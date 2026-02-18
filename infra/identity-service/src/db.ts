import Database from "better-sqlite3";

export const db = new Database("identity-service.sqlite");

db.exec(`
  PRAGMA journal_mode=WAL;

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    hedera_account_id TEXT NOT NULL,
    display_name TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    hedera_account_id TEXT NOT NULL,
    credential_type TEXT NOT NULL,
    metadata_json TEXT NOT NULL,
    hedera_token_id TEXT,
    hedera_serial INTEGER,
    tx_id TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS value_events (
    id TEXT PRIMARY KEY,
    actor TEXT NOT NULL,
    event_type TEXT NOT NULL,
    amount TEXT,
    currency TEXT,
    reference TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL
  );
`);
