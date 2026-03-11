"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
exports.db = new better_sqlite3_1.default("identity-service.sqlite");
exports.db.exec(`
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




  CREATE TABLE IF NOT EXISTS recruiter_applications (
    id              TEXT PRIMARY KEY,
    full_name       TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    phone           TEXT,
    linkedin_url    TEXT,
    steam_fields    TEXT,        -- comma-separated STEAM areas
    experience      TEXT,        -- years recruiting experience
    industries      TEXT,        -- industries they recruit in
    why_join        TEXT,        -- why they want to join GeniusSeeker
    referral_source TEXT,
    status          TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
    admin_notes     TEXT,
    created_at      TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS offers (
    id               TEXT PRIMARY KEY,
    employer_id      TEXT NOT NULL,       -- employer_profiles.id
    employer_email   TEXT NOT NULL,
    employer_company TEXT NOT NULL,
    candidate_hedera TEXT NOT NULL,       -- profiles.hedera_account_id
    candidate_name   TEXT,
    role_title       TEXT NOT NULL,
    contract_type    TEXT NOT NULL,       -- 'milestone' | 'hourly' | 'fixed'
    rate             TEXT NOT NULL,       -- e.g. "5000" or "75/hr"
    currency         TEXT DEFAULT 'USD',
    start_date       TEXT,
    scope            TEXT,
    milestones_json  TEXT,               -- JSON array [{title, amount, due_date}]
    status           TEXT NOT NULL DEFAULT 'pending',
    -- pending | accepted | declined | countered | agreed | contracted | completed
    counter_note     TEXT,               -- candidate's counter-offer note
    placement_fee    TEXT,               -- GeniusSeeker fee amount
    deel_contract_id TEXT,               -- set once Deel contract is created
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id               TEXT PRIMARY KEY,
    offer_id         TEXT NOT NULL,
    deel_contract_id TEXT NOT NULL UNIQUE,
    deel_status      TEXT,               -- active | terminated | etc
    signed_at        TEXT,
    terminated_at    TEXT,
    total_value      TEXT,
    currency         TEXT DEFAULT 'USD',
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS deel_sync_log (
    id          TEXT PRIMARY KEY,
    event_type  TEXT NOT NULL,    -- webhook event or API call type
    entity_id   TEXT,             -- offer_id or contract_id
    payload_json TEXT,
    status      TEXT,             -- ok | error
    created_at  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS employer_profiles (
    id              TEXT PRIMARY KEY,
    company_name    TEXT NOT NULL,
    website         TEXT,
    contact_name    TEXT NOT NULL,
    contact_email   TEXT NOT NULL UNIQUE,
    contact_title   TEXT,
    company_size    TEXT,
    industry        TEXT,
    ein             TEXT,
    tier            TEXT NOT NULL DEFAULT 'pending',
    status          TEXT NOT NULL DEFAULT 'pending',
    admin_notes     TEXT,
    reviewed_by     TEXT,
    reviewed_at     TEXT,
    created_at      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS employer_attestations (
    id                TEXT PRIMARY KEY,
    employer_id       TEXT NOT NULL,
    posts_salary      INTEGER DEFAULT 0,
    has_dei_policy    INTEGER DEFAULT 0,
    diverse_panels    INTEGER DEFAULT 0,
    structured_feedback INTEGER DEFAULT 0,
    flexible_work     INTEGER DEFAULT 0,
    tracks_equity     INTEGER DEFAULT 0,
    pipeline_programs INTEGER DEFAULT 0,
    pay_equity_audit  INTEGER DEFAULT 0,
    dei_policy_url    TEXT,
    equity_report_url TEXT,
    additional_notes  TEXT,
    created_at        TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS employer_reviews (
    id              TEXT PRIMARY KEY,
    employer_id     TEXT NOT NULL,
    application_id  TEXT NOT NULL,
    reviewer_hedera TEXT NOT NULL,
    stage           TEXT NOT NULL DEFAULT 'application',
    accurate_description INTEGER,
    clear_communication  INTEGER,
    respectful_process   INTEGER,
    salary_matched       INTEGER,
    would_apply_again    INTEGER,
    comments        TEXT,
    created_at      TEXT NOT NULL
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
const profileColumns = [
    ["bio", "TEXT"],
    ["skills", "TEXT"], // JSON array stored as string
    ["avatar_url", "TEXT"],
    ["portfolio_url", "TEXT"],
    ["linkedin_url", "TEXT"],
    ["github_url", "TEXT"],
    ["open_to_work", "TEXT DEFAULT 'open'"], // 'looking' | 'open' | 'not_looking'
    ["resume_text", "TEXT"], // pasted resume / LinkedIn text
    ["resume_pdf_url", "TEXT"], // URL to uploaded resume PDF
];
for (const [col, type] of profileColumns) {
    try {
        exports.db.exec(`ALTER TABLE profiles ADD COLUMN ${col} ${type}`);
    }
    catch (_) {
        // Column already exists — safe to ignore
    }
}
//# sourceMappingURL=db.js.map