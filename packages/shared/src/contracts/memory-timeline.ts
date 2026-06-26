import { z } from "zod";

/**
 * Enterprise Memory Timeline contracts. A chronological history of business launches, campaigns, product
 * releases, major decisions, clients, partnerships, financial milestones, failures, wins, hiring,
 * technology adoption, legal events, and media appearances — each event linking related assets, agents,
 * people, businesses, and lessons. It makes it easy to answer "when did we first discuss this?" and "what
 * happened after that decision?" See docs/adr/ADR-0091-memory-timeline.md. Mirrored in workers (Pydantic).
 */

export const TimelineEventKindSchema = z.enum([
  "business_launch", "campaign", "product_release", "major_decision", "client", "partnership",
  "financial_milestone", "failure", "win", "hiring", "technology_adoption", "legal_event", "media_appearance",
]);
export type TimelineEventKind = z.infer<typeof TimelineEventKindSchema>;

export const AddTimelineEventInputSchema = z.object({
  kind: TimelineEventKindSchema,
  title: z.string().min(1),
  occurred_at: z.string().datetime(),
  summary: z.string().default(""),
  business_id: z.string().uuid().nullable().default(null),
  related_assets: z.array(z.string()).default([]),
  related_agents: z.array(z.string()).default([]),
  related_people: z.array(z.string()).default([]),
  related_businesses: z.array(z.string()).default([]),
  lessons_learned: z.array(z.string()).default([]),
});
export type AddTimelineEventInput = z.infer<typeof AddTimelineEventInputSchema>;

export const TimelineEventSchema = AddTimelineEventInputSchema.extend({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  created_at: z.string().datetime(),
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
