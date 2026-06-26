import { z } from "zod";

/**
 * Voice Interface. Lets Alyssa operate Alfy² through natural voice — executive commands, hands-free
 * navigation, and idea capture — interpreting a transcribed utterance into a structured command with intent,
 * target, and a confirmation gate for sensitive actions. The tone is a calm, intelligent executive
 * companion, not a robotic assistant. A deterministic parser (read-model). See
 * docs/adr/ADR-0126-voice-interface.md. Mirrored in workers. (Speech capture/TTS are runtime, not modeled here.)
 */

export const VoiceCategorySchema = z.enum(["action", "navigation", "query", "capture", "unknown"]);
export type VoiceCategory = z.infer<typeof VoiceCategorySchema>;

export const VoiceIntentSchema = z.enum([
  // action
  "create", "save", "remember", "approve", "reject", "pause", "send_to_approval", "accept", "cancel",
  // navigation
  "scroll_up", "scroll_down", "go_back", "go_forward", "open_tab", "close_tab", "next_section",
  "previous_section", "expand", "collapse", "search", "open",
  // query / read
  "read_briefing", "read_this", "summarize", "explain_decision", "what_needs_me", "what_makes_money_fastest",
  "show", "build_with_me",
  // read-aloud briefings & reminders (companion reads these)
  "read_daily_briefing", "read_lunch_briefing", "read_evening_briefing", "read_news", "read_reminders",
  "summarize_dashboard",
  // action / routing
  "create_task", "route_to_agent", "confirm_approval", "ask_clarifying_question",
  // capture
  "capture_idea", "voice_note",
  // fallback
  "unknown",
]);
export type VoiceIntent = z.infer<typeof VoiceIntentSchema>;

export const InterpretVoiceInputSchema = z.object({
  utterance: z.string().min(1),
});
export type InterpretVoiceInput = z.infer<typeof InterpretVoiceInputSchema>;

/** The interpreted voice command. */
export const VoiceCommandSchema = z.object({
  utterance: z.string().min(1),
  intent: VoiceIntentSchema,
  category: VoiceCategorySchema,
  /** The object of the command when present (e.g. "Revenue Factory", "Decoded"), else null. */
  target: z.string().nullable().default(null),
  /** Sensitive actions (approve/reject/send_to_approval/pause/create) confirm before executing. */
  requires_confirmation: z.boolean(),
  /** The calm companion-style spoken response. */
  spoken_response: z.string().min(1),
});
export type VoiceCommand = z.infer<typeof VoiceCommandSchema>;
