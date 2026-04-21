/*
 * referralStore.js
 *
 * Tiny localStorage-backed referral/earnings store. Seeds with demo data on
 * first load so the Measure page has something to render. API is intentionally
 * narrow so swapping to a real backend later is a single-file change.
 *
 * Record shape:
 *   {
 *     id: number,              // local id
 *     name: string,             // referred person's display name
 *     status: "Active" | "Pending" | "Ended",
 *     hoursWorked: number,
 *     monthlyEarnings: number,  // $ per month the referrer earns from this referral
 *     totalEarned: number,      // lifetime $ earned from this referral
 *   }
 */
(function () {
  "use strict";

  var STORAGE_KEY = "gs_referrals_v1";
  var SEED_FLAG = "gs_referrals_seeded";

  var SEED = [
    {
      id: 1,
      name: "John D",
      status: "Active",
      hoursWorked: 160,
      monthlyEarnings: 40,
      totalEarned: 320,
    },
    {
      id: 2,
      name: "Sarah K",
      status: "Active",
      hoursWorked: 150,
      monthlyEarnings: 38,
      totalEarned: 280,
    },
  ];

  function readRaw() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function writeRaw(list) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  function seedIfNeeded() {
    try {
      if (window.localStorage.getItem(SEED_FLAG) === "1") return;
      var existing = readRaw();
      if (!existing || existing.length === 0) {
        writeRaw(SEED);
      }
      window.localStorage.setItem(SEED_FLAG, "1");
    } catch (e) {
      /* ignore */
    }
  }

  function list() {
    seedIfNeeded();
    return readRaw() || [];
  }

  function add(record) {
    var existing = list();
    var nextId = existing.reduce(function (m, r) {
      return Math.max(m, r.id || 0);
    }, 0) + 1;
    var clean = {
      id: nextId,
      name: String(record.name || "").slice(0, 80),
      status: record.status || "Pending",
      hoursWorked: Number(record.hoursWorked) || 0,
      monthlyEarnings: Number(record.monthlyEarnings) || 0,
      totalEarned: Number(record.totalEarned) || 0,
    };
    existing.push(clean);
    writeRaw(existing);
    return clean;
  }

  function totals() {
    var data = list();
    return {
      count: data.length,
      activeCount: data.filter(function (r) { return r.status === "Active"; }).length,
      monthlyEarnings: data.reduce(function (s, r) { return s + (r.monthlyEarnings || 0); }, 0),
      totalEarned: data.reduce(function (s, r) { return s + (r.totalEarned || 0); }, 0),
    };
  }

  function reset() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(SEED_FLAG);
    } catch (e) { /* ignore */ }
  }

  window.GS = window.GS || {};
  window.GS.referralStore = {
    list: list,
    add: add,
    totals: totals,
    reset: reset,
  };
})();
