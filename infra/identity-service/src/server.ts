import "dotenv/config";
import express from "express";
import cors from "cors";
import { v4 as uuid } from "uuid";
import { db } from "./db";
import { IssueBadgeSchema, VerifyCredentialSchema } from "./validators";
import { mintNftToTreasury } from "./hedera";

const app = express();

// CORS — dev friendly. Lock down via CORS_ORIGIN in prod.
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "1mb" }));

const nowISO = () => new Date().toISOString();

app.get("/", (_req, res) => {
  res.type("text").send("GeniusSeeker identity-service is running. Try /health or /api/profile/:accountId");
});

app.get("/health", (_req, res) => res.json({ ok: true }));

/* =====================================================
   PROFILE UPSERT
===================================================== */
app.post("/api/profile/upsert", (req, res) => {
  const { hederaAccountId, displayName } = req.body || {};
  if (!hederaAccountId) return res.status(400).json({ error: "hederaAccountId required" });

  const id = `profile_${hederaAccountId}`;
  const existing = db.prepare("SELECT * FROM profiles WHERE id=?").get(id);
  const name = displayName?.trim() || null;

  if (existing) {
    db.prepare("UPDATE profiles SET display_name=? WHERE id=?").run(name ?? existing.display_name, id);
  } else {
    db.prepare("INSERT INTO profiles (id, hedera_account_id, display_name, created_at) VALUES (?,?,?,?)").run(
      id,
      hederaAccountId,
      name,
      nowISO()
    );
  }

  const profile = db.prepare("SELECT * FROM profiles WHERE id=?").get(id);
  res.json({ profile });
});

app.get("/api/profile/:accountId", (req, res) => {
  const id = `profile_${req.params.accountId}`;
  const profile = db.prepare("SELECT * FROM profiles WHERE id=?").get(id);
  const creds = db
    .prepare("SELECT * FROM credentials WHERE hedera_account_id=? ORDER BY created_at DESC")
    .all(req.params.accountId);

  res.json({ profile: profile || null, credentials: creds });
});

/* =====================================================
   VERIFY GENERIC CREDENTIAL
===================================================== */
app.post("/api/credentials/verify", async (req, res) => {
  const parsed = VerifyCredentialSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { hederaAccountId, credentialType, metadata } = parsed.data;
  const createdAt = nowISO();
  const id = `cred_${uuid()}`;

  let hederaTokenId: string | undefined;
  let hederaSerial: number | undefined;
  let txId: string | undefined;

  const tokenId = process.env.HEDERA_CREDENTIAL_TOKEN_ID;

  if (tokenId) {
    try {
      const payload = { credentialType, hederaAccountId, metadata, issuedAt: createdAt, issuer: "GeniusSeeker" };
      const bytes = new TextEncoder().encode(JSON.stringify(payload));
      const minted = await mintNftToTreasury({ tokenId, metadataBytes: bytes });
      hederaTokenId = tokenId;
      hederaSerial = minted.serial;
      txId = minted.txId;
    } catch (e) {
      console.error("Credential mint failed:", e);
    }
  }

  db.prepare(
    `
    INSERT INTO credentials
    (id, hedera_account_id, credential_type, metadata_json, hedera_token_id, hedera_serial, tx_id, created_at)
    VALUES (?,?,?,?,?,?,?,?)
  `
  ).run(
    id,
    hederaAccountId,
    credentialType,
    JSON.stringify(metadata),
    hederaTokenId ?? null,
    hederaSerial ?? null,
    txId ?? null,
    createdAt
  );

  res.json({ ok: true, id, hederaTokenId, hederaSerial, txId });
});

