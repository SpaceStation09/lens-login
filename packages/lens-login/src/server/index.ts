import { PublicClient, mainnet, testnet } from "@lens-protocol/client";
import { fetchAccount, fetchAccountsAvailable } from "@lens-protocol/client/actions";
import { createRemoteJWKSet, jwtVerify } from "jose";

import type {
  LensAccountsRequest,
  LensAccountsResponse,
  LensApiError,
  LensDiscoveredAccount,
  LensVerifyResponse,
  LensVerifiedIdentity,
  LensLoginServer,
  LensLoginServerOptions,
  LensSessionRequest,
} from "../shared/types";
import { LensLoginError, normalizeAddress, normalizeText } from "../shared/utils";

export class LensLoginServerError extends LensLoginError {
  constructor(code: string, message: string, status = 400) {
    super(code, message, status);
  }
}

const LENS_ENV_CONFIG = {
  mainnet: {
    apiUrl: "https://api.lens.xyz",
    appAddress: "0x8A5Cc31180c37078e1EbA2A23c861Acf351a97cE",
  },
  testnet: {
    apiUrl: "https://api.testnet.lens.xyz",
    appAddress: "0xC75A89145d765c396fd75CbD16380Eb184Bd2ca7",
  },
} as const;

function toProviderSubject(lensAccountAddress: string) {
  return `lens:${normalizeAddress(lensAccountAddress)}`;
}

function getActSubject(payload: Record<string, unknown>) {
  const act = payload.act;
  if (typeof act !== "object" || act === null || Array.isArray(act)) {
    return null;
  }

  return normalizeText((act as Record<string, unknown>)["sub"]);
}

