import { z } from "zod";

/**
 * Podcast Guest Booking Agent contracts. Mines Alyssa's contacts and external experts for guests, ranks
 * them by relevance, credibility, audience fit, and business value, drafts outreach, tracks replies,
 * schedules, and prepares briefs — and also gets Alyssa booked on OTHER podcasts. Never sends outreach
 * without approval unless persistent approval exists. See docs/adr/ADR-0072-podcast-guests.md. Mirrored in
 * workers (Pydantic).
 */

export const GuestStatusSchema = z.enum([
  "candidate",
  "approved_to_contact",
  "contacted",
  "replied",
  "scheduled",
  "recorded",
  "declined",
]);
export type GuestStatus = z.infer<typeof GuestStatusSchema>;

/** Whether the record is a guest FOR the show, or a target show to get Alyssa booked ON. */
export const BookingDirectionSchema = z.enum(["inbound_guest", "outbound_appearance"]);
export type BookingDirection = z.infer<typeof BookingDirectionSchema>;

export const GuestCandidateInputSchema = z.object({
  direction: BookingDirectionSchema.default("inbound_guest"),
  name: z.string().min(1),
  /** For outbound: the show/host; for inbound: their org/expertise. */
  context: z.string().default(""),
  /** Ranking signals 0..1. */
  relevance: z.number().min(0).max(1).default(0.5),
  credibility: z.number().min(0).max(1).default(0.5),
  audience_fit: z.number().min(0).max(1).default(0.5),
  business_value: z.number().min(0).max(1).default(0.5),
  pitch_angle: z.string().default(""),
});
export type GuestCandidateInput = z.infer<typeof GuestCandidateInputSchema>;

/** A tracked guest / appearance target. */
export const GuestRecordSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  direction: BookingDirectionSchema,
  name: z.string().min(1),
  context: z.string().default(""),
  relevance: z.number().min(0).max(1),
  credibility: z.number().min(0).max(1),
  audience_fit: z.number().min(0).max(1),
  business_value: z.number().min(0).max(1),
  /** Weighted composite ranking, 0..1. */
  rank_score: z.number().min(0).max(1),
  status: GuestStatusSchema.default("candidate"),
  pitch_angle: z.string().default(""),
  /** Drafted but not sent until approved (or persistent approval exists). */
  draft_outreach: z.string().default(""),
  outreach_approved: z.boolean().default(false),
  booked_date: z.string().datetime().nullable().default(null),
  episode_link: z.string().default(""),
  relationship_value: z.number().min(0).max(1).default(0.5),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type GuestRecord = z.infer<typeof GuestRecordSchema>;
