import { z } from "zod";

/**
 * Knowledge Ops — turns public elite-expert knowledge into a structured, tested,
 * business-specific operating library. NOT a quote library.
 *
 * Sits ON TOP of the Expert Knowledge Council (expert-council.ts), which already
 * handles lens application / conflict / advisory. This engine adds the layers the
 * Council does not: a source library + pipeline, a weekly Elite Operator Digest
 * (surface only likely-leverage so Alyssa is never overwhelmed), the Alyssa
 * Adaptation Filter, knowledge governance (taxonomy + stage-fit + model-fit), a
 * deterministic scenario simulator, and an experiment + learning repository.
 *
 * All enums/objects are UNIQUELY PREFIXED (Knowledge*, Operator*, Adaptation*,
 * Source*, Know*) to avoid barrel collisions with knowledge-vault / knowledge-graph
 * / knowledge-ingestion / expert-council.
 *
 * This contract is mirrored 1:1 by Pydantic models in workers/alfy_workers/contracts.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Where a piece of elite-operator knowledge came from. */
export const KnowledgeSourceKindSchema = z.enum([
  "youtube",
  "podcast",
  "blog",
  "book",
  "newsletter",
  "social",
  "course",
  "transcript",
  "interview",
]);
export type KnowledgeSourceKind = z.infer<typeof KnowledgeSourceKindSchema>;

/** Lifecycle of a source as it moves through the knowledge pipeline. */
export const SourcePipelineStatusSchema = z.enum([
  "added",
  "summarized",
  "extracted",
  "mapped",
  "tested",
  "archived",
]);
export type SourcePipelineStatus = z.infer<typeof SourcePipelineStatusSchema>;

/** Implementation effort (locally named to avoid barrel collision). */
export const KnowEffortSchema = z.enum(["low", "medium", "high"]);
export type KnowEffort = z.infer<typeof KnowEffortSchema>;

/** Magnitude of upside / risk / ROI / quality (locally named). */
export const KnowMagnitudeSchema = z.enum(["low", "medium", "high"]);
export type KnowMagnitude = z.infer<typeof KnowMagnitudeSchema>;

/** Stage a company is at — governs whether advice even applies. */
export const CompanyStageSchema = z.enum([
  "idea",
  "validation",
  "first_revenue",
  "repeatable_revenue",
  "scaling",
  "mature",
  "enterprise",
  "acquisition_ready",
]);
export type CompanyStage = z.infer<typeof CompanyStageSchema>;

/** Business model of the target business (locally named). */
export const KnowBusinessModelSchema = z.enum([
  "saas",
  "marketplace",
  "local_service",
  "advisory",
  "nonprofit",
  "procurement",
  "event_platform",
  "health_wellness",
  "ai_software",
  "media_personal_brand",
  "subscription",
  "transaction_fee",
  "referral_model",
  "sponsorship_model",
]);
export type KnowBusinessModel = z.infer<typeof KnowBusinessModelSchema>;

/** Discipline / domain a principle belongs to (locally named). */
export const KnowDisciplineSchema = z.enum([
  "sales",
  "marketing",
  "offers",
  "pricing",
  "funnels",
  "social_media",
  "finance",
  "investing",
  "operations",
  "hiring",
  "leadership",
  "psychology",
  "negotiation",
  "product",
  "growth",
  "fundraising",
  "customer_success",
  "brand",
  "pr",
  "ai_search",
]);
export type KnowDiscipline = z.infer<typeof KnowDisciplineSchema>;

/** The six strategic lenses the scenario simulator always evaluates. */
export const ScenarioKindSchema = z.enum([
  "fastest_cash",
  "highest_margin",
  "lowest_effort",
  "best_long_term_asset",
  "best_brand",
  "highest_automation",
]);
export type ScenarioKind = z.infer<typeof ScenarioKindSchema>;

/** Where a principle sits in the experiment / learning repository. */
export const KnowExperimentStatusSchema = z.enum([
  "untested",
  "testing",
  "validated",
  "adapted",
  "rejected",
  "archived",
]);
export type KnowExperimentStatus = z.infer<typeof KnowExperimentStatusSchema>;

// ---------------------------------------------------------------------------
// Source library (mutable — moves through the pipeline)
// ---------------------------------------------------------------------------

