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
  return (v ? v.replace(/\/$/, "") : "http://localhost:8787");
};

console.log("GS API base (Quiz):", gsApiBase());

// Prefer the stable key we set on candidates.html; fall back to older keys
const gsGetAccountId = () =>
  (localStorage.getItem("GS_HEDERA_ACCOUNT_ID") ||
    localStorage.getItem("gs_hedera_account_id") ||
    "").trim();

const gsGetDisplayName = () => (localStorage.getItem("gs_display_name") || "").trim();

async function gsPost(path, payload) {
  const url = gsApiBase() + path;

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      // IMPORTANT: do NOT set credentials:"include" (CORS + dev origin "*")
      body: JSON.stringify(payload || {}),
    });
  } catch (err) {
    throw new Error(`Network/CORS error calling ${url}: ${err?.message || err}`);
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const detail = data?.error ? JSON.stringify(data.error) : (data?.raw || text || "");
    throw new Error(`API ${res.status} on ${path}: ${detail}`);
  }

  return data;
}

// ---------------------------
// pay range text by level
// ---------------------------
const getPayRange = (level) => {
  switch (level) {
    case 1:
      return "$10–$20/hour (early-career / exploring)";
    case 2:
      return "$20–$30/hour (developing professional)";
    case 3:
      return "$30–$50/hour (established contributor)";
    case 4:
      return "$50–$100/hour (senior / strategic leader)";
    case 5:
    default:
      return "$100+/hour or equivalent salary (top of field)";
  }
};

