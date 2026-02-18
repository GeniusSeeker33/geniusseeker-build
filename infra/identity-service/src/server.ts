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
    db.prepare("INSERT INTO profiles (id, hedera_account_id, display_name, created_at) VALUES (?,?,?,?)")
      .run(id, hederaAccountId, name, nowISO());
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

  db.prepare(`
    INSERT INTO credentials
    (id, hedera_account_id, credential_type, metadata_json, hedera_token_id, hedera_serial, tx_id, created_at)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(id, hederaAccountId, credentialType, JSON.stringify(metadata),
    hederaTokenId ?? null, hederaSerial ?? null, txId ?? null, createdAt);

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
    db.prepare("INSERT INTO profiles (id, hedera_account_id, display_name, created_at) VALUES (?,?,?,?)")
      .run(profileId, hederaAccountId, displayName?.trim() || null, createdAt);
  }

  // dedupe
  const versionNeedle = `"quizVersion":"${quizVersion}"`;
  const existingCred = db.prepare(`
      SELECT * FROM credentials
      WHERE hedera_account_id = ?
      AND credential_type = 'STEAM_BADGE'
      AND metadata_json LIKE ?
      LIMIT 1
  `).get(hederaAccountId, `%${versionNeedle}%`);

  if (existingCred) {
    return res.json({
      ok: true,
      deduped: true,
      id: existingCred.id,
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

  db.prepare(`
    INSERT INTO credentials
    (id, hedera_account_id, credential_type, metadata_json, hedera_token_id, hedera_serial, tx_id, created_at)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(id, hederaAccountId, "STEAM_BADGE", JSON.stringify(payload),
    hederaTokenId ?? null, hederaSerial ?? null, txId ?? null, createdAt);

  res.json({ ok: true, deduped: false, id, hederaTokenId, hederaSerial, txId, payload });
});

/* =====================================================
   VALUE EVENT LOG
===================================================== */
app.post("/api/value/log", (req, res) => {
  try {
    const ts = nowISO();
    const { actor, eventType, currency, amount, reference, metadata } = req.body || {};

    if (!actor || !eventType || !currency || !amount)
      return res.status(400).json({ error: "Invalid value log payload" });

    try {
      db.prepare(`
        INSERT INTO value_events
        (id, actor, event_type, amount, currency, reference, metadata_json, created_at)
        VALUES (?,?,?,?,?,?,?,?)
      `).run(`ve_${uuid()}`, actor, eventType, String(amount), currency,
        reference ?? null, metadata ? JSON.stringify(metadata) : null, ts);
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

const port = Number(process.env.PORT || 8787);
app.listen(port, "0.0.0.0", () => {
  console.log(`identity-service running on 0.0.0.0:${port}`);
});

