import type { IdentityRecord, SessionRecord, UserRecord } from "@/lib/db/types";
import { sqlite } from "@/lib/db/sqlite";
import { createId, nowIso } from "@/lib/utils";
function mapUser(row: {
  id: string;
  username: string | null;
  password_hash: string | null;
  created_at: string;
  updated_at: string;
}): UserRecord {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapIdentity(row: {
  id: string;
  user_id: string;
  provider: "lens";
  provider_subject: string;
  wallet_address: string;
  lens_account_address: string;
  lens_username_full: string | null;
  lens_username_local_name: string | null;
  lens_username_namespace: string | null;
  lens_display_name: string | null;
  lens_picture_url: string | null;
  created_at: string;
  updated_at: string;
}): IdentityRecord {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    providerSubject: row.provider_subject,
    walletAddress: row.wallet_address,
    lensAccountAddress: row.lens_account_address,
    lensUsernameFull: row.lens_username_full,
    lensUsernameLocalName: row.lens_username_local_name,
    lensUsernameNamespace: row.lens_username_namespace,
    lensDisplayName: row.lens_display_name,
    lensPictureUrl: row.lens_picture_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSession(row: {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
}): SessionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export async function listUsers() {
  const rows = sqlite.prepare("SELECT * FROM users ORDER BY created_at ASC").all() as Array<Parameters<typeof mapUser>[0]>;
  return rows.map(mapUser);
}

export async function getUserById(userId: string) {
  const row = sqlite.prepare("SELECT * FROM users WHERE id = ?").get(userId) as Parameters<typeof mapUser>[0] | undefined;
  return row ? mapUser(row) : null;
}

export async function getUserByUsername(username: string) {
  const row = sqlite.prepare("SELECT * FROM users WHERE lower(username) = lower(?)").get(username) as Parameters<typeof mapUser>[0] | undefined;
  return row ? mapUser(row) : null;
}

export async function createUser(input: Pick<UserRecord, "username" | "passwordHash">) {
  const timestamp = nowIso();
  const user: UserRecord = {
    id: createId("usr"),
    username: input.username,
    passwordHash: input.passwordHash,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  sqlite
    .prepare("INSERT INTO users (id, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
    .run(user.id, user.username, user.passwordHash, user.createdAt, user.updatedAt);

  return user;
}

export async function completeUserAccount(userId: string, input: Pick<UserRecord, "username" | "passwordHash">) {
  const timestamp = nowIso();
  const result = sqlite
    .prepare("UPDATE users SET username = ?, password_hash = ?, updated_at = ? WHERE id = ? AND username IS NULL AND password_hash IS NULL")
    .run(input.username, input.passwordHash, timestamp, userId);

  if (result.changes === 0) {
    return null;
  }

  return getUserById(userId);
}

export async function getIdentitiesForUser(userId: string) {
  const rows = sqlite
    .prepare("SELECT * FROM identities WHERE user_id = ? ORDER BY created_at ASC")
    .all(userId) as Array<Parameters<typeof mapIdentity>[0]>;
  return rows.map(mapIdentity);
}

export async function getIdentityByProviderSubject(providerSubject: string) {
  const row = sqlite
    .prepare("SELECT * FROM identities WHERE provider_subject = ?")
    .get(providerSubject) as Parameters<typeof mapIdentity>[0] | undefined;
  return row ? mapIdentity(row) : null;
}

export async function createLensIdentity(input: Omit<IdentityRecord, "id" | "createdAt" | "updatedAt">) {
  const timestamp = nowIso();
  const identity: IdentityRecord = {
    ...input,
    id: createId("idn"),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  sqlite
    .prepare(
      `INSERT INTO identities (
        id, user_id, provider, provider_subject, wallet_address, lens_account_address,
        lens_username_full, lens_username_local_name, lens_username_namespace,
        lens_display_name, lens_picture_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      identity.id,
      identity.userId,
      identity.provider,
      identity.providerSubject,
      identity.walletAddress,
      identity.lensAccountAddress,
      identity.lensUsernameFull,
      identity.lensUsernameLocalName,
      identity.lensUsernameNamespace,
      identity.lensDisplayName,
      identity.lensPictureUrl,
      identity.createdAt,
      identity.updatedAt,
    );

  return identity;
}

export async function deleteLensIdentitiesForUser(userId: string) {
  const result = sqlite.prepare("DELETE FROM identities WHERE user_id = ? AND provider = ?").run(userId, "lens");
  return result.changes;
}

export async function createSession(userId: string) {
  const session: SessionRecord = {
    id: createId("sess"),
    userId,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  };

  sqlite
    .prepare("INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .run(session.id, session.userId, session.createdAt, session.expiresAt);

  return session;
}

export async function getSessionById(sessionId: string) {
  const row = sqlite.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as Parameters<typeof mapSession>[0] | undefined;
  return row ? mapSession(row) : null;
}

export async function deleteSession(sessionId: string) {
  sqlite.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}
