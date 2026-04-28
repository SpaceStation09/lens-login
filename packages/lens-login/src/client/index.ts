import type { LensLoginClient, LensLoginClientOptions } from "../shared/types";
import { LensLoginError } from "../shared/utils";

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

export function createLensLoginClient(options: LensLoginClientOptions = {}): LensLoginClient {
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

  return {
    connectWallet,
  };
}
