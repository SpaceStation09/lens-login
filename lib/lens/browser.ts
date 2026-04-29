"use client";

import type { LensLoginClientOptions } from "@demo/lens-login/shared";

export const defaultLensAppByEnvironment = {
  mainnet: "0x8A5Cc31180c37078e1EbA2A23c861Acf351a97cE",
  testnet: "0xC75A89145d765c396fd75CbD16380Eb184Bd2ca7",
} as const;

export function getLensEnvironment() {
  return process.env.NEXT_PUBLIC_LENS_ENV === "mainnet" ? "mainnet" : "testnet";
}

export function getLensAppAddress() {
  return process.env.NEXT_PUBLIC_LENS_APP_ADDRESS ?? defaultLensAppByEnvironment[getLensEnvironment()];
}

export function getInjectedProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No injected wallet found. Install MetaMask or another EVM wallet.");
  }

  return window.ethereum as NonNullable<LensLoginClientOptions["ethereum"]>;
}

export async function requestWalletAddress(options: { requestAccountSelection: boolean }) {
  const provider = getInjectedProvider();

  if (options.requestAccountSelection) {
    await provider.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });
  }

  const accounts = (await provider.request({ method: options.requestAccountSelection ? "eth_accounts" : "eth_requestAccounts" })) as string[];
  const account = accounts[0];
  if (!account) {
    throw new Error("No wallet account was returned.");
  }

  return {
    provider,
    walletAddress: account.toLowerCase(),
  };
}
