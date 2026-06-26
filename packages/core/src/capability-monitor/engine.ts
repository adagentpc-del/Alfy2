import {
  AssessCapabilityInputSchema,
  CapabilityReportSchema,
  type AssessCapabilityInput,
  type CapabilityReport,
  type CapabilityImpact,
  type CapabilityPriority,
} from "@alfy2/shared";

/**
 * Capability Monitor (docs/adr/ADR-0151-capability-monitor.md). Tests a newly-available capability against
 * seven impact questions and generates a Capability Report with a priority: `now` when a high-impact lever
 * (replace workflow, eliminate a tool, cut cost, or improve security) is strong; `soon` for solid impact;
 * `watch` for early signal; `ignore` otherwise. It never assumes Alyssa already knows the capability exists.
 * Deterministic. Tenant-scoped. Append-only in-memory store.
 */
export class CapabilityMonitor {
  private readonly reports = new Map<string, CapabilityReport>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  assess(tenantId: string, input: AssessCapabilityInput): CapabilityReport {
    const i = AssessCapabilityInputSchema.parse(input);
    const im = i.impact;
    const highLevers = Math.max(im.replaces_workflow, im.eliminates_third_party_tool, im.reduces_cost, im.improves_security);
    const peak = Math.max(
      im.replaces_workflow, im.simplifies_architecture, im.improves_founder_freedom, im.reduces_cost,
      im.improves_security, im.eliminates_third_party_tool, im.creates_product_opportunity,
    );

    const priority: CapabilityPriority =
      highLevers >= 0.7 ? "now" : peak >= 0.5 ? "soon" : peak > 0 ? "watch" : "ignore";

    const report = CapabilityReportSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      capability: i.capability,
      source: i.source,
      impact: i.impact,
      business_impact: this.businessImpact(i.capability, im),
      suggested_implementation:
        priority === "ignore"
          ? "No action — monitor for changes."
          : `Pilot ${i.capability} behind a feature flag against one workflow, measure, then expand.`,
      migration_plan:
        priority === "ignore"
          ? []
          : ["Identify the highest-impact workflow", "Prototype behind a flag", "Measure cost/quality/freedom", "Roll out or revert"],
      priority,
      created_at: this.clock().toISOString(),
    });
    this.reports.set(report.id, report);
    return report;
  }

  get(tenantId: string, id: string): CapabilityReport | undefined {
    const r = this.reports.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  list(tenantId: string): CapabilityReport[] {
    return [...this.reports.values()].filter((r) => r.tenant_id === tenantId);
  }

  private businessImpact(capability: string, im: CapabilityImpact): string {
    const wins: string[] = [];
    if (im.replaces_workflow >= 0.5) wins.push("can replace an existing workflow");
    if (im.eliminates_third_party_tool >= 0.5) wins.push("can eliminate a third-party tool");
    if (im.reduces_cost >= 0.5) wins.push("can reduce cost");
    if (im.improves_security >= 0.5) wins.push("can improve security");
    if (im.improves_founder_freedom >= 0.5) wins.push("can increase founder freedom");
    if (im.creates_product_opportunity >= 0.5) wins.push("opens a new product opportunity");
    return wins.length ? `${capability} ${wins.join(", ")}.` : `${capability} has limited near-term business impact.`;
  }
}