export function createLensLoginServer<User extends { id: string }>(options: LensLoginServerOptions<User>): LensLoginServer<User> {
  const environment = options.environment ?? (process.env.NEXT_PUBLIC_LENS_ENV === "mainnet" ? "mainnet" : "testnet");
  const origin = options.origin ?? process.env.NEXT_PUBLIC_APP_ORIGIN ?? "http://localhost:3000";
  const config = LENS_ENV_CONFIG[environment];
  const lensApiBaseUrl = config.apiUrl;
  const lensAppAddress = normalizeAddress(options.appAddress ?? process.env.NEXT_PUBLIC_LENS_APP_ADDRESS ?? config.appAddress);
  const jwks = createRemoteJWKSet(new URL(`${lensApiBaseUrl}/.well-known/jwks.json`));

  function getLensClient() {
    return PublicClient.create({
      environment: environment === "mainnet" ? mainnet : testnet,
      origin,
    });
  }

  function toAccountView(item: any): LensDiscoveredAccount {
    const account = item.account ?? item;

    return {
      accountAddress: account.address,
      username: account.username
        ? {
            fullHandle: normalizeText(account.username.value),
            localName: normalizeText(account.username.localName),
            namespace: normalizeText(account.username.namespace),
          }
        : null,
      metadata: {
        displayName: normalizeText(account.metadata?.name),
        picture: normalizeText(account.metadata?.picture),
      },
    };
  }

  async function discoverAccounts(input: LensAccountsRequest): Promise<LensAccountsResponse> {
    const client = getLensClient();
    const walletAddress = normalizeAddress(input.walletAddress);
    const result = await fetchAccountsAvailable(client, {
      managedBy: walletAddress as `0x${string}`,
      includeOwned: true,
    });

    if (result.isErr()) {
      throw new LensLoginServerError("INTERNAL_ERROR", "Failed to fetch Lens accounts.", 500);
    }

    return {
      walletAddress,
      accounts: result.value.items.map(toAccountView),
    };
  }

  async function resolveSessionIdentity(input: {
    signerAddress: string;
    lensAccountAddress: string;
  }): Promise<LensVerifiedIdentity> {
    const client = getLensClient();
    const accountResult = await fetchAccount(client, {
      address: input.lensAccountAddress as `0x${string}`,
    });

    if (accountResult.isErr()) {
      throw new LensLoginServerError("INTERNAL_ERROR", "Failed to fetch Lens account.", 500);
    }

    if (!accountResult.value) {
      throw new LensLoginServerError("INVALID_ID_TOKEN", "Lens account from ID token was not found.", 401);
    }

    const account = toAccountView(accountResult.value);

    return {
      providerSubject: toProviderSubject(account.accountAddress),
      walletAddress: normalizeAddress(input.signerAddress),
      lensAccountAddress: normalizeAddress(account.accountAddress),
      username: account.username,
      metadata: account.metadata,
    };
  }

  async function verifyIdToken(idToken: string) {
    try {
      const result = await jwtVerify(idToken, jwks, {
        issuer: lensApiBaseUrl,
      });
      const payload = result.payload as Record<string, unknown>;
      const role = normalizeText(payload["tag:lens.dev,2024:role"]);
      const audience = normalizeText(payload["aud"]);
      const signerAddress = normalizeText(payload["sub"]);
      const lensAccountAddress = getActSubject(payload);
      const authenticationId = normalizeText(payload["sid"]);

      if (!audience || normalizeAddress(audience) !== lensAppAddress) {
        throw new LensLoginServerError("INVALID_ID_TOKEN", "Lens ID token was not issued for this app.", 401);
      }

      if (role !== "ACCOUNT_OWNER" && role !== "ACCOUNT_MANAGER") {
        throw new LensLoginServerError("UNSUPPORTED_LENS_ROLE", "This Lens session role cannot be used to authenticate.", 401);
      }

      if (!signerAddress || !lensAccountAddress || !authenticationId) {
        throw new LensLoginServerError("INVALID_ID_TOKEN", "Lens ID token is missing required identity claims.", 401);
      }

      return {
        signerAddress: normalizeAddress(signerAddress),
        lensAccountAddress: normalizeAddress(lensAccountAddress),
        authenticationId,
        role,
      };
    } catch (error) {
      if (error instanceof LensLoginServerError) {
        throw error;
      }

      throw new LensLoginServerError("INVALID_ID_TOKEN", "Lens ID token is invalid or expired.", 401);
    }
  }

  async function persistNewIdentity(userId: string, verifiedIdentity: LensVerifiedIdentity) {
    await options.storage.createLensIdentity({
      userId,
      providerSubject: verifiedIdentity.providerSubject,
      walletAddress: verifiedIdentity.walletAddress,
      lensAccountAddress: verifiedIdentity.lensAccountAddress,
      lensUsernameFull: verifiedIdentity.username?.fullHandle ?? null,
      lensUsernameLocalName: verifiedIdentity.username?.localName ?? null,
      lensUsernameNamespace: verifiedIdentity.username?.namespace ?? null,
      lensDisplayName: verifiedIdentity.metadata?.displayName ?? null,
      lensPictureUrl: verifiedIdentity.metadata?.picture ?? null,
    });
  }

  async function verifySession(input: LensSessionRequest & { currentUserId: string | null }): Promise<LensVerifyResponse<User>> {
    const tokenIdentity = await verifyIdToken(input.idToken);
    const verifiedIdentity = await resolveSessionIdentity({
      signerAddress: tokenIdentity.signerAddress,
      lensAccountAddress: tokenIdentity.lensAccountAddress,
    });

    if (input.type === "link") {
      if (!input.currentUserId) {
        throw new LensLoginServerError("UNAUTHORIZED", "You must be logged in to bind a Lens account.", 401);
      }

      const existing = await options.storage.getIdentityByProviderSubject(verifiedIdentity.providerSubject);
      if (existing && existing.userId !== input.currentUserId) {
        throw new LensLoginServerError("IDENTITY_ALREADY_LINKED", "That Lens identity is already linked to another user.");
      }

      if (!existing) {
        await persistNewIdentity(input.currentUserId, verifiedIdentity);
      }

      const user = await options.findUserById(input.currentUserId);
      if (!user) {
        throw new LensLoginServerError("UNAUTHORIZED", "User session no longer exists.", 401);
      }

      return {
        ok: true,
        action: "link",
        user,
        identity: verifiedIdentity,
        isNewUser: false,
      };
    }

    const existing = await options.storage.getIdentityByProviderSubject(verifiedIdentity.providerSubject);
    let user = existing ? await options.findUserById(existing.userId) : null;
    let isNewUser = false;

    if (!user) {
      user = await options.createUser();
      await persistNewIdentity(user.id, verifiedIdentity);
      isNewUser = true;
    }

    await options.setSession(user);

    return {
      ok: true,
      action: "login",
      user,
      identity: verifiedIdentity,
      isNewUser,
    };
  }

  function toErrorResponse(error: unknown): { status: number; body: LensApiError } {
    if (error instanceof LensLoginServerError) {
      return {
        status: error.status,
        body: {
          ok: false,
          error: {
            code: error.code as LensApiError["error"]["code"],
            message: error.message,
          },
        },
      };
    }

    return {
      status: 500,
      body: {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Unexpected error.",
        },
      },
    };
  }

  return {
    discoverAccounts,
    verifySession,
    toErrorResponse,
  };
}
