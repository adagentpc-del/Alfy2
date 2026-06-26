import {
  GeneratePlaybookInputSchema,
  PlaybookSchema,
  type GeneratePlaybookInput,
  type Playbook,
  type PlaybookArtifact,
  type DomainKind,
} from "@alfy2/shared";
import { DOMAIN_TEMPLATES } from "../domain-model/templates.js";

/**
 * The Enterprise Playbook Generator (docs/adr/ADR-0028-enterprise-playbook-generator.md). For a
 * business and domain it generates a full playbook — SOPs, workflows, scripts, checklists, onboarding
 * docs, training docs, role scorecards, KPIs, escalation rules, and client-facing assets — turning a
 * domain operating model into reusable operating IP. Deterministic (composes DOMAIN_TEMPLATES). No AI.
 * Tenant-scoped.
 */

export interface PlaybookGeneratorOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export class PlaybookGenerator {
  private readonly playbooks = new Map<string, Playbook>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: PlaybookGeneratorOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Generate the full playbook for a domain (optionally scoped to a business). */
  generate(tenantId: string, input: GeneratePlaybookInput): Playbook {
    const i = GeneratePlaybookInputSchema.parse(input);
    const tmpl = DOMAIN_TEMPLATES[i.domain];
    const biz = i.business_name || tmpl.name;
    const now = this.clock().toISOString();
    const artifacts: PlaybookArtifact[] = [];
    const tag = [i.domain];

    // SOP + checklist for each workflow.
    for (const w of tmpl.workflows) {
      artifacts.push({
        kind: "sop",
        title: `SOP: ${w.name}`,
        body: `Purpose: ${w.purpose}\nTrigger: ${w.trigger || "as needed"}\nSteps:\n${w.steps.map((s, n) => `${n + 1}. ${s}`).join("\n")}`,
        tags: tag,
      });
      artifacts.push({
        kind: "checklist",
        title: `Checklist: ${w.name}`,
        body: w.steps.map((s) => `[ ] ${s}`).join("\n"),
        tags: tag,
      });
      // A "workflow" artifact mirrors the operating-model workflow.
      artifacts.push({
        kind: "workflow",
        title: `Workflow: ${w.name}`,
        body: `${w.purpose} — ${w.steps.join(" → ")}`,
        tags: tag,
      });
    }

    // Scripts + client assets (domain-shaped).
    artifacts.push({
      kind: "script",
      title: `${domainLabel(i.domain)} call/message script`,
      body: scriptFor(i.domain, biz),
      tags: tag,
    });
    artifacts.push({
      kind: "client_asset",
      title: `${biz} — ${domainLabel(i.domain)} one-pager`,
      body: `A client-facing overview of ${biz}'s ${domainLabel(i.domain).toLowerCase()} approach, outcomes, and next steps.`,
      tags: [...tag, "client"],
    });

    // Onboarding + training.
    artifacts.push({
      kind: "onboarding_doc",
      title: `Onboarding: ${domainLabel(i.domain)} at ${biz}`,
      body: `Week 1 goals, tools, key contacts, and the first workflow to learn (${tmpl.workflows[0]?.name ?? "core workflow"}).`,
      tags: tag,
    });
    artifacts.push({
      kind: "training_doc",
      title: `Training: ${domainLabel(i.domain)} fundamentals`,
      body: `How the ${domainLabel(i.domain).toLowerCase()} domain works here: goals (${tmpl.goals.join("; ")}), the workflows, and how success is measured.`,
      tags: tag,
    });

    // Role scorecard (from goals + KPIs).
    artifacts.push({
      kind: "role_scorecard",
      title: `Role scorecard: ${domainLabel(i.domain)} owner`,
      body: `Outcomes: ${tmpl.goals.join("; ")}.\nMeasured by: ${tmpl.kpis.map((k) => `${k.name} (target ${k.target}${k.unit ? ` ${k.unit}` : ""})`).join(", ")}.`,
      tags: tag,
    });

    // KPIs.
    for (const k of tmpl.kpis) {
      artifacts.push({
        kind: "kpi",
        title: `KPI: ${k.name}`,
        body: `Target ${k.target}${k.unit ? ` ${k.unit}` : ""}, ${k.direction === "lower_better" ? "lower is better" : "higher is better"}.`,
        tags: [...tag, "kpi"],
      });
    }

    // Escalation rules.
    for (const e of tmpl.escalation_rules) {
      artifacts.push({
        kind: "escalation_rule",
        title: `Escalation: ${e.condition}`,
        body: `${e.action} → ${e.escalate_to}`,
        tags: [...tag, "escalation"],
      });
    }

    const playbook: Playbook = PlaybookSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      domain: i.domain,
      business_id: i.business_id,
      business_name: i.business_name,
      name: `${biz} — ${domainLabel(i.domain)} Playbook`,
      artifacts,
      created_at: now,
      updated_at: now,
    });
    this.playbooks.set(playbook.id, playbook);
    return playbook;
  }

  /** Generate playbooks for every domain (a full enterprise playbook set). */
  generateAll(tenantId: string, businessName = ""): Playbook[] {
    return (Object.keys(DOMAIN_TEMPLATES) as DomainKind[]).map((domain) =>
      this.generate(tenantId, GeneratePlaybookInputSchema.parse({ domain, business_name: businessName })),
    );
  }

  get(tenantId: string, id: string): Playbook | undefined {
    const p = this.playbooks.get(id);
    return p && p.tenant_id === tenantId ? p : undefined;
  }

  list(tenantId: string): Playbook[] {
    return [...this.playbooks.values()].filter((p) => p.tenant_id === tenantId);
  }
}

function domainLabel(domain: DomainKind): string {
  return DOMAIN_TEMPLATES[domain].name;
}

function scriptFor(domain: DomainKind, biz: string): string {
  switch (domain) {
    case "sales":
      return `Open with relevance to ${biz}'s prospect, ask about their current situation, surface the pain, present the offer, handle objections, propose a clear next step.`;
    case "customer_success":
      return `Confirm the customer's goal, check progress against value, surface risks early, agree on the next milestone.`;
    case "recruiting":
      return `Introduce the role and ${biz}'s mission, ask about the candidate's recent work, assess fit against the scorecard, outline next steps.`;
    case "marketing":
      return `Hook with the prospect's problem, deliver one concrete insight, invite a single clear action.`;
    default:
      return `A repeatable ${domainLabel(domain).toLowerCase()} talk-track for ${biz}: context, value, next step.`;
  }
}
