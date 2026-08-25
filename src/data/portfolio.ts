/* ===========================================================================
 * src/data/portfolio.ts
 *
 * Every personal fact on this site lives here and nowhere else. No component
 * hardcodes a name, a date, an institution, a project claim or a contact
 * detail; they all read from this object. tools/check_source.mjs enforces that
 * by failing if it finds personal content sitting in a component file.
 *
 * TWO RULES THIS FILE FOLLOWS, AND THEY MATTER MORE THAN THE SHAPE:
 *
 * 1. Nothing here is invented. Every string traces back to something you told
 *    me. Where a fact does not exist yet, the field is `null` and the UI shows
 *    an honest pending state instead of a plausible-looking URL. There are no
 *    percentages, no proficiency levels, no user counts, no revenue, no
 *    repository links that were guessed from a project name, and no university
 *    admissions.
 *
 * 2. `problem` and `approach` on each project are restatements of the
 *    description you supplied, not new claims. They exist because a case study
 *    reads better when it names the problem before the solution. Read them, and
 *    rewrite anything that misses your intent. That is the one place in this
 *    file where my words stand in for yours.
 *
 * TO EDIT THE SITE, EDIT THIS FILE. Change `person.name` and it changes the
 * hero, the nav wordmark, the document title, the Open Graph tags and the
 * close, because all five read this one field.
 * ========================================================================= */

/* ---------------------------------------------------------------- types --- */

export type ProjectStatus =
  | "Developing"
  | "Developed / Experimental"
  | "Completed / Running"
  | "Completed";

/** Drives the status pip colour only. No status is presented as better than
 *  another: `live` means running, `active` means being worked on now. */
export type StatusTone = "live" | "active" | "experimental";

export interface Project {
  id: string;
  /** Displayed as the chapter number. Order, not ranking. */
  index: string;
  name: string;
  fullName: string | null;
  category: string;
  type: string;
  status: ProjectStatus;
  tone: StatusTone;
  /** One or two sentences. This is the only project copy shown in the rail. */
  summary: string;
  /** A restatement of the purpose you gave. See rule 2 at the top of the file. */
  problem: string | null;
  approach: string | null;
  technologies: string[];
  concepts: string[];
  /** POGO only: the capability list you specified. */
  goals: string[] | null;
  /** POGO only: the architecture you named, in order. */
  architecture: ArchitectureNode[] | null;
  /** null renders as "Repository pending", never as a guessed URL. */
  repo: string | null;
  demo: string | null;
  /** Any true aside worth surfacing. */
  note: string | null;
  /** Marks the one project the page is built around. Exactly one is true. */
  hero: boolean;
}

export interface ArchitectureNode {
  key: string;
  label: string;
  /** Which layer of the stack it sits in, used for the diagram's rows. */
  tier: "edge" | "core" | "surface";
  blurb: string;
}

export interface SkillGroup {
  index: string;
  id: string;
  label: string;
  /** Design copy, deliberately free of any skill-level claim. */
  blurb: string;
  items: string[];
  /** Only projects that genuinely use this group, by project id. */
  projects: string[];
  /**
   * Neighbouring groups, by id. This is the spine of the skill graph.
   *
   * lib/graph.ts also DERIVES edges from shared items and shared projects, and
   * those derived edges are the interesting ones because they are evidence
   * rather than opinion: HTML, CSS and JavaScript genuinely connect Software
   * Development to Web Development, and Pakhi AI genuinely connects Artificial
   * Intelligence to Docker. But derivation alone leaves Cybersecurity, Linux
   * and Creative Technology with no edges at all, and a graph with orphans
   * reads as a bug. So this field states the relationships that are real but
   * not visible in the item lists, and the graph unions the two.
   */
  related: string[];
  /** Honest acknowledgement of unnamed work, or null. */
  unnamed: string | null;
}

export interface JourneyStage {
  key: string;
  label: string;
  state: "now" | "ahead";
  line: string;
}

export interface EducationEntry {
  id: string;
  kind: "current" | "intended";
  level: string;
  stream: string | null;
  institution: string | null;
  board: string | null;
  session: string | null;
  outcome: string;
  detail: string;
  /** Intended study only: the fields under consideration. */
  fields: string[] | null;
  destination: string | null;
}

