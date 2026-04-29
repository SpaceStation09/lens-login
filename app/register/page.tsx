import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { AccountAuthForm } from "@/components/account-auth-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function RegisterPage() {
  const user = await getCurrentUser(await cookies());

  if (user) {
    if (!user.username || !user.passwordHash) {
      redirect("/complete-account");
    }

    redirect("/dashboard");
  }

  return (
    <main className="grid">
      <section className="card stack">
        <h1>Create an account</h1>
        <p className="muted">The demo keeps the classic auth path so Lens can be an additive login option.</p>
        <AccountAuthForm mode="register" />
        <p className="muted">
          Already have an account? <Link href="/login">Go to login</Link>
        </p>
      </section>
      <section className="card stack">
        <h2>What happens next</h2>
        <div className="list">
          <div className="list-item">Register with username/password</div>
          <div className="list-item">Open settings after login</div>
          <div className="list-item">Bind a Lens account from the same app session</div>
        </div>
      </section>
    </main>
  );
}
