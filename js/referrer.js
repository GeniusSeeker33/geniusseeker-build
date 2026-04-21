/*
 * referrer.js
 *
 * Sitewide referrer-code capture. On every page load, check for ?ref=CODE
 * in the URL. If found, persist it to localStorage so the eventual signup
 * or hire can be attributed.
 *
 * Used by: every page, via partials/header.html (loaded automatically by main.js).
 * API: window.GS.referrer.get() returns the stored referrer record or null.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "gs_referrer";
  var MAX_AGE_DAYS = 90;

  function readParam() {
    try {
      var params = new URLSearchParams(window.location.search);
      var code = params.get("ref");
      if (!code) return null;
      // Defensive: trim, clamp length, allow only safe chars.
      code = String(code).trim().slice(0, 64);
      if (!/^[A-Za-z0-9_-]+$/.test(code)) return null;
      return code;
    } catch (e) {
      return null;
    }
  }

  function read() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      // Expire stale records.
      var ageMs = Date.now() - (parsed.capturedAt || 0);
      if (ageMs > MAX_AGE_DAYS * 24 * 60 * 60 * 1000) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function write(code) {
    try {
      var record = {
        code: code,
        capturedAt: Date.now(),
        landingPath: window.location.pathname || "/",
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      return record;
    } catch (e) {
      return null;
    }
  }

  function capture() {
    var code = readParam();
    if (!code) return read();
    // Do not overwrite an existing first-touch record; first-touch attribution
    // is almost always more valuable than last-touch.
    var existing = read();
    if (existing && existing.code) return existing;
    return write(code);
  }

  // Expose a tiny namespace so other scripts (invite flow, forms) can read
  // the active referrer without re-parsing the URL.
  window.GS = window.GS || {};
  window.GS.referrer = {
    get: read,
    capture: capture,
  };

  // Run on load.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", capture);
  } else {
    capture();
  }
})();