export interface BuildingEntry {
  id: string;
  label: string;
  line: string;
  detail: string;
}

export interface Service {
  index: string;
  label: string;
  line: string;
}

export interface SocialLink {
  key: string;
  label: string;
  handle: string;
  url: string;
}

/* --------------------------------------------------------------- person --- */

export const person = {
  name: "Jubayer Tahsin",
  /** Split for the hero, which sets the two words on their own lines. */
  nameLines: ["Jubayer", "Tahsin"] as const,
  /** The two letterforms the signature object collapses into at the close. */
  monogram: "JT",
  /**
   * The handle that matches the email and the GitHub account.
   *
   * Only ever a fallback: the accounts do not share one spelling, so every
   * platform's real handle is written out in `social` below and that is what the
   * page renders. Nothing should print this string next to a platform name.
   */
  username: "xubayertahxin",
  status: "Student",
  role: "Student • AI Enthusiast • Developer",
  tagline: "Learn. Build. Innovate. Lead.",
  /** The four words as separate beats, for the philosophy interlude. */
  creed: ["Learn", "Build", "Innovate", "Lead"] as const,
  statement:
    "Exploring Computer Science, building with AI, and preparing to create technology that matters.",
  alternateStatement:
    "Building with AI. Learning by doing. Dreaming beyond limits.",
  location: "Bangladesh",
  year: "2026",
} as const;

/* ------------------------------------------------------------------ hero --- */

export const hero = {
  eyebrow: person.role,
  lines: person.nameLines,
  tagline: person.tagline,
  statement: person.statement,
  /** The word the decryption resolves to over the hero's own scroll. */
  primary: { label: "View projects", href: "#work" },
  secondary: { label: "Get in touch", href: "#contact" },
} as const;

/* ----------------------------------------------------------------- about --- */

export const about = {
  heading: "Who is Jubayer?",
  /** Shown as a spaced row of facts under the heading. */
  facts: [
    { key: "status", label: "Status", value: "HSC Science student" },
    { key: "place", label: "Based", value: "Bangladesh" },
    { key: "field", label: "Studying", value: "Science, headed for Computer Science" },
    { key: "year", label: "Graduating", value: "2026" },
  ],
  /** The paragraph the decryption resolves into. Kept short on purpose. */
  keyStatement: "I learn by building the thing.",
  body: [
    "I am an HSC Science student from Bangladesh with strong interests in Computer Science, Artificial Intelligence, Software Engineering, Cybersecurity, and Technology Entrepreneurship.",
    "Reading about a system tells me how it is supposed to work. Building one tells me how it actually does. So most of what I know came out of practical experimentation, real projects, technical problems that refused to resolve, and a lot of troubleshooting.",
    "Three of those interests are usually kept in three separate portfolios. To me they are one job. A model nobody can audit is a model nobody should ship, and neither of those matters if the thing has no surface a person can actually use.",
  ],
  /** How you said you prefer to learn. Rendered as a short list. */
  method: [
    "Practical experimentation",
    "Building real projects",
    "Solving technical problems",
    "Exploring future-oriented technologies",
    "Troubleshooting",
    "Hands-on development",
  ],
} as const;

/* --------------------------------------------------------------- purpose --- */

export const objective = {
  heading: "What I'm building toward",
  /** Long-term direction, stated as aspiration. Never as current employment. */
  direction:
    "Build strong technical skills, create real software and AI products, generate income through technology, and eventually build and lead a technology-driven company.",
  dream: {
    role: "CEO",
    /** The framing is load-bearing: this is a destination, not a job title. */
    framing: "Long-term aspiration, not a current title.",
  },
  stages: [
    {
      key: "now",
      label: "Now",
      state: "now",
      line: "HSC Science, and every spare hour spent building.",
    },
    {
      key: "learning",
      label: "Learning",
      state: "now",
      line: "Computer Science properly, at degree depth.",
    },
    {
      key: "building",
      label: "Building",
      state: "ahead",
      line: "Real software and AI products, shipped and used.",
    },
    {
      key: "innovating",
      label: "Innovating",
      state: "ahead",
      line: "Systems around AI, not just applications on top of it.",
    },
    {
      key: "leading",
      label: "Leading",
      state: "ahead",
      line: "A technology-driven company of my own.",
    },
  ] satisfies JourneyStage[],
} as const;

