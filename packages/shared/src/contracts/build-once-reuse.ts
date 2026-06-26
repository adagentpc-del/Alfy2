import { z } from "zod";

/**
 * Build Once, Reuse Everywhere. Whenever a module is built, it asks whether the build can be reused by another
 * business, another department, another agent, FounderOS, future clients, or future products — and if so,
 * packages it as a reusable component, workflow, agent, schema, prompt, or playbook. No valuable build should
 * remain trapped in one project. Each assessment is APPEND-ONLY. See docs/adr/ADR-0153-build-once-reuse.md.
 * Mirrored in workers.
 */

/** Who could reuse the build. */
export const ReuseTargetSchema = z.enum([
  "another_business", "another_department", "another_agent", "founderos", "future_clients", "future_products",
]);
export type ReuseTarget = z.infer<typeof ReuseTargetSchema>;

/** The reusable forms a valuable build can be packaged into. */
export const ReusePackageKindSchema = z.enum([
  "component", "workflow", "agent", "schema", "prompt", "playbook",
]);
export type ReusePackageKind = z.infer<typeof ReusePackageKindSchema>;

export const AssessReuseInputSchema = z.object({
  module: z.string().min(1),
  /** 0..1 — how broadly valuable / generic the build is. */
  generality: z.number().min(0).max(1).default(0.5),
  /** The reuse targets that plausibly apply. */
  targets: z.array(ReuseTargetSchema).default([]),
});
export type AssessReuseInput = z.infer<typeof AssessReuseInputSchema>;

/** A reuse assessment for one built module. Append-only. */
export const ReuseAssessmentSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  module: z.string().min(1),
  /** True when the build should be packaged for reuse rather than left in one project. */
  reusable: z.boolean(),
  targets: z.array(ReuseTargetSchema).default([]),
  package_as: z.array(ReusePackageKindSchema).default([]),
  reason: z.string().min(1),
  created_at: z.string().datetime(),
});
export type ReuseAssessment = z.infer<typeof ReuseAssessmentSchema>;
