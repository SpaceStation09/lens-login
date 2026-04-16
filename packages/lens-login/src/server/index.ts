import { randomBytes } from "node:crypto";

import { PublicClient, mainnet, testnet } from "@lens-protocol/client";
import { fetchAccountsAvailable } from "@lens-protocol/client/actions";
import { recoverMessageAddress } from "viem";

import type {
  LensAccountsRequest,
  LensAccountsResponse,
  LensApiError,
  LensChallengeRequest,
  LensChallengeResponse,
  LensDiscoveredAccount,
  LensVerifyRequest,
  LensVerifyResponse,
  LensVerifiedIdentity,
  LensLoginServer,
  LensLoginServerCreateIdentityInput,
  LensLoginServerOptions,
  LensLoginServerStorage,
  LensLoginServerStoredChallenge,
  LensLoginServerStoredIdentity,
} from "../shared/types";
import { normalizeAddress } from "../shared/utils";

export class LensLoginServerError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function buildChallengeMessage(input: {
  nonce: string;
  walletAddress: string;
  lensAccountAddress: string;
  type: LensChallengeRequest["type"];
  expiresAt: string;
}) {
  return [
    "Sign this message to continue with Lens Login Demo.",
    "",
    `Challenge: ${input.nonce}`,
    `Wallet: ${input.walletAddress}`,
    `Lens Account: ${input.lensAccountAddress}`,
    `Action: ${input.type}`,
    `Expires At: ${input.expiresAt}`,
  ].join("\n");
}

function toProviderSubject(lensAccountAddress: string) {
  return `lens:${normalizeAddress(lensAccountAddress)}`;
}

export function createLensLoginServer<User extends { id: string }>(options: LensLoginServerOptions<User>): LensLoginServer<User> {
  const environment = options.environment ?? (process.env.NEXT_PUBLIC_LENS_ENV === "mainnet" ? "mainnet" : "testnet");
  const origin = options.origin ?? process.env.NEXT_PUBLIC_APP_ORIGIN ?? "http://localhost:3000";

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

  async function createChallengeFor(input: LensChallengeRequest & { currentUserId: string | null }): Promise<LensChallengeResponse> {
    const walletAddress = normalizeAddress(input.walletAddress);
    const lensAccountAddress = normalizeAddress(input.lensAccountAddress);

    if (input.type === "link" && !input.currentUserId) {
      throw new LensLoginServerError("UNAUTHORIZED", "You must be logged in to bind a Lens account.", 401);
    }

    const discovered = await discoverAccounts({ walletAddress });
    const matched = discovered.accounts.find((account) => normalizeAddress(account.accountAddress) === lensAccountAddress);

    if (!matched) {
      throw new LensLoginServerError("LENS_ACCOUNT_NOT_CONTROLLED", "This wallet does not control the selected Lens account.");
    }

    const expiresAt = new Date(Date.now() + 1000 * 60 * 5).toISOString();
    const nonce = randomBytes(16).toString("hex");
    const message = buildChallengeMessage({
      nonce,
      walletAddress,
      lensAccountAddress,
      type: input.type,
      expiresAt,
    });

    const challenge = await options.storage.createChallenge({
      type: input.type,
      nonce,
      walletAddress,
      lensAccountAddress,
      message,
      expiresAt,
      createdByUserId: input.currentUserId,
    });

    return {
      challengeId: challenge.id,
      type: challenge.type,
      walletAddress: challenge.walletAddress,
      lensAccountAddress: challenge.lensAccountAddress,
      message: challenge.message,
      expiresAt: challenge.expiresAt,
    };
  }

  async function resolveVerifiedIdentity(walletAddress: string, lensAccountAddress: string): Promise<LensVerifiedIdentity> {
    const discovered = await discoverAccounts({ walletAddress });
    const account = discovered.accounts.find((item) => normalizeAddress(item.accountAddress) === normalizeAddress(lensAccountAddress));

    if (!account) {
      throw new LensLoginServerError("LENS_ACCOUNT_NOT_CONTROLLED", "This wallet no longer controls the selected Lens account.");
    }

    return {
      providerSubject: toProviderSubject(account.accountAddress),
      walletAddress: normalizeAddress(walletAddress),
      lensAccountAddress: normalizeAddress(account.accountAddress),
      username: account.username,
      metadata: account.metadata,
    };
  }

  async function verifyChallenge(input: LensVerifyRequest): Promise<LensVerifyResponse<User>> {
    const challenge = await options.storage.getChallengeById(input.challengeId);

    if (!challenge) {
      throw new LensLoginServerError("CHALLENGE_NOT_FOUND", "Challenge not found.", 404);
    }

    if (challenge.usedAt) {
      throw new LensLoginServerError("CHALLENGE_ALREADY_USED", "Challenge has already been used.");
    }

    if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
      throw new LensLoginServerError("CHALLENGE_EXPIRED", "Challenge has expired.");
    }

    const recovered = normalizeAddress(
      await recoverMessageAddress({
        message: challenge.message,
        signature: input.signature,
      }),
    );

    if (recovered !== challenge.walletAddress) {
      throw new LensLoginServerError("INVALID_SIGNATURE", "Signature does not match the expected wallet.");
    }

    const verifiedIdentity = await resolveVerifiedIdentity(challenge.walletAddress, challenge.lensAccountAddress);

    if (challenge.type === "link") {
      if (!challenge.createdByUserId) {
        throw new LensLoginServerError("UNAUTHORIZED", "Missing binding user context.", 401);
      }

      const existing = await options.storage.getIdentityByProviderSubject(verifiedIdentity.providerSubject);
      if (existing && existing.userId !== challenge.createdByUserId) {
        throw new LensLoginServerError("IDENTITY_ALREADY_LINKED", "That Lens identity is already linked to another user.");
      }

      if (!existing) {
        await options.storage.createLensIdentity({
          userId: challenge.createdByUserId,
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

      await options.storage.markChallengeUsed(challenge.id);
      const user = await options.findUserById(challenge.createdByUserId);
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
      await options.storage.createLensIdentity({
        userId: user.id,
        providerSubject: verifiedIdentity.providerSubject,
        walletAddress: verifiedIdentity.walletAddress,
        lensAccountAddress: verifiedIdentity.lensAccountAddress,
        lensUsernameFull: verifiedIdentity.username?.fullHandle ?? null,
        lensUsernameLocalName: verifiedIdentity.username?.localName ?? null,
        lensUsernameNamespace: verifiedIdentity.username?.namespace ?? null,
        lensDisplayName: verifiedIdentity.metadata?.displayName ?? null,
        lensPictureUrl: verifiedIdentity.metadata?.picture ?? null,
      });
      isNewUser = true;
    }

    await options.setSession(user);
    await options.storage.markChallengeUsed(challenge.id);

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
    createChallenge: createChallengeFor,
    verifyChallenge,
    toErrorResponse,
  };
}