/* ---------------------------------------------------------------- skills --- */

/**
 * Eight groups, no levels, no bars, no percentages.
 *
 * `items` are the exact terms you listed, sorted into the group they belong to.
 * `projects` links a group to a named project ONLY where that project's own
 * technology list justifies it, so nothing here overstates what a project uses.
 * `unnamed` is how the groups with real but unnamed work stay honest.
 */
export const skills: SkillGroup[] = [
  {
    index: "01",
    id: "cs",
    label: "Computer Science",
    blurb: "The layer underneath everything else here.",
    items: ["Programming", "Software Engineering", "Problem solving", "Troubleshooting", "Automation"],
    projects: [],
    related: ["dev", "ai", "sys"],
    unnamed: null,
  },
  {
    index: "02",
    id: "dev",
    label: "Software Development",
    blurb: "What I write in, and what I write with.",
    items: ["Python", "JavaScript", "HTML", "CSS", "Git", "GitHub", "API Integration"],
    projects: ["pogo", "freellmapi", "omniroute", "vqt"],
    related: ["cs", "web", "ai", "infra"],
    unnamed: null,
  },
  {
    index: "03",
    id: "ai",
    label: "Artificial Intelligence",
    blurb: "Not only using models. Building the systems around them.",
    items: [
      "LLMs",
      "Multi-model AI",
      "AI Agents",
      "AI Memory",
      "Embeddings",
      "Model Routing",
      "Local AI",
      "Cloud AI",
      "Tool Use",
      "AI APIs",
      "AI Automation",
      "Machine Learning",
      "Personal AI",
      "AI Operating System",
    ],
    projects: ["pogo", "pakhi", "freellmapi", "omniroute"],
    related: ["cs", "dev", "infra", "web"],
    unnamed: "Further AI projects on GitHub, not yet written up here.",
  },
  {
    index: "04",
    id: "web",
    label: "Web Development",
    blurb: "The part people actually touch.",
    items: ["Web Development", "Static Websites", "HTML", "CSS", "JavaScript"],
    projects: ["pakhi"],
    related: ["dev", "ai", "creative"],
    unnamed: "Web projects on GitHub, not yet written up here.",
  },
  {
    index: "05",
    id: "sec",
    label: "Cybersecurity",
    blurb: "The reason I try to break what I build.",
    items: ["Cybersecurity"],
    projects: [],
    related: ["sys", "infra", "cs"],
    unnamed: "Cybersecurity projects on GitHub, not yet written up here.",
  },
  {
    index: "06",
    id: "sys",
    label: "Linux & Networking",
    blurb: "Where the software has to actually live.",
    items: ["Linux", "Networking"],
    projects: [],
    related: ["infra", "sec", "cs"],
    unnamed: "Linux and networking projects on GitHub, not yet written up here.",
  },
  {
    index: "07",
    id: "infra",
    label: "Docker & Infrastructure",
    blurb: "Making a thing run somewhere other than my machine.",
    items: [
      "Docker",
      "Dockerized Applications",
      "Self-hosted Applications",
      "Cloud Infrastructure",
      "DevOps",
    ],
    projects: ["pakhi"],
    related: ["sys", "dev", "ai", "sec"],
    unnamed: "Docker projects on GitHub, not yet written up here.",
  },
  {
    index: "08",
    id: "creative",
    label: "Creative Technology",
    blurb: "The half of the work that is about attention.",
    items: ["Video Editing", "Creative Content", "Reels", "YouTube"],
    projects: [],
    related: ["web", "ai"],
    unnamed: null,
  },
];

/* --------------------------------------------------------- ai ecosystem --- */

export const aiEcosystem = {
  heading: "The AI stack I keep coming back to",
  /** Platforms and tools you have explored or worked with. */
  platforms: [
    "ChatGPT",
    "OpenAI",
    "Claude",
    "Gemini",
    "Gemma",
    "OpenRouter",
    "FreeLLMAPI",
    "OmniRoute",
    "LM Studio",
    "Ollama",
    "Open WebUI",
    "OpenClaw",
  ],
  concepts: [
    "LLMs",
    "Multi-model AI",
    "AI Agents",
    "AI Memory",
    "Embeddings",
    "Model Routing",
    "Local AI",
    "Cloud AI",
    "Tool Use",
    "AI Automation",
    "Personal AI",
    "AI Operating System",
  ],
  /** The conceptual architecture you named, in order. */
  architecture: ["Local AI", "Cloud AI", "Model Router", "Memory", "Tools", "Automation"],
} as const;

