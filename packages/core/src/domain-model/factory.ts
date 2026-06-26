import {
  CreateDomainInputSchema,
  DomainModelSchema,
  type CreateDomainInput,
  type DomainModel,
  type DomainKind,
} from "@alfy2/shared";
import { DOMAIN_TEMPLATES, DOMAIN_TEMPLATE_VERSION } from "./templates.js";

/**
 * The Domain Operating Model factory (docs/adr/ADR-0024-domain-operating-models.md). Instead of
 * automating single tasks, it stands up a full operating model for one of the eleven domains — goals,
 * workflows, agents, KPIs, assets, approvals, dashboards, and escalation rules — by deep-cloning the
 * canonical template so each model is independently editable. Pure (no I/O). Tenant-scoped by id.
 */

export interface DomainFactoryOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

const clone = <T>(v: T): T => structuredClone(v);

export class DomainOperatingModelFactory {
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: DomainFactoryOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Build a full operating model for a domain from the canonical template. */
  create(tenantId: string, input: CreateDomainInput): DomainModel {
    const i = CreateDomainInputSchema.parse(input);
    const tmpl = DOMAIN_TEMPLATES[i.domain];
    const now = this.clock().toISOString();
    return DomainModelSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      domain: i.domain,
      name: i.name ?? tmpl.name,
      goals: clone(tmpl.goals),
      workflows: clone(tmpl.workflows),
      agents: clone(tmpl.agents),
      kpis: clone(tmpl.kpis),
      assets: clone(tmpl.assets),
      approvals: clone(tmpl.approvals),
      dashboards: clone(tmpl.dashboards),
      escalation_rules: clone(tmpl.escalation_rules),
      template_version: i.template_version ?? DOMAIN_TEMPLATE_VERSION,
      created_at: now,
      updated_at: now,
    });
  }

  /** Build all eleven domain models at once (e.g. when standing up a business). */
  createAll(tenantId: string): DomainModel[] {
    return (Object.keys(DOMAIN_TEMPLATES) as DomainKind[]).map((domain) =>
      this.create(tenantId, CreateDomainInputSchema.parse({ domain })),
    );
  }
}

export { DOMAIN_TEMPLATES, DOMAIN_TEMPLATE_VERSION };
