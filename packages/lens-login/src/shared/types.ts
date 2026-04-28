export type LensAuthIntent = "login" | "link";

export type LensDiscoveredAccount = {
  accountAddress: string;
  username: {
    fullHandle: string | null;
    localName: string | null;
    namespace: string | null;
  } | null;
  metadata: {
    displayName: string | null;
    picture: string | null;
  } | null;
};

export type LensVerifiedIdentity = {
  providerSubject: string;
  walletAddress: string;
  lensAccountAddress: string;
  username: LensDiscoveredAccount["username"];
  metadata: LensDiscoveredAccount["metadata"];
};

export type LensIdTokenClaims = {
  signerAddress: string;
  lensAccountAddress: string;
  authenticationId: string;
  role: "ACCOUNT_OWNER" | "ACCOUNT_MANAGER";
};

export type LensApiErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR"
  | "LENS_ACCOUNT_NOT_CONTROLLED"
  | "INVALID_ID_TOKEN"
  | "UNSUPPORTED_LENS_ROLE"
  | "IDENTITY_ALREADY_LINKED";

export type LensApiError = {
  ok: false;
  error: {
    code: LensApiErrorCode;
    message: string;
  };
};

export type LensAccountsRequest = {
  walletAddress: string;
};

export type LensAccountsResponse = {
  walletAddress: string;
  accounts: LensDiscoveredAccount[];
};

export type LensLoginClientOptions = {
  ethereum?: {
    request: (request: { method: string; params?: unknown[] }) => Promise<unknown>;
  };
};

export type LensLoginClient = {
  connectWallet: () => Promise<string>;
};

export type LensLoginServerOptions = {
  environment?: "mainnet" | "testnet";
  origin?: string;
  appAddress?: string;
};

export type LensLoginServer = {
  discoverAccounts: (input: LensAccountsRequest) => Promise<LensAccountsResponse>;
  verifyIdToken: (idToken: string) => Promise<LensIdTokenClaims>;
  resolveIdentity: (input: { signerAddress: string; lensAccountAddress: string }) => Promise<LensVerifiedIdentity>;
  toErrorResponse: (error: unknown) => { status: number; body: LensApiError };
};

export type LensSessionRequest = {
  type: LensAuthIntent;
  idToken: string;
};
