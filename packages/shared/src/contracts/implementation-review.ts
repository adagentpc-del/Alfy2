import { z } from "zod";

/**
 * Implementation Review Agent. After a coding agent (Claude Code / Codex) completes work, it reviews whether
 * the work satisfied requirements, created the correct files, followed the architecture, introduced security
 * issues, preserved permissions, updated documentation, included tests, and broke nothing existing. It
 * outputs a verdict (approve / needs_revision / reject), the risks found, and recommended fixes. Each review
 * is an APPEND-ONLY record. Composes the QA checklist. See docs/adr/ADR-0137-implementation-review.md.
 * Mirrored in workers.
 */

/** The review dimensions, each pass/fail with a note. */
export const ReviewDimensionSchema = z.enum([
  "satisfied_requirements", "correct_files", "followed_architecture", "no_security_issues",
  "preserved_permissions", "updated_documentation", "included_tests", "no_regressions",
]);
export type ReviewDimension = z.infer<typeof ReviewDimensionSchema>;

export const ReviewCheckSchema = z.object({
  dimension: ReviewDimensionSchema,
  passed: z.boolean(),
  note: z.string().default(""),
});
export type ReviewCheck = z.infer<typeof ReviewCheckSchema>;

export const ImplementationVerdictSchema = z.enum(["approve", "needs_revision", "reject"]);
export type ImplementationVerdict = z.infer<typeof ImplementationVerdictSchema>;

export const ReviewImplementationInputSchema = z.object({
  build_packet_id: z.string().uuid().nullable().default(null),
  handoff_id: z.string().uuid().nullable().default(null),
  checks: z.array(ReviewCheckSchema).default([]),
});
export type ReviewImplementationInput = z.infer<typeof ReviewImplementationInputSchema>;

/** One implementation review verdict. Append-only. */
export const ImplementationReviewSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  build_packet_id: z.string().uuid().nullable().default(null),
  handoff_id: z.string().uuid().nullable().default(null),
  checks: z.array(ReviewCheckSchema).default([]),
  verdict: ImplementationVerdictSchema,
  risks_found: z.array(z.string()).default([]),
  recommended_fixes: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type ImplementationReview = z.infer<typeof ImplementationReviewSchema>;
