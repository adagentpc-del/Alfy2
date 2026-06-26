import { z } from "zod";

/**
 * Intelligence "lenses" — two read-model engines that turn information into decisions.
 *
 * Why This Matters to Me: for any news/article/repo/book/law/tech update, answers which businesses it
 * affects, whether anything must change, competitive advantage, compliance risk, product opportunity,
 * test/ignore, which assets/agents/workflows/SOPs to update, and whether it belongs in a strategy review.
 *
 * Contrarian View: for major trends/technologies/companies/investments, deliberately evaluates the
 * strongest credible opposing view to reduce blind spots and prevent hype-driven decisions.
 *
 * See docs/adr/ADR-0069-intel-lenses.md. Mirrored in workers (Pydantic).
 */

// === Why This Matters to Me ===

export const WhyThisMattersInputSchema = z.object({
  title: z.string().min(1),
  summary: z.string().default(""),
  /** Alyssa's businesses, for matching. */
  businesses: z.array(z.string()).default([]),
  /** Free-text content to scan for business mentions and signals. */
  content: z.string().default(""),
  competitive: z.boolean().default(false),
  compliance_sensitive: z.boolean().default(false),
  product_relevant: z.boolean().default(false),
});
export type WhyThisMattersInput = z.infer<typeof WhyThisMattersInputSchema>;

export const WhyThisMattersSchema = z.object({
  title: z.string().min(1),
  businesses_affected: z.array(z.string()).default([]),
  needs_change: z.boolean(),
  competitive_advantage: z.boolean(),
  compliance_risk: z.boolean(),
  product_opportunity: z.boolean(),
  should_test: z.boolean(),
  should_ignore: z.boolean(),
  assets_agents_workflows_to_update: z.array(z.string()).default([]),
  add_to_strategy_review: z.enum(["none", "monthly", "quarterly"]).default("none"),
  decision: z.string().min(1),
});
export type WhyThisMatters = z.infer<typeof WhyThisMattersSchema>;

// === Contrarian View ===

export const ContrarianInputSchema = z.object({
  subject: z.string().min(1),
  mainstream_view: z.string().min(1),
  /** Optional caller-supplied counter-evidence to weave in. */
  counter_evidence: z.array(z.string()).default([]),
});
export type ContrarianInput = z.infer<typeof ContrarianInputSchema>;

export const ContrarianViewSchema = z.object({
  subject: z.string().min(1),
  mainstream_view: z.string().min(1),
  contrarian_view: z.string().min(1),
  evidence_for_mainstream: z.array(z.string()).default([]),
  evidence_for_contrarian: z.array(z.string()).default([]),
  ignored_risks: z.array(z.string()).default([]),
  questionable_assumptions: z.array(z.string()).default([]),
  adoption_barriers: z.array(z.string()).default([]),
  compliance_concerns: z.array(z.string()).default([]),
  business_model_weaknesses: z.array(z.string()).default([]),
  execution_risks: z.array(z.string()).default([]),
  recommendation: z.string().min(1),
});
export type ContrarianView = z.infer<typeof ContrarianViewSchema>;
