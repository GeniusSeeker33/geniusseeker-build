import React, { useMemo, useState } from "react";

// 27-question upgraded STEAM assessment
const questions = [
  // 1. Problem-solving style
  {
    question:
      "When you’re given a brand-new project with little direction, what do you naturally do first?",
    options: [
      {
        label: "Gather existing research, data, or evidence before moving forward",
        category: "Science",
        weight: 1.0,
      },
      {
        label: "Explore tools, platforms, or tech solutions that might help",
        category: "Technology",
        weight: 1.0,
      },
      {
        label: "Break it down into a structured plan with steps and dependencies",
        category: "Engineering",
        weight: 1.0,
      },
      {
        label: "Sketch ideas, mind maps, or visuals to see possibilities",
        category: "Arts",
        weight: 1.0,
      },
      {
        label: "Estimate impact, prioritize by numbers, and define measurable goals",
        category: "Math",
        weight: 1.0,
      },
    ],
  },

  // 2. Under time pressure
  {
    question: "A tight deadline shows up unexpectedly. What is your instinctive response?",
    options: [
      { label: "Narrow the scope to what’s provable and essential", category: "Science", weight: 0.9 },
      { label: "Automate or digitize steps to save time", category: "Technology", weight: 0.9 },
      { label: "Rebuild the timeline and optimize the workflow", category: "Engineering", weight: 0.9 },
      { label: "Simplify the deliverable but keep it impactful and compelling", category: "Arts", weight: 0.9 },
      { label: "Recalculate priorities and resource allocation to hit the target", category: "Math", weight: 0.9 },
    ],
  },

  // 3. Information seeking
  {
    question: "When you don’t understand something at work, how do you usually move forward?",
    options: [
      { label: "Look for patterns in the data or results until it clicks", category: "Math", weight: 0.9 },
      { label: "Dive into documentation or research articles", category: "Science", weight: 0.9 },
      { label: "Experiment with a prototype or try it hands-on", category: "Engineering", weight: 0.9 },
      { label: "Search for tutorials, tools, or online communities", category: "Technology", weight: 0.9 },
      { label: "Ask for examples, stories, or analogies that make it relatable", category: "Arts", weight: 0.9 },
    ],
  },

  // 4. Collaboration role
  {
    question: "In a cross-functional team meeting, which role do you most often play?",
    options: [
      { label: "The one who ensures the data, facts, and assumptions are solid", category: "Science", weight: 1.0 },
      { label: "The one who suggests digital tools or systems to make it work", category: "Technology", weight: 1.0 },
      { label: "The one who organizes the plan, owners, and timelines", category: "Engineering", weight: 1.0 },
      { label: "The one who brings creative ideas and keeps the story inspiring", category: "Arts", weight: 1.0 },
      { label: "The one who keeps an eye on budget, KPIs, and impact metrics", category: "Math", weight: 1.0 },
    ],
  },

  // 5. Motivation driver
  {
    question: "What matters most to you in your work output?",
    options: [
      { label: "That it’s accurate, evidence-based, and trustworthy", category: "Science", weight: 1.0 },
      { label: "That it’s innovative, modern, and leverages technology", category: "Technology", weight: 1.0 },
      { label: "That it’s reliable, scalable, and structurally sound", category: "Engineering", weight: 1.0 },
      { label: "That it’s beautiful, meaningful, and emotionally resonant", category: "Arts", weight: 1.0 },
      { label: "That it’s efficient, optimized, and clearly measurable", category: "Math", weight: 1.0 },
    ],
  },

  // 6. Learning style
  {
    question: "When you want to upskill, what’s your preferred way to learn?",
    options: [
      { label: "Reading articles, whitepapers, or research summaries", category: "Science", weight: 0.8 },
      { label: "Taking structured online courses or certifications", category: "Technology", weight: 0.8 },
      { label: "Hands-on workshops, labs, or real-world practice", category: "Engineering", weight: 0.8 },
      { label: "Learning through creative projects, design, or storytelling", category: "Arts", weight: 0.8 },
      { label: "Working through examples, exercises, and problem sets", category: "Math", weight: 0.8 },
    ],
  },

  // 7. Joy at work
  {
    question: "Which type of task lights you up the most at work?",
    options: [
      { label: "Designing experiments, tests, or validation processes", category: "Science", weight: 0.9 },
      { label: "Configuring tools, dashboards, or technical systems", category: "Technology", weight: 0.9 },
      { label: "Improving a process, system, or workflow so it runs smoother", category: "Engineering", weight: 0.9 },
      { label: "Creating visuals, copy, presentations, or experiences", category: "Arts", weight: 0.9 },
      { label: "Analyzing reports, metrics, or models to guide decisions", category: "Math", weight: 0.9 },
    ],
  },

  // 8. Handling ambiguity
  {
    question: "How do you feel about ambiguous or open-ended problems?",
    options: [
      { label: "I define hypotheses and test my way through the unknown", category: "Science", weight: 1.0 },
      { label: "I look for tools or frameworks that bring clarity", category: "Technology", weight: 1.0 },
      { label: "I create structure and milestones to bring order", category: "Engineering", weight: 1.0 },
      { label: "I explore possibilities creatively until a direction emerges", category: "Arts", weight: 1.0 },
      { label: "I quantify assumptions and stress-test scenarios", category: "Math", weight: 1.0 },
    ],
  },

  // 9. Feedback preference
  {
    question: "What kind of feedback feels most useful to you?",
    options: [
      { label: "Evidence-based feedback supported by observations or data", category: "Science", weight: 0.8 },
      { label: "Suggestions about better tools, platforms, or techniques", category: "Technology", weight: 0.8 },
      { label: "Input on structure, feasibility, and execution quality", category: "Engineering", weight: 0.8 },
      { label: "Reflections on impact, story, and emotional resonance", category: "Arts", weight: 0.8 },
      { label: "Clear metrics, benchmarks, and measurable outcomes", category: "Math", weight: 0.8 },
    ],
  },

  // 10. Conflict response
  {
    question: "When a project is going off-track, you tend to:",
    options: [
      { label: "Verify assumptions and check what’s actually true", category: "Science", weight: 0.9 },
      { label: "Introduce or adjust a system/tool to get things back in line", category: "Technology", weight: 0.9 },
      { label: "Rebuild the plan, roles, and sequence of tasks", category: "Engineering", weight: 0.9 },
      { label: "Re-frame the story and reconnect the team to the “why”", category: "Arts", weight: 0.9 },
      { label: "Revisit budgets, capacity, and constraints to rebalance", category: "Math", weight: 0.9 },
    ],
  },

  // 11. Focus zone
  {
    question: "You feel most “in the zone” when you’re:",
    options: [
      { label: "Investigating, researching, or getting to the bottom of something", category: "Science", weight: 1.0 },
      { label: "Solving problems with tech, code, or digital tools", category: "Technology", weight: 1.0 },
      { label: "Building, architecting, or improving systems and structures", category: "Engineering", weight: 1.0 },
      { label: "Creating, designing, writing, performing, or storytelling", category: "Arts", weight: 1.0 },
      { label: "Modeling scenarios, optimizing decisions, or calculating impact", category: "Math", weight: 1.0 },
    ],
  },

  // 12. Risk style
  {
    question: "How do you relate to risk in your work?",
    options: [
      { label: "I want strong evidence before taking big risks", category: "Science", weight: 0.8 },
      { label: "I’m open to risk if the technology or idea is truly innovative", category: "Technology", weight: 0.8 },
      { label: "I prefer managed risk with solid contingency plans", category: "Engineering", weight: 0.8 },
      { label: "I’ll take creative risks if it could lead to something meaningful", category: "Arts", weight: 0.8 },
      { label: "I assess risk by probabilities and potential upside/downside", category: "Math", weight: 0.8 },
    ],
  },

  // 13. Detail vs big picture
  {
    question: "Which feels closest to how you naturally think?",
    options: [
      { label: "I zoom into details to be sure they’re accurate and valid", category: "Science", weight: 0.9 },
      { label: "I think in terms of systems, integrations, and platforms", category: "Technology", weight: 0.9 },
      { label: "I balance details with structure and flow across the whole", category: "Engineering", weight: 0.9 },
      { label: "I think in stories, visuals, or themes first", category: "Arts", weight: 0.9 },
      { label: "I move between summary and detail using numbers as a guide", category: "Math", weight: 0.9 },
    ],
  },

  // 14. Preferred recognition
  {
    question: "What kind of recognition feels most satisfying?",
    options: [
      { label: "“Your work changed how we understand this.”", category: "Science", weight: 0.7 },
      { label: "“Your solution transformed how we use technology.”", category: "Technology", weight: 0.7 },
      { label: "“Your structure and execution made this possible.”", category: "Engineering", weight: 0.7 },
      { label: "“Your creativity and voice made this unforgettable.”", category: "Arts", weight: 0.7 },
      { label: "“Your insights and analysis drove our results.”", category: "Math", weight: 0.7 },
    ],
  },

  // 15. Innovation pattern
  {
    question: "When you innovate, what do you most often innovate on?",
    options: [
      { label: "Methods of testing, measuring, or validating", category: "Science", weight: 0.8 },
      { label: "The digital tools, software, or tech stack you use", category: "Technology", weight: 0.8 },
      { label: "The way the process or system is built and runs", category: "Engineering", weight: 0.8 },
      { label: "The story, brand, visuals, or experience around it", category: "Arts", weight: 0.8 },
      { label: "The metrics, pricing, or model behind the strategy", category: "Math", weight: 0.8 },
    ],
  },

  // 16. Preferred environment
  {
    question: "In your ideal work environment, you would have:",
    options: [
      { label: "Time and tools to deeply research and think", category: "Science", weight: 0.9 },
      { label: "Access to powerful technology and experimentation space", category: "Technology", weight: 0.9 },
      { label: "Clear processes, strong collaboration, and stable systems", category: "Engineering", weight: 0.9 },
      { label: "Freedom to create, explore, and design new ideas", category: "Arts", weight: 0.9 },
      { label: "Reliable data, dashboards, and strong decision frameworks", category: "Math", weight: 0.9 },
    ],
  },

  // 17. Mentoring others
  {
    question: "When mentoring or supporting others, what do you most enjoy sharing?",
    options: [
      { label: "How to ask better questions and design experiments", category: "Science", weight: 0.8 },
      { label: "How to leverage tools, platforms, or automation", category: "Technology", weight: 0.8 },
      { label: "How to structure projects and solve operational problems", category: "Engineering", weight: 0.8 },
      { label: "How to express themselves, pitch, or tell their story", category: "Arts", weight: 0.8 },
      { label: "How to understand numbers, metrics, or financial impact", category: "Math", weight: 0.8 },
    ],
  },

  // 18. Handling failure
  {
    question: "After a project doesn’t go as planned, what’s your first instinct?",
    options: [
      { label: "Analyze what data and evidence reveal about what happened", category: "Science", weight: 0.9 },
      { label: "Check whether the tools or systems were the right fit", category: "Technology", weight: 0.9 },
      { label: "Review the process, roles, and handoffs for breakdowns", category: "Engineering", weight: 0.9 },
      { label: "Reflect on the story, alignment, and emotional dynamics", category: "Arts", weight: 0.9 },
      { label: "Evaluate forecasts vs reality and update the model", category: "Math", weight: 0.9 },
    ],
  },

  // 19. Self-description
  {
    question: "Which of these statements feels most like you?",
    options: [
      { label: "“I am a curious investigator.”", category: "Science", weight: 1.0 },
      { label: "“I am a systems and tools optimizer.”", category: "Technology", weight: 1.0 },
      { label: "“I am a builder of structures and solutions.”", category: "Engineering", weight: 1.0 },
      { label: "“I am a creator and storyteller.”", category: "Arts", weight: 1.0 },
      { label: "“I am a strategist guided by numbers.”", category: "Math", weight: 1.0 },
    ],
  },

  // 20. Energy source
  {
    question: "You feel energized after a day spent:",
    options: [
      { label: "Exploring questions and learning something new in depth", category: "Science", weight: 0.8 },
      { label: "Solving technical problems or building digital solutions", category: "Technology", weight: 0.8 },
      { label: "Designing or fixing systems to run more smoothly", category: "Engineering", weight: 0.8 },
      { label: "Expressing ideas creatively or collaborating on creative work", category: "Arts", weight: 0.8 },
      { label: "Making sense of data, trends, and business decisions", category: "Math", weight: 0.8 },
    ],
  },

  // 21. Decision style
  {
    question: "When you must make a decision with incomplete information, you tend to:",
    options: [
      { label: "Look for the most plausible evidence and make a reasoned call", category: "Science", weight: 0.9 },
      { label: "Trust your sense of what solution or tech will scale best", category: "Technology", weight: 0.9 },
      { label: "Choose what keeps the system stable and moving forward", category: "Engineering", weight: 0.9 },
      { label: "Lean into intuition and alignment with values or story", category: "Arts", weight: 0.9 },
      { label: "Estimate probabilities and go with the highest expected value", category: "Math", weight: 0.9 },
    ],
  },

  // 22. Preferred collaboration partner
  {
    question: "Which kind of partner do you most love working with?",
    options: [
      { label: "Someone who asks deep questions and challenges assumptions", category: "Science", weight: 0.7 },
      { label: "Someone who knows tools and tech you don’t", category: "Technology", weight: 0.7 },
      { label: "Someone who is strong in operations and execution", category: "Engineering", weight: 0.7 },
      { label: "Someone with big creative energy and vision", category: "Arts", weight: 0.7 },
      { label: "Someone who is brilliant with numbers and patterns", category: "Math", weight: 0.7 },
    ],
  },

  // 23. Long-term legacy
  {
    question: "Looking back years from now, what kind of impact do you most want to have made?",
    options: [
      { label: "Advancing knowledge, understanding, or truth in some area", category: "Science", weight: 1.0 },
      { label: "Shaping how people use technology in a meaningful way", category: "Technology", weight: 1.0 },
      { label: "Building systems, organizations, or solutions that still stand", category: "Engineering", weight: 1.0 },
      { label: "Creating experiences, art, or stories that people remember", category: "Arts", weight: 1.0 },
      { label: "Influencing outcomes through strategy, finance, or analytics", category: "Math", weight: 1.0 },
    ],
  },

  // 24–27: Level signals
  {
    question: "How do you feel about highly complex problems in your field?",
    options: [
      { label: "I often feel overwhelmed and unsure where to start", category: "Level1", weight: 1.0 },
      { label: "I can contribute, but usually need guidance", category: "Level2", weight: 1.0 },
      { label: "I can handle them with some effort and support", category: "Level3", weight: 1.0 },
      { label: "I’m comfortable leading through complex situations", category: "Level4", weight: 1.0 },
      { label: "I seek out complexity and often teach others how to navigate it", category: "Level5", weight: 1.0 },
    ],
  },
  {
    question: "Which best describes your relationship to your current field?",
    options: [
      { label: "I’m exploring and still deciding if this is my long-term path", category: "Level1", weight: 1.0 },
      { label: "I’m learning and gaining confidence, but still early in my journey", category: "Level2", weight: 1.0 },
      { label: "I’m established and can work independently on most things", category: "Level3", weight: 1.0 },
      { label: "I’m seen as a go-to person or informal leader in my area", category: "Level4", weight: 1.0 },
      { label: "I’m recognized as an expert/mentor and shape direction in my field", category: "Level5", weight: 1.0 },
    ],
  },
  {
    question: "How many years have you been working in your primary field or discipline?",
    options: [
      { label: "0–1 years", category: "Level1", weight: 1.5 },
      { label: "2–4 years", category: "Level2", weight: 1.5 },
      { label: "5–9 years", category: "Level3", weight: 1.5 },
      { label: "10–14 years", category: "Level4", weight: 1.5 },
      { label: "15+ years", category: "Level5", weight: 1.5 },
    ],
  },
  {
    question: "How actively are you investing in your own growth in this field right now?",
    options: [
      { label: "I rarely invest time in learning beyond what’s required", category: "Level1", weight: 1.0 },
      { label: "I occasionally take a course or read, when time allows", category: "Level2", weight: 1.0 },
      { label: "I consistently keep up with trends and upgrade my skills", category: "Level3", weight: 1.0 },
      { label: "I intentionally build advanced skills and seek stretch projects", category: "Level4", weight: 1.0 },
      { label: "I treat my growth as strategic and help others grow too", category: "Level5", weight: 1.0 },
    ],
  },
];

