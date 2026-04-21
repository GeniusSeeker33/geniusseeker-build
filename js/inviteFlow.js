/*
 * inviteFlow.js
 *
 * Invite code + shareable URL generator for the Refer page. No backend:
 * the code is generated client-side and persisted so the same user sees
 * the same code on return visits. Copy-to-clipboard is supported.
 *
 * Expected DOM on refer.html:
 *   #invite-name-input       (optional text input for their display name)
 *   #invite-generate-btn     (button to generate / regenerate)
 *   #invite-code-output      (element whose textContent shows the code)
 *   #invite-url-output       (element whose textContent shows the URL)
 *   #invite-copy-btn         (button to copy the URL to clipboard)
 *   #invite-status           (element for status messages)
 */
(function () {
  "use strict";

  var STORAGE_KEY = "gs_invite_self";
  var BASE_URL = "https://geniusseeker.com/";

  function randomCode() {
    // 8-char, upper-case, readable (no 0/O/I/1 collisions).
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var out = "";
    var cryptoObj = window.crypto || window.msCrypto;
    if (cryptoObj && cryptoObj.getRandomValues) {
      var buf = new Uint32Array(8);
      cryptoObj.getRandomValues(buf);
      for (var i = 0; i < 8; i++) {
        out += chars.charAt(buf[i] % chars.length);
      }
    } else {
      for (var j = 0; j < 8; j++) {
        out += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    return out;
  }

  function readSelf() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && parsed.code ? parsed : null;
    } catch (e) { return null; }
  }

  function writeSelf(record) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch (e) { /* ignore */ }
  }

  function buildUrl(code) {
    return BASE_URL + "?ref=" + encodeURIComponent(code);
  }

  function render(record) {
    var codeEl = document.getElementById("invite-code-output");
    var urlEl = document.getElementById("invite-url-output");
    if (codeEl) codeEl.textContent = record ? record.code : "—";
    if (urlEl) urlEl.textContent = record ? buildUrl(record.code) : "—";
  }

  function setStatus(msg) {
    var el = document.getElementById("invite-status");
    if (el) el.textContent = msg || "";
  }

  function generate(name) {
    var record = {
      name: String(name || "").slice(0, 80),
      code: randomCode(),
      createdAt: Date.now(),
    };
    writeSelf(record);
    render(record);
    setStatus("New invite link ready.");
    return record;
  }

  function copyToClipboard(text) {
    if (!text) return Promise.resolve(false);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    }
    // Fallback for older browsers.
    return new Promise(function (resolve) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        resolve(ok);
      } catch (e) { resolve(false); }
    });
  }

  function init() {
    var nameInput = document.getElementById("invite-name-input");
    var genBtn = document.getElementById("invite-generate-btn");
    var copyBtn = document.getElementById("invite-copy-btn");
    var urlEl = document.getElementById("invite-url-output");

    // Render existing record on first load, or auto-generate so the page
    // never looks empty on first visit.
    var existing = readSelf();
    if (existing) {
      render(existing);
      if (nameInput && existing.name) nameInput.value = existing.name;
    } else {
      generate("");
    }

    if (genBtn) {
      genBtn.addEventListener("click", function (e) {
        e.preventDefault();
        generate(nameInput ? nameInput.value : "");
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", function (e) {
        e.preventDefault();
        var text = urlEl ? urlEl.textContent : "";
        copyToClipboard(text).then(function (ok) {
          setStatus(ok ? "Link copied to clipboard." : "Couldn't copy. Long-press to copy manually.");
        });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
