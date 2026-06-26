import { z } from "zod";

/**
 * Follow-Up Execution Engine contracts. Alyssa's follow-up should never depend on memory or energy. The
 * engine tracks leads, warm contacts, deals, vendors, investors, clients, partners, unanswered emails,
 * and stale opportunities, and runs follow-up sequences with reminders, an approval queue, no-response
 * logic, escalation, and reactivation. Once approved a sequence keeps going until a response arrives,
 * the goal is reached, the sequence completes, a risk appears, or Alyssa pauses it. See
 * docs/adr/ADR-0033-follow-up-execution-engine.md. Mirrored in workers (Pydantic).
 */

/** The nine kinds of thing followed up. */
export const FollowUpEntityKindSchema = z.enum([
  "lead",
  "warm_contact",
  "deal",
  "vendor",
  "investor",
  "client",
  "partner",
  "unanswered_email",
  "stale_opportunity",
]);
export type FollowUpEntityKind = z.infer<typeof FollowUpEntityKindSchema>;

export const FollowUpStatusSchema = z.enum([
  "pending_approval",
  "active",
  "paused",
  "completed",
  "stopped",
  "escalated",
]);
export type FollowUpStatus = z.infer<typeof FollowUpStatusSchema>;

/** Why a sequence left autopilot. The autopilot keeps going until one of these fires. */
export const FollowUpStopReasonSchema = z.enum([
  "response_received",
  "meeting_booked",
  "deal_closed",
  "goal_reached",
  "sequence_completed",
  "risk",
  "escalated",
  "paused",
  "manual",
]);
export type FollowUpStopReason = z.infer<typeof FollowUpStopReasonSchema>;

/** One step of a follow-up sequence. */
export const SequenceStepSchema = z.object({
  day_offset: z.number().int().nonnegative(),
  channel: z.string().min(1),
  template: z.string().min(1),
});
export type SequenceStep = z.infer<typeof SequenceStepSchema>;

/** A follow-up being executed. */
export const FollowUpSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  entity_kind: FollowUpEntityKindSchema,
  entity_name: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  goal_id: z.string().uuid().nullable().default(null),
  sequence: z.array(SequenceStepSchema).min(1),
  current_step: z.number().int().nonnegative().default(0),
  status: FollowUpStatusSchema.default("pending_approval"),
  stop_reason: FollowUpStopReasonSchema.nullable().default(null),
  /** What to do when there's no response (escalate / reactivate / stop). */
  no_response_policy: z.string().default("escalate"),
  /** Whether to run a reactivation campaign after the sequence completes with no response. */
  reactivation: z.boolean().default(false),
  /** Set when the autopilot escalated to a human; explains why human judgment was needed. */
  escalation_reason: z.string().nullable().default(null),
  last_touch_at: z.string().datetime().nullable().default(null),
  next_touch_at: z.string().datetime().nullable().default(null),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type FollowUp = z.infer<typeof FollowUpSchema>;

/** Input to start a follow-up. A default sequence is generated if none supplied. */
export const CreateFollowUpInputSchema = z.object({
  entity_kind: FollowUpEntityKindSchema,
  entity_name: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  goal_id: z.string().uuid().nullable().default(null),
  sequence: z.array(SequenceStepSchema).default([]),
  no_response_policy: z.string().default("escalate"),
  reactivation: z.boolean().default(false),
});
export type CreateFollowUpInput = z.infer<typeof CreateFollowUpInputSchema>;

/** Signals that advance or stop a follow-up (the autopilot inputs). */
export const FollowUpSignalSchema = z.object({
  response_received: z.boolean().default(false),
  /** A meeting/call got booked — a successful outcome that completes the sequence. */
  meeting_booked: z.boolean().default(false),
  /** The deal closed — a successful outcome that completes the sequence. */
  deal_closed: z.boolean().default(false),
  goal_reached: z.boolean().default(false),
  risk: z.boolean().default(false),
  /** Something needs human judgment — hand off to Alyssa (with a reason) instead of continuing. */
  needs_human: z.boolean().default(false),
  escalation_reason: z.string().default(""),
});
export type FollowUpSignal = z.infer<typeof FollowUpSignalSchema>;
