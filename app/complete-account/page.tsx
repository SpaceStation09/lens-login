import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CompleteAccountForm } from "@/components/complete-account-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function CompleteAccountPage() {
  const user = await getCurrentUser(await cookies());

  if (!user) {
    redirect("/login");
  }

  if (user.username && user.passwordHash) {
    redirect("/dashboard");
  }

  return (
    <main className="grid">
      <section className="card stack">
        <span className="pill">Account setup required</span>
        <h1>Complete your local account</h1>
        <p className="muted">
          You logged in with Lens first. Add a username and password so this same local account can be accessed by either Lens login or username/password login.
        </p>
      </section>
      <section className="card stack">
        <CompleteAccountForm />
      </section>
    </main>
  );
}
