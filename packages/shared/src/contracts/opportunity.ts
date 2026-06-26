import { z } from "zod";

/**
 * Opportunity Intelligence contracts. Continuously analyzes contacts, businesses, vendors, investors,
 * clients, ideas, GitHub repositories, assets, past conversations, and market trends, finds
 * relationships between them, and surfaces ranked opportunities — e.g. "this developer also fits Divini
 * Procure", "this investor should meet this project", "this GitHub repo solves Move Mi", "this vendor
 * should be introduced to this developer". Every opportunity is scored on revenue, probability, effort,
 * risk, and strategic value. See docs/adr/ADR-0019-opportunity-intelligence.md. Mirrored in workers.
 */

/** The ten analyzable entity sources. */
export const EntityKindSchema = z.enum([
  "contact",
  "business",
  "vendor",
  "investor",
  "client",
  "idea",
  "github_repo",
  "asset",
  "conversation",
  "market_trend",
]);
export type EntityKind = z.infer<typeof EntityKindSchema>;

/** The kind of relationship/opportunity found between two entities. */
export const RelationshipKindSchema = z.enum([
  "fit",
  "introduction",
  "solves",
  "investment",
  "partnership",
  "synergy",
  "trend_tailwind",
]);
export type RelationshipKind = z.infer<typeof RelationshipKindSchema>;

export const OpportunityStatusSchema = z.enum(["new", "surfaced", "accepted", "dismissed", "acted"]);
export type OpportunityStatus = z.infer<typeof OpportunityStatusSchema>;

/** A reference to an entity drawn from one of the analyzable sources. */
export const EntityRefSchema = z.object({
  /** Identifier in the source system (memory id, asset id, repo id, etc.). */
  ref_id: z.string().min(1),
  kind: EntityKindSchema,
  name: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  tags: z.array(z.string()).default([]),
  /** Words describing the entity (skills, sectors, problems, theses) — the matching signal. */
  keywords: z.array(z.string()).default([]),
  /** Structured hints, e.g. { role: "developer", sector: "logistics", revenue_potential: "high" }. */
  attributes: z.record(z.unknown()).default({}),
});
export type EntityRef = z.infer<typeof EntityRefSchema>;

/** The five ranking dimensions plus the composite. All 0..1 (effort/risk: higher = worse). */
export const OpportunityScoreSchema = z.object({
  revenue: z.number().min(0).max(1),
  probability: z.number().min(0).max(1),
  effort: z.number().min(0).max(1),
  risk: z.number().min(0).max(1),
  strategic_value: z.number().min(0).max(1),
  composite: z.number().min(0).max(1),
});
export type OpportunityScore = z.infer<typeof OpportunityScoreSchema>;

/** A surfaced opportunity connecting two entities. */
export const OpportunitySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  kind: RelationshipKindSchema,
  /** The human-facing statement, e.g. "This GitHub repo solves Move Mi". */
  title: z.string().min(1),
  source: EntityRefSchema,
  target: EntityRefSchema,
  rationale: z.string().min(1),
  evidence: z.array(z.string()).default([]),
  scores: OpportunityScoreSchema,
  recommended_action: z.string().min(1),
  recommended_agents: z.array(z.string()).default([]),
  status: OpportunityStatusSchema.default("new"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Opportunity = z.infer<typeof OpportunitySchema>;

/** The corpus to analyze. */
export const AnalyzeInputSchema = z.object({
  entities: z.array(EntityRefSchema).min(2),
});
export type AnalyzeInput = z.infer<typeof AnalyzeInputSchema>;

/** Weights for the composite rank. Positive dims add; effort and risk subtract. */
export const ScoreWeightsSchema = z.object({
  revenue: z.number().default(0.3),
  probability: z.number().default(0.25),
  strategic_value: z.number().default(0.2),
  effort: z.number().default(0.15),
  risk: z.number().default(0.1),
});
export type ScoreWeights = z.infer<typeof ScoreWeightsSchema>;