/* -------------------------------------------------------------- projects --- */

export const projects: Project[] = [
  {
    id: "pogo",
    index: "01",
    name: "POGO",
    fullName: null,
    category: "Personal AI Operating System",
    type: "Personal AI Operating System / Personal AI Assistant",
    status: "Developing",
    tone: "active",
    summary:
      "A personal AI operating system: many models, a memory that persists, tools it can actually use, and automation on top. One assistant that knows the whole context instead of six chat tabs that each know a sliver.",
    problem:
      "Every model lives in its own window with its own blank memory. Nothing knows what I did yesterday, which model is right for this question, or how to reach my files.",
    approach:
      "Treat it as an operating system rather than a chat app. Route between local and cloud models, keep one persistent memory underneath them, give the whole thing tools, and let automation drive it.",
    technologies: ["OpenClaw", "LLM APIs", "Local AI", "Cloud AI", "Memory", "Automation"],
    concepts: ["Model routing", "Persistent memory", "Tool use", "Multi-model AI", "Personal AI"],
    goals: [
      "Personal memory",
      "Multiple AI models",
      "Model routing",
      "Tool use",
      "Automation",
      "Coding assistance",
      "File interaction",
      "Local AI",
      "Cloud AI",
      "Project assistance",
    ],
    architecture: [
      {
        key: "local",
        label: "Local AI",
        tier: "edge",
        blurb: "Runs on my own machine. Private, offline, no per-token cost.",
      },
      {
        key: "cloud",
        label: "Cloud AI",
        tier: "edge",
        blurb: "Reached for when the question is bigger than the local model.",
      },
      {
        key: "router",
        label: "Model Router",
        tier: "core",
        blurb: "Decides which model answers, so the rest of the system never has to care.",
      },
      {
        key: "memory",
        label: "Memory",
        tier: "core",
        blurb: "What makes it mine rather than a fresh assistant every morning.",
      },
      {
        key: "tools",
        label: "Tools",
        tier: "surface",
        blurb: "Files, code and the projects I am actually working on.",
      },
      {
        key: "automation",
        label: "Automation",
        tier: "surface",
        blurb: "The work that should happen without me asking for it twice.",
      },
    ],
    repo: null,
    demo: null,
    note: "Earlier in development the agent went by Crestodian.",
    hero: true,
  },
  {
    id: "pakhi",
    index: "02",
    name: "Pakhi AI",
    fullName: null,
    category: "AI Interface",
    type: "AI Interface / Open WebUI Customization",
    status: "Developed / Experimental",
    tone: "experimental",
    summary:
      "A personal AI interface built by customizing Open WebUI, so talking to local and hosted models happens somewhere that feels like mine rather than somewhere generic.",
    problem:
      "A default interface shapes how you use a model. I wanted the environment to fit the way I actually work with AI.",
    approach:
      "Start from Open WebUI rather than from nothing, and customize the surface into a personal environment for local and cloud models.",
    technologies: ["Open WebUI", "Local AI", "Self-hosted"],
    concepts: ["AI interface", "Local AI", "Personal environment"],
    goals: null,
    architecture: null,
    repo: null,
    demo: null,
    note: "Experimental by design. The interface is the experiment.",
    hero: false,
  },
  {
    id: "freellmapi",
    index: "03",
    name: "FreeLLMAPI",
    fullName: null,
    category: "AI Infrastructure",
    type: "AI Infrastructure / LLM API",
    status: "Completed / Running",
    tone: "live",
    summary:
      "One interface in front of many language models and providers, so an application can ask a question without first learning six different API shapes.",
    problem:
      "Every provider has its own request format, its own auth, its own quirks. Supporting four of them means writing the same integration four times.",
    approach:
      "Abstract the model behind a common interface, and let the platform absorb the differences between providers.",
    technologies: ["LLM APIs", "Multi-provider AI"],
    concepts: ["Unified interface", "Model abstraction", "Multi-provider AI", "AI infrastructure"],
    goals: null,
    architecture: null,
    repo: null,
    demo: null,
    note: null,
    hero: false,
  },
  {
    id: "omniroute",
    index: "04",
    name: "OmniRoute",
    fullName: null,
    category: "AI Model Routing",
    type: "AI Model Routing / Infrastructure",
    status: "Completed",
    tone: "live",
    summary:
      "A routing layer between an application and many models, so switching provider is a configuration change rather than a rewrite.",
    problem:
      "Building against one provider's API is building a dependency on that provider. Swapping models later means touching everything.",
    approach:
      "Put a router in the middle. The application talks to the router, the router talks to whichever provider fits, and the application stays provider-independent.",
    technologies: ["LLM APIs", "Multi-provider AI", "Model routing"],
    concepts: ["AI routing", "Provider independence", "Usage optimization", "AI infrastructure"],
    goals: null,
    architecture: null,
    repo: null,
    demo: null,
    note: null,
    hero: false,
  },
  {
    id: "vqt",
    index: "05",
    name: "VQT",
    fullName: "Video QR Data Transfer",
    category: "Experimental Technology",
    type: "Data Transfer / Experimental Technology",
    status: "Developing",
    tone: "active",
    summary:
      "Moving data between devices as pictures. Encode the payload into QR frames, play them as video, and let the other device read it back with a camera.",
    problem:
      "Two devices that cannot be paired, networked, or trusted with a cable still have a screen and a camera between them.",
    approach:
      "Use visual encoding as the transport: frames of QR carried by video, decoded on the far side.",
    technologies: ["QR", "Video", "Visual encoding"],
    concepts: ["Experimental technology", "Visual encoding", "Data transfer"],
    goals: null,
    architecture: null,
    repo: null,
    demo: null,
    note: "An experiment first. Whether it is practical is part of what is being tested.",
    hero: false,
  },
];

