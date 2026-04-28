"use client";

import { useState } from "react";
import { chains } from "@lens-chain/sdk/viem";
import { immutable, StorageClient } from "@lens-chain/storage-client";
import { PublicClient, evmAddress } from "@lens-protocol/client";
import { createAccountWithUsername, fetchAccount } from "@lens-protocol/client/actions";
import { handleOperationWith, signMessageWith } from "@lens-protocol/client/viem";
import { account as accountMetadata } from "@lens-protocol/metadata";
import { createWalletClient, custom } from "viem";

import { createBrowserLensClient, getLensAppAddress, getInjectedProvider } from "@/lib/lens/browser";
import type { LensLoginClientOptions } from "@demo/lens-login/shared";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getDefaultLocalName() {
  return `test-${Date.now().toString(36)}`;
}

async function ensureLensTestnet(provider: NonNullable<LensLoginClientOptions["ethereum"]>) {
  const chainId = `0x${chains.testnet.id.toString(16)}`;

  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId,
            chainName: chains.testnet.name,
            nativeCurrency: chains.testnet.nativeCurrency,
            rpcUrls: chains.testnet.rpcUrls.default.http,
            blockExplorerUrls: chains.testnet.blockExplorers?.default ? [chains.testnet.blockExplorers.default.url] : undefined,
          },
        ],
      });
      return;
    }

    throw error;
  }
}

async function waitForAccountByUsername(client: PublicClient, localName: string) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const result = await fetchAccount(client, {
      username: { localName },
    });

    if (result.isOk() && result.value) {
      return result.value;
    }

    await sleep(1500);
  }

  return null;
}

export function CreateTestAccountPanel() {
  const [localName, setLocalName] = useState(getDefaultLocalName);
  const [displayName, setDisplayName] = useState("Test Lens Account");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function createTestAccount() {
    const cleanLocalName = localName.trim().toLowerCase();
    if (!/^[a-z0-9-]{3,26}$/.test(cleanLocalName)) {
      setError("Username must be 3-26 chars and only use lowercase letters, numbers, or hyphens.");
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);
    setNotice("Connecting MetaMask...");

    try {
      const provider = getInjectedProvider();
      const [address] = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      if (!address) {
        throw new Error("No wallet account was returned.");
      }

      setWalletAddress(address.toLowerCase());
      setNotice("Switching MetaMask to Lens testnet...");
      await ensureLensTestnet(provider);

      const publicClient = createBrowserLensClient({ environment: "testnet" });
      const walletClient = createWalletClient({
        account: evmAddress(address),
        chain: chains.testnet,
        transport: custom(provider),
      });

      setNotice("Signing Lens onboarding login...");
      const authenticated = await publicClient.login({
        onboardingUser: {
          wallet: evmAddress(address),
          app: evmAddress(getLensAppAddress()),
        },
        signMessage: signMessageWith(walletClient),
      });

      if (authenticated.isErr()) {
        throw authenticated.error;
      }

      const sessionClient = authenticated.value;
      const storage = StorageClient.create();
      const metadata = accountMetadata({
        name: displayName.trim() || cleanLocalName,
        bio: "Temporary test account created from the Lens login demo.",
      });

      setNotice("Uploading account metadata to Grove...");
      const { uri } = await storage.uploadAsJson(metadata, {
        acl: immutable(chains.testnet.id),
      });

      setNotice("Creating Lens testnet account...");
      const created = await createAccountWithUsername(sessionClient, {
        username: { localName: cleanLocalName },
        metadataUri: uri,
      }).andThen(handleOperationWith(walletClient));

      if (created.isErr()) {
        throw created.error;
      }

      setNotice("Waiting for Lens API indexing...");
      const indexed = await waitForAccountByUsername(publicClient, cleanLocalName);

      setResult(
        JSON.stringify(
          {
            username: `lens/${cleanLocalName}`,
            accountAddress: indexed?.address ?? "Not indexed yet",
            txHash: created.value,
          },
          null,
          2,
        ),
      );
      setNotice(indexed ? "Account created and indexed." : "Transaction submitted, but account was not indexed yet. Try refreshing account discovery in a minute.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to create Lens testnet account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="form">
        <label>
          Username local name
          <input disabled={busy} onChange={(event) => setLocalName(event.target.value)} value={localName} />
        </label>
        <label>
          Display name
          <input disabled={busy} onChange={(event) => setDisplayName(event.target.value)} value={displayName} />
        </label>
      </div>
      <div className="actions">
        <button className="button" disabled={busy} onClick={createTestAccount} type="button">
          {busy ? "Working..." : "Create testnet Lens account"}
        </button>
        <button className="button-secondary" disabled={busy} onClick={() => setLocalName(getDefaultLocalName())} type="button">
          Generate username
        </button>
      </div>
      {walletAddress ? <div className="notice">Wallet: {walletAddress}</div> : null}
      {notice ? <div className="notice">{notice}</div> : null}
      {error ? <div className="error">{error}</div> : null}
      {result ? <pre className="notice">{result}</pre> : null}
    </div>
  );
}
