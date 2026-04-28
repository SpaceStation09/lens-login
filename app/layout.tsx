import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import "./globals.css";
import { getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/logout-button";

export const metadata: Metadata = {
  title: "Lens Login Demo",
  description: "POC demo for Lens account login and binding.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const user = await getCurrentUser(cookieStore);

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="brand">
              <strong>Lens Login Demo</strong>
              <span className="muted">Username/password auth plus Lens account login and binding</span>
            </div>
            <div className="inline-actions">
              <Link className="button-secondary" href="/">
                Home
              </Link>
              {user ? (
                <>
                  <Link className="button-secondary" href="/dashboard">
                    Dashboard
                  </Link>
                  <Link className="button-secondary" href="/settings">
                    Settings
                  </Link>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link className="button-secondary" href="/login">
                    Login
                  </Link>
                  <Link className="button-secondary" href="/register">
                    Register
                  </Link>
                </>
              )}
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
