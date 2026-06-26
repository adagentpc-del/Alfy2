import { z } from "zod";
import { DecisionCategorySchema } from "./decision.js";
import { SuccessMetricSchema } from "./agent-factory.js";

/**
 * Idea Builder contracts. Trigger: "I have an idea." The builder produces a complete, structured
 * workup (fifteen sections) and STOPS at an approval gate — it never begins building until approved.
 * See docs/adr/ADR-0008-idea-builder.md. Mirrored in workers (Pydantic).
 */

// --- enums ---
export const PricingModelSchema = z.enum([
  "subscription",
  "one_time",
  "usage",
  "marketplace",
  "freemium",
  "tiered",
]);
export type PricingModel = z.infer<typeof PricingModelSchema>;

export const CompetitorKindSchema = z.enum(["direct", "indirect", "substitute"]);
export type CompetitorKind = z.infer<typeof CompetitorKindSchema>;

export const RiskSeveritySchema = z.enum(["low", "medium", "high"]);
export type RiskSeverity = z.infer<typeof RiskSeveritySchema>;

export const IdeaVerdictSchema = z.enum(["pursue", "pursue_with_changes", "park", "pass"]);
export type IdeaVerdict = z.infer<typeof IdeaVerdictSchema>;

export const IdeaStatusSchema = z.enum(["awaiting_approval", "approved", "rejected"]);
export type IdeaStatus = z.infer<typeof IdeaStatusSchema>;

export const HttpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

// --- sub-types ---
export const CompetitorSchema = z.object({
  name: z.string().min(1),
  kind: CompetitorKindSchema,
  notes: z.string().default(""),
});
export type Competitor = z.infer<typeof CompetitorSchema>;

export const PriceTierSchema = z.object({
  name: z.string().min(1),
  price: z.string().min(1),
  includes: z.array(z.string()).default([]),
});
export type PriceTier = z.infer<typeof PriceTierSchema>;

export const DbTableSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().min(1),
  key_fields: z.array(z.string()).min(1),
});
export type DbTable = z.infer<typeof DbTableSchema>;

export const ApiEndpointSchema = z.object({
  method: HttpMethodSchema,
  path: z.string().min(1),
  purpose: z.string().min(1),
});
export type ApiEndpoint = z.infer<typeof ApiEndpointSchema>;

export const AgentNeedSchema = z.object({
  proposed_key: z.string().min(1),
  purpose: z.string().min(1),
  capabilities: z.array(z.string()).default([]),
});
export type AgentNeed = z.infer<typeof AgentNeedSchema>;

export const LaunchPhaseSchema = z.object({
  name: z.string().min(1),
  goal: z.string().min(1),
  actions: z.array(z.string()).min(1),
});
export type LaunchPhase = z.infer<typeof LaunchPhaseSchema>;

export const RiskSchema = z.object({
  risk: z.string().min(1),
  severity: RiskSeveritySchema,
  mitigation: z.string().min(1),
});
export type Risk = z.infer<typeof RiskSchema>;

// --- the fifteen sections ---
export const MarketResearchSchema = z.object({
  summary: z.string().min(1),
  target_segments: z.array(z.string()).min(1),
  demand_signals: z.array(z.string()).default([]),
  open_questions: z.array(z.string()).default([]),
  tam_hypothesis: z.string().min(1),
});
export type MarketResearch = z.infer<typeof MarketResearchSchema>;

export const CompetitorAnalysisSchema = z.object({
  competitors: z.array(CompetitorSchema).min(1),
  positioning_gap: z.string().min(1),
});
export type CompetitorAnalysis = z.infer<typeof CompetitorAnalysisSchema>;

export const PricingPlanSchema = z.object({
  model: PricingModelSchema,
  tiers: z.array(PriceTierSchema).min(1),
  rationale: z.string().min(1),
});
export type PricingPlan = z.infer<typeof PricingPlanSchema>;