/* =====================================================
   ISSUE STEAM BADGE (DEDUPED)
===================================================== */
app.post("/api/badges/issue", async (req, res) => {
  const parsed = IssueBadgeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { hederaAccountId, displayName, badge } = parsed.data;
  const createdAt = nowISO();

  const quizVersion =
    (req.body?.quizVersion && String(req.body.quizVersion)) ||
    (req.body?.badge?.quizVersion && String(req.body.badge.quizVersion)) ||
    "STEAM_V1";

  // upsert profile
  const profileId = `profile_${hederaAccountId}`;
  const existingProfile = db.prepare("SELECT * FROM profiles WHERE id=?").get(profileId);

  if (!existingProfile) {
    db.prepare("INSERT INTO profiles (id, hedera_account_id, display_name, created_at) VALUES (?,?,?,?)").run(
      profileId,
      hederaAccountId,
      displayName?.trim() || null,
      createdAt
    );
  }

  // dedupe (v1): text search in metadata_json for quizVersion
  const versionNeedle = `"quizVersion":"${quizVersion}"`;
  const existingCred = db
    .prepare(
      `
      SELECT *
      FROM credentials
      WHERE hedera_account_id = ?
        AND credential_type = 'STEAM_BADGE'
        AND metadata_json LIKE ?
      ORDER BY created_at DESC
      LIMIT 1
    `
    )
    .get(hederaAccountId, `%${versionNeedle}%`);

  if (existingCred) {
    return res.json({
      ok: true,
      deduped: true,
      id: existingCred.id,
      hederaTokenId: existingCred.hedera_token_id ?? null,
      hederaSerial: existingCred.hedera_serial ?? null,
      txId: existingCred.tx_id ?? null,
      payload: JSON.parse(existingCred.metadata_json),
    });
  }

  const id = `cred_${uuid()}`;

  let hederaTokenId: string | undefined;
  let hederaSerial: number | undefined;
  let txId: string | undefined;

  const payload = {
    type: "STEAM_BADGE",
    quizVersion,
    hederaAccountId,
    badge,
    issuedAt: createdAt,
    issuer: "GeniusSeeker",
  };

  const tokenId = process.env.HEDERA_BADGE_TOKEN_ID;

  if (tokenId) {
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(payload));
      const minted = await mintNftToTreasury({ tokenId, metadataBytes: bytes });
      hederaTokenId = tokenId;
      hederaSerial = minted.serial;
      txId = minted.txId;
    } catch (e) {
      console.error("Badge mint failed:", e);
    }
  }

  db.prepare(
    `
    INSERT INTO credentials
    (id, hedera_account_id, credential_type, metadata_json, hedera_token_id, hedera_serial, tx_id, created_at)
    VALUES (?,?,?,?,?,?,?,?)
  `
  ).run(
    id,
    hederaAccountId,
    "STEAM_BADGE",
    JSON.stringify(payload),
    hederaTokenId ?? null,
    hederaSerial ?? null,
    txId ?? null,
    createdAt
  );

  res.json({ ok: true, deduped: false, id, hederaTokenId, hederaSerial, txId, payload });
});

/* =====================================================
   VALUE EVENT LOG
===================================================== */
app.post("/api/value/log", (req, res) => {
  try {
    const ts = nowISO();
    const { actor, eventType, currency, amount, reference, metadata } = req.body || {};

    if (!actor || !eventType || !currency || amount === undefined || amount === null || String(amount).trim() === "") {
      return res.status(400).json({ error: "Invalid value log payload" });
    }

    try {
      db.prepare(
        `
        INSERT INTO value_events
        (id, actor, event_type, amount, currency, reference, metadata_json, created_at)
        VALUES (?,?,?,?,?,?,?,?)
      `
      ).run(
        `ve_${uuid()}`,
        String(actor),
        String(eventType),
        String(amount),
        String(currency),
        reference ?? null,
        metadata ? JSON.stringify(metadata) : null,
        ts
      );
    } catch (e) {
      console.error("DB write failed (continuing):", e);
    }

    res.json({ ok: true, event: { actor, eventType, amount, currency, reference, metadata, ts } });
  } catch (e) {
    res.status(500).json({ error: "Internal error" });
  }
});

