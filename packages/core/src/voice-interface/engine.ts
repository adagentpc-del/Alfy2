import {
  InterpretVoiceInputSchema,
  VoiceCommandSchema,
  type InterpretVoiceInput,
  type VoiceCommand,
  type VoiceCategory,
  type VoiceIntent,
} from "@alfy2/shared";

/**
 * Voice Interface (docs/adr/ADR-0126-voice-interface.md). A PURE deterministic parser (read-model, no
 * persistence): `interpret()` lowercases a transcribed utterance, matches keywords to a VoiceIntent +
 * VoiceCategory, extracts a target for open/show, gates sensitive actions behind confirmation, and returns a
 * calm executive-companion spoken response. `interpretMany()` maps the same over a list. The tone is a calm,
 * intelligent companion — never robotic.
 */

/** Intents that must be confirmed before they execute — sensitive actions. */
const CONFIRM_INTENTS: ReadonlySet<VoiceIntent> = new Set<VoiceIntent>([
  "approve",
  "reject",
  "pause",
  "send_to_approval",
  "create",
  "cancel",
]);

/** Which category each intent belongs to. */
const CATEGORY_FOR_INTENT: Record<VoiceIntent, VoiceCategory> = {
  create: "action",
  save: "action",
  remember: "action",
  approve: "action",
  reject: "action",
  pause: "action",
  send_to_approval: "action",
  accept: "action",
  cancel: "action",
  scroll_up: "navigation",
  scroll_down: "navigation",
  go_back: "navigation",
  go_forward: "navigation",
  open_tab: "navigation",
  close_tab: "navigation",
  next_section: "navigation",
  previous_section: "navigation",
  expand: "navigation",
  collapse: "navigation",
  search: "navigation",
  open: "navigation",
  read_briefing: "query",
  read_this: "query",
  summarize: "query",
  explain_decision: "query",
  what_needs_me: "query",
  what_makes_money_fastest: "query",
  show: "query",
  build_with_me: "query",
  read_daily_briefing: "query",
  read_lunch_briefing: "query",
  read_evening_briefing: "query",
  read_news: "query",
  read_reminders: "query",
  summarize_dashboard: "query",
  create_task: "action",
  route_to_agent: "action",
  confirm_approval: "action",
  ask_clarifying_question: "query",
  capture_idea: "capture",
  voice_note: "capture",
  unknown: "unknown",
};

/** A calm companion-style spoken response per intent (open/show append the target). */
const SPOKEN_FOR_INTENT: Record<VoiceIntent, string> = {
  create: "Want me to build that? Just say yes to confirm.",
  save: "Saved. It's safe with me.",
  remember: "I'll remember that for you.",
  approve: "Want me to approve that? Just say yes to confirm.",
  reject: "Want me to reject that? Just say yes to confirm.",
  pause: "Want me to pause that? Just say yes to confirm.",
  send_to_approval: "Want me to send that for approval? Just say yes to confirm.",
  accept: "Accepted.",
  cancel: "Want me to cancel that? Just say yes to confirm.",
  scroll_up: "Scrolling up.",
  scroll_down: "Scrolling down.",
  go_back: "Going back.",
  go_forward: "Going forward.",
  open_tab: "Opening a new tab.",
  close_tab: "Closing this tab.",
  next_section: "Here's the next section.",
  previous_section: "Here's the previous section.",
  expand: "Expanding that for you.",
  collapse: "Collapsing that.",
  search: "What would you like me to search for?",
  open: "Opening that for you.",
  read_briefing: "Here's your briefing.",
  read_this: "Reading this for you.",
  summarize: "Here's the short version.",
  explain_decision: "Here's the thinking behind that decision.",
  what_needs_me: "Here's what needs you today.",
  what_makes_money_fastest: "Here's what makes money fastest right now.",
  show: "Here's what you asked for.",
  build_with_me: "Let's build this out together — where should we start?",
  read_daily_briefing: "Here's your daily briefing.",
  read_lunch_briefing: "Here's your lunch briefing.",
  read_evening_briefing: "Here's your evening briefing.",
  read_news: "Here's your news briefing.",
  read_reminders: "Here are your reminders.",
  summarize_dashboard: "Here's the dashboard in brief.",
  create_task: "Want me to create that task? Just say yes to confirm.",
  route_to_agent: "Want me to route that to an agent? Just say yes to confirm.",
  confirm_approval: "Confirmed.",
  ask_clarifying_question: "One quick question so I get this right.",
  capture_idea: "Got it — I've captured that idea.",
  voice_note: "I'm listening — go ahead with your note.",
  unknown: "I didn't quite catch that — could you say it another way?",
};

/** A keyword rule: if the lowercased utterance includes `phrase`, it resolves to `intent`. */
interface Rule {
  readonly phrase: string;
  readonly intent: VoiceIntent;
}

/**
 * Ordered keyword rules. Order matters: more specific / multi-word phrases come first so they win before
 * shorter generic ones (e.g. "send to approval" before "approve", "next section" before generic matches).
 */
