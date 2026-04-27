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

export type LensSessionRequest = {
  type: LensAuthIntent;
  idToken: string;
};

export type LensVerifyResponse<User> = {
  ok: true;
  action: LensAuthIntent;
  user: User;
  identity: LensVerifiedIdentity;
  isNewUser: boolean;
};

export type LensLoginServerStoredIdentity = {
  userId: string;
  providerSubject: string;
};

export type LensLoginServerCreateIdentityInput = {
  userId: string;
  providerSubject: string;
  walletAddress: string;
  lensAccountAddress: string;
  lensUsernameFull: string | null;
  lensUsernameLocalName: string | null;
  lensUsernameNamespace: string | null;
  lensDisplayName: string | null;
  lensPictureUrl: string | null;
};

export type LensLoginClientOptions = {
  apiBasePath?: string;
  ethereum?: {
    request: (request: { method: string; params?: unknown[] }) => Promise<unknown>;
  };
  fetch?: typeof fetch;
};

export type LensLoginClient<User> = {
  connectWallet: () => Promise<string>;
  discoverAccounts: (input: LensAccountsRequest) => Promise<LensAccountsResponse>;
  verifySession: (input: LensSessionRequest) => Promise<LensVerifyResponse<User>>;
};

export type LensLoginServerStorage = {
  getIdentityByProviderSubject: (providerSubject: string) => Promise<LensLoginServerStoredIdentity | null>;
  createLensIdentity: (input: LensLoginServerCreateIdentityInput) => Promise<unknown>;
};

export type LensLoginServerOptions<User extends { id: string }> = {
  environment?: "mainnet" | "testnet";
  origin?: string;
  appAddress?: string;
  storage: LensLoginServerStorage;
  setSession: (user: User) => Promise<void>;
  findUserById: (userId: string) => Promise<User | null>;
  createUser: () => Promise<User>;
};

export type LensLoginServer<User extends { id: string }> = {
  discoverAccounts: (input: LensAccountsRequest) => Promise<LensAccountsResponse>;
  verifySession: (input: LensSessionRequest & { currentUserId: string | null }) => Promise<LensVerifyResponse<User>>;
  toErrorResponse: (error: unknown) => { status: number; body: LensApiError };
};
