export type LensAuthIntent = "login" | "link";

export type LensAccountMetadataAttribute = {
  key: string;
  type: string;
  value: string;
};

export type LensAccountMetadata = {
  id: string;
  name: string | null;
  bio: string | null;
  picture: string | null;
  coverPicture: string | null;
  attributes: LensAccountMetadataAttribute[];
};

export type LensDiscoveredAccount = {
  accountAddress: string;
  username: {
    fullHandle: string | null;
    localName: string | null;
    namespace: string | null;
  } | null;
  metadata: LensAccountMetadata | null;
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
  environment?: "mainnet" | "testnet";
  origin?: string;
  appAddress?: string;
  storage?: Storage;
};

export type LensClientLoginRequest = {
  lensAccountAddress: string;
  walletAddress?: string;
};

export type LensClientLoginResult = {
  walletAddress: string;
  sessionClient: import("@lens-protocol/client").SessionClient;
  idToken: string;
};

export type LensLoginClient = {
  connectWallet: () => Promise<string>;
  listAvailableAccounts: (input?: { walletAddress?: string }) => Promise<LensAccountsResponse>;
  getAccount: (input: { lensAccountAddress: string }) => Promise<LensDiscoveredAccount | null>;
  login: (input: LensClientLoginRequest) => Promise<LensClientLoginResult>;
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
