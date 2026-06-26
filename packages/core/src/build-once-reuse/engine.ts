import {
  AssessReuseInputSchema,
  ReuseAssessmentSchema,
  type AssessReuseInput,
  type ReuseAssessment,
  type ReusePackageKind,
} from "@alfy2/shared";

/**
 * Build Once, Reuse Everywhere (docs/adr/ADR-0153-build-once-reuse.md). For a built module it decides whether
 * the build should be packaged for reuse (generic enough and at least one reuse target) and, if so, which
 * reusable forms to package it as — so no valuable build stays trapped in one project. Deterministic.
 * Tenant-scoped. Append-only in-memory store.
 */
export class BuildOnceReuseEngine {
  private readonly assessments = new Map<string, ReuseAssessment>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  assess(tenantId: string, input: AssessReuseInput): ReuseAssessment {
    const i = AssessReuseInputSchema.parse(input);
    const reusable = i.generality >= 0.5 && i.targets.length > 0;

    const assessment = ReuseAssessmentSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      module: i.module,
      reusable,
      targets: i.targets,
      package_as: reusable ? this.packageKinds(i.generality) : [],
      reason: reusable
        ? `"${i.module}" is generic (${i.generality}) and reusable by ${i.targets.length} target(s) — package it so it is not trapped in one project.`
        : `"${i.module}" is too project-specific or has no reuse target right now — leave it in place and revisit if a target appears.`,
      created_at: this.clock().toISOString(),
    });
    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  get(tenantId: string, id: string): ReuseAssessment | undefined {
    const a = this.assessments.get(id);
    return a && a.tenant_id === tenantId ? a : undefined;
  }

  list(tenantId: string): ReuseAssessment[] {
    return [...this.assessments.values()].filter((a) => a.tenant_id === tenantId);
  }

  private packageKinds(generality: number): ReusePackageKind[] {
    // The more generic, the more forms it is worth packaging into.
    const kinds: ReusePackageKind[] = ["component", "workflow", "playbook"];
    if (generality >= 0.7) kinds.push("schema", "prompt");
    if (generality >= 0.85) kinds.push("agent");
    return kinds;
  }
}