const RULES: readonly Rule[] = [
  // query / read (specific multi-word first)
  { phrase: "what makes money fastest", intent: "what_makes_money_fastest" },
  { phrase: "what needs me today", intent: "what_needs_me" },
  { phrase: "what needs me", intent: "what_needs_me" },
  { phrase: "build this out with me", intent: "build_with_me" },
  { phrase: "build with me", intent: "build_with_me" },
  { phrase: "read my briefing", intent: "read_briefing" },
  { phrase: "read briefing", intent: "read_briefing" },
  { phrase: "read this", intent: "read_this" },
  { phrase: "summarize this", intent: "summarize" },
  { phrase: "summarize", intent: "summarize" },
  { phrase: "explain", intent: "explain_decision" },

  // capture
  { phrase: "capture this idea", intent: "capture_idea" },
  { phrase: "new idea", intent: "capture_idea" },
  { phrase: "voice note", intent: "voice_note" },
  { phrase: "take a note", intent: "voice_note" },

  // action
  { phrase: "send to approval", intent: "send_to_approval" },
  { phrase: "create this", intent: "create" },
  { phrase: "make this", intent: "create" },
  { phrase: "build this", intent: "create" },
  { phrase: "approve it", intent: "approve" },
  { phrase: "approve", intent: "approve" },
  { phrase: "reject", intent: "reject" },
  { phrase: "decline", intent: "reject" },
  { phrase: "pause that", intent: "pause" },
  { phrase: "pause", intent: "pause" },
  { phrase: "accept", intent: "accept" },
  { phrase: "cancel", intent: "cancel" },
  { phrase: "remember", intent: "remember" },
  { phrase: "save", intent: "save" },

  // navigation
  { phrase: "scroll up", intent: "scroll_up" },
  { phrase: "scroll down", intent: "scroll_down" },
  { phrase: "go back", intent: "go_back" },
  { phrase: "go forward", intent: "go_forward" },
  { phrase: "open tab", intent: "open_tab" },
  { phrase: "close tab", intent: "close_tab" },
  { phrase: "next section", intent: "next_section" },
  { phrase: "next", intent: "next_section" },
  { phrase: "previous section", intent: "previous_section" },
  { phrase: "previous", intent: "previous_section" },
  { phrase: "expand", intent: "expand" },
  { phrase: "collapse", intent: "collapse" },
  { phrase: "search", intent: "search" },

  // targeted navigation / query (handled specially for target extraction, kept last)
  { phrase: "open", intent: "open" },
  { phrase: "show", intent: "show" },
];

/** Title-case-ish: trim, collapse whitespace, capitalize each word. */
function toTitleish(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (cleaned.length === 0) return cleaned;
  return cleaned
    .split(" ")
    .map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/** Extract the target (words after the keyword) for "open X" / "show X"; null if none. */
function extractTarget(lowered: string, keyword: string): string | null {
  const index = lowered.indexOf(keyword);
  if (index < 0) return null;
  const after = lowered.slice(index + keyword.length);
  const target = toTitleish(after);
  return target.length > 0 ? target : null;
}

export class VoiceInterface {
  constructor(_options: { clock?: () => Date; idFactory?: () => string } = {}) {
    // Pure parser — no persistence, no clock/id needed. Options accepted for ctor consistency.
  }

  /** Interpret a transcribed utterance into a structured VoiceCommand. Pure — nothing is persisted. */
  interpret(input: InterpretVoiceInput): VoiceCommand {
    const i = InterpretVoiceInputSchema.parse(input);
    const lowered = i.utterance.toLowerCase();

    let intent: VoiceIntent = "unknown";
    let matchedPhrase: string | null = null;
    for (const rule of RULES) {
      if (lowered.includes(rule.phrase)) {
        intent = rule.intent;
        matchedPhrase = rule.phrase;
        break;
      }
    }

    let target: string | null = null;
    if ((intent === "open" || intent === "show") && matchedPhrase !== null) {
      target = extractTarget(lowered, matchedPhrase);
      // "open tab" / "close tab" already matched earlier; a bare "open"/"show" with no object stays targetless.
    }

    const category = CATEGORY_FOR_INTENT[intent];
    const requiresConfirmation = CONFIRM_INTENTS.has(intent);

    const spokenResponse =
      (intent === "open" || intent === "show") && target !== null
        ? intent === "open"
          ? `Opening ${target}.`
          : `Showing ${target}.`
        : SPOKEN_FOR_INTENT[intent];

    return VoiceCommandSchema.parse({
      utterance: i.utterance,
      intent,
      category,
      target: target ?? null,
      requires_confirmation: requiresConfirmation,
      spoken_response: spokenResponse,
    });
  }
}

/** Convenience: interpret a batch of utterances into VoiceCommands (pure, order-preserving). */
export function interpretMany(utterances: string[]): VoiceCommand[] {
  const parser = new VoiceInterface();
  return utterances.map((utterance) => parser.interpret({ utterance }));
}
