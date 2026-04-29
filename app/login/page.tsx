import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { AccountAuthForm } from "@/components/account-auth-form";
import { LensAuthPanel } from "@/components/lens-auth-panel";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LoginPage() {
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
        <h1>Login</h1>
        <p className="muted">Use your existing username/password account or sign in with a Lens account controlled by your wallet.</p>
        <AccountAuthForm mode="login" />
        <p className="muted">
          Need an account? <Link href="/register">Register first</Link>
        </p>
      </section>
      <section className="card stack">
        <h2>Login with Lens</h2>
        <p className="muted">Strict mode: only wallets that already control a Lens account can continue.</p>
        <LensAuthPanel mode="login" />
      </section>
    </main>
  );
}
