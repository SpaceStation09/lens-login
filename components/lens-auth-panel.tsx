"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { LensAuthIntent, LensDiscoveredAccount } from "@demo/lens-login/shared";
import { createDemoLensLoginClient, requestWalletAddress } from "@/lib/lens/browser";
import { verifyLensSession } from "@/lib/lens/api";

type Props = {
  mode: LensAuthIntent;
};

function getAccountLabel(account: LensDiscoveredAccount) {
  const fullHandle = account.username?.fullHandle?.trim();
  if (fullHandle) {
    return fullHandle;
  }

  const profileName = account.metadata?.name?.trim();
  if (profileName) {
    return profileName;
  }

  const localName = account.username?.localName?.trim();
  if (localName) {
    return localName;
  }

  return account.accountAddress;
}

export function LensAuthPanel({ mode }: Props) {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<LensDiscoveredAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function discoverAccounts() {
    setBusy(true);
    setError(null);
    setNotice("Connect MetaMask to load Lens accounts...");

    try {
      const { walletAddress: connectedWallet } = await requestWalletAddress({ requestAccountSelection: true });
      const lensLoginClient = createDemoLensLoginClient();
      setWalletAddress(connectedWallet);
      setNotice("Loading Lens accounts...");

      const data = await lensLoginClient.listAvailableAccounts({ walletAddress: connectedWallet });
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
      const lensLoginClient = createDemoLensLoginClient();
      const authenticated = await lensLoginClient.login({
        lensAccountAddress: selectedAccount,
        walletAddress,
      });

      setNotice("Verifying Lens session with the app server...");

      const verified = await verifyLensSession({
        type: mode,
        idToken: authenticated.idToken,
      });

      router.push(mode === "login" && (!verified.user.username || !verified.user.hasPassword) ? "/complete-account" : "/dashboard");
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
        <button className="button" disabled={busy} onClick={discoverAccounts} type="button">
          {walletAddress ? "Refresh MetaMask wallet" : "Connect MetaMask"}
        </button>
        <button className="button-secondary" disabled={busy || !selectedAccount} onClick={continueWithLens} type="button">
          {busy ? "Working..." : mode === "login" ? "Continue with Lens" : "Bind Lens account"}
        </button>
      </div>
      <div className="notice">Use MetaMask or another injected EVM wallet that controls a Lens account on the selected network.</div>
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
      {accounts.length === 1 ? <div className="notice">Lens account: {getAccountLabel(accounts[0])}</div> : null}
      {notice ? <div className="notice">{notice}</div> : null}
      {error ? <div className="error">{error}</div> : null}
    </div>
  );
}
