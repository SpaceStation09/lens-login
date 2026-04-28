"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CompleteAccountForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/account/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = (await response.json()) as { error?: { message?: string } };

    if (!response.ok) {
      setError(data.error?.message ?? "Request failed.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <label>
        Username
        <input
          autoComplete="username"
          minLength={3}
          onChange={(event) => setUsername(event.target.value)}
          pattern="[A-Za-z0-9_-]+"
          required
          type="text"
          value={username}
        />
      </label>
      <label>
        Password
        <input
          autoComplete="new-password"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      {error ? <div className="error">{error}</div> : null}
      <button className="button" disabled={loading} type="submit">
        {loading ? "Saving..." : "Save username and password"}
      </button>
    </form>
  );
}
