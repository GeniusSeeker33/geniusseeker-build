import React, { useEffect, useMemo, useRef, useState } from "react";
import { questions } from "./quizquestions.js";

// ---------------------------
// Identity-service helpers
// ---------------------------
const gsApiBase = () => {
  const meta = document.querySelector('meta[name="gs-api"]');
  const vMeta = meta?.getAttribute("content");
  const vLs = localStorage.getItem("gs_api_base");
  const v = (vMeta || vLs || "").trim();
  return v ? v.replace(/\/$/, "") : "http://localhost:8787";
};

console.log("GS API base (Quiz):", gsApiBase());

const gsGetAccountId = () =>
  (localStorage.getItem("GS_HEDERA_ACCOUNT_ID") ||
    localStorage.getItem("gs_hedera_account_id") ||
    "").trim();

const gsGetDisplayName = () =>
  (localStorage.getItem("gs_display_name") || "").trim();

async function gsPost(path, payload) {
  const url = gsApiBase() + path;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
  } catch (err) {
    throw new Error(`Network/CORS error calling ${url}: ${err?.message || err}`);
  }

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    const detail = data?.error ? JSON.stringify(data.error) : (data?.raw || text || "");
    throw new Error(`API ${res.status} on ${path}: ${detail}`);
  }
  return data;
}

// ---------------------------
// Pay range by level
// ---------------------------
const getPayRange = (level) => {
  switch (level) {
    case 1: return "$10–$20/hour (early-career / exploring)";
    case 2: return "$20–$30/hour (developing professional)";
    case 3: return "$30–$50/hour (established contributor)";
    case 4: return "$50–$100/hour (senior / strategic leader)";
    case 5:
    default: return "$100+/hour or equivalent salary (top of field)";
  }
};

// ---------------------------
// Comp structure labels
// ---------------------------
const COMP_LABELS = {
  base_only:            "Predictable base salary",
  base_plus_commission: "Base + commission",
  base_plus_bonus:      "Base + performance bonus",
  commission_heavy:     "Commission / equity-heavy",
  project_based:        "Project-based / contract pay",
};

const WAGE_LABELS = {
  under_50k:  "Under $50,000",
  "50k_80k":  "$50,000–$80,000",
  "80k_120k": "$80,000–$120,000",
  "120k_180k":"$120,000–$180,000",
  "180k_plus":"$180,000+",
};

const WORK_STYLE_LABELS = {
  independent:    "Independent deep work",
  collaborative:  "Collaborative team work",
  hybrid_style:   "Mix of solo + team",
  leading:        "Leading & coordinating",
  flexible:       "Flexible — adapts to project",
};

const WORK_LOCATION_LABELS = {
  remote:    "Fully remote",
  onsite:    "In-office",
  hybrid:    "Hybrid",
  flexible:  "Flexible / location-agnostic",
  traveling: "Traveling / multi-location",
};

