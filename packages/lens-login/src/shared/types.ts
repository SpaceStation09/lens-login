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
  | "CHALLENGE_NOT_FOUND"
  | "CHALLENGE_ALREADY_USED"
  | "CHALLENGE_EXPIRED"
  | "INVALID_SIGNATURE"
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

export type LensChallengeRequest = {
  type: LensAuthIntent;
  walletAddress: string;
  lensAccountAddress: string;
};

export type LensChallengeResponse = {
  challengeId: string;
  type: LensAuthIntent;
  walletAddress: string;
  lensAccountAddress: string;
  message: string;
  expiresAt: string;
};

export type LensVerifyRequest = {
  challengeId: string;
  signature: `0x${string}`;
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

export type LensLoginServerStoredChallenge = {
  id: string;
  type: LensAuthIntent;
  walletAddress: string;
  lensAccountAddress: string;
  message: string;
  expiresAt: string;
  usedAt: string | null;
  createdByUserId: string | null;
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
  signMessage: (message: string) => Promise<`0x${string}`>;
  discoverAccounts: (input: LensAccountsRequest) => Promise<LensAccountsResponse>;
  createChallenge: (input: LensChallengeRequest) => Promise<LensChallengeResponse>;
  verify: (input: LensVerifyRequest) => Promise<LensVerifyResponse<User>>;
  authenticate: (input: {
    type: LensChallengeRequest["type"];
    walletAddress: string;
    lensAccountAddress: string;
  }) => Promise<LensVerifyResponse<User>>;
};

export type LensLoginServerStorage = {
  createChallenge: (input: {
    type: LensChallengeRequest["type"];
    nonce: string;
    walletAddress: string;
    lensAccountAddress: string;
    message: string;
    expiresAt: string;
    createdByUserId: string | null;
  }) => Promise<LensLoginServerStoredChallenge>;
  getChallengeById: (challengeId: string) => Promise<LensLoginServerStoredChallenge | null>;
  markChallengeUsed: (challengeId: string) => Promise<unknown>;
  getIdentityByProviderSubject: (providerSubject: string) => Promise<LensLoginServerStoredIdentity | null>;
  createLensIdentity: (input: LensLoginServerCreateIdentityInput) => Promise<unknown>;
};

export type LensLoginServerOptions<User extends { id: string }> = {
  environment?: "mainnet" | "testnet";
  origin?: string;
  storage: LensLoginServerStorage;
  setSession: (user: User) => Promise<void>;
  findUserById: (userId: string) => Promise<User | null>;
  createUser: () => Promise<User>;
};

export type LensLoginServer<User extends { id: string }> = {
  discoverAccounts: (input: LensAccountsRequest) => Promise<LensAccountsResponse>;
  createChallenge: (input: LensChallengeRequest & { currentUserId: string | null }) => Promise<LensChallengeResponse>;
  verifyChallenge: (input: LensVerifyRequest) => Promise<LensVerifyResponse<User>>;
  toErrorResponse: (error: unknown) => { status: number; body: LensApiError };
};
