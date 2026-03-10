import Database from "better-sqlite3";

export const db = new Database("identity-service.sqlite");

db.exec(`
  PRAGMA journal_mode=WAL;

  CREATE TABLE IF NOT EXISTS profiles (
    id                TEXT PRIMARY KEY,
    hedera_account_id TEXT NOT NULL,
    display_name      TEXT,
    created_at        TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS credentials (
    id                TEXT PRIMARY KEY,
    hedera_account_id TEXT NOT NULL,
    credential_type   TEXT NOT NULL,
    metadata_json     TEXT NOT NULL,
    hedera_token_id   TEXT,
    hedera_serial     INTEGER,
    tx_id             TEXT,
    created_at        TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS value_events (
    id           TEXT PRIMARY KEY,
    actor        TEXT NOT NULL,
    event_type   TEXT NOT NULL,
    amount       TEXT,
    currency     TEXT,
    reference    TEXT,
    metadata_json TEXT,
    created_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS applications (
    id         TEXT PRIMARY KEY,
    job_title  TEXT NOT NULL,
    company    TEXT,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    phone      TEXT,
    portfolio  TEXT,
    hedera_id  TEXT,
    cover_note TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS job_submissions (
    id          TEXT PRIMARY KEY,
    company     TEXT NOT NULL,
    website     TEXT,
    title       TEXT NOT NULL,
    steam       TEXT,
    type        TEXT,
    remote      TEXT,
    location    TEXT,
    pay         TEXT,
    deadline    TEXT,
    description TEXT,
    email       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS employer_sessions (
    id         TEXT PRIMARY KEY,
    email      TEXT NOT NULL,
    token      TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
`);

// ── Profile column migrations (safe to run repeatedly) ──
// SQLite doesn't support IF NOT EXISTS on ALTER TABLE,
// so we wrap each in a try/catch at runtime.
const profileColumns: [string, string][] = [
  ["bio",            "TEXT"],
  ["skills",         "TEXT"],   // JSON array stored as string
  ["avatar_url",     "TEXT"],
  ["portfolio_url",  "TEXT"],
  ["linkedin_url",   "TEXT"],
  ["github_url",     "TEXT"],
  ["open_to_work",   "TEXT DEFAULT 'open'"],  // 'looking' | 'open' | 'not_looking'
  ["resume_text",    "TEXT"],   // pasted resume / LinkedIn text
  ["resume_pdf_url", "TEXT"],   // URL to uploaded resume PDF
];

for (const [col, type] of profileColumns) {
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN ${col} ${type}`);
  } catch (_) {
    // Column already exists — safe to ignore
  }
}