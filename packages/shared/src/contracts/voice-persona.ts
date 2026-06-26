import { z } from "zod";

/**
 * Companion Voice Persona. A named voice companion that is the VOICE LAYER of Alfy² — not a separate brain.
 * The intelligence remains Alfy²; the persona only gives it a calm, intelligent presence: an elegant female
 * British voice, warm and concise, executive-level, emotionally regulated, reassuring without being childish,
 * never robotic, never overly cheerful. She reads briefings, asks clarifying questions, summarizes options,
 * reminds Alyssa of priorities, reduces cognitive load, and escalates only what matters. The persona is
 * MUTABLE — it is refined over time. See docs/adr/ADR-0127-voice-persona.md. Mirrored in workers.
 */

/** The persona's tonal qualities. All true by default for the default companion. */
export const PersonaToneSchema = z.enum([
  "elegant", "calm", "warm", "intelligent", "concise", "executive",
  "emotionally_regulated", "reassuring", "not_childish", "not_robotic", "not_overly_cheerful",
]);
export type PersonaTone = z.infer<typeof PersonaToneSchema>;

/** What the companion is responsible for at the voice layer. */
export const PersonaDutySchema = z.enum([
  "read_briefings", "ask_clarifying_questions", "summarize_options", "remind_priorities",
  "reduce_cognitive_load", "keep_grounded", "escalate_only_what_matters",
]);
export type PersonaDuty = z.infer<typeof PersonaDutySchema>;

export const ConfigureVoicePersonaInputSchema = z.object({
  name: z.string().min(1),
  accent: z.string().default("British (female)"),
  tones: z.array(PersonaToneSchema).default([]),
  duties: z.array(PersonaDutySchema).default([]),
});
export type ConfigureVoicePersonaInput = z.infer<typeof ConfigureVoicePersonaInputSchema>;

/** The configured companion voice persona. Mutable (refined over time). */
export const VoicePersonaSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string().min(1),
  accent: z.string().default("British (female)"),
  tones: z.array(PersonaToneSchema).default([]),
  duties: z.array(PersonaDutySchema).default([]),
  /** Invariant: the persona is the voice layer, never the brain. The intelligence remains Alfy². */
  is_voice_layer_only: z.literal(true).default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type VoicePersona = z.infer<typeof VoicePersonaSchema>;
