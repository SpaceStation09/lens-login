import type {
  LensAccountsRequest,
  LensAccountsResponse,
  LensApiError,
  LensLoginClient,
  LensLoginClientOptions,
  LensSessionRequest,
  LensVerifyResponse,
} from "../shared/types";

declare global {
  interface Window {
    ethereum?: LensLoginClientOptions["ethereum"];
  }
}

export class LensLoginClientError extends Error {
  code: string;
  status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function getErrorMessage(value: unknown, fallback: string) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "object" &&
    value.error !== null &&
    "message" in value.error &&
    typeof value.error.message === "string"
  ) {
    return value.error.message;
  }

  return fallback;
}

function getErrorCode(value: unknown, fallback: string) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "object" &&
    value.error !== null &&
    "code" in value.error &&
    typeof value.error.code === "string"
  ) {
    return value.error.code;
  }

  return fallback;
}

export function createLensLoginClient<User = unknown>(options: LensLoginClientOptions = {}): LensLoginClient<User> {
  const apiBasePath = options.apiBasePath ?? "/api/auth/lens";
  const fetchImpl = options.fetch ?? fetch;

  function getInjectedProvider() {
    const provider = options.ethereum ?? (typeof window !== "undefined" ? window.ethereum : undefined);

    if (!provider) {
      throw new LensLoginClientError("NO_WALLET", "No injected wallet found. Install MetaMask or another EVM wallet.");
    }

    return provider;
  }

  async function connectWallet() {
    const provider = getInjectedProvider();
    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
    const wallet = accounts[0];

    if (!wallet) {
      throw new LensLoginClientError("NO_WALLET_ACCOUNT", "No wallet account was returned.");
    }

    return wallet.toLowerCase();
  }

  async function postJson<TResponse>(path: string, body: unknown, fallbackMessage: string): Promise<TResponse> {
    const response = await fetchImpl(`${apiBasePath}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as TResponse | LensApiError;

    if (!response.ok) {
      throw new LensLoginClientError(getErrorCode(data, "REQUEST_FAILED"), getErrorMessage(data, fallbackMessage), response.status);
    }

    return data as TResponse;
  }

  async function discoverAccounts(input: LensAccountsRequest) {
    return postJson<LensAccountsResponse>("/accounts", input, "Failed to load Lens accounts.");
  }

  async function verifySession(input: LensSessionRequest) {
    return postJson<LensVerifyResponse<User>>("/session", input, "Lens session verification failed.");
  }

  return {
    connectWallet,
    discoverAccounts,
    verifySession,
  };
}