export const KnowledgeSourceSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  source_name: z.string().min(1),
  expert: z.string().default(""),
  kind: KnowledgeSourceKindSchema,
  url_ref: z.string().default(""),
  date_added: z.string().default(""),
  summarized: z.boolean().default(false),
  principles_extracted: z.boolean().default(false),
  mapped_to_businesses: z.boolean().default(false),
  tested: z.boolean().default(false),
  status: SourcePipelineStatusSchema.default("added"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type KnowledgeSource = z.infer<typeof KnowledgeSourceSchema>;

// ---------------------------------------------------------------------------
// Elite Operator Digest (append-only — only likely-leverage items are surfaced)
// ---------------------------------------------------------------------------

export const OperatorDigestItemSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  week: z.string().min(1),
  source: z.string().default(""),
  principle: z.string().min(1),
  why_it_matters: z.string().default(""),
  business_it_applies_to: z.string().default(""),
  recommended_test: z.string().default(""),
  effort: KnowEffortSchema.default("medium"),
  upside: KnowMagnitudeSchema.default("medium"),
  risk: KnowMagnitudeSchema.default("medium"),
  /** Set true only for likely-leverage items, so Alyssa is never overwhelmed. */
  surfaced: z.boolean().default(false),
  created_at: z.string().datetime(),
});
export type OperatorDigestItem = z.infer<typeof OperatorDigestItemSchema>;

// ---------------------------------------------------------------------------
// Alyssa Adaptation Filter (append-only — pass/fail with reasoning)
// ---------------------------------------------------------------------------

export const AdaptationFilterResultSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  principle: z.string().min(1),
  business_key: z.string().min(1),
  fits_model: z.boolean().default(false),
  fits_brand: z.boolean().default(false),
  fits_energy: z.boolean().default(false),
  protects_trust: z.boolean().default(false),
  creates_leverage: z.boolean().default(false),
  risks_generic: z.boolean().default(false),
  too_manual: z.boolean().default(false),
  ai_automatable: z.boolean().default(false),
  cheaply_testable: z.boolean().default(false),
  passed: z.boolean().default(false),
  recommendation: z.string().default(""),
  created_at: z.string().datetime(),
});
export type AdaptationFilterResult = z.infer<typeof AdaptationFilterResultSchema>;

// ---------------------------------------------------------------------------
// Knowledge taxonomy / governance (append-only)
// ---------------------------------------------------------------------------

export const KnowledgeTaxonomyEntrySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  insight: z.string().min(1),
  discipline: KnowDisciplineSchema,
  business_function: z.string().default(""),
  funnel_stage: z.string().default(""),
  company_stage: CompanyStageSchema,
  business_model: KnowBusinessModelSchema,
  audience_type: z.string().default(""),
  risk_level: KnowMagnitudeSchema.default("medium"),
  implementation_difficulty: KnowEffortSchema.default("medium"),
  expected_roi: KnowMagnitudeSchema.default("medium"),
  confidence: z.number().min(0).max(1).default(0.5),
  source_quality: KnowMagnitudeSchema.default("medium"),
  freshness: z.string().default(""),
  created_at: z.string().datetime(),
});
export type KnowledgeTaxonomyEntry = z.infer<typeof KnowledgeTaxonomyEntrySchema>;

// ---------------------------------------------------------------------------
// Scenario simulator (append-only — always all six ScenarioKind options)
// ---------------------------------------------------------------------------

export const ScenarioOptionSchema = z.object({
  kind: ScenarioKindSchema,
  upside: z.string().default(""),
  effort: KnowEffortSchema.default("medium"),
  risk: KnowMagnitudeSchema.default("medium"),
  timeline: z.string().default(""),
  required_agents: z.array(z.string()).default([]),
  kpis: z.array(z.string()).default([]),
  recommendation: z.string().default(""),
});
export type ScenarioOption = z.infer<typeof ScenarioOptionSchema>;

export const KnowledgeScenarioSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  strategy: z.string().min(1),
  business_key: z.string().min(1),
  scenarios: z.array(ScenarioOptionSchema).default([]),
  created_at: z.string().datetime(),
});
export type KnowledgeScenario = z.infer<typeof KnowledgeScenarioSchema>;

// ---------------------------------------------------------------------------
// Experiment + learning repository (mutable — keep / adapt / reject / archive)
// ---------------------------------------------------------------------------

export const KnowledgeExperimentSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  hypothesis: z.string().min(1),
  business_key: z.string().min(1),
  audience: z.string().default(""),
  asset: z.string().default(""),
  channel: z.string().default(""),
  timeline: z.string().default(""),
  expected_result: z.string().default(""),
  kpi: z.string().default(""),
  success_threshold: z.string().default(""),
  failure_threshold: z.string().default(""),
  next_if_works: z.string().default(""),
  next_if_fails: z.string().default(""),
  status: KnowExperimentStatusSchema.default("untested"),
  result_notes: z.string().default(""),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type KnowledgeExperiment = z.infer<typeof KnowledgeExperimentSchema>;