// ---------------------------
// Badge & Level calculation
// Fixed: averages ALL Level questions, not just one
// ---------------------------
const calculateResults = (answers) => {
  const steamCounts = { Science: 0, Technology: 0, Engineering: 0, Arts: 0, Math: 0 };
  const levelVotes  = [];

  // Preference answers (stored separately, not scored for STEAM/Level)
  let compStructure  = null;
  let wageRange      = null;
  let workStyle      = null;
  let workLocation   = null;

  answers.forEach((answerObj) => {
    if (!answerObj) return;
    const { category, weight, value } = answerObj;

    if (!category) return;

    // ── STEAM ──
    if (Object.prototype.hasOwnProperty.call(steamCounts, category)) {
      steamCounts[category] += weight ?? 1;
      return;
    }

    // ── LEVEL (collect all votes, average at end) ──
    if (category.startsWith("Level")) {
      const parsed = parseInt(category.replace("Level", ""), 10);
      if (!Number.isNaN(parsed)) {
        // Weight higher-weight questions (experience Q) more
        const voteWeight = weight ?? 1;
        for (let i = 0; i < voteWeight; i++) levelVotes.push(parsed);
      }
      return;
    }

    // ── Preferences (not scored for STEAM/Level) ──
    if (category === "CompStructure"  && value) { compStructure = value; return; }
    if (category === "WageRange"      && value) { wageRange     = value; return; }
    if (category === "WorkStyle"      && value) { workStyle     = value; return; }
    if (category === "WorkLocation"   && value) { workLocation  = value; return; }

    // ── Interdisciplinary signal — score both primary + secondary ──
    if (answerObj.secondary && Object.prototype.hasOwnProperty.call(steamCounts, answerObj.secondary)) {
      steamCounts[answerObj.secondary] += (weight ?? 1) * 0.5;
    }
  });

  // Average level votes, round to nearest integer, clamp 1–5
  const level = levelVotes.length
    ? Math.min(5, Math.max(1, Math.round(
        levelVotes.reduce((a, b) => a + b, 0) / levelVotes.length
      )))
    : 1;

  // Top STEAM category
  const sorted = Object.entries(steamCounts).sort((a, b) => b[1] - a[1]);
  const badge  = sorted[0]?.[0] || "Science";

  // Secondary badge (runner-up, if meaningfully close within 20%)
  const secondaryBadge =
    sorted[1] && sorted[1][1] >= sorted[0][1] * 0.8
      ? sorted[1][0]
      : null;

  return {
    badge,
    secondaryBadge,
    level,
    payRange:     getPayRange(level),
    compStructure,
    wageRange,
    workStyle,
    workLocation,
    steamCounts,
  };
};

