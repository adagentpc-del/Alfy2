import { z } from "zod";

/**
 * Cognitive Offloading Engine (COE) — the L0 executive pipeline. Any input passes through five stages
 * (Understand → Connect → Build → Delegate → Executive Report). The core test: "Can Alyssa forget about
 * this now?" If yes, the system owns it; if no, it surfaces only the minimum for a decision. It returns
 * only what needs executive attention. See docs/adr/ADR-0093-cognitive-offload.md. Mirrored in workers.
 */

export const OffloadInputKindSchema = z.enum([
  "conversation", "voice_note", "meeting_transcript", "email", "pdf", "image", "message", "uploaded_file",
]);
export type OffloadInputKind = z.infer<typeof OffloadInputKindSchema>;

export const ProcessOffloadInputSchema = z.object({
  kind: OffloadInputKindSchema,
  content: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  businesses: z.array(z.string()).default([]),
});
export type ProcessOffloadInput = z.infer<typeof ProcessOffloadInputSchema>;

/** Stage 1 — extracted understanding. */
export const UnderstandingSchema = z.object({
  objectives: z.array(z.string()).default([]),
  decisions: z.array(z.string()).default([]),
  problems: z.array(z.string()).default([]),
  opportunities: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  deadlines: z.array(z.string()).default([]),
  metrics: z.array(z.string()).default([]),
  /** Surrounding context that makes the input interpretable (L0 Stage 1). */
  context: z.string().default(""),
  /** The relevant emotional state detected, if any — informs tone and urgency, never stored as judgment. */
  emotional_state: z.string().default(""),
  urgency: z.enum(["low", "medium", "high", "now"]).default("low"),
  dependencies: z.array(z.string()).default([]),
});
export type Understanding = z.infer<typeof UnderstandingSchema>;

/** A delegation disposition for a piece of work. */
export const OffloadDispositionSchema = z.enum([
  "automated", "scheduled", "assigned", "deferred", "archived", "reviewed", "escalated", "needs_alyssa",
]);
export type OffloadDisposition = z.infer<typeof OffloadDispositionSchema>;

/** One handled item. */
export const HandledItemSchema = z.object({
  title: z.string().min(1),
  disposition: OffloadDispositionSchema,
  /** True when Alyssa can fully forget about it. */
  alyssa_can_forget: z.boolean(),
  reason: z.string().min(1),
});
export type HandledItem = z.infer<typeof HandledItemSchema>;

/** The processed offload record + the Stage-5 executive report. */
export const OffloadRecordSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  kind: OffloadInputKindSchema,
  understanding: UnderstandingSchema,
  connections: z.array(z.string()).default([]),
  built: z.array(z.string()).default([]),
  handled: z.array(HandledItemSchema).default([]),
  /** Stage 5 — only what needs executive attention. */
  what_changed: z.string().default(""),
  why_it_matters: z.string().default(""),
  completed_automatically: z.array(z.string()).default([]),
  decisions_requiring_alyssa: z.array(z.string()).default([]),
  /** 0..1 — share of work the system took off Alyssa's plate. */
  cognitive_load_removed: z.number().min(0).max(1),
  created_at: z.string().datetime(),
});
export type OffloadRecord = z.infer<typeof OffloadRecordSchema>;
