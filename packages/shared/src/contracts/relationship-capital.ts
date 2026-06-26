import { z } from "zod";

/**
 * Relationship Capital Engine. Treats relationships as long-term capital that compounds trust over decades.
 * Tracks every relationship party (family, friends, clients, investors, vendors, partners, podcast guests,
 * mentors, employees, advisors) with conversation & follow-up history, important dates, shared interests,
 * business opportunities, introductions, promises made, preferred communication, and relationship health &
 * strength. It surfaces opportunities to reconnect, introduce people, thank someone, celebrate wins, and
 * provide value before asking. The record is MUTABLE — relationship state evolves. Named RelationshipParty*
 * to avoid colliding with the existing RelationshipKind in the memory graph. See
 * docs/adr/ADR-0130-relationship-capital.md. Mirrored in workers.
 */

export const RelationshipPartyKindSchema = z.enum([
  "family", "friend", "client", "investor", "vendor", "partner",
  "podcast_guest", "mentor", "employee", "advisor",
]);
export type RelationshipPartyKind = z.infer<typeof RelationshipPartyKindSchema>;

/** A promise made, with whether it has been kept. */
export const RelationshipPromiseSchema = z.object({
  promise: z.string().min(1),
  due: z.string().datetime().nullable().default(null),
  kept: z.boolean().default(false),
});
export type RelationshipPromise = z.infer<typeof RelationshipPromiseSchema>;

/** The kinds of value-creating moves the engine surfaces. */
export const RelationshipMoveKindSchema = z.enum([
  "reconnect", "introduce", "thank", "celebrate_win", "provide_value",
]);
export type RelationshipMoveKind = z.infer<typeof RelationshipMoveKindSchema>;

/** A surfaced opportunity to invest in the relationship — value before asking. */
export const RelationshipOpportunitySchema = z.object({
  move: RelationshipMoveKindSchema,
  reason: z.string().min(1),
  /** 0..1 — how timely / high-value this move is now. */
  priority: z.number().min(0).max(1).default(0.5),
});
export type RelationshipOpportunity = z.infer<typeof RelationshipOpportunitySchema>;

export const UpsertRelationshipInputSchema = z.object({
  person_id: z.string().min(1),
  name: z.string().min(1),
  kind: RelationshipPartyKindSchema,
  preferred_communication: z.string().default(""),
});
export type UpsertRelationshipInput = z.infer<typeof UpsertRelationshipInputSchema>;

/** A relationship treated as capital. Mutable — health/strength and history evolve. */
export const RelationshipCapitalRecordSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  person_id: z.string().min(1),
  name: z.string().min(1),
  kind: RelationshipPartyKindSchema,
  conversation_history: z.array(z.string()).default([]),
  follow_up_history: z.array(z.string()).default([]),
  important_dates: z.array(z.string()).default([]),
  shared_interests: z.array(z.string()).default([]),
  business_opportunities: z.array(z.string()).default([]),
  introductions: z.array(z.string()).default([]),
  promises_made: z.array(RelationshipPromiseSchema).default([]),
  preferred_communication: z.string().default(""),
  /** 0..1 — relationship health (warmth / reciprocity / recency). */
  health: z.number().min(0).max(1).default(0.5),
  /** 0..1 — relationship strength (depth / trust accrued). */
  strength: z.number().min(0).max(1).default(0.5),
  opportunities: z.array(RelationshipOpportunitySchema).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type RelationshipCapitalRecord = z.infer<typeof RelationshipCapitalRecordSchema>;
