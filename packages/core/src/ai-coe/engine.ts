import {
  CreateStandardInputSchema,
  ApprovedStandardSchema,
  ComplianceTargetSchema,
  ComplianceResultSchema,
  type CreateStandardInput,
  type ApprovedStandard,
  type ComplianceTarget,
  type ComplianceResult,
  type Violation,
  type StandardKind,
  type StandardStatus,
} from "@alfy2/shared";
import {
  DEFAULT_STANDARDS,
  APPROVED_MODELS,
  DEFAULT_COST_CEILING_USD,
  RULES,
} from "./standards.js";

/**
 * The AI Center of Excellence (docs/adr/ADR-0022-ai-center-of-excellence.md) — Alfy²'s internal
 * standards layer. It holds the approved prompt library, agent/workflow templates, and the security/
 * data/naming/testing/documentation/escalation/model-usage/cost standards, and it checks that every new
 * agent, workflow, and connector complies before it goes live. Deterministic. Tenant-scoped.
 */

const SLUG = /^[a-z][a-z0-9]*([._-][a-z0-9]+)*$/;

export interface AiCoeOptions {
  clock?: () => Date;
  idFactory?: () => string;
  approvedModels?: readonly string[];
  costCeilingUsd?: number;
  /** Seed the default standards (approved) on construction. Default true. */
  seedDefaults?: boolean;
}

export class AiCenterOfExcellence {
  private readonly standards = new Map<string, ApprovedStandard>();
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly approvedModels: readonly string[];
  private readonly costCeiling: number;
  /** Tracks which tenants have been seeded with the defaults. */
  private readonly seeded = new Set<string>();
  private readonly seedDefaults: boolean;

  constructor(options: AiCoeOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.approvedModels = options.approvedModels ?? APPROVED_MODELS;
    this.costCeiling = options.costCeilingUsd ?? DEFAULT_COST_CEILING_USD;
    this.seedDefaults = options.seedDefaults ?? true;
  }

  /** Add a standard (status draft). */
  register(tenantId: string, input: CreateStandardInput): ApprovedStandard {
    const i = CreateStandardInputSchema.parse(input);
    const now = this.clock().toISOString();
    const std = ApprovedStandardSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      kind: i.kind,
      name: i.name,
      version: "1.0.0",
      status: "draft",
      summary: i.summary,
      body: i.body,
      rules: i.rules,
      tags: i.tags,
      created_at: now,
      updated_at: now,
    });
    this.standards.set(std.id, std);
    return std;
  }

  approve(tenantId: string, id: string): ApprovedStandard {
    return this.setStatus(tenantId, id, "approved");
  }

  deprecate(tenantId: string, id: string): ApprovedStandard {
    return this.setStatus(tenantId, id, "deprecated");
  }

  get(tenantId: string, id: string): ApprovedStandard | undefined {
    const s = this.standards.get(id);
    return s && s.tenant_id === tenantId ? s : undefined;
  }

  /** The approved standards library, optionally filtered by kind. Seeds defaults on first read. */
  library(tenantId: string, kind?: StandardKind): ApprovedStandard[] {
    this.ensureSeeded(tenantId);
    return [...this.standards.values()].filter(
      (s) => s.tenant_id === tenantId && s.status === "approved" && (kind ? s.kind === kind : true),
    );
  }

  /**
   * Check a new agent / workflow / connector against the approved standards. Returns the violations,
   * a score, and pass/fail (fails only on error-severity violations). This is the gate every new
   * agent, workflow, and connector must pass.
   */
  checkCompliance(tenantId: string, target: ComplianceTarget): ComplianceResult {
    const t = ComplianceTargetSchema.parse(target);
    this.ensureSeeded(tenantId);
    const active = this.library(tenantId);
    const activeRules = new Set(active.flatMap((s) => s.rules));
    const checked = new Set<StandardKind>();
    const violations: Violation[] = [];
    let applicable = 0;
    let passedCount = 0;

    const evaluate = (rule: string, kind: StandardKind, ok: boolean, severity: Violation["severity"], message: string) => {
      if (!activeRules.has(rule)) return;
      checked.add(kind);
      applicable += 1;
      if (ok) passedCount += 1;
      else violations.push({ standard_kind: kind, rule, severity, message });
    };

    evaluate(RULES.nameSlug, "naming_convention", SLUG.test(t.name), "error", `Name "${t.name}" is not a lowercase dotted/kebab slug.`);
    evaluate(RULES.hasTests, "testing_standard", t.has_tests, "error", `${t.kind} "${t.name}" has no tests.`);
    evaluate(RULES.hasDocs, "documentation_standard", t.has_docs, "warning", `${t.kind} "${t.name}" has no documentation.`);
    evaluate(
      RULES.modelApproved,
      "model_usage_rule",
      t.model === null || this.approvedModels.includes(t.model),
      "error",
      `Model "${t.model}" is not on the approved list (${this.approvedModels.join(", ")}).`,
    );
    evaluate(RULES.costCeiling, "cost_control", t.est_cost_usd <= this.costCeiling, "warning", `Estimated cost $${t.est_cost_usd} exceeds the $${this.costCeiling} ceiling.`);
    evaluate(
      RULES.approvalForIrreversible,
      "security_standard",
      !t.irreversible || t.requires_approval,
      "error",
      `${t.kind} "${t.name}" performs irreversible actions but does not require approval.`,
    );

    const passed = !violations.some((v) => v.severity === "error");
    return ComplianceResultSchema.parse({
      target_kind: t.kind,
      target_name: t.name,
      passed,
      score: applicable > 0 ? Math.round((passedCount / applicable) * 100) / 100 : 1,
      violations,
      checked: [...checked],
      created_at: this.clock().toISOString(),
    });
  }

  // --- internals ---

  private ensureSeeded(tenantId: string): void {
    if (!this.seedDefaults || this.seeded.has(tenantId)) return;
    this.seeded.add(tenantId);
    for (const def of DEFAULT_STANDARDS) {
      const std = this.register(tenantId, def);
      this.setStatus(tenantId, std.id, "approved");
    }
  }

  private setStatus(tenantId: string, id: string, status: StandardStatus): ApprovedStandard {
    const s = this.get(tenantId, id);
    if (!s) throw new Error(`No standard ${id} in tenant ${tenantId}.`);
    const next: ApprovedStandard = { ...s, status, updated_at: this.clock().toISOString() };
    this.standards.set(id, next);
    return next;
  }
}
