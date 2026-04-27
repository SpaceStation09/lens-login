import Link from "next/link";
import { cookies } from "next/headers";

import { getCurrentUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getCurrentUser(await cookies());

  return (
    <main className="hero">
      <section className="card stack">
        <span className="pill">POC architecture</span>
        <h1>Lens login for apps that already use classic accounts</h1>
        <p className="muted">
          This demo proves the core flow: email users can bind a Lens account, and Lens-first users can create a local account automatically.
        </p>
        <div className="actions">
          <Link className="button" href={user ? "/dashboard" : "/login"}>
            {user ? "Open dashboard" : "Try the demo"}
          </Link>
          <Link className="button-secondary" href="/settings">
            View binding flow
          </Link>
        </div>
      </section>
      <section className="card stack">
        <h2>What this demo covers</h2>
        <div className="list">
          <div className="list-item">Email registration and password login</div>
          <div className="list-item">Wallet discovery plus Lens account selection</div>
          <div className="list-item">Lens native login, ID token verification, and local session creation</div>
          <div className="list-item">Binding a Lens identity to an existing local user</div>
        </div>
      </section>
    </main>
  );
}
