import { z } from "zod";

/**
 * Don't Drop the Ball System contracts. Detects the things that quietly fall through the cracks —
 * forgotten leads, missed follow-ups, unfinished launches, abandoned ideas, stale campaigns, unpaid
 * invoices, unsigned contracts, open loops, and waiting-on responses — by flagging anything past a
 * per-kind staleness threshold, surfaces them daily, and (once approved) assigns an agent to close the
 * loop. See docs/adr/ADR-0037-dont-drop-the-ball.md. Mirrored in workers (Pydantic).
 */

/** The nine kinds of thing that get dropped. */
export const DroppedKindSchema = z.enum([
  "forgotten_lead",
  "missed_follow_up",
  "unfinished_launch",
  "abandoned_idea",
  "stale_campaign",
  "unpaid_invoice",
  "unsigned_contract",
  "open_loop",
  "waiting_on_response",
]);
export type DroppedKind = z.infer<typeof DroppedKindSchema>;

export const DroppedStatusSchema = z.enum(["open", "assigned", "closed", "dismissed"]);
export type DroppedStatus = z.infer<typeof DroppedStatusSchema>;

/** A candidate the engine evaluates for staleness. */
export const BallCandidateSchema = z.object({
  kind: DroppedKindSchema,
  title: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  business_name: z.string().default(""),
  /** When the item last had activity — staleness is measured from here. */
  last_activity_at: z.string().datetime(),
  value_usd: z.number().nonnegative().default(0),
});
export type BallCandidate = z.infer<typeof BallCandidateSchema>;

/** A detected dropped item. */
export const DroppedItemSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  kind: DroppedKindSchema,
  title: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  business_name: z.string().default(""),
  /** How many days stale (past the kind's threshold). */
  age_days: z.number().int().nonnegative(),
  value_usd: z.number().nonnegative().default(0),
  status: DroppedStatusSchema.default("open"),
  /** The agent assigned to close the loop, once approved. */
  assigned_agent: z.string().nullable().default(null),
  /** The recommended action to close it. */
  recommended_action: z.string().min(1),
  detected_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type DroppedItem = z.infer<typeof DroppedItemSchema>;

/** Input to the daily scan. */
export const ScanInputSchema = z.object({
  candidates: z.array(BallCandidateSchema).default([]),
});
export type ScanInput = z.infer<typeof ScanInputSchema>;
