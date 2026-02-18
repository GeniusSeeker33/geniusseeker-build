// /js/identity-client.js
// GeniusSeeker v1 identity + credentials client

(function () {
  const DEFAULT_API = "http://localhost:8787";

  function apiBase() {
    // Allow overriding via <meta name="gs-api" content="...">
    const meta = document.querySelector('meta[name="gs-api"]');
    return (meta && meta.content) ? meta.content.replace(/\/$/, "") : DEFAULT_API;
  }

  function getAccountId() {
    return localStorage.getItem("gs_hedera_account_id") || "";
  }

  function setAccountId(accountId) {
    localStorage.setItem("gs_hedera_account_id", accountId);
  }

  async function post(path, payload) {
    const res = await fetch(apiBase() + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const txt = await res.text();
    let data;
    try { data = JSON.parse(txt); } catch { data = { raw: txt }; }

    if (!res.ok) {
      console.error("API error:", res.status, data);
      throw new Error((data && data.error) ? JSON.stringify(data.error) : "Request failed");
    }
    return data;
  }

  async function get(path) {
    const res = await fetch(apiBase() + path);
    const txt = await res.text();
    let data;
    try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
    if (!res.ok) throw new Error("GET failed: " + res.status);
    return data;
  }

  // Public API
  window.GSIdentity = {
    apiBase,
    getAccountId,
    setAccountId,

    upsertProfile: async ({ hederaAccountId, displayName }) =>
      post("/api/profile/upsert", { hederaAccountId, displayName }),

    issueBadge: async ({ hederaAccountId, displayName, badge }) =>
      post("/api/badges/issue", { hederaAccountId, displayName, badge }),

    verifyCredential: async ({ hederaAccountId, credentialType, metadata }) =>
      post("/api/credentials/verify", { hederaAccountId, credentialType, metadata }),

    logValueEvent: async ({ actor, eventType, amount, currency, reference, metadata }) =>
      post("/api/value/log", { actor, eventType, amount, currency, reference, metadata }),

    fetchProfile: async (hederaAccountId) =>
      get("/api/profile/" + encodeURIComponent(hederaAccountId))
  };
})();
