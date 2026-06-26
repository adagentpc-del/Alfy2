import type {
  InboxItemType,
  InboxCategory,
  InboxDrop,
  DecisionCategory,
  MemoryKind,
} from "@alfy2/shared";

/**
 * Deterministic item-type detection and category classification for the Executive Inbox. No AI —
 * explicit cues so the routing is explainable. The operator never decides where something goes; this
 * does. See docs/EXECUTIVE_INBOX.md.
 */

const EXT: Array<[RegExp, InboxItemType]> = [
  [/\.(pdf)$/i, "pdf"],
  [/\.(png|jpg|jpeg|gif|webp|heic)$/i, "photo"],
  [/\.(mp4|mov|webm|avi)$/i, "video"],
  [/\.(m4a|mp3|wav|aac|ogg)$/i, "voice_note"],
  [/\.(ics)$/i, "calendar_invite"],
];

/** Identify what the item is. Trusts an explicit `kind`; otherwise detects from content + attachments. */
export function detectItemType(drop: InboxDrop): { type: InboxItemType; certainty: number } {
  if (drop.kind && drop.kind !== "unknown") return { type: drop.kind, certainty: 0.95 };

  const text = drop.content.toLowerCase();
  const atts = drop.attachments.join(" ").toLowerCase();

  for (const [re, type] of EXT) {
    if (re.test(atts)) {
      // A screenshot vs a generic photo: filename hint.
      if (type === "photo" && /screenshot|screen shot|capture/i.test(atts)) {
        return { type: "screenshot", certainty: 0.8 };
      }
      return { type, certainty: 0.8 };
    }
  }

  if (/github\.com/i.test(text + " " + atts)) return { type: "github_link", certainty: 0.9 };
  if (/\bhttps?:\/\//i.test(text)) return { type: "url", certainty: 0.7 };
  if (/\binvoice\b|amount due|net\s*\d+/i.test(text)) return { type: "invoice", certainty: 0.8 };
  if (/\breceipt\b|total paid|order total|thank you for your purchase/i.test(text)) return { type: "receipt", certainty: 0.75 };
  if (/\bcontract\b|\bagreement\b|terms and conditions|hereby agree|nda\b/i.test(text)) return { type: "contract", certainty: 0.8 };
  if (/\bagenda\b|attendees:|action items|meeting notes|minutes\b/i.test(text)) return { type: "meeting_notes", certainty: 0.75 };
  if (/calendar invite|\.ics|invite:|when:.*where:/i.test(text)) return { type: "calendar_invite", certainty: 0.7 };
  if (/(^|\n)\s*[-*]\s|\bto-?do\b|\btasks?:\b|- \[ \]/i.test(drop.content)) return { type: "todo_list", certainty: 0.7 };
  if (/^from:|\nsubject:|\nto:.*@/i.test(drop.content)) return { type: "email", certainty: 0.7 };
  if (/\bidea\b|what if|concept:|i have an idea/i.test(text)) return { type: "idea", certainty: 0.65 };
  if (/\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i.test(text) && /\b(ceo|founder|director|manager|llc|inc|co\.)\b/i.test(text)) {
    return { type: "business_card", certainty: 0.6 };
  }
  return { type: "text", certainty: 0.5 };
}

const CATEGORY_KEYWORDS: Array<[RegExp, InboxCategory]> = [
  [/\b(lawsuit|legal|nda|attorney|liability|compliance|terms)\b/i, "legal"],
  [/\b(property|real estate|vehicle|equity|asset|portfolio|deed|title)\b/i, "asset"],
  [/\b(github|api|server|deploy|code|bug|repo|software|infra|database)\b/i, "technology"],
  [/\b(invoice|receipt|payment|tax|budget|expense|refund|invoice|bank)\b/i, "finance"],
  [/\b(doctor|clinic|symptom|prescription|therapy|labs|workout)\b/i, "health"],
  [/\b(course|learn|study|tutorial|research|read)\b/i, "learning"],
  [/\b(risk|breach|overdue|penalty|threat|deadline missed)\b/i, "risk"],
  [/\b(opportunity|partnership|sponsor|new market|expand|lead)\b/i, "opportunity"],
];

/** Map item type first, then keyword overrides, then fall back to the Decision Engine's category. */
export function classifyCategory(
  itemType: InboxItemType,
  decisionCategory: DecisionCategory,
  content: string,
): InboxCategory {
  // Strong item-type signals.
  switch (itemType) {
    case "invoice":
    case "receipt":
      return "finance";
    case "contract":
      return "legal";
    case "github_link":
      return "technology";
    case "business_card":
      return "relationship";
    case "todo_list":
      return "task";
    case "calendar_invite":
      return "task";
    case "meeting_notes":
      return "business";
    case "idea":
      return "idea";
    default:
      break;
  }
  // Keyword overrides.
  for (const [re, cat] of CATEGORY_KEYWORDS) {
    if (re.test(content)) return cat;
  }
  // Fall back to the Decision Engine's primary category (shares most names with InboxCategory).
  const direct: Record<DecisionCategory, InboxCategory> = {
    business: "business",
    personal: "personal",
    health: "health",
    finance: "finance",
    relationship: "relationship",
    idea: "idea",
    learning: "learning",
    risk: "risk",
    opportunity: "opportunity",
  };
  return direct[decisionCategory];
}

/** The memory kind an item should be saved as (for reuse). */
export function memoryKindFor(itemType: InboxItemType, category: InboxCategory): MemoryKind {
  switch (itemType) {
    case "contract":
      return "contract";
    case "invoice":
    case "receipt":
      return "subscription";
    case "business_card":
      return "person";
    case "meeting_notes":
    case "calendar_invite":
      return "meeting";
    case "idea":
      return "idea";
    case "todo_list":
      return "task";
    case "github_link":
    case "url":
      return "pattern";
    default:
      break;
  }
  const byCat: Partial<Record<InboxCategory, MemoryKind>> = {
    finance: "account",
    legal: "contract",
    relationship: "person",
    health: "health_event",
    project: "project",
    task: "task",
    idea: "idea",
    business: "business",
  };
  return byCat[category] ?? "idea";
}

/** Required fields the inbox should chase down for certain item types. */
export const REQUIRED_FIELDS_BY_TYPE: Partial<Record<InboxItemType, string[]>> = {
  invoice: ["amount", "due_date", "vendor", "payment_method"],
  receipt: ["amount", "vendor", "date"],
  contract: ["parties", "term", "renewal_date"],
  business_card: ["name", "company", "phone", "email"],
};