// pay range text by level
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

  const handleSendEmail = async () => {
    if (!email) {
      alert("Please enter your email address.");
      return;
    }

    const { badge, level } = calculateBadgeAndLevel();
    const payRange = getPayRange(level);

    const answerLines = answers.map((a, i) => `Q${i + 1}: ${a?.label ?? ""}`).join("\n");

    const bodyText =
      `Here are your GeniusSeeker STEAM Badge results:\n\n` +
      `Badge: ${badge}\n` +
      `Level: ${level}\n` +
      `Suggested earning potential: ${payRange}\n\n` +
      `Your answers:\n${answerLines}\n\n` +
      `With love,\nGeniusSeeker`;

    await submitToServer();

    const subject = "Your GeniusSeeker STEAM Badge Results";
    const mailtoUrl =
      `mailto:${encodeURIComponent(email)}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(bodyText)}` +
      `&bcc=${encodeURIComponent("info@geniusseeker.com")}`;

    window.location.href = mailtoUrl;
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
  };

  const shell = "min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white";
  const container = "mx-auto w-full max-w-3xl px-4 py-10";
  const card =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,.35)] backdrop-blur-xl";
  const pad = "p-6 sm:p-8";

  // ---------- RESULTS ----------
  if (isFinished && results) {
    const { badge, level, payRange } = results;

    return (
      <div className={shell}>
        <div className={container}>
          <div className={`${card} ${pad}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm text-white/70">GeniusSeeker STEAM Assessment</p>
                <h2 className="mt-1 text-2xl sm:text-3xl font-semibold">Your Results</h2>
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
                <p className="mt-2 text-sm text-white/70">
                  This is an estimate based on your level signals.
                </p>
              </div>
            </div>

            {/* earnings + mentoring flow */}
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

            {/* Email results flow */}
            <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
              {!showEmailForm ? (
                <button
                  onClick={() => setShowEmailForm(true)}
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
                    className="w-full rounded-2xl bg-indigo-600/90 px-5 py-3 font-semibold hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300/60"
                  >
                    Send results
                  </button>
                </div>
              )}
            </div>

            {/* Answers (collapsible) */}
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
              <div
                className="h-2 rounded-full bg-violet-400/90 transition-all"
                style={{ width: `${progressPct}%` }}
              />
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
