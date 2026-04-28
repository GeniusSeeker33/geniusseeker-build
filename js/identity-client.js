// /js/identity-client.js
// GeniusSeeker v1 identity + credentials client (Codespaces-safe)

(function () {
  const DEFAULT_API = "http://127.0.0.1:8787";

  function gsApiBase() {
    // 1) meta tag wins (best for Codespaces forwarded URL)
    const meta = document.querySelector('meta[name="gs-api"]');
    const vMeta = meta ? meta.getAttribute("content") : "";

    // 2) localStorage fallback (set by candidates page)
    const vLs = localStorage.getItem("gs_api_base") || "";

    // 3) choose the first non-empty
    const raw = (vMeta || vLs || DEFAULT_API).trim();

    // normalize: remove trailing slash
    return raw.replace(/\/$/, "");
  }

  function getAccountId() {
    return localStorage.getItem("gs_hedera_account_id") || "";
  }

  function setAccountId(accountId) {
    localStorage.setItem("gs_hedera_account_id", accountId || "");
  }

  function getDisplayName() {
    return localStorage.getItem("gs_display_name") || "";
  }

  function setDisplayName(name) {
    localStorage.setItem("gs_display_name", name || "");
  }

  async function post(path, payload) {
    const base = gsApiBase();
    const url = base + path;

    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      });
    } catch (err) {
      // Network-level failure (CORS, DNS, port not reachable, mixed content, etc.)
      throw new Error(`Failed to fetch ${url}. Check your gs-api base URL + forwarded port 8787.`);
    }

    const txt = await res.text();
    let data;
    try {
      data = JSON.parse(txt);
    } catch {
      data = { raw: txt };
    }

    if (!res.ok) {
      const msg =
        (data && data.error && (data.error.message || JSON.stringify(data.error))) ||
        (data && data.message) ||
        `Request failed (${res.status})`;
      throw new Error(`API ${res.status} on ${path}: ${msg}`);
    }

    return data;
  }

  async function get(path) {
    const base = gsApiBase();
    const url = base + path;

    let res;
    try {
      res = await fetch(url);
    } catch {
      throw new Error(`Failed to fetch ${url}. Check your gs-api base URL + forwarded port 8787.`);
    }

    const txt = await res.text();
    let data;
    try {
      data = JSON.parse(txt);
    } catch {
      data = { raw: txt };
    }

    if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
    return data;
  }

  // Public API
  window.GSIdentity = {
    apiBase: gsApiBase,

    getAccountId,
    setAccountId,

    getDisplayName,
    setDisplayName,

    // Profiles
    upsertProfile: async ({ hederaAccountId, displayName, email }) => {
      if (hederaAccountId) setAccountId(hederaAccountId);
      if (displayName) setDisplayName(displayName);
      if (email) localStorage.setItem("gs_email", email);

      return post("/api/profile/upsert", { hederaAccountId, displayName, email });
    },

    fetchProfile: async (hederaAccountId) =>
      get("/api/profile/" + encodeURIComponent(hederaAccountId)),

    // Credentials & badges
    issueBadge: async ({ hederaAccountId, displayName, quizVersion, badge }) =>
      post("/api/badges/issue", { hederaAccountId, displayName, quizVersion, badge }),

    verifyCredential: async ({ hederaAccountId, credentialType, metadata }) =>
      post("/api/credentials/verify", { hederaAccountId, credentialType, metadata }),

    // Value ledger
    logValueEvent: async ({ actor, eventType, amount, currency, reference, metadata }) =>
      post("/api/value/log", { actor, eventType, amount, currency, reference, metadata }),
  };
})();



