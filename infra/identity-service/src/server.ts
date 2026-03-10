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
app.use(express.json({ limit: "10mb" }));

const nowISO = () => new Date().toISOString();

app.get("/", (_req, res) => {
  res.type("text").send("GeniusSeeker identity-service is running. Try /health or /api/profile/:accountId");
});

app.get("/health", (_req, res) => res.json({ ok: true }));

/* =====================================================
   EMPLOYER AUTH — simple token-based session
===================================================== */
const EMPLOYER_PASSWORD = process.env.EMPLOYER_PASSWORD || "geniusseeker2026";

app.post("/api/employer/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || password !== EMPLOYER_PASSWORD) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = uuid();
  const createdAt = nowISO();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    "INSERT INTO employer_sessions (id, email, token, created_at, expires_at) VALUES (?,?,?,?,?)"
  ).run(`sess_${uuid()}`, email, token, createdAt, expiresAt);
  res.json({ ok: true, token, email });
});

function requireEmployer(req: any, res: any, next: any) {
  const auth = req.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const sess = db.prepare(
    "SELECT * FROM employer_sessions WHERE token=? AND expires_at > ?"
  ).get(token, nowISO());
  if (!sess) return res.status(401).json({ error: "Session expired or invalid" });
  next();
}

/* =====================================================
   PROFILE UPSERT (basic — from candidates.html)
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
      id, hederaAccountId, name, nowISO()
    );
  }

  const profile = db.prepare("SELECT * FROM profiles WHERE id=?").get(id);
  res.json({ profile });
});

/* =====================================================
   PROFILE UPDATE — extended fields
===================================================== */
app.post("/api/profile/update", (req, res) => {
  const {
    hederaAccountId, displayName, bio, skills,
    avatarUrl, portfolioUrl, linkedinUrl, githubUrl, openToWork,
    resumeText, resumePdfUrl
  } = req.body || {};

  if (!hederaAccountId) return res.status(400).json({ error: "hederaAccountId required" });

  const id = `profile_${hederaAccountId}`;
  const existing = db.prepare("SELECT * FROM profiles WHERE id=?").get(id);

  if (!existing) {
    db.prepare(
      "INSERT INTO profiles (id, hedera_account_id, display_name, created_at) VALUES (?,?,?,?)"
    ).run(id, hederaAccountId, displayName?.trim() || null, nowISO());
  }

  db.prepare(`
    UPDATE profiles SET
      display_name   = COALESCE(?, display_name),
      bio            = COALESCE(?, bio),
      skills         = COALESCE(?, skills),
      avatar_url     = COALESCE(?, avatar_url),
      portfolio_url  = COALESCE(?, portfolio_url),
      linkedin_url   = COALESCE(?, linkedin_url),
      github_url     = COALESCE(?, github_url),
      open_to_work   = COALESCE(?, open_to_work),
      resume_text    = COALESCE(?, resume_text),
      resume_pdf_url = COALESCE(?, resume_pdf_url)
    WHERE id = ?
  `).run(
    displayName?.trim()   || null,
    bio?.trim()           || null,
    skills ? JSON.stringify(skills) : null,
    avatarUrl?.trim()     || null,
    portfolioUrl?.trim()  || null,
    linkedinUrl?.trim()   || null,
    githubUrl?.trim()     || null,
    openToWork            || null,
    resumeText?.trim()    || null,
    resumePdfUrl?.trim()  || null,
    id
  );

  const profile = db.prepare("SELECT * FROM profiles WHERE id=?").get(id);
  res.json({ ok: true, profile });
});

/* =====================================================
   GET SINGLE PROFILE
===================================================== */
app.get("/api/profile/:accountId", (req, res) => {
  const id = `profile_${req.params.accountId}`;
  const profile = db.prepare("SELECT * FROM profiles WHERE id=?").get(id) as any;
  const creds = db
    .prepare("SELECT * FROM credentials WHERE hedera_account_id=? ORDER BY created_at DESC")
    .all(req.params.accountId);

  if (!profile) return res.json({ profile: null, credentials: [] });

  if (profile.skills) {
    try { profile.skills = JSON.parse(profile.skills); } catch { profile.skills = []; }
  }

  const auth = req.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();
  const sess = token
    ? db.prepare("SELECT * FROM employer_sessions WHERE token=? AND expires_at > ?").get(token, nowISO())
    : null;

  if (!sess) delete profile.hedera_account_id;

  res.json({ profile, credentials: creds });
});