export const OfferSchema = z.object({
  headline: z.string().min(1),
  what_you_get: z.array(z.string()).min(1),
  guarantee: z.string().default(""),
  primary_cta: z.string().min(1),
});
export type Offer = z.infer<typeof OfferSchema>;

export const PositioningSchema = z.object({
  one_liner: z.string().min(1),
  for_whom: z.string().min(1),
  unlike: z.string().min(1),
  because: z.string().min(1),
  category: z.string().min(1),
});
export type Positioning = z.infer<typeof PositioningSchema>;

export const MvpPlanSchema = z.object({
  goal: z.string().min(1),
  must_have: z.array(z.string()).min(1),
  explicitly_not: z.array(z.string()).default([]),
  success_metric: SuccessMetricSchema,
});
export type MvpPlan = z.infer<typeof MvpPlanSchema>;

export const DataModelSchema = z.object({
  tables: z.array(DbTableSchema).min(1),
});
export type DataModel = z.infer<typeof DataModelSchema>;

export const ApiPlanSchema = z.object({
  endpoints: z.array(ApiEndpointSchema).min(1),
  integrations: z.array(z.string()).default([]),
});
export type ApiPlan = z.infer<typeof ApiPlanSchema>;

export const RequiredAgentsSchema = z.object({
  agents: z.array(AgentNeedSchema).default([]),
});
export type RequiredAgents = z.infer<typeof RequiredAgentsSchema>;

export const MarketingPlanSchema = z.object({
  channels: z.array(z.string()).min(1),
  content_pillars: z.array(z.string()).default([]),
  hooks: z.array(z.string()).default([]),
});
export type MarketingPlan = z.infer<typeof MarketingPlanSchema>;

export const SeoPlanSchema = z.object({
  primary_keywords: z.array(z.string()).min(1),
  content_ideas: z.array(z.string()).default([]),
  notes: z.string().default(""),
});
export type SeoPlan = z.infer<typeof SeoPlanSchema>;

export const LaunchPlanSchema = z.object({
  phases: z.array(LaunchPhaseSchema).min(1),
});
export type LaunchPlan = z.infer<typeof LaunchPlanSchema>;

export const MonetizationPlanSchema = z.object({
  primary: z.string().min(1),
  secondary: z.array(z.string()).default([]),
  expansion: z.array(z.string()).default([]),
});
export type MonetizationPlan = z.infer<typeof MonetizationPlanSchema>;

export const RiskAssessmentSchema = z.object({
  risks: z.array(RiskSchema).min(1),
  overall: RiskSeveritySchema,
});
export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;

export const RecommendationSchema = z.object({
  verdict: IdeaVerdictSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  next_step: z.string().min(1),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

// --- input + the full blueprint ---
export const IdeaInputSchema = z.object({
  text: z.string().min(1),
});
export type IdeaInput = z.infer<typeof IdeaInputSchema>;

export const IdeaBlueprintSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  idea_text: z.string().min(1),
  title: z.string().min(1),
  category: DecisionCategorySchema,
  priority_score: z.number().min(0).max(1),

  market_research: MarketResearchSchema,
  competitors: CompetitorAnalysisSchema,
  pricing: PricingPlanSchema,
  offer: OfferSchema,
  positioning: PositioningSchema,
  mvp: MvpPlanSchema,
  database: DataModelSchema,
  api_needs: ApiPlanSchema,
  required_agents: RequiredAgentsSchema,
  marketing: MarketingPlanSchema,
  seo: SeoPlanSchema,
  launch: LaunchPlanSchema,
  monetization: MonetizationPlanSchema,
  risks: RiskAssessmentSchema,
  recommendation: RecommendationSchema,

  /** Operator approval. Building never starts until this is true. */
  approved: z.boolean().default(false),
  status: IdeaStatusSchema.default("awaiting_approval"),
  explanation: z.string().min(1),
  created_at: z.string().datetime(),
});
export type IdeaBlueprint = z.infer<typeof IdeaBlueprintSchema>;
