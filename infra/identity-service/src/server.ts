import "dotenv/config";
import express from "express";
import cors from "cors";
import { v4 as uuid } from "uuid";
import { db } from "./db";
import { IssueBadgeSchema, VerifyCredentialSchema, ValueEventSchema } from "./validators";
import { mintNftToTreasury } from "./hedera";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.type("text").send("GeniusSeeker identity-service is running. Try /health or /api/profile/:accountId");
});

const nowISO = () => new Date().toISOString();

app.get("/health", (_req, res) => res.json({ ok: true }));

/**
 * 1) Talent identity can live on-chain (v1)
 * We create/return a "profile anchor" for a Hedera Account ID.
 * Later we can add DID-like docs and signatures.
 */
app.post("/api/profile/upsert", (req, res) => {
  const { hederaAccountId, displayName } = req.body || {};
  if (!hederaAccountId) return res.status(400).json({ error: "hederaAccountId required" });

  const id = `profile_${hederaAccountId}`;
  const existing = db.prepare("SELECT * FROM profiles WHERE id=?").get(id);

  if (existing) {
    db.prepare("UPDATE profiles SET display_name=? WHERE id=?")
      .run(displayName ?? existing.display_name, id);
  } else {
    db.prepare("INSERT INTO profiles (id, hedera_account_id, display_name, created_at) VALUES (?,?,?,?)")
      .run(id, hederaAccountId, displayName ?? null, nowISO());
  }

  const profile = db.prepare("SELECT * FROM profiles WHERE id=?").get(id);
  res.json({ profile });
});

app.get("/api/profile/:accountId", (req, res) => {
  const id = `profile_${req.params.accountId}`;
  const profile = db.prepare("SELECT * FROM profiles WHERE id=?").get(id);
  const creds = db.prepare("SELECT * FROM credentials WHERE hedera_account_id=? ORDER BY created_at DESC")
    .all(req.params.accountId);

  res.json({ profile: profile || null, credentials: creds });
});

/**
 * 2) Verified credentials can travel with the individual (v1)
 * Issue a credential record + optionally mint a Hedera NFT representing the credential.
 */
app.post("/api/credentials/verify", async (req, res) => {
  const parsed = VerifyCredentialSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { hederaAccountId, credentialType, metadata } = parsed.data;

  const id = `cred_${uuid()}`;
  const createdAt = nowISO();

  let hederaTokenId: string | undefined;
  let hederaSerial: number | undefined;
  let txId: string | undefined;

  // Optional mint (recommended once your token IDs exist)
  const tokenId = process.env.HEDERA_CREDENTIAL_TOKEN_ID;
  if (tokenId) {
    const payload = {
      credentialType,
      hederaAccountId,
      metadata,
      issuedAt: createdAt,
      issuer: "GeniusSeeker"
    };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const minted = await mintNftToTreasury({ tokenId, metadataBytes: bytes });
    hederaTokenId = tokenId;
    hederaSerial = minted.serial;
    txId = minted.txId;
  }

  db.prepare(`
    INSERT INTO credentials
    (id, hedera_account_id, credential_type, metadata_json, hedera_token_id, hedera_serial, tx_id, created_at)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(
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

/**
 * 1) Issue a STEAM Badge (v1)
 * Same idea as credential, but standardized payload.
 */
app.post("/api/badges/issue", async (req, res) => {
  const parsed = IssueBadgeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { hederaAccountId, displayName, badge } = parsed.data;

  // Upsert profile
  const profileId = `profile_${hederaAccountId}`;
  const existing = db.prepare("SELECT * FROM profiles WHERE id=?").get(profileId);
  if (!existing) {
    db.prepare("INSERT INTO profiles (id, hedera_account_id, display_name, created_at) VALUES (?,?,?,?)")
      .run(profileId, hederaAccountId, displayName ?? null, nowISO());
  }

  const id = `cred_${uuid()}`;
  const createdAt = nowISO();

  let hederaTokenId: string | undefined;
  let hederaSerial: number | undefined;
  let txId: string | undefined;

  const tokenId = process.env.HEDERA_BADGE_TOKEN_ID;
  const payload = {
    type: "STEAM_BADGE",
    hederaAccountId,
    badge,
    issuedAt: createdAt,
    issuer: "GeniusSeeker"
  };

  if (tokenId) {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const minted = await mintNftToTreasury({ tokenId, metadataBytes: bytes });
    hederaTokenId = tokenId;
    hederaSerial = minted.serial;
    txId = minted.txId;
  }

  db.prepare(`
    INSERT INTO credentials
    (id, hedera_account_id, credential_type, metadata_json, hedera_token_id, hedera_serial, tx_id, created_at)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(
    id,
    hederaAccountId,
    "STEAM_BADGE",
    JSON.stringify(payload),
    hederaTokenId ?? null,
    hederaSerial ?? null,
    txId ?? null,
    createdAt
  );

  res.json({ ok: true, id, hederaTokenId, hederaSerial, txId, payload });
});

/**
 * 3) Value can move transparently (v1)
 * For now: an immutable event log (auditable).
 */
app.post("/api/value/log", (req, res) => {
  const parsed = ValueEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const id = `evt_${uuid()}`;
  const createdAt = nowISO();

  db.prepare(`
    INSERT INTO value_events
    (id, actor, event_type, amount, currency, reference, metadata_json, created_at)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(
    id,
    parsed.data.actor,
    parsed.data.eventType,
    parsed.data.amount ?? null,
    parsed.data.currency ?? null,
    parsed.data.reference ?? null,
    parsed.data.metadata ? JSON.stringify(parsed.data.metadata) : null,
    createdAt
  );

  res.json({ ok: true, id });
});

/**
 * 4) Community participation (v1)
 * Query events for transparency
 */
app.get("/api/value/events", (_req, res) => {
  const events = db.prepare("SELECT * FROM value_events ORDER BY created_at DESC LIMIT 200").all();
  res.json({ events });
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`identity-service running on :${port}`);
});
