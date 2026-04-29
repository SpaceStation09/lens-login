import { PublicClient, evmAddress, mainnet, testnet } from "@lens-protocol/client";
import { fetchAccount, fetchAccountsAvailable } from "@lens-protocol/client/actions";
import { signMessageWith } from "@lens-protocol/client/viem";
import { createWalletClient, custom } from "viem";

import type { LensAccountsResponse, LensClientLoginRequest, LensLoginClient, LensLoginClientOptions } from "../shared/types";
import { LensLoginError, normalizeAddress, toDiscoveredAccount } from "../shared/utils";

declare global {
  interface Window {
    ethereum?: LensLoginClientOptions["ethereum"];
  }
}

export class LensLoginClientError extends LensLoginError {
  constructor(code: string, message: string, status?: number) {
    super(code, message, status ?? 0);
  }
}

const LENS_ENV_CONFIG = {
  mainnet: {
    appAddress: "0x8A5Cc31180c37078e1EbA2A23c861Acf351a97cE",
  },
  testnet: {
    appAddress: "0xC75A89145d765c396fd75CbD16380Eb184Bd2ca7",
  },
} as const;

export function createLensLoginClient(options: LensLoginClientOptions = {}): LensLoginClient {
  const environment = options.environment ?? "testnet";
  const appAddress = normalizeAddress(options.appAddress ?? LENS_ENV_CONFIG[environment].appAddress);

  function getInjectedProvider() {
    const provider = options.ethereum ?? (typeof window !== "undefined" ? window.ethereum : undefined);

    if (!provider) {
      throw new LensLoginClientError("NO_WALLET", "No injected wallet found. Install MetaMask or another EVM wallet.");
    }

    return provider;
  }

  async function connectWallet() {
    const provider = getInjectedProvider();
    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
    const wallet = accounts[0];

    if (!wallet) {
      throw new LensLoginClientError("NO_WALLET_ACCOUNT", "No wallet account was returned.");
    }

    return wallet.toLowerCase();
  }

  function getLensClient() {
    return PublicClient.create({
      environment: environment === "mainnet" ? mainnet : testnet,
      origin: options.origin,
      storage: options.storage ?? (typeof window !== "undefined" ? window.localStorage : undefined),
    });
  }

  async function listAvailableAccounts(input: { walletAddress?: string } = {}): Promise<LensAccountsResponse> {
    const walletAddress = input.walletAddress ? normalizeAddress(input.walletAddress) : await connectWallet();
    const client = getLensClient();
    const result = await fetchAccountsAvailable(client, {
      managedBy: evmAddress(walletAddress),
      includeOwned: true,
    });

    if (result.isErr()) {
      throw result.error;
    }

    return {
      walletAddress,
      accounts: result.value.items.map(toDiscoveredAccount),
    };
  }

  async function login(input: LensClientLoginRequest) {
    const provider = getInjectedProvider();
    const walletAddress = await connectWallet();

    if (input.walletAddress && normalizeAddress(input.walletAddress) !== walletAddress) {
      throw new LensLoginClientError("WALLET_MISMATCH", "The connected wallet does not match the wallet used to discover this Lens account.");
    }

    const client = getLensClient();
    const walletClient = createWalletClient({
      account: evmAddress(walletAddress),
      transport: custom(provider),
    });
    const lensAccountAddress = normalizeAddress(input.lensAccountAddress);
    const authenticated = await client.login({
      accountOwner: {
        account: evmAddress(lensAccountAddress),
        owner: evmAddress(walletAddress),
        app: evmAddress(appAddress),
      },
      signMessage: signMessageWith(walletClient),
    });

    if (authenticated.isErr()) {
      throw authenticated.error;
    }

    const credentials = authenticated.value.getCredentials();

    if (credentials.isErr()) {
      throw credentials.error;
    }

    if (!credentials.value?.idToken) {
      throw new LensLoginClientError("NO_ID_TOKEN", "Lens session did not include an ID token.");
    }

    const accountResult = await fetchAccount(client, {
      address: evmAddress(lensAccountAddress),
    });

    if (accountResult.isErr()) {
      throw new LensLoginClientError("ACCOUNT_FETCH_FAILED", "Failed to fetch the Lens account after login.");
    }

    if (!accountResult.value) {
      throw new LensLoginClientError("ACCOUNT_NOT_FOUND", "The Lens account used for login could not be found.");
    }

    return {
      walletAddress,
      sessionClient: authenticated.value,
      idToken: credentials.value.idToken,
      account: toDiscoveredAccount(accountResult.value),
    };
  }

  return {
    connectWallet,
    listAvailableAccounts,
    login,
  };
}
