import { z } from "zod";

/**
 * AI Center of Excellence contracts — Alfy²'s internal standards layer. It holds the approved prompt
 * library, agent/workflow templates, and the security/data/naming/testing/documentation/escalation/
 * model-usage/cost standards, and it checks that every new agent, workflow, and connector complies.
 * See docs/adr/ADR-0022-ai-center-of-excellence.md. Mirrored in workers (Pydantic).
 */

/** The eleven kinds of standard the CoE governs. */
export const StandardKindSchema = z.enum([
  "prompt",
  "agent_template",
  "workflow_template",
  "security_standard",
  "data_standard",
  "naming_convention",
  "testing_standard",
  "documentation_standard",
  "escalation_rule",
  "model_usage_rule",
  "cost_control",
]);
export type StandardKind = z.infer<typeof StandardKindSchema>;

export const StandardStatusSchema = z.enum(["draft", "approved", "deprecated"]);
export type StandardStatus = z.infer<typeof StandardStatusSchema>;

/** What a compliance check targets. */
export const ComplianceTargetKindSchema = z.enum(["agent", "workflow", "connector"]);
export type ComplianceTargetKind = z.infer<typeof ComplianceTargetKindSchema>;

export const ViolationSeveritySchema = z.enum(["info", "warning", "error"]);
export type ViolationSeverity = z.infer<typeof ViolationSeveritySchema>;

/** One approved standard (a prompt, a template, or a rule set). */
export const ApprovedStandardSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  kind: StandardKindSchema,
  name: z.string().min(1),
  version: z.string().default("1.0.0"),
  status: StandardStatusSchema.default("draft"),
  summary: z.string().default(""),
  /** The full content — the prompt text, the template, or the standard's prose. */
  body: z.string().default(""),
  /** Machine-checkable rule identifiers this standard enforces (e.g. "name:slug", "cost:max"). */
  rules: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type ApprovedStandard = z.infer<typeof ApprovedStandardSchema>;

export const CreateStandardInputSchema = z.object({
  kind: StandardKindSchema,
  name: z.string().min(1),
  summary: z.string().default(""),
  body: z.string().default(""),
  rules: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});
export type CreateStandardInput = z.infer<typeof CreateStandardInputSchema>;

/** A thing being checked for compliance with the standards. */
export const ComplianceTargetSchema = z.object({
  kind: ComplianceTargetKindSchema,
  name: z.string().min(1),
  /** The model the target uses, if any (checked against model-usage rules). */
  model: z.string().nullable().default(null),
  has_tests: z.boolean().default(false),
  has_docs: z.boolean().default(false),
  /** Estimated per-run cost (checked against cost controls). */
  est_cost_usd: z.number().nonnegative().default(0),
  /** Whether the target gates irreversible actions behind approval. */
  requires_approval: z.boolean().default(false),
  /** Whether the target performs irreversible/sensitive actions (raises the security bar). */
  irreversible: z.boolean().default(false),
  permissions: z.array(z.string()).default([]),
  attributes: z.record(z.unknown()).default({}),
});
export type ComplianceTarget = z.infer<typeof ComplianceTargetSchema>;

/** A single standards violation. */
export const ViolationSchema = z.object({
  standard_kind: StandardKindSchema,
  rule: z.string().min(1),
  severity: ViolationSeveritySchema,
  message: z.string().min(1),
});
export type Violation = z.infer<typeof ViolationSchema>;

/** The result of checking a target against the standards. */
export const ComplianceResultSchema = z.object({
  target_kind: ComplianceTargetKindSchema,
  target_name: z.string().min(1),
  /** True only when there are no error-severity violations. */
  passed: z.boolean(),
  /** Fraction of applicable checks passed, 0..1. */
  score: z.number().min(0).max(1),
  violations: z.array(ViolationSchema).default([]),
  /** The standard kinds that were evaluated. */
  checked: z.array(StandardKindSchema).default([]),
  created_at: z.string().datetime(),
});
export type ComplianceResult = z.infer<typeof ComplianceResultSchema>;
