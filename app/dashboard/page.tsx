import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getCurrentUser } from "@/lib/auth/session";
import { getIdentitiesForUser } from "@/lib/db/store";

export default async function DashboardPage() {
  const user = await getCurrentUser(await cookies());

  if (!user) {
    redirect("/login");
  }

  const identities = await getIdentitiesForUser(user.id);
  const lensIdentity = identities.find((identity) => identity.provider === "lens");

  return (
    <main className="grid">
      <section className="card stack">
        <span className="pill">Current user</span>
        <h1>Dashboard</h1>
        <div className="kv">
          <div className="muted">User ID</div>
          <div>{user.id}</div>
          <div className="muted">Email</div>
          <div>{user.email ?? "No email on this user"}</div>
          <div className="muted">Created</div>
          <div>{new Date(user.createdAt).toLocaleString()}</div>
        </div>
      </section>
      <section className="card stack">
        <span className="pill">Identity mapping</span>
        <h2>Lens binding status</h2>
        {lensIdentity ? (
          <div className="kv">
            <div className="muted">Provider subject</div>
            <div>{lensIdentity.providerSubject}</div>
            <div className="muted">Lens account</div>
            <div>{lensIdentity.lensAccountAddress}</div>
            <div className="muted">Username</div>
            <div>{lensIdentity.lensUsernameFull ?? "Unknown"}</div>
            <div className="muted">Wallet</div>
            <div>{lensIdentity.walletAddress}</div>
          </div>
        ) : (
          <p className="muted">This account is not bound to a Lens identity yet. Use the settings page to attach one.</p>
        )}
      </section>
    </main>
  );
}