export default function Quiz() {
  const [step, setStep]         = useState(0);
  const [answers, setAnswers]   = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const [incomeAnswer,   setIncomeAnswer]   = useState(null);
  const [mentorAnswer,   setMentorAnswer]   = useState(null);
  const [showEmailForm,  setShowEmailForm]  = useState(false);
  const [email,          setEmail]          = useState("");
  const [showAllAnswers, setShowAllAnswers] = useState(false);

  const [issueStatus, setIssueStatus] = useState("");
  const [sendStatus,  setSendStatus]  = useState("");
  const [sendError,   setSendError]   = useState("");

  const total      = questions.length;
  const isFinished = step >= total;
  const current    = !isFinished ? questions[step] : null;
  const progressPct = Math.round((Math.min(step, total) / total) * 100);

  const results = useMemo(() => {
    if (!isFinished) return null;
    return calculateResults(answers);
  }, [isFinished, answers]);

  // ---------------------------
  // Issue badge once on completion
  // ---------------------------
  const issuedRef = useRef(false);

  useEffect(() => {
    if (!isFinished || !results) return;
    if (issuedRef.current) return;

    const hederaAccountId = gsGetAccountId();
    if (!hederaAccountId) { setIssueStatus("skipped"); issuedRef.current = true; return; }

    issuedRef.current = true;
    setIssueStatus("pending");

    (async () => {
      try {
        const displayName = gsGetDisplayName();
        const { badge, level, payRange, compStructure, wageRange, workStyle, workLocation } = results;

        await gsPost("/api/badges/issue", {
          hederaAccountId,
          displayName,
          badge: {
            category:      badge,
            level,
            payRange,
            compStructure,
            wageRange,
            workStyle,
            workLocation,
            issuedFor:     "STEAM Identity Quiz",
          },
          quizVersion: "STEAM_V2",
        });

        await gsPost("/api/value/log", {
          actor:     hederaAccountId,
          eventType: "QUIZ_COMPLETED",
          amount:    "25",
          currency:  "GLCD",
          reference: "steam-quiz",
          metadata:  { category: badge, level },
        });

        // Auto-update profile with work preferences
        await gsPost("/api/profile/update", {
          hederaAccountId,
          displayName,
          openToWork: "looking",
        });

        setIssueStatus("ok");
        try { localStorage.setItem("gs_quiz_just_completed", "1"); } catch {}
      } catch (err) {
        console.error("❌ Failed issuing badge:", err);
        setIssueStatus("error");
      }
    })();
  }, [isFinished, results]);

  // ---------------------------
  // Netlify storage backup
  // ---------------------------
  const submitToServer = async () => {
    if (submitted) return;
    const { badge, level } = results || calculateResults(answers);
    const fileData = {
      timestamp:    new Date().toISOString(),
      answers,
      awardedBadge: badge,
      level,
      source:       "steam-card-quiz-v2",
    };
    try {
      const response = await fetch(
        "/api/quiz/submit",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fileData) }
      );
      try { await response.json(); } catch {}
      if (response.ok) setSubmitted(true);
    } catch (err) {
      console.error("❌ Network error:", err);
    }
  };

  const handleMentorClick = (answer) => {
    setMentorAnswer(answer);
    if (answer === "yes") {
      const { badge, level } = results;
      const subject = encodeURIComponent("GeniusSeeker Mentor Interest");
      const body    = encodeURIComponent(
        `Hi GeniusSeeker team,\n\nI'd love to mentor others as a Level ${level} ${badge} professional.\n\nLove,\n`
      );
      window.location.href = `mailto:mentor@geniusseeker.com?subject=${subject}&body=${body}`;
    }
  };

  // ---------------------------
  // Send results email
  // ---------------------------
  const handleSendEmail = async () => {
    setSendError("");
    if (!email) { alert("Please enter your email address."); return; }

    const hederaAccountId = gsGetAccountId();
    if (!hederaAccountId) {
      alert("Please go back to Candidates and click Save Identity first, then return to the quiz.");
      return;
    }

    const { badge, level, payRange, compStructure, wageRange, workStyle, workLocation } = results;

    const resultsPayload = {
      badge, level, payRange,
      compStructure:  COMP_LABELS[compStructure]         || compStructure,
      wageRange:      WAGE_LABELS[wageRange]             || wageRange,
      workStyle:      WORK_STYLE_LABELS[workStyle]       || workStyle,
      workLocation:   WORK_LOCATION_LABELS[workLocation] || workLocation,
      answers: answers.map((a, i) => ({
        q: i + 1, label: a?.label ?? "", category: a?.category ?? "", weight: a?.weight ?? 1,
      })),
      quizVersion:  "STEAM_V2",
      issuedStatus: issueStatus,
      timestamp:    new Date().toISOString(),
    };

    setSendStatus("sending");
    try {
      await submitToServer();
      await gsPost("/api/results/email", {
        email, hederaAccountId,
        displayName: gsGetDisplayName(),
        results: resultsPayload,
      });
      setSendStatus("sent");
    } catch (err) {
      console.error("❌ Send results failed:", err);
      setSendStatus("error");
      setSendError(err?.message || "Send failed");
      alert("Could not send results. Please try again.");
    }
  };

  const handleOptionClick = (opt) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = opt;
      return next;
    });
    setStep((prev) => prev + 1);
  };

  const goBack = () => { if (step > 0) setStep((s) => s - 1); };

  const resetQuiz = () => {
    setStep(0); setAnswers([]); setSubmitted(false);
    setIncomeAnswer(null); setMentorAnswer(null);
    setShowEmailForm(false); setEmail(""); setShowAllAnswers(false);
    issuedRef.current = false; setIssueStatus("");
    setSendStatus(""); setSendError("");
  };

  const shell     = "min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white";
  const container = "mx-auto w-full max-w-3xl px-4 py-10";
  const card      = "rounded-3xl border border-white/10 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,.35)] backdrop-blur-xl";
  const pad       = "p-6 sm:p-8";

  // ── RESULTS ──────────────────────────────────────────────────────────
  if (isFinished && results) {
    const {
      badge, secondaryBadge, level, payRange,
      compStructure, wageRange, workStyle, workLocation,
    } = results;

    const hederaAccountId = gsGetAccountId();

    return (
      <div className={shell}>
        <div className={container}>
          <div className={`${card} ${pad}`}>

            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm text-white/70">GeniusSeeker STEAM Assessment</p>
                <h2 className="mt-1 text-2xl sm:text-3xl font-semibold">Your Results</h2>
                <div className="mt-2 text-xs text-white/60">
                  {!hederaAccountId && <span>Connect your Hedera Account ID on the Candidates page to save your badge on-chain.</span>}
                  {hederaAccountId && issueStatus === "pending" && <span>Saving your badge…</span>}
                  {hederaAccountId && issueStatus === "ok"      && <span>Badge saved ✅</span>}
                  {hederaAccountId && issueStatus === "error"   && <span>Couldn't save badge right now (refresh and try again).</span>}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <p className="text-xs text-white/60">Skill Level</p>
                <p className="text-lg font-semibold">Level {level}</p>
              </div>
            </div>

            {/* STEAM Badge + Earning */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-wide text-white/60">Primary Badge</p>
                <p className="mt-2 text-2xl font-semibold">{badge}</p>
                {secondaryBadge && (
                  <p className="mt-1 text-sm text-white/55">
                    Strong secondary: <span className="text-white/80 font-medium">{secondaryBadge}</span>
                  </p>
                )}
                <p className="mt-2 text-sm text-white/70">
                  This reflects your strongest "default mode" across the assessment.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-wide text-white/60">Earning Potential</p>
                <p className="mt-2 text-lg font-semibold">{payRange}</p>
                <p className="mt-2 text-sm text-white/70">Estimated based on your level signals.</p>
              </div>
            </div>

            {/* Work Preferences Summary */}
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-wide text-white/60 mb-3">Your Work Preferences</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {compStructure && (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-white/40 mt-0.5">💰</span>
                    <div>
                      <span className="text-white/50 text-xs block">Compensation</span>
                      <span className="text-white/85 font-medium">{COMP_LABELS[compStructure] || compStructure}</span>
                    </div>
                  </div>
                )}
                {wageRange && (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-white/40 mt-0.5">🎯</span>
                    <div>
                      <span className="text-white/50 text-xs block">Target Compensation</span>
                      <span className="text-white/85 font-medium">{WAGE_LABELS[wageRange] || wageRange}</span>
                    </div>
                  </div>
                )}
                {workStyle && (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-white/40 mt-0.5">🤝</span>
                    <div>
                      <span className="text-white/50 text-xs block">Work Style</span>
                      <span className="text-white/85 font-medium">{WORK_STYLE_LABELS[workStyle] || workStyle}</span>
                    </div>
                  </div>
                )}
                {workLocation && (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-white/40 mt-0.5">📍</span>
                    <div>
                      <span className="text-white/50 text-xs block">Location Preference</span>
                      <span className="text-white/85 font-medium">{WORK_LOCATION_LABELS[workLocation] || workLocation}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Income question */}
            {incomeAnswer === null && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-lg font-medium">Are you currently earning at or above this level?</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button onClick={() => setIncomeAnswer("yes")}
                    className="w-full rounded-2xl bg-emerald-600/90 px-5 py-3 font-semibold hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-300/60">
                    Yes
                  </button>
                  <button onClick={() => setIncomeAnswer("no")}
                    className="w-full rounded-2xl bg-rose-600/90 px-5 py-3 font-semibold hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-300/60">
                    No
                  </button>
                </div>
              </div>
            )}

            {incomeAnswer === "yes" && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-lg font-medium">
                  Beautiful. Would you be interested in mentoring other women to achieve their highest potential?
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button onClick={() => handleMentorClick("yes")}
                    className="w-full rounded-2xl bg-violet-600/90 px-5 py-3 font-semibold hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-300/60">
                    Yes, I'd love to mentor
                  </button>
                  <button onClick={() => handleMentorClick("no")}
                    className="w-full rounded-2xl bg-white/10 px-5 py-3 font-semibold hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30">
                    Not right now
                  </button>
                </div>
              </div>
            )}

            {incomeAnswer === "no" && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-lg font-medium">
                  Let's change that. Schedule time to get on the path to earning your full potential.
                </p>
                <a href="https://calendly.com/desiree33/geniusseeker-interview"
                  target="_blank" rel="noopener noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600/90 px-5 py-3 font-semibold hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-300/60 sm:w-auto">
                  Schedule a GeniusSeeker session
                </a>
              </div>
            )}

            {/* Email results */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
              {!showEmailForm ? (
                <button onClick={() => { setShowEmailForm(true); setSendStatus(""); setSendError(""); }}
                  className="w-full rounded-2xl bg-indigo-600/90 px-5 py-3 font-semibold hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300/60">
                  Email me my results
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-white/70">
                    We'll send your STEAM badge, level, work preferences, and earning potential straight to your inbox.
                  </p>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-300/50" />
                  <button onClick={handleSendEmail} disabled={sendStatus === "sending"}
                    className={["w-full rounded-2xl px-5 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300/60",
                      sendStatus === "sending" ? "bg-indigo-600/40 cursor-not-allowed" : "bg-indigo-600/90 hover:bg-indigo-600"].join(" ")}>
                    {sendStatus === "sending" ? "Sending…" : "Send results"}
                  </button>
                  {sendStatus === "sent"  && <div className="text-sm text-emerald-200">Sent ✅ Check your inbox.</div>}
                  {sendStatus === "error" && <div className="text-sm text-rose-200">Could not send. {sendError ? `(${sendError})` : ""}</div>}
                </div>
              )}
            </div>

            {/* Show all answers */}
            <div className="mt-6">
              <button onClick={() => setShowAllAnswers((v) => !v)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-left font-semibold hover:bg-white/10">
                {showAllAnswers ? "Hide" : "Show"} my answers
              </button>
              {showAllAnswers && (
                <ul className="mt-4 space-y-2">
                  {answers.map((a, i) => (
                    <li key={i} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                      <span className="font-semibold text-white/90">Q{i + 1}:</span>{" "}
                      <span className="text-white/80">{a?.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button onClick={resetQuiz} className="rounded-2xl bg-white/10 px-5 py-3 font-semibold hover:bg-white/15">
                Retake quiz
              </button>
              <button onClick={submitToServer}
                className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 font-semibold hover:bg-black/40">
                {submitted ? "Saved ✅" : "Save my results"}
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-white/50">GeniusSeeker • STEAM Badge Assessment v2</p>
        </div>
      </div>
    );
  }

  // ── IN-PROGRESS ───────────────────────────────────────────────────────
  return (
    <div className={shell}>
      <div className={container}>
        <div className={`${card} ${pad}`}>
          <div>
            <p className="text-sm text-white/70">GeniusSeeker STEAM Assessment</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-semibold">
              Question {step + 1} of {total}
            </h2>

            <div className="mt-4 h-2 w-full rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-violet-400/90 transition-all" style={{ width: `${progressPct}%` }} />
            </div>

            <p className="mt-6 text-xl sm:text-2xl font-medium leading-snug">{current.question}</p>
            <p className="mt-2 text-sm text-white/60">Choose the option that feels most natural.</p>
          </div>

          <div className="mt-6 space-y-3">
            {current.options.map((opt, idx) => (
              <button key={idx} type="button" onClick={() => handleOptionClick(opt)}
                className={[
                  "w-full text-left rounded-2xl border border-white/12 bg-white/5",
                  "px-5 py-4",
                  "hover:bg-white/10 hover:border-white/20",
                  "active:scale-[0.99] transition",
                  "focus:outline-none focus:ring-2 focus:ring-violet-300/60",
                ].join(" ")}>
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-5 w-5 rounded-full border border-white/25 flex items-center justify-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white/95 leading-snug">{opt.label}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <button type="button" onClick={goBack} disabled={step === 0}
              className={["rounded-2xl px-5 py-3 font-semibold transition-all",
                step === 0 ? "bg-white/5 text-white/30 cursor-not-allowed" : "bg-white/10 hover:bg-white/15"].join(" ")}>
              Back
            </button>
            <p className="text-xs text-white/45">Click an option to continue</p>
          </div>

          <p className="mt-6 text-center text-xs text-white/45">Your answers are private. You can retake this anytime.</p>
        </div>
      </div>
    </div>
  );
}


