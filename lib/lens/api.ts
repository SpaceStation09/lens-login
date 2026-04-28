import type {
  LensAccountsRequest,
  LensAccountsResponse,
  LensApiError,
  LensAuthIntent,
  LensSessionRequest,
  LensVerifiedIdentity,
} from "@demo/lens-login/shared";

import type { PublicUser } from "@/lib/auth/public-user";

type LensVerifyAppResponse = {
  ok: true;
  action: LensAuthIntent;
  user: PublicUser;
  identity: LensVerifiedIdentity;
  isNewUser: boolean;
};

const API_BASE = "/api/auth/lens";

async function postJson<TResponse>(path: string, body: unknown, fallbackMessage: string): Promise<TResponse> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as TResponse | LensApiError;

  if (!response.ok) {
    const err = data as LensApiError;
    throw new Error(err.error?.message || fallbackMessage);
  }

  return data as TResponse;
}

export function discoverLensAccounts(input: LensAccountsRequest) {
  return postJson<LensAccountsResponse>("/accounts", input, "Failed to load Lens accounts.");
}

export function verifyLensSession(input: LensSessionRequest) {
  return postJson<LensVerifyAppResponse>("/session", input, "Lens session verification failed.");
}