/* =====================================================
   CANDIDATE DIRECTORY — employers only
===================================================== */
app.get("/api/candidates", requireEmployer, (req, res) => {
  const { steam, open_to_work } = req.query as any;

  let query = `
    SELECT p.*,
      (SELECT metadata_json FROM credentials
       WHERE hedera_account_id = p.hedera_account_id
         AND credential_type = 'STEAM_BADGE'
       ORDER BY created_at DESC LIMIT 1) AS latest_badge_json
    FROM profiles p WHERE 1=1
  `;
  const params: any[] = [];

  if (open_to_work) { query += " AND p.open_to_work = ?"; params.push(open_to_work); }
  query += " ORDER BY p.created_at DESC LIMIT 100";

  const candidates = (db.prepare(query).all(...params) as any[]).map(c => {
    if (c.skills) { try { c.skills = JSON.parse(c.skills); } catch { c.skills = []; } }
    if (c.latest_badge_json) {
      try {
        const b = JSON.parse(c.latest_badge_json);
        c.steam_badge = b?.badge?.category || b?.badge?.name || null;
        c.steam_level = b?.badge?.level || null;
      } catch { c.steam_badge = null; c.steam_level = null; }
    }
    delete c.latest_badge_json;
    return c;
  });

  const filtered = steam ? candidates.filter(c => c.steam_badge === steam) : candidates;
  res.json({ candidates: filtered });
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

/* =====================================================
   EMPLOYER VERIFICATION SYSTEM
===================================================== */

// POST /api/employer/apply — submit verification application
app.post("/api/employer/apply", (req, res) => {
  const {
    companyName, website, contactName, contactEmail, contactTitle,
    companySize, industry, ein,
    // attestations
    postsSalary, hasDeiPolicy, diversePanels, structuredFeedback,
    flexibleWork, tracksEquity, pipelinePrograms, payEquityAudit,
    deiPolicyUrl, equityReportUrl, additionalNotes
  } = req.body || {};

  if (!companyName || !contactName || !contactEmail) {
    return res.status(400).json({ error: "companyName, contactName, and contactEmail are required" });
  }

  // Check for duplicate
  const existing = db.prepare("SELECT id FROM employer_profiles WHERE contact_email=?").get(contactEmail);
  if (existing) {
    return res.status(409).json({ error: "An application with this email already exists" });
  }

  const empId = "emp_" + uuid();
  const now   = nowISO();

  db.prepare(`
    INSERT INTO employer_profiles
      (id, company_name, website, contact_name, contact_email, contact_title,
       company_size, industry, ein, tier, status, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,'pending','pending',?)
  `).run(empId, companyName, website||null, contactName, contactEmail,
         contactTitle||null, companySize||null, industry||null, ein||null, now);

  // Score the attestations to suggest initial tier
  const score = [postsSalary, hasDeiPolicy, diversePanels, structuredFeedback,
                 flexibleWork, tracksEquity, pipelinePrograms, payEquityAudit]
    .filter(Boolean).length;

  db.prepare(`
    INSERT INTO employer_attestations
      (id, employer_id, posts_salary, has_dei_policy, diverse_panels,
       structured_feedback, flexible_work, tracks_equity, pipeline_programs,
       pay_equity_audit, dei_policy_url, equity_report_url, additional_notes, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    "att_" + uuid(), empId,
    postsSalary?1:0, hasDeiPolicy?1:0, diversePanels?1:0,
    structuredFeedback?1:0, flexibleWork?1:0, tracksEquity?1:0,
    pipelinePrograms?1:0, payEquityAudit?1:0,
    deiPolicyUrl||null, equityReportUrl||null, additionalNotes||null, now
  );

  res.json({ ok: true, id: empId, attestationScore: score });
});

// GET /api/employer/applications — admin: list all pending applications
app.get("/api/employer/applications", requireEmployer, (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, a.posts_salary, a.has_dei_policy, a.diverse_panels,
           a.structured_feedback, a.flexible_work, a.tracks_equity,
           a.pipeline_programs, a.pay_equity_audit,
           a.dei_policy_url, a.equity_report_url, a.additional_notes,
           (a.posts_salary + a.has_dei_policy + a.diverse_panels +
            a.structured_feedback + a.flexible_work + a.tracks_equity +
            a.pipeline_programs + a.pay_equity_audit) as attestation_score
    FROM employer_profiles p
    LEFT JOIN employer_attestations a ON a.employer_id = p.id
    ORDER BY p.created_at DESC
  `).all();
  res.json({ ok: true, applications: rows });
});

// POST /api/employer/applications/:id/approve — admin approve with tier
app.post("/api/employer/applications/:id/approve", requireEmployer, (req, res) => {
  const { tier, adminNotes } = req.body || {};
  const validTiers = ["listed","committed","invested","exemplary"];
  if (!validTiers.includes(tier)) {
    return res.status(400).json({ error: "tier must be listed, committed, invested, or exemplary" });
  }
  const now = nowISO();
  db.prepare(`
    UPDATE employer_profiles
    SET status='approved', tier=?, admin_notes=?, reviewed_at=?
    WHERE id=?
  `).run(tier, adminNotes||null, now, req.params.id);
  res.json({ ok: true });
});

// POST /api/employer/applications/:id/reject — admin reject
app.post("/api/employer/applications/:id/reject", requireEmployer, (req, res) => {
  const { adminNotes } = req.body || {};
  db.prepare(`
    UPDATE employer_profiles
    SET status='rejected', admin_notes=?, reviewed_at=?
    WHERE id=?
  `).run(adminNotes||null, nowISO(), req.params.id);
  res.json({ ok: true });
});

// GET /api/employer/status/:email — let employer check their status
app.get("/api/employer/status/:email", (req, res) => {
  const emp = db.prepare(
    "SELECT id, company_name, tier, status, created_at, reviewed_at FROM employer_profiles WHERE contact_email=?"
  ).get(req.params.email);
  if (!emp) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true, employer: emp });
});