export default function Quiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]); // answers aligned to question index
  const [submitted, setSubmitted] = useState(false);

  const [incomeAnswer, setIncomeAnswer] = useState(null); // "yes" | "no" | null
  const [mentorAnswer, setMentorAnswer] = useState(null); // "yes" | "no" | null
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [showAllAnswers, setShowAllAnswers] = useState(false);

  // Badge issuance UX status
  const [issueStatus, setIssueStatus] = useState(""); // "", "pending", "ok", "skipped", "error"

  // NEW: results email (server relay) status
  const [sendStatus, setSendStatus] = useState(""); // "", "sending", "sent", "error"
  const [sendError, setSendError] = useState("");

  const total = questions.length;
  const isFinished = step >= total;
  const current = !isFinished ? questions[step] : null;
  const progressPct = Math.round((Math.min(step, total) / total) * 100);

  const calculateBadgeAndLevel = () => {
    const counts = { Science: 0, Technology: 0, Engineering: 0, Arts: 0, Math: 0 };

    // Q26 is the years-in-field question (0-based index 25)
    const EXPERIENCE_QUESTION_INDEX = 25;

    let level = null;

    answers.forEach((answerObj, index) => {
      if (!answerObj) return;

      const { category, weight } = answerObj;

      // LEVEL: only use experience question for Level 1–5
      if (index === EXPERIENCE_QUESTION_INDEX && category?.startsWith("Level")) {
        const parsed = parseInt(category.replace("Level", ""), 10);
        if (!Number.isNaN(parsed)) level = parsed;
        return;
      }

      // BADGE: accumulate STEAM weights
      if (category && Object.prototype.hasOwnProperty.call(counts, category)) {
        counts[category] += weight ?? 1;
      }
    });

    if (!level) level = 1;

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const badge = sorted[0]?.[0] || "Science";

    return { badge, level };
  };

  const results = useMemo(() => {
    if (!isFinished) return null;
    const { badge, level } = calculateBadgeAndLevel();
    return { badge, level, payRange: getPayRange(level) };
  }, [isFinished, answers]);

  // ---------------------------
  // Issue badge + log value event ONCE when results show
  // ---------------------------
  const issuedRef = useRef(false);

  useEffect(() => {
    if (!isFinished || !results) return;
    if (issuedRef.current) return;

    const hederaAccountId = gsGetAccountId();

    // If user hasn't connected identity, don't issue
    if (!hederaAccountId) {
      setIssueStatus("skipped");
      issuedRef.current = true;
      return;
    }

    issuedRef.current = true;
    setIssueStatus("pending");

    (async () => {
      try {
        const displayName = gsGetDisplayName();
        const { badge, level, payRange } = results;

        await gsPost("/api/badges/issue", {
          hederaAccountId,
          displayName,
          badge: {
            category: badge,
            level,
            payRange,
            issuedFor: "STEAM Identity Quiz",
          },
          quizVersion: "STEAM_V1",
        });

        await gsPost("/api/value/log", {
          actor: hederaAccountId,
          eventType: "QUIZ_COMPLETED",
          amount: "25",
          currency: "GLCD",
          reference: "steam-quiz",
          metadata: { category: badge, level },
        });

        setIssueStatus("ok");
      } catch (err) {
        console.error("❌ Failed issuing badge:", err);
        setIssueStatus("error");
      }
    })();
  }, [isFinished, results]);

  // ---------------------------
  // Existing server upload (Netlify function)
  // ---------------------------
  const submitToServer = async () => {
    if (submitted) return;

    const { badge, level } = calculateBadgeAndLevel();

    const fileData = {
      timestamp: new Date().toISOString(),
      answers,
      awardedBadge: badge,
      level,
      source: "steam-card-quiz",
    };

    try {
      const response = await fetch(
        "https://symphonious-sunshine-96ba29.netlify.app/.netlify/functions/upload",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fileData),
        }
      );

      try {
        await response.json();
      } catch {
        // ignore parse errors
      }

      if (response.ok) setSubmitted(true);
    } catch (err) {
      console.error("❌ Network error:", err);
    }
  };

  const handleMentorClick = (answer, badge, level) => {
    setMentorAnswer(answer);
    if (answer === "yes") {
      const subject = encodeURIComponent("GeniusSeeker Mentor Interest");
      const body = encodeURIComponent(
        `Hi GeniusSeeker team,\n\nI’d love to mentor others as a Level ${level} ${badge} professional.\n\nLove,\n`
      );
      window.location.href = `mailto:mentor@geniusseeker.com?subject=${subject}&body=${body}`;
    }
  };

  // ---------------------------
  // NEW: Send results via identity-service -> Formspree relay
  // ---------------------------
  const handleSendEmail = async () => {
    setSendError("");

    if (!email) {
      alert("Please enter your email address.");
      return;
    }

    const hederaAccountId = gsGetAccountId();
    const displayName = gsGetDisplayName();

    // If they didn’t connect identity, we can still send, but better UX to instruct them
    if (!hederaAccountId) {
      alert("Please go back to Candidates and click Save Identity first, then return to the quiz.");
      return;
    }

    const { badge, level } = calculateBadgeAndLevel();
    const payRange = getPayRange(level);

    const answerLines = answers.map((a, i) => `Q${i + 1}: ${a?.label ?? ""}`).join("\n");

    const resultsPayload = {
      badge,
      level,
      payRange,
      answers: answers.map((a, i) => ({
        q: i + 1,
        label: a?.label ?? "",
        category: a?.category ?? "",
        weight: a?.weight ?? 1,
      })),
      answerLines,
      quizVersion: "STEAM_V1",
      issuedStatus: issueStatus,
      timestamp: new Date().toISOString(),
    };

    setSendStatus("sending");

    try {
      // Optional: also persist to your existing Netlify storage
      await submitToServer();

      // Send to backend (which relays to Formspree)
      await gsPost("/api/results/email", {
        email,
        hederaAccountId,
        displayName,
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

  const goBack = () => {
    if (step <= 0) return;
    setStep((s) => s - 1);
  };

  const resetQuiz = () => {
    setStep(0);
    setAnswers([]);
    setSubmitted(false);
    setIncomeAnswer(null);
    setMentorAnswer(null);
    setShowEmailForm(false);
    setEmail("");
    setShowAllAnswers(false);

    issuedRef.current = false;
    setIssueStatus("");

    setSendStatus("");
    setSendError("");
  };

  const shell = "min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white";
  const container = "mx-auto w-full max-w-3xl px-4 py-10";
  const card =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,.35)] backdrop-blur-xl";
  const pad = "p-6 sm:p-8";

  // ---------- RESULTS ----------
  if (isFinished && results) {
    const { badge, level, payRange } = results;
    const hederaAccountId = gsGetAccountId();

    return (
      <div className={shell}>
        <div className={container}>
          <div className={`${card} ${pad}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm text-white/70">GeniusSeeker STEAM Assessment</p>
                <h2 className="mt-1 text-2xl sm:text-3xl font-semibold">Your Results</h2>

                <div className="mt-2 text-xs text-white/60">
                  {!hederaAccountId && (
                    <span>Connect your Hedera Account ID on the Candidates page to save your badge on-chain.</span>
                  )}
                  {hederaAccountId && issueStatus === "pending" && <span>Saving your badge…</span>}
                  {hederaAccountId && issueStatus === "ok" && <span>Badge saved ✅</span>}
                  {hederaAccountId && issueStatus === "error" && (
                    <span>Couldn’t save badge right now (refresh and try again).</span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <p className="text-xs text-white/60">Skill Level</p>
                <p className="text-lg font-semibold">Level {level}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-wide text-white/60">Awarded Badge</p>
                <p className="mt-2 text-2xl font-semibold">{badge}</p>
                <p className="mt-2 text-sm text-white/70">
                  This reflects your strongest “default mode” across the assessment.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-wide text-white/60">Earning Potential</p>
                <p className="mt-2 text-lg font-semibold">{payRange}</p>
                <p className="mt-2 text-sm text-white/70">This is an estimate based on your level signals.</p>
              </div>
            </div>

            {incomeAnswer === null && (
              <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-lg font-medium">Are you currently earning at or above this level?</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => setIncomeAnswer("yes")}
                    className="w-full rounded-2xl bg-emerald-600/90 px-5 py-3 font-semibold hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setIncomeAnswer("no")}
                    className="w-full rounded-2xl bg-rose-600/90 px-5 py-3 font-semibold hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-300/60"
                  >
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
                  <button
                    onClick={() => handleMentorClick("yes", badge, level)}
                    className="w-full rounded-2xl bg-violet-600/90 px-5 py-3 font-semibold hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-300/60"
                  >
                    Yes, I’d love to mentor
                  </button>
                  <button
                    onClick={() => handleMentorClick("no", badge, level)}
                    className="w-full rounded-2xl bg-white/10 px-5 py-3 font-semibold hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
                  >
                    Not right now
                  </button>
                </div>
              </div>
            )}

            {incomeAnswer === "no" && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-lg font-medium">
                  Let’s change that. Schedule time to get on the path to earning your full potential.
                </p>
                <a
                  href="https://calendly.com/desiree33/geniusseeker-interview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600/90 px-5 py-3 font-semibold hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-300/60 sm:w-auto"
                >
                  Schedule a GeniusSeeker session
                </a>
              </div>
            )}

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
              {!showEmailForm ? (
                <button
                  onClick={() => {
                    setShowEmailForm(true);
                    setSendStatus("");
                    setSendError("");
                  }}
                  className="w-full rounded-2xl bg-indigo-600/90 px-5 py-3 font-semibold hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300/60"
                >
                  Email me my results
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-white/70">
                    Enter the email address where you’d like to receive your results. A copy will be sent to GeniusSeeker
                    for follow-up support.
                  </p>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-300/50"
                  />

                  <button
                    onClick={handleSendEmail}
                    disabled={sendStatus === "sending"}
                    className={[
                      "w-full rounded-2xl px-5 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300/60",
                      sendStatus === "sending"
                        ? "bg-indigo-600/40 cursor-not-allowed"
                        : "bg-indigo-600/90 hover:bg-indigo-600",
                    ].join(" ")}
                  >
                    {sendStatus === "sending" ? "Sending…" : "Send results"}
                  </button>

                  {sendStatus === "sent" && (
                    <div className="text-sm text-emerald-200">
                      Sent ✅ Check your inbox (and we received a copy for follow-up).
                    </div>
                  )}

                  {sendStatus === "error" && (
                    <div className="text-sm text-rose-200">
                      Could not send results. {sendError ? `(${sendError})` : ""}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-8">
              <button
                onClick={() => setShowAllAnswers((v) => !v)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-left font-semibold hover:bg-white/10"
              >
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

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button onClick={resetQuiz} className="rounded-2xl bg-white/10 px-5 py-3 font-semibold hover:bg-white/15">
                Retake quiz
              </button>

              <button
                onClick={submitToServer}
                className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 font-semibold hover:bg-black/40"
              >
                {submitted ? "Saved ✅" : "Save my results"}
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-white/50">GeniusSeeker • STEAM Badge Assessment</p>
        </div>
      </div>
    );
  }

  // ---------- IN-PROGRESS ----------
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
              <button
                key={idx}
                type="button"
                onClick={() => handleOptionClick(opt)}
                className={[
                  "w-full text-left rounded-2xl border border-white/12 bg-white/5",
                  "px-5 py-4",
                  "hover:bg-white/10 hover:border-white/20",
                  "active:scale-[0.99] transition",
                  "focus:outline-none focus:ring-2 focus:ring-violet-300/60",
                ].join(" ")}
              >
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
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className={[
                "rounded-2xl px-5 py-3 font-semibold transition-all",
                step === 0 ? "bg-white/5 text-white/30 cursor-not-allowed" : "bg-white/10 hover:bg-white/15",
              ].join(" ")}
            >
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


