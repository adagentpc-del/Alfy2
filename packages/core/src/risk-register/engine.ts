import {
  AddRiskInputSchema,
  EnterpriseRiskSchema as RiskSchema,
  type AddRiskInput,
  type EnterpriseRisk as Risk,
  type RiskCategory,
} from "@alfy2/shared";

/**
 * Enterprise Risk Register (docs/adr/ADR-0103-risk-register.md). One record per risk across thirteen
 * categories with severity, likelihood, owner, mitigation, deadline, escalation trigger, and affected
 * businesses. Exposure = severity × likelihood drives the weekly top-ten ranking. Mutable (updated_at
 * bumps on every change). Deterministic. Tenant-scoped.
 */

export class RiskRegisterError extends Error {}

/** Risk states that are still live and surface in the top-N ranking. */
const LIVE_STATUSES: ReadonlySet<Risk["status"]> = new Set<Risk["status"]>(["open", "mitigating", "monitored"]);

export class EnterpriseRiskRegister {
  private readonly risks = new Map<string, Risk>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Register a new risk. Exposure is derived; status starts at "open". */
  add(tenantId: string, input: AddRiskInput): Risk {
    const i = AddRiskInputSchema.parse(input);
    const now = this.clock().toISOString();
    const risk = RiskSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      category: i.category,
      title: i.title,
      severity: i.severity,
      likelihood: i.likelihood,
      exposure: round(i.severity * i.likelihood),
      owner: i.owner,
      mitigation: i.mitigation,
      deadline: i.deadline ?? null,
      escalation_trigger: i.escalation_trigger,
      affected_businesses: i.affected_businesses,
      status: "open",
      created_at: now,
      updated_at: now,
    });
    this.risks.set(risk.id, risk);
    return risk;
  }

  /** Patch a risk (status, mitigation, severity, likelihood, etc.). Recomputes exposure and bumps updated_at. */
  update(tenantId: string, id: string, patch: Partial<Omit<Risk, "id" | "tenant_id" | "created_at" | "updated_at" | "exposure">>): Risk {
    const cur = this.require(tenantId, id);
    const merged = { ...cur, ...patch };
    const next = RiskSchema.parse({
      ...merged,
      id: cur.id,
      tenant_id: cur.tenant_id,
      created_at: cur.created_at,
      exposure: round(merged.severity * merged.likelihood),
      updated_at: this.clock().toISOString(),
    });
    this.risks.set(next.id, next);
    return next;
  }

  get(tenantId: string, id: string): Risk | undefined {
    const r = this.risks.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  list(tenantId: string): Risk[] {
    return [...this.risks.values()].filter((r) => r.tenant_id === tenantId);
  }

  byCategory(tenantId: string, category: RiskCategory): Risk[] {
    return this.list(tenantId).filter((r) => r.category === category);
  }

  /** Top N live risks (open / mitigating / monitored) by exposure, descending. */
  top(tenantId: string, n = 10): Risk[] {
    return this.list(tenantId)
      .filter((r) => LIVE_STATUSES.has(r.status))
      .sort((a, b) => b.exposure - a.exposure)
      .slice(0, n);
  }

  private require(tenantId: string, id: string): Risk {
    const r = this.get(tenantId, id);
    if (!r) throw new RiskRegisterError(`No risk ${id} in tenant ${tenantId}.`);
    return r;
  }
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
