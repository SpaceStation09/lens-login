import { mkdirSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "demo.sqlite");

mkdirSync(dataDir, { recursive: true });

declare global {
  var __lensDemoSqlite: Database.Database | undefined;
}

const sqlite = globalThis.__lensDemoSqlite ?? new Database(dbPath, { timeout: 5000 });

if (!globalThis.__lensDemoSqlite) {
  globalThis.__lensDemoSqlite = sqlite;
}

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 5000");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password_hash TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS identities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_subject TEXT NOT NULL UNIQUE,
    wallet_address TEXT NOT NULL,
    lens_account_address TEXT NOT NULL,
    lens_username_full TEXT,
    lens_username_local_name TEXT,
    lens_username_namespace TEXT,
    lens_display_name TEXT,
    lens_picture_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS identities_user_id_idx ON identities(user_id);
  CREATE INDEX IF NOT EXISTS identities_wallet_address_idx ON identities(wallet_address);

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
`);

const userColumns = sqlite.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
if (!userColumns.some((column) => column.name === "username")) {
  sqlite.exec("ALTER TABLE users ADD COLUMN username TEXT");
  sqlite.exec("UPDATE users SET username = lower(email) WHERE username IS NULL AND email IS NOT NULL");
  sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users(username)");
}

export { sqlite };
