import { z } from "zod";

/**
 * Tech Stack Evaluator. Continuously evaluates the technology stack supporting Alfy² (AI / coding / voice /
 * image / video models, search, GitHub, Supabase, Render, Resend, Stripe, Slack, Google/Apple/Microsoft
 * ecosystems, security tools, open-source projects). For every update it decides: upgrade, replace, wait,
 * experiment, or ignore. It NEVER recommends change simply because something is newer — only when there is a
 * measurable benefit. Each evaluation is APPEND-ONLY. See docs/adr/ADR-0152-tech-stack-evaluator.md. Mirrored
 * in workers.
 */

export const StackCategorySchema = z.enum([
  "ai_model", "coding_model", "voice_model", "image_model", "video_model", "search", "github", "supabase",
  "render", "resend", "stripe", "slack", "google_workspace", "apple_ecosystem", "microsoft_ecosystem",
  "security_tool", "open_source",
]);
export type StackCategory = z.infer<typeof StackCategorySchema>;

export const StackDispositionSchema = z.enum(["upgrade", "replace", "wait", "experiment", "ignore"]);
export type StackDisposition = z.infer<typeof StackDispositionSchema>;

/** The signals that decide the disposition (0..1). Change requires measurable benefit, not novelty. */
export const StackSignalsSchema = z.object({
  measurable_benefit: z.number().min(0).max(1).default(0),
  current_pain: z.number().min(0).max(1).default(0),
  switching_cost: z.number().min(0).max(1).default(0.3),
  risk: z.number().min(0).max(1).default(0.3),
  maturity: z.number().min(0).max(1).default(0.5),
});
export type StackSignals = z.infer<typeof StackSignalsSchema>;

export const EvaluateStackInputSchema = z.object({
  component: z.string().min(1),
  category: StackCategorySchema,
  signals: StackSignalsSchema,
});
export type EvaluateStackInput = z.infer<typeof EvaluateStackInputSchema>;

/** One stack evaluation. Append-only. */
export const StackEvaluationSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  component: z.string().min(1),
  category: StackCategorySchema,
  signals: StackSignalsSchema,
  disposition: StackDispositionSchema,
  /** True only when there is a real, measurable benefit — guards against change-for-novelty. */
  has_measurable_benefit: z.boolean(),
  reason: z.string().min(1),
  created_at: z.string().datetime(),
});
export type StackEvaluation = z.infer<typeof StackEvaluationSchema>;