// POST /api/employer/review — candidate submits a review after application
app.post("/api/employer/review", (req, res) => {
  const {
    employerId, applicationId, reviewerHedera, stage,
    accurateDescription, clearCommunication, respectfulProcess,
    salaryMatched, wouldApplyAgain, comments
  } = req.body || {};

  if (!employerId || !applicationId || !reviewerHedera) {
    return res.status(400).json({ error: "employerId, applicationId and reviewerHedera required" });
  }

  // Prevent duplicate reviews for same application+stage
  const existing = db.prepare(
    "SELECT id FROM employer_reviews WHERE application_id=? AND stage=?"
  ).get(applicationId, stage||"application");
  if (existing) return res.status(409).json({ error: "Review already submitted for this application" });

  db.prepare(`
    INSERT INTO employer_reviews
      (id, employer_id, application_id, reviewer_hedera, stage,
       accurate_description, clear_communication, respectful_process,
       salary_matched, would_apply_again, comments, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    "rev_" + uuid(), employerId, applicationId, reviewerHedera,
    stage||"application",
    accurateDescription||null, clearCommunication||null, respectfulProcess||null,
    salaryMatched||null, wouldApplyAgain||null, comments||null, nowISO()
  );

  // Recompute employer score (avg of all 5-star ratings)
  const reviews = db.prepare(`
    SELECT accurate_description, clear_communication, respectful_process,
           would_apply_again FROM employer_reviews WHERE employer_id=?
  `).all(employerId) as any[];

  res.json({ ok: true, totalReviews: reviews.length });
});

// GET /api/employer/reviews/:employerId — get reviews for an employer
app.get("/api/employer/reviews/:employerId", requireEmployer, (req, res) => {
  const reviews = db.prepare(
    "SELECT * FROM employer_reviews WHERE employer_id=? ORDER BY created_at DESC"
  ).all(req.params.employerId);
  res.json({ ok: true, reviews });
});

/* =====================================================
   AI PROFILE IMPORT
   POST /api/profile/import
   Body: { text?: string, pdfBase64?: string }
   Returns: { ok: true, data: { displayName, bio, skills, ... } }
===================================================== */
app.post("/api/profile/import", async (req, res) => {
  const { text, pdfBase64 } = req.body || {};

  if (!text && !pdfBase64) {
    return res.status(400).json({ error: "Provide text or pdfBase64" });
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not set in .env" });
  }

  const systemPrompt = `You are a profile extraction assistant for GeniusSeeker, a STEAM talent platform.
Extract profile fields and return ONLY a valid JSON object — no markdown fences, no explanation, no extra text.
Required keys:
{
  "displayName": "Full name",
  "bio": "2-3 sentence professional summary (write one if not present, based on their experience)",
  "skills": ["skill1", "skill2"],
  "portfolioUrl": "URL or null",
  "linkedinUrl": "LinkedIn URL or null",
  "githubUrl": "GitHub URL or null",
  "openToWork": "looking | open | not_looking — infer from context, default open",
  "steamCategory": "Science | Technology | Engineering | Arts | Mathematics",
  "yearsExperience": number or null,
  "currentTitle": "most recent job title or null"
}`;

  let userContent: any;

  if (pdfBase64) {
    userContent = [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: pdfBase64 }
      },
      { type: "text", text: "Extract the profile fields from this resume or LinkedIn PDF as instructed." }
    ];
  } else {
    userContent = `Extract the profile fields from this text:

${text}`;
  }

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "pdfs-2024-09-25",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    const anthropicData = await anthropicRes.json() as any;

    if (!anthropicRes.ok) {
      console.error("Anthropic API error:", anthropicData);
      return res.status(502).json({ error: "AI extraction failed", detail: anthropicData?.error?.message });
    }

    const raw   = anthropicData?.content?.[0]?.text || "";
    const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      console.error("JSON parse failed. Raw:", raw);
      return res.status(422).json({ error: "Could not parse AI response as JSON", raw });
    }

    res.json({ ok: true, data: parsed });
  } catch (err: any) {
    console.error("Import route error:", err);
    res.status(500).json({ error: "Import failed", detail: err?.message });
  }
});

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
