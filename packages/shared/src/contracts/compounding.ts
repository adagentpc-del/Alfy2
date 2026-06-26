import { z } from "zod";

/**
 * Compounding Engine contracts. Nothing should be created only once if it can create value repeatedly.
 * Every completed task is evaluated for whether it can become reusable IP, automation, knowledge, or
 * revenue (SOP, template, automation, agent, workflow, checklist, playbook, training doc, knowledge
 * article, podcast topic, video, social post, newsletter, blog, sales asset, PR opportunity, FounderOS
 * feature, course lesson, keynote, consulting framework, licensing). The engine maintains an Asset Lineage
 * Graph and a Compounding Score. See docs/adr/ADR-0084-compounding-engine.md. Mirrored in workers.
 */

/** The reusable forms a completed task can become. */
export const ReusableFormSchema = z.enum([
  "sop", "template", "automation", "agent", "workflow", "checklist", "playbook", "training_doc",
  "knowledge_article", "podcast_topic", "youtube_video", "social_post", "newsletter", "blog",
  "sales_asset", "pr_opportunity", "founderos_feature", "course_lesson", "keynote",
  "consulting_framework", "licensing_opportunity",
]);
export type ReusableForm = z.infer<typeof ReusableFormSchema>;

/** The eight compounding-score dimensions, each 0..1. */
export const CompoundingMetricsSchema = z.object({
  reuse_frequency: z.number().min(0).max(1).default(0),
  businesses_using: z.number().min(0).max(1).default(0),
  revenue_generated: z.number().min(0).max(1).default(0),
  time_saved: z.number().min(0).max(1).default(0),
  automation_potential: z.number().min(0).max(1).default(0),
  knowledge_value: z.number().min(0).max(1).default(0),
  strategic_importance: z.number().min(0).max(1).default(0),
  longevity: z.number().min(0).max(1).default(0),
});
export type CompoundingMetrics = z.infer<typeof CompoundingMetricsSchema>;

export const EvaluateCompoundingInputSchema = z.object({
  task_title: z.string().min(1),
  task_summary: z.string().default(""),
  business_id: z.string().uuid().nullable().default(null),
  metrics: CompoundingMetricsSchema,
  /** What produced this work (for the lineage graph). */
  created_by: z.string().default(""),
});
export type EvaluateCompoundingInput = z.infer<typeof EvaluateCompoundingInputSchema>;

/** A lineage record — every asset knows what created it, what it created, and its footprint. */
export const AssetLineageSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  asset_title: z.string().min(1),
  created_by: z.string().default(""),
  created_assets: z.array(z.string()).default([]),
  businesses_using: z.array(z.string()).default([]),
  revenue_influenced_usd: z.number().nonnegative().default(0),
  agents_using: z.array(z.string()).default([]),
  workflows_using: z.array(z.string()).default([]),
  version: z.number().int().positive().default(1),
  last_updated: z.string().datetime(),
});
export type AssetLineage = z.infer<typeof AssetLineageSchema>;

/** The compounding evaluation of a completed task. */
export const CompoundingEvaluationSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  task_title: z.string().min(1),
  recommended_forms: z.array(ReusableFormSchema).default([]),
  metrics: CompoundingMetricsSchema,
  /** 0..1 — weighted compounding value. */
  compounding_score: z.number().min(0).max(1),
  /** True when the score warrants creating the reusable version now. */
  recommend_create_reusable: z.boolean().default(false),
  lineage_id: z.string().uuid().nullable().default(null),
  created_at: z.string().datetime(),
});
export type CompoundingEvaluation = z.infer<typeof CompoundingEvaluationSchema>;
