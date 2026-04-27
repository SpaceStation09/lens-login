"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PublicClient, evmAddress, mainnet, testnet } from "@lens-protocol/client";
import { signMessageWith } from "@lens-protocol/client/viem";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom } from "viem";

import type { LensAuthIntent, LensDiscoveredAccount } from "@/lib/lens/types";
import { createLensLoginClient } from "@demo/lens-login/client";

type Props = {
  mode: LensAuthIntent;
};

const lensAppByEnvironment = {
  mainnet: "0x8A5Cc31180c37078e1EbA2A23c861Acf351a97cE",
  testnet: "0xC75A89145d765c396fd75CbD16380Eb184Bd2ca7",
} as const;

function getLensEnvironment() {
  return process.env.NEXT_PUBLIC_LENS_ENV === "mainnet" ? "mainnet" : "testnet";
}

function getLensAppAddress() {
  return process.env.NEXT_PUBLIC_LENS_APP_ADDRESS ?? lensAppByEnvironment[getLensEnvironment()];
}

function getAccountLabel(account: LensDiscoveredAccount) {
  const fullHandle = account.username?.fullHandle?.trim();
  if (fullHandle) {
    return fullHandle;
  }

  const displayName = account.metadata?.displayName?.trim();
  if (displayName) {
    return displayName;
  }

  const localName = account.username?.localName?.trim();
  if (localName) {
    return localName;
  }

  return account.accountAddress;
}

export function LensAuthPanel({ mode }: Props) {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<LensDiscoveredAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<"discover" | "authenticate" | null>(null);

  const activeWallet = useMemo(
    () => wallets.find((wallet) => wallet.walletClientType === "privy") ?? wallets[0] ?? null,
    [wallets],
  );
  const lensEnvironment = getLensEnvironment();
  const lensAppAddress = getLensAppAddress();

  function createLensClient() {
    return PublicClient.create({
      environment: lensEnvironment === "mainnet" ? mainnet : testnet,
      storage: window.localStorage,
    });
  }

  async function getLensLoginClient(action: "discover" | "authenticate") {
    if (!ready) {
      setNotice("Initializing Privy...");
      return null;
    }

    if (!authenticated || !activeWallet) {
      setPendingAction(action);
      setNotice("Continue in the Privy modal to connect your wallet.");
      await login();
      return null;
    }

    const provider = await activeWallet.getEthereumProvider();

    return {
      client: createLensLoginClient({ ethereum: provider }),
      walletAddress: activeWallet.address.toLowerCase(),
    };
  }

  useEffect(() => {
    if (!pendingAction || !ready || !authenticated || !activeWallet) {
      return;
    }

    setPendingAction(null);

    if (pendingAction === "discover") {
      void discoverAccounts();
      return;
    }

    if (pendingAction === "authenticate" && selectedAccount) {
      void continueWithLens();
    }
  }, [pendingAction, ready, authenticated, activeWallet, selectedAccount]);

  async function discoverAccounts() {
    setBusy(true);
    setError(null);
    setNotice(ready ? "Loading Lens accounts..." : "Initializing Privy...");

    try {
      const result = await getLensLoginClient("discover");
      if (!result) {
        return;
      }

      const { client, walletAddress: connectedWallet } = result;
      setWalletAddress(connectedWallet);

      const data = await client.discoverAccounts({ walletAddress: connectedWallet });
      const nextAccounts = data.accounts ?? [];
      setAccounts(nextAccounts);

      if (nextAccounts.length === 0) {
        setSelectedAccount("");
        setNotice("This wallet does not control any Lens account on the selected network.");
      } else if (nextAccounts.length === 1) {
        setSelectedAccount(nextAccounts[0].accountAddress);
        setNotice("One Lens account found. You can continue now.");
      } else {
        setSelectedAccount(nextAccounts[0].accountAddress);
        setNotice("Multiple Lens accounts found. Pick the one you want to use.");
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Wallet connection failed.");
    } finally {
      setBusy(false);
    }
  }

  async function continueWithLens() {
    if (!walletAddress || !selectedAccount) {
      setError("Connect a wallet and choose a Lens account first.");
      return;
    }

    setBusy(true);
    setError(null);
      setNotice("Signing Lens login challenge...");

    try {
      const result = await getLensLoginClient("authenticate");
      if (!result) {
        return;
      }

      const { client, walletAddress: connectedWallet } = result;
      const provider = await activeWallet?.getEthereumProvider();
      if (!provider) {
        throw new Error("Wallet provider is not available.");
      }

      const walletClient = createWalletClient({
        account: evmAddress(connectedWallet),
        transport: custom(provider),
      });
      const lensClient = createLensClient();
      const authenticated = await lensClient.login({
        accountOwner: {
          account: evmAddress(selectedAccount),
          owner: evmAddress(connectedWallet),
          app: evmAddress(lensAppAddress),
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
        throw new Error("Lens session did not include an ID token.");
      }

      setNotice("Verifying Lens session with the app server...");

      await client.verifySession({
        type: mode,
        idToken: credentials.value.idToken,
      });

      router.push("/dashboard");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Lens auth failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="actions">
        <button className="button" disabled={busy || !ready} onClick={discoverAccounts} type="button">
          {!ready ? "Initializing Privy..." : walletAddress ? "Refresh Privy wallet" : "Login with Privy"}
        </button>
        <button className="button-secondary" disabled={busy || !selectedAccount} onClick={continueWithLens} type="button">
          {busy ? "Working..." : mode === "login" ? "Continue with Lens" : "Bind Lens account"}
        </button>
      </div>
      <div className="notice">Privy now supports email login plus wallet login. If the user logs in with email and has no wallet yet, Privy will create an embedded wallet for Lens auth.</div>
      {walletAddress ? <div className="notice">Wallet: {walletAddress}</div> : null}
      {accounts.length > 1 ? (
        <label>
          Lens account
            <select onChange={(event) => setSelectedAccount(event.target.value)} value={selectedAccount}>
            {accounts.map((account, index) => (
              <option key={`${account.accountAddress}-${account.username?.fullHandle ?? "unknown"}-${index}`} value={account.accountAddress}>
                {getAccountLabel(account)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {accounts.length === 1 ? (
        <div className="notice">
          Lens account: {getAccountLabel(accounts[0])}
        </div>
      ) : null}
      {notice ? <div className="notice">{notice}</div> : null}
      {error ? <div className="error">{error}</div> : null}
    </div>
  );
}
