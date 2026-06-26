import type { DecisionCategory } from "@alfy2/shared";

/**
 * Signal lexicons for the deterministic Decision classifier and scorers.
 * These are intentionally transparent (no AI): a term firing is recorded as a `reason`, so every
 * score is explainable. Tune freely — adding terms cannot break the contract.
 * See docs/adr/ADR-0003-decision-engine.md.
 */

/** Category signal terms (substring-matched against the lowercased input). */
export const CATEGORY_LEXICON: Record<DecisionCategory, string[]> = {
  business: [
    "client",
    "customer",
    "deal",
    "contract",
    "proposal",
    "vendor",
    "partner",
    "launch",
    "hire",
    "meeting",
    "pitch",
    "invoice",
    "project",
    "team",
    "sales",
  ],
  personal: ["family", "home", "house", "friend", "birthday", "vacation", "errand", "personal", "kids"],
  health: [
    "doctor",
    "symptom",
    "sleep",
    "workout",
    "exercise",
    "medication",
    "labs",
    "diet",
    "therapy",
    "pain",
    "appointment",
    "clinic",
    "wellness",
  ],
  finance: [
    "payment",
    "invoice",
    "budget",
    "tax",
    "bank",
    "expense",
    "cash",
    "payroll",
    "refund",
    "subscription",
    "price",
    "cost",
    "revenue",
    "$",
    "usd",
    "dollar",
  ],
  relationship: [
    "partner",
    "spouse",
    "date",
    "conflict",
    "apologize",
    "reconnect",
    "relationship",
    "marriage",
    "boundary",
  ],
  idea: ["idea", "concept", "brainstorm", "what if", "prototype", "feature", "invent", "imagine"],
  learning: ["learn", "study", "course", "read", "research", "understand", "tutorial", "practice", "skill"],
  // Category signals only. Urgency words (urgent/deadline) live in the urgency DIMENSION, not here.
  // "threat" already covers "threatening" by substring, so it is not listed twice.
  risk: [
    "risk",
    "overdue",
    "breach",
    "legal",
    "compliance",
    "lawsuit",
    "penalty",
    "fraud",
    "fail",
    "threat",
    "security",
    "violation",
  ],
  opportunity: [
    "opportunity",
    "growth",
    "expand",
    "new market",
    "lead",
    "sponsor",
    "viral",
    "scale",
    "upside",
    "partnership",
    "investor",
  ],
};

/** Urgency signal terms. */
export const URGENCY_TERMS = [
  "urgent",
  "asap",
  "immediately",
  "now",
  "today",
  "tonight",
  "eod",
  "deadline",
  "overdue",
  "right away",
  "time-sensitive",
  "emergency",
];

/** Importance signal terms. */
export const IMPORTANCE_TERMS = [
  "important",
  "critical",
  "key",
  "priority",
  "must",
  "revenue",
  "investor",
  "board",
  "strategic",
  "high stakes",
];

/** Difficulty signal terms. */
export const DIFFICULTY_TERMS = [
  "complex",
  "complicated",
  "hard",
  "difficult",
  "multi-step",
  "unknown",
  "research",
  "figure out",
  "uncertain",
  "ambiguous",
];

/** Terms that make something cheap/quick (lower effort). */
export const QUICK_TERMS = ["quick", "simple", "easy", "trivial", "minor", "small", "five minutes", "5 min"];

/** Revenue-impacting signal terms. */
export const REVENUE_TERMS = [
  "revenue",
  "deal",
  "client",
  "customer",
  "sponsor",
  "invoice",
  "sale",
  "contract",
  "upsell",
  "renewal",
  "pricing",
];

/** Risk-elevating signal terms (also drive required approvals). */
export const RISK_TERMS = [
  "legal",
  "compliance",
  "lawsuit",
  "breach",
  "penalty",
  "security",
  "contract",
  "payment",
  "irreversible",
  "delete",
  "fire",
  "terminate",
  "refund",
  "overdue",
  "threat",
];

/** Terms that imply an irreversible / approval-requiring action. */
export const APPROVAL_TERMS = [
  "pay",
  "payment",
  "send money",
  "wire",
  "transfer",
  "sign",
  "contract",
  "delete",
  "terminate",
  "fire",
  "refund",
  "publish",
  "purchase",
  "buy",
];

/** Automation cue -> suggested automation opportunity. */
export const AUTOMATION_CUES: Array<{ terms: string[]; suggestion: string }> = [
  { terms: ["every day", "daily", "each morning", "weekly", "monthly", "recurring", "every week"], suggestion: "Set up a recurring scheduled task" },
  { terms: ["follow up", "follow-up", "remind", "reminder", "chase"], suggestion: "Auto-schedule follow-up reminders until resolved" },
  { terms: ["email", "reply", "respond", "draft", "message", "send", "proposal"], suggestion: "Auto-draft the message or document for review" },
  { terms: ["schedule", "calendar", "book", "meeting"], suggestion: "Auto-create the calendar block" },
  { terms: ["invoice", "bill", "payment due"], suggestion: "Automate invoice generation and reminders" },
  { terms: ["report", "summary", "digest", "recap"], suggestion: "Generate the report automatically on a schedule" },
  { terms: ["research", "look up", "find out", "compare"], suggestion: "Dispatch a research agent to gather and summarize" },
];

/** Category -> recommended agent registry keys. Suggestions only (agents may not be registered yet). */
export const CATEGORY_AGENTS: Record<DecisionCategory, string[]> = {
  business: ["draft.text", "research.web"],
  personal: ["plan.schedule"],
  health: ["health.track"],
  finance: ["finance.analyze"],
  relationship: ["draft.text"],
  idea: ["research.web", "draft.text"],
  learning: ["research.web"],
  risk: ["research.web"],
  opportunity: ["research.web", "draft.text"],
};
