import {
  StartBuildInputSchema,
  VentureBlueprintSchema,
  type StartBuildInput,
  type VentureBlueprint,
  type BuilderStageOutput,
  type BuilderStage,
} from "@alfy2/shared";

/**
 * Builder Mode (docs/adr/ADR-0060-builder-mode.md). When Alyssa says "I want to build...", Builder Mode
 * guides the project through eighteen stages — discovery → review checkpoints — producing the complete
 * operating system for a new venture, not just a task list. Human-in-command: the blueprint is always
 * returned awaiting approval; nothing is built until approved. Deterministic (no AI/web; research stages
 * yield hypotheses + open questions). Tenant-scoped. Composes the Idea Builder and Business Template.
 */

export class BuilderModeError extends Error {}

const STAGES: BuilderStage[] = [
  "discovery", "market_validation", "offer_design", "pricing", "business_model", "brand",
  "product_architecture", "technical_architecture", "database", "agent_plan", "asset_checklist",
  "legal", "marketing_plan", "sales_plan", "automation_plan", "launch_plan", "kpis", "review_checkpoints",
];

export class BuilderMode {
  private readonly blueprints = new Map<string, VentureBlueprint>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Launch Builder Mode → the full 18-stage venture operating system (awaiting approval). */
  build(tenantId: string, input: StartBuildInput): VentureBlueprint {
    const i = StartBuildInputSchema.parse(input);
    const name = i.business_name || deriveName(i.idea);
    const stages: BuilderStageOutput[] = STAGES.map((stage) => buildStage(stage, i, name));
    const now = this.clock().toISOString();
    const bp = VentureBlueprintSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      idea: i.idea,
      business_name: name,
      stages,
      status: "awaiting_approval",
      created_at: now,
      updated_at: now,
    });
    this.blueprints.set(bp.id, bp);
    return bp;
  }

  /** Approve a blueprint (human-in-command). Only then would downstream construction begin. */
  approve(tenantId: string, id: string): VentureBlueprint {
    const bp = this.require(tenantId, id);
    const next = VentureBlueprintSchema.parse({ ...bp, status: "approved", updated_at: this.clock().toISOString() });
    this.blueprints.set(next.id, next);
    return next;
  }

  get(tenantId: string, id: string): VentureBlueprint | undefined {
    const bp = this.blueprints.get(id);
    return bp && bp.tenant_id === tenantId ? bp : undefined;
  }

  list(tenantId: string): VentureBlueprint[] {
    return [...this.blueprints.values()].filter((bp) => bp.tenant_id === tenantId);
  }

  private require(tenantId: string, id: string): VentureBlueprint {
    const bp = this.get(tenantId, id);
    if (!bp) throw new BuilderModeError(`No venture blueprint ${id} in tenant ${tenantId}.`);
    return bp;
  }
}

function buildStage(stage: BuilderStage, i: StartBuildInput, name: string): BuilderStageOutput {
  const market = i.target_market || "the target market";
  const map: Record<BuilderStage, Omit<BuilderStageOutput, "stage">> = {
    discovery: { title: "Discovery", summary: `Define the problem "${i.idea}" solves and for whom.`, items: ["Problem statement", "Target user", "Why now"], open_questions: ["Who feels this pain most acutely?"] },
    market_validation: { title: "Market Validation", summary: `Validate demand in ${market}.`, items: ["Demand signals", "Competitor scan", "Willingness to pay"], open_questions: ["What evidence proves people will pay?"] },
    offer_design: { title: "Offer Design", summary: "Design the core offer and outcome.", items: ["Core offer", "Transformation promised", "Bonuses/guarantee"], open_questions: ["What is the irresistible version of this offer?"] },
    pricing: { title: "Pricing", summary: "Price on outcome, not hours.", items: ["Price points", "Tiers", "Anchor"], open_questions: ["What is the value delivered vs price?"] },
    business_model: { title: "Business Model", summary: "How it makes money repeatably.", items: ["Revenue streams", "Margins", "Repeatability"], open_questions: ["Where does recurring revenue come from?"] },
    brand: { title: "Brand", summary: `Position ${name} distinctly.`, items: ["Name", "Positioning", "Voice"], open_questions: ["What single idea should the brand own?"] },
    product_architecture: { title: "Product Architecture", summary: "The product's core components.", items: ["Core features", "User journey", "MVP scope"], open_questions: ["What is the smallest valuable version?"] },
    technical_architecture: { title: "Technical Architecture", summary: "Cost-controlled, modular build.", items: ["Stack", "Services", "Cost controls"], open_questions: ["What's the cheapest stack that scales?"] },
    database: { title: "Database", summary: "Data model with tenancy + RLS.", items: ["Core tables", "tenant_id + RLS", "Append-only logs"], open_questions: ["What are the canonical entities?"] },
    agent_plan: { title: "Agent Plan", summary: "Agents to run the venture.", items: ["Sales follow-up agent", "Content agent", "Ops agent"], open_questions: ["Which tasks are recurring enough to automate?"] },
    asset_checklist: { title: "Asset Checklist", summary: "The 25 key business assets.", items: ["Offer", "Pricing", "Landing page", "Lead list", "Follow-up sequence"], open_questions: ["Which asset unblocks revenue fastest?"] },
    legal: { title: "Legal Considerations", summary: "Compliance and protection (attorney review required).", items: ["Entity", "Terms/Privacy", "Contracts/NDA"], open_questions: ["What needs licensed legal review?"] },
    marketing_plan: { title: "Marketing Plan", summary: "Demand generation.", items: ["Channels", "Content engine", "Funnel"], open_questions: ["Where does the first audience come from?"] },
    sales_plan: { title: "Sales Plan", summary: "Convert interest to cash.", items: ["Sales motion", "Scripts", "Pipeline"], open_questions: ["What's the fastest path to first sale?"] },
    automation_plan: { title: "Automation Plan", summary: "Run with minimal manual effort.", items: ["Follow-up", "Reporting", "Onboarding"], open_questions: ["What should never need manual touch?"] },
    launch_plan: { title: "Launch Plan", summary: "Sequenced go-to-market.", items: ["Pre-launch", "Launch", "Post-launch"], open_questions: ["What's the launch trigger?"] },
    kpis: { title: "KPIs", summary: "What success is measured by.", items: ["Revenue", "Conversion", "CAC/LTV"], open_questions: ["What single metric matters most first?"] },
    review_checkpoints: { title: "Review Checkpoints", summary: "When to reflect and adjust.", items: ["30-day review", "Quarterly review", "Kill/scale criteria"], open_questions: ["What would tell us to pivot or stop?"] },
  };
  return { stage, ...map[stage] };
}

const deriveName = (idea: string): string => idea.split(/\s+/).slice(0, 3).join(" ") || "New Venture";
