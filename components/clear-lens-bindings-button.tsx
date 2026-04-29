"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClearLensBindingsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function clearBindings() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/lens/unbind", {
        method: "POST",
      });
      const data = (await response.json()) as { error?: { message?: string } };

      if (!response.ok) {
        throw new Error(data.error?.message ?? "Failed to clear Lens binding.");
      }

      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to clear Lens binding.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <button className="button-secondary" disabled={busy} onClick={clearBindings} type="button">
        {busy ? "Clearing..." : "Clear Lens binding"}
      </button>
      {error ? <div className="error">{error}</div> : null}
    </div>
  );
}
