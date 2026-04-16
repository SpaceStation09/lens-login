export type UserRecord = {
  id: string;
  email: string | null;
  passwordHash: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IdentityRecord = {
  id: string;
  userId: string;
  provider: "lens";
  providerSubject: string;
  walletAddress: string;
  lensAccountAddress: string;
  lensUsernameFull: string | null;
  lensUsernameLocalName: string | null;
  lensUsernameNamespace: string | null;
  lensDisplayName: string | null;
  lensPictureUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChallengeRecord = {
  id: string;
  type: "login" | "link";
  nonce: string;
  walletAddress: string;
  lensAccountAddress: string;
  message: string;
  expiresAt: string;
  usedAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
};

export type SessionRecord = {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

export type DemoDatabase = {
  users: UserRecord[];
  identities: IdentityRecord[];
  challenges: ChallengeRecord[];
  sessions: SessionRecord[];
};
