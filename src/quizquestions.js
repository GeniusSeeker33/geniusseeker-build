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

export { questions };