/** Unnamed work, acknowledged rather than invented. Shown beside the GitHub link. */
export const projectCategories = [
  "AI Projects",
  "Web Projects",
  "Cybersecurity Projects",
  "Networking Projects",
  "Docker Projects",
  "Linux Projects",
] as const;

/* ------------------------------------------------------------ experience --- */

export const building = {
  heading: "Learning through building",
  /** Stated plainly: there is no formal employment history to show. */
  disclaimer:
    "No formal employment yet. This is the work itself, which is the part that taught me anything.",
  entries: [
    {
      id: "ai-systems",
      label: "AI systems",
      line: "Four projects that are infrastructure rather than apps.",
      detail:
        "POGO, FreeLLMAPI, OmniRoute and Pakhi AI all exist because I wanted to understand the layer underneath the model, not just the prompt on top of it.",
    },
    {
      id: "experiments",
      label: "Experiments",
      line: "Ideas built far enough to find out whether they work.",
      detail:
        "VQT is the clearest example: an experiment in moving data as video, built to be tested rather than to be right.",
    },
    {
      id: "web",
      label: "Web development",
      line: "Static sites and interfaces, written by hand.",
      detail:
        "HTML, CSS and JavaScript, plus the interface work in Pakhi AI. The surface is not the easy half.",
    },
    {
      id: "video",
      label: "Video editing",
      line: "YouTube video editing for two teachers.",
      detail:
        "Real edited output on a real schedule, which is a different discipline from writing code and made me better at pacing anything.",
    },
  ] satisfies BuildingEntry[],
} as const;

/* ------------------------------------------------------------- education --- */

export const education: EducationEntry[] = [
  {
    id: "hsc",
    kind: "current",
    level: "HSC",
    stream: "Science",
    institution: "Barguna Govt. College",
    board: "Barishal Education Board",
    session: "2024 - 2025",
    outcome: "Graduating 2026",
    detail: "HSC candidate. Science stream, and the reason the rest of this list exists.",
    fields: null,
    destination: null,
  },
  {
    id: "bachelors",
    kind: "intended",
    level: "Bachelor's degree",
    stream: null,
    institution: null,
    board: null,
    session: null,
    outcome: "Next",
    detail:
      "The plan is a bachelor's degree in one of four fields, with Germany as the preferred destination. Nothing is decided or applied for yet, and this section will say so until it is.",
    fields: [
      "Computer Science",
      "Computer Science & Engineering",
      "Software Engineering",
      "Cybersecurity",
    ],
    destination: "Germany",
  },
];

