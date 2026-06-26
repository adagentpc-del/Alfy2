import { z } from "zod";

/**
 * Research & Development Department. Continuously evaluates discoveries across technology and industry so
 * Alyssa stays ahead, assigning each a disposition and a confidence — and surfacing only high-confidence
 * opportunities. Produces a weekly Innovation Report. See docs/adr/ADR-0111-rnd.md. Mirrored in workers.
 */

export const RndDomainSchema = z.enum([
  "ai_model", "github_repo", "research_paper", "patent", "startup", "competitor", "api", "hardware",
  "quantum", "security", "robotics", "healthcare", "construction", "real_estate", "finance",
  "regulation", "emerging_industry", "workflow", "automation",
]);
export type RndDomain = z.infer<typeof RndDomainSchema>;

export const RndDispositionSchema = z.enum([
  "learn", "test", "implement", "ignore", "watch", "invest", "build_on", "partner",
]);
export type RndDisposition = z.infer<typeof RndDispositionSchema>;

export const EvaluateDiscoveryInputSchema = z.object({
  domain: RndDomainSchema,
  title: z.string().min(1),
  summary: z.string().default(""),
  /** 0..1 signals. */
  relevance: z.number().min(0).max(1).default(0.5),
  upside: z.number().min(0).max(1).default(0.5),
  maturity: z.number().min(0).max(1).default(0.5),
  effort: z.number().min(0).max(1).default(0.5),
  risk: z.number().min(0).max(1).default(0.3),
});
export type EvaluateDiscoveryInput = z.infer<typeof EvaluateDiscoveryInputSchema>;

/** One evaluated discovery. */
export const RndDiscoverySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  domain: RndDomainSchema,
  title: z.string().min(1),
  disposition: RndDispositionSchema,
  /** 0..1 — confidence this is worth acting on. */
  confidence: z.number().min(0).max(1),
  /** True when confidence clears the high-confidence threshold and it should be surfaced. */
  high_confidence: z.boolean(),
  rationale: z.string().min(1),
  next_step: z.string().min(1),
  created_at: z.string().datetime(),
});
export type RndDiscovery = z.infer<typeof RndDiscoverySchema>;

/** The weekly Innovation Report — high-confidence items grouped by disposition. */
export const InnovationReportSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  period_label: z.string().min(1),
  evaluated_count: z.number().int().nonnegative(),
  high_confidence_count: z.number().int().nonnegative(),
  top_opportunities: z.array(RndDiscoverySchema).default([]),
  watch_list: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type InnovationReport = z.infer<typeof InnovationReportSchema>;