/* =====================================================
   QUERY VALUE EVENTS
===================================================== */
app.get("/api/value/events", (_req, res) => {
  try {
    const events = db.prepare("SELECT * FROM value_events ORDER BY created_at DESC LIMIT 200").all();
    res.json({ events });
  } catch (e) {
    console.error("DB read failed:", e);
    res.json({ events: [], warning: "table_missing" });
  }
});

/* =====================================================
   EMAIL QUIZ RESULTS (Formspree relay)
   Sends results to your Formspree form: https://formspree.io/f/xdalgvva
===================================================== */
app.post("/api/results/email", async (req, res) => {
  try {
    const { email, hederaAccountId, displayName, results } = req.body || {};

    if (!email || !hederaAccountId || !results) {
      return res.status(400).json({ error: "Missing required fields: email, hederaAccountId, results" });
    }

    const formspreeEndpoint = process.env.FORMSPREE_ENDPOINT || "https://formspree.io/f/xdalgvva";

    const payload = {
      email,
      hederaAccountId,
      displayName: displayName || "—",
      results: typeof results === "string" ? results : JSON.stringify(results, null, 2),
      timestamp: nowISO(),
      source: "GeniusSeeker Quiz",
    };

    const resp = await fetch(formspreeEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("Formspree error:", resp.status, text);
      return res.status(502).json({ error: "Email relay failed", status: resp.status });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("Email endpoint error:", e);
    return res.status(500).json({ error: "Internal error" });
  }
});

/* =====================================================
   JOB APPLICATION (SQLite + Formspree relay)
   Stores in DB first, then relays to Formspree:
   https://formspree.io/f/xpqyqyjn
===================================================== */
app.post("/api/apply", async (req, res) => {
  try {
    const { job_title, company, name, email, phone, portfolio, hedera_id, cover_note } = req.body || {};

    if (!name || !email || !job_title) {
      return res.status(400).json({ error: "Missing required fields: name, email, job_title" });
    }

    const createdAt = nowISO();
    const id = `app_${uuid()}`;

    // ── 1. Save to SQLite ──
    try {
      db.prepare(`
        INSERT INTO applications
        (id, job_title, company, name, email, phone, portfolio, hedera_id, cover_note, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)
      `).run(
        id,
        job_title,
        company    || null,
        name,
        email,
        phone      || null,
        portfolio  || null,
        hedera_id  || null,
        cover_note || null,
        createdAt
      );
    } catch (e) {
      console.error("DB write failed (continuing):", e);
    }

    // ── 2. Relay to Formspree ──
    const formspreeEndpoint = process.env.FORMSPREE_APPLY_ENDPOINT || "https://formspree.io/f/xpqyqyjn";

    const payload = {
      email,
      name,
      job_title,
      company:    company    || "—",
      phone:      phone      || "—",
      portfolio:  portfolio  || "—",
      hedera_id:  hedera_id  || "—",
      cover_note: cover_note || "—",
      timestamp:  createdAt,
      source:     "GeniusSeeker Jobs Page",
    };

    const resp = await fetch(formspreeEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("Formspree error:", resp.status, text);
      // Still return ok — application is saved to DB so no data is lost
      return res.json({ ok: true, id, warning: "email_relay_failed" });
    }

    return res.json({ ok: true, id });
  } catch (e) {
    console.error("Apply endpoint error:", e);
    return res.status(500).json({ error: "Internal error" });
  }
});

/* =====================================================
   VIEW ALL APPLICATIONS (admin)
   TODO: add auth before going to production
===================================================== */
app.get("/api/applications", (_req, res) => {
  try {
    const applications = db.prepare(
      "SELECT * FROM applications ORDER BY created_at DESC LIMIT 200"
    ).all();
    res.json({ applications });
  } catch (e) {
    console.error("DB read failed:", e);
    res.json({ applications: [], warning: "table_missing" });
  }
});

/* =====================================================
   SUBMIT A JOB (SQLite + Formspree relay)
   Stores in DB first, then relays to Formspree:
   https://formspree.io/f/xpqyqyjn
===================================================== */
app.post("/api/submit-job", async (req, res) => {
  try {
    const { company, website, title, steam, type, remote, location, pay, deadline, desc, email } = req.body || {};

    if (!company || !title || !email) {
      return res.status(400).json({ error: "Missing required fields: company, title, email" });
    }

    const createdAt = nowISO();
    const id = `job_${uuid()}`;

    // ── 1. Save to SQLite ──
    try {
      db.prepare(`
        INSERT INTO job_submissions
        (id, company, website, title, steam, type, remote, location, pay, deadline, description, email, status, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        id,
        company,
        website    || null,
        title,
        steam      || null,
        type       || null,
        remote     || null,
        location   || null,
        pay        || null,
        deadline   || null,
        desc       || null,
        email,
        "pending",
        createdAt
      );
    } catch (e) {
      console.error("DB write failed (continuing):", e);
    }

    // ── 2. Relay to Formspree ──
    const formspreeEndpoint = process.env.FORMSPREE_APPLY_ENDPOINT || "https://formspree.io/f/xpqyqyjn";

    const payload = {
      email,
      company,
      website:   website   || "—",
      title,
      steam:     steam     || "—",
      type:      type      || "—",
      remote:    remote    || "—",
      location:  location  || "—",
      pay:       pay       || "—",
      deadline:  deadline  || "—",
      desc:      desc      || "—",
      timestamp: createdAt,
      source:    "GeniusSeeker Submit-a-Job",
    };

    const resp = await fetch(formspreeEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("Formspree error:", resp.status, text);
      // Still return ok — submission is saved to DB so no data is lost
      return res.json({ ok: true, id, warning: "email_relay_failed" });
    }

    return res.json({ ok: true, id });
  } catch (e) {
    console.error("Submit-job endpoint error:", e);
    return res.status(500).json({ error: "Internal error" });
  }
});

/* =====================================================
   VIEW ALL JOB SUBMISSIONS (admin)
   TODO: add auth before going to production
===================================================== */
app.get("/api/job-submissions", (_req, res) => {
  try {
    const jobs = db.prepare(
      "SELECT * FROM job_submissions ORDER BY created_at DESC LIMIT 200"
    ).all();
    res.json({ jobs });
  } catch (e) {
    console.error("DB read failed:", e);
    res.json({ jobs: [], warning: "table_missing" });
  }
});

/* =====================================================
   APPROVE / REJECT JOB SUBMISSION (admin)
===================================================== */
app.post("/api/job-submissions/:id/approve", (req, res) => {
  try {
    const { id } = req.params;
    const job = db.prepare("SELECT * FROM job_submissions WHERE id=?").get(id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    db.prepare("UPDATE job_submissions SET status=? WHERE id=?").run("approved", id);
    res.json({ ok: true, id, status: "approved" });
  } catch (e) {
    console.error("Approve error:", e);
    res.status(500).json({ error: "Internal error" });
  }
});

app.post("/api/job-submissions/:id/reject", (req, res) => {
  try {
    const { id } = req.params;
    const job = db.prepare("SELECT * FROM job_submissions WHERE id=?").get(id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    db.prepare("UPDATE job_submissions SET status=? WHERE id=?").run("rejected", id);
    res.json({ ok: true, id, status: "rejected" });
  } catch (e) {
    console.error("Reject error:", e);
    res.status(500).json({ error: "Internal error" });
  }
});

/* =====================================================
   PUBLIC JOBS FEED (approved only)
   Used by jobs.html to load live listings
===================================================== */
app.get("/api/jobs", (_req, res) => {
  try {
    const jobs = db.prepare(
      "SELECT * FROM job_submissions WHERE status='approved' ORDER BY created_at DESC"
    ).all();
    res.json({ jobs });
  } catch (e) {
    console.error("DB read failed:", e);
    res.json({ jobs: [] });
  }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, "0.0.0.0", () => {
  console.log(`identity-service running on 0.0.0.0:${port}`);
});