/* -------------------------------------------------------------- services --- */

export const services = {
  heading: "What I can build",
  /** Framed as capability, not as an agency. */
  framing: "Not an agency. One student who builds these things.",
  items: [
    { index: "01", label: "Web Development", line: "Sites and interfaces, written rather than assembled." },
    { index: "02", label: "AI Development", line: "Applications built on language models." },
    { index: "03", label: "AI Automation", line: "Work that should not need a human twice." },
    { index: "04", label: "Software Development", line: "Tools, scripts and small systems." },
    { index: "05", label: "AI API Integration", line: "Wiring models into something that already exists." },
  ] satisfies Service[],
} as const;

/* --------------------------------------------------------------- contact --- */

/**
 * PUBLIC CHANNELS ONLY.
 *
 * These are the details you designated as public. Nothing private is in this
 * file: no date of birth, no home address, no alternate email, no credentials.
 * tools/check_source.mjs greps the whole project for anything shaped like a
 * secret and fails if it finds one.
 */
export const contact = {
  heading: "Let's build something.",
  line: "Open to freelance work, internships, and anything that has to actually work.",
  email: "xubayertahxin@gmail.com",
  phone: "+8801780082987",
  telegram: { handle: "@xubayer_tahsin", url: "https://t.me/xubayer_tahsin" },
  primary: { label: "Get in touch", href: "mailto:xubayertahxin@gmail.com" },
  secondary: { label: "Explore GitHub", href: "https://github.com/xubayertahxin" },
} as const;

export const social: SocialLink[] = [
  {
    key: "github",
    label: "GitHub",
    handle: "xubayertahxin",
    url: "https://github.com/xubayertahxin",
  },
  {
    key: "telegram",
    label: "Telegram",
    handle: "@xubayer_tahsin",
    url: "https://t.me/xubayer_tahsin",
  },
  {
    key: "x",
    label: "X",
    handle: "@xubayer_tahsin",
    url: "https://x.com/xubayer_tahsin",
  },
  {
    key: "instagram",
    label: "Instagram",
    handle: "@xubayer.tahsin",
    url: "https://www.instagram.com/xubayer.tahsin/",
  },
  {
    key: "facebook",
    label: "Facebook",
    handle: "xubayer.tahsin2.0",
    url: "https://www.facebook.com/xubayer.tahsin2.0",
  },
];

export const github = {
  url: "https://github.com/xubayertahxin",
  username: "xubayertahxin",
  heading: "The proof is in the repositories",
  line: "Named projects above. Everything else, including the work that has not been written up, is here.",
} as const;

/* ------------------------------------------------------------------- nav --- */

export const nav = [
  { id: "about", label: "About", href: "#about" },
  { id: "skills", label: "Skills", href: "#skills" },
  { id: "work", label: "Projects", href: "#work" },
  { id: "journey", label: "Journey", href: "#journey" },
  { id: "contact", label: "Contact", href: "#contact" },
] as const;

/* ------------------------------------------------------------------- seo --- */

export const seo = {
  title: "Jubayer Tahsin — Student, AI Enthusiast & Future Technology Entrepreneur",
  description:
    "Jubayer Tahsin is a Bangladesh-based HSC Science student interested in Computer Science, Artificial Intelligence, Software Engineering, Cybersecurity, and technology entrepreneurship.",
  keywords: [
    "Jubayer Tahsin",
    "xubayertahxin",
    "xubayer tahsin",
    "Computer Science",
    "Artificial Intelligence",
    "Software Engineering",
    "Cybersecurity",
    "AI Agents",
    "AI Operating System",
    "Model Routing",
    "POGO",
    "Pakhi AI",
    "FreeLLMAPI",
    "OmniRoute",
    "VQT",
    "Bangladesh developer",
    "student portfolio",
  ],
  /** Relative on purpose: there is no domain yet. Make absolute at deploy. */
  ogImage: "/og.png",
} as const;

/* ----------------------------------------------------------------- index --- */

export const portfolio = {
  person,
  hero,
  about,
  objective,
  skills,
  aiEcosystem,
  projects,
  projectCategories,
  building,
  education,
  services,
  contact,
  social,
  github,
  nav,
  seo,
} as const;

export default portfolio;
