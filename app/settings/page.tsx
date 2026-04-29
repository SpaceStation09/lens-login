import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { ClearLensBindingsButton } from "@/components/clear-lens-bindings-button";
import { LensAuthPanel } from "@/components/lens-auth-panel";
import { getCurrentUser } from "@/lib/auth/session";
import { getIdentitiesForUser } from "@/lib/db/store";

export default async function SettingsPage() {
  const user = await getCurrentUser(await cookies());

  if (!user) {
    redirect("/login");
  }

  if (!user.username || !user.passwordHash) {
    redirect("/complete-account");
  }

  const identities = await getIdentitiesForUser(user.id);
  const lensIdentity = identities.find((identity) => identity.provider === "lens");

  return (
    <main className="grid">
      <section className="card stack">
        <h1>Account settings</h1>
        <p className="muted">This is the flow an existing username/password app would expose to let users attach a Lens identity.</p>
        {lensIdentity ? (
          <>
            <div className="notice">
              Bound to {lensIdentity.lensUsernameFull ?? lensIdentity.lensAccountAddress} via wallet {lensIdentity.walletAddress}
            </div>
            <ClearLensBindingsButton />
          </>
        ) : (
          <div className="notice">No Lens account bound yet.</div>
        )}
      </section>
      <section className="card stack">
        <h2>Bind Lens account</h2>
        <LensAuthPanel mode="link" />
      </section>
    </main>
  );
}
