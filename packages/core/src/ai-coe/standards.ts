import type { CreateStandardInput } from "@alfy2/shared";

/**
 * The default Center-of-Excellence standards seeded into a tenant. Each carries machine-checkable
 * `rules` the compliance checker enforces (see checker.ts). These are the baseline; a tenant can add or
 * supersede standards via the engine. Deterministic, no AI.
 */

/** Models the platform is approved to use (model-usage rule). */
export const APPROVED_MODELS: readonly string[] = [
  "claude-code",
  "gpt-5.5",
  "gpt-codex",
  "openclaw",
  "local-llama",
];

/** Default per-run cost ceiling in USD (cost-control rule). */
export const DEFAULT_COST_CEILING_USD = 1.0;

/** Rule identifiers the checker understands. */
export const RULES = {
  nameSlug: "name:slug",
  hasTests: "testing:required",
  hasDocs: "docs:required",
  modelApproved: "model:approved",
  costCeiling: "cost:ceiling",
  approvalForIrreversible: "security:approval-for-irreversible",
} as const;

/** The seeded standards. The CoE governs eleven kinds; these cover the machine-checkable ones. */
export const DEFAULT_STANDARDS: CreateStandardInput[] = [
  {
    kind: "naming_convention",
    name: "Lowercase dotted/kebab names",
    summary: "Agents, workflows, and connectors use lowercase dotted or kebab slugs.",
    body: "Names match ^[a-z][a-z0-9]*([._-][a-z0-9]+)*$ — lowercase, no spaces, no capitals.",
    rules: [RULES.nameSlug],
    tags: ["naming"],
  },
  {
    kind: "testing_standard",
    name: "Tests required",
    summary: "Every agent and workflow ships with tests.",
    body: "A target must declare has_tests=true before approval.",
    rules: [RULES.hasTests],
    tags: ["testing"],
  },
  {
    kind: "documentation_standard",
    name: "Documentation required",
    summary: "Every agent, workflow, and connector ships with documentation.",
    body: "A target must declare has_docs=true before approval.",
    rules: [RULES.hasDocs],
    tags: ["docs"],
  },
  {
    kind: "model_usage_rule",
    name: "Approved models only",
    summary: `Targets may only use approved models: ${APPROVED_MODELS.join(", ")}.`,
    body: "Any model a target uses must appear in the approved-models list (routed via the Model Router).",
    rules: [RULES.modelApproved],
    tags: ["model", "router"],
  },
  {
    kind: "cost_control",
    name: "Per-run cost ceiling",
    summary: `Estimated per-run cost must stay at or below $${DEFAULT_COST_CEILING_USD}.`,
    body: "AI features are manual-triggered, cached, and budgeted; per-run cost is capped.",
    rules: [RULES.costCeiling],
    tags: ["cost"],
  },
  {
    kind: "security_standard",
    name: "Approval-gate irreversible actions",
    summary: "Anything performing irreversible/sensitive actions must gate them behind approval.",
    body: "If a target is irreversible, it must set requires_approval=true (Security Gate / Persistent Approval).",
    rules: [RULES.approvalForIrreversible],
    tags: ["security", "approval"],
  },
];
