export type UserRecord = {
  id: string;
  username: string | null;
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

export type SessionRecord = {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

export type DemoDatabase = {
  users: UserRecord[];
  identities: IdentityRecord[];
  sessions: SessionRecord[];
};
