"use client";

import { useEffect, useState } from "react";

import type { LensDiscoveredAccount } from "@demo/lens-login/shared";
import { createDemoLensLoginClient } from "@/lib/lens/browser";

type Props = {
  lensAccountAddress: string;
};

function getRenderableImageUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.startsWith("http://") || value.startsWith("https://") ? value : null;
}

function getProfileLabel(account: LensDiscoveredAccount) {
  return account.metadata?.name ?? account.username?.fullHandle ?? account.accountAddress;
}

export function LensAccountMetadataCard({ lensAccountAddress }: Props) {
  const [account, setAccount] = useState<LensDiscoveredAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      setLoading(true);
      setError(null);

      try {
        const nextAccount = await createDemoLensLoginClient().getAccount({
          lensAccountAddress,
        });

        if (!cancelled) {
          setAccount(nextAccount);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Failed to load Lens account metadata.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAccount();

    return () => {
      cancelled = true;
    };
  }, [lensAccountAddress]);

  if (loading) {
    return <div className="notice">Loading live Lens account metadata...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!account) {
    return <div className="notice">This Lens account could not be loaded from the Lens API.</div>;
  }

  const pictureUrl = getRenderableImageUrl(account.metadata?.picture);
  const coverUrl = getRenderableImageUrl(account.metadata?.coverPicture);
  const profileLabel = getProfileLabel(account);
  const initials = profileLabel.slice(0, 2).toUpperCase();

  return (
    <div className="stack">
      <div className="profile-card">
        <div
          className="profile-cover"
          style={coverUrl ? { backgroundImage: `linear-gradient(180deg, rgba(3, 8, 16, 0.18), rgba(3, 8, 16, 0.78)), url(${coverUrl})` } : undefined}
        />
        <div className="profile-body">
          <div className="profile-avatar-shell">
            {pictureUrl ? (
              <img alt={`${profileLabel} profile`} className="profile-avatar" src={pictureUrl} />
            ) : (
              <div className="profile-avatar profile-avatar-fallback">{initials}</div>
            )}
          </div>
          <div className="profile-copy stack">
            <div>
              <div className="pill">Live Lens profile</div>
            </div>
            <div className="stack-tight">
              <h3>{account.metadata?.name ?? "Unnamed Lens account"}</h3>
              <div className="muted">{account.username?.fullHandle ?? lensAccountAddress}</div>
            </div>
            <p className="profile-bio">{account.metadata?.bio ?? "This account has not set a bio yet."}</p>
          </div>
        </div>
      </div>

      <div className="profile-details-grid">
        <div className="profile-stat-card">
          <div className="muted">Account address</div>
          <div>{account.accountAddress}</div>
        </div>
        <div className="profile-stat-card">
          <div className="muted">Profile metadata ID</div>
          <div>{account.metadata?.id ?? "Unknown"}</div>
        </div>
        <div className="profile-stat-card">
          <div className="muted">Picture source</div>
          <div>{account.metadata?.picture ?? "Not set"}</div>
        </div>
        <div className="profile-stat-card">
          <div className="muted">Cover source</div>
          <div>{account.metadata?.coverPicture ?? "Not set"}</div>
        </div>
      </div>

      <div className="stack">
        <div className="muted">Metadata attributes</div>
        {account.metadata?.attributes.length ? (
          <div className="profile-attributes-grid">
            {account.metadata.attributes.map((attribute) => (
              <div className="profile-attribute-card" key={`${attribute.key}:${attribute.type}:${attribute.value}`}>
                <div className="muted">{attribute.type}</div>
                <strong>{attribute.key}</strong>
                <div>{attribute.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="notice">No custom metadata attributes.</div>
        )}
      </div>
    </div>
  );
}
