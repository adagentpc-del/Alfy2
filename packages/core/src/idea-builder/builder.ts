import {
  IdeaInputSchema,
  IdeaBlueprintSchema,
  type IdeaInput,
  type IdeaBlueprint,
  type CreateMemoryInput,
  type MemoryRecord,
  type AgentNeed,
} from "@alfy2/shared";
import type { DecisionEngine } from "../decision/engine.js";
import {
  analyzeShape,
  marketResearch,
  competitors,
  pricing,
  offer,
  positioning,
  mvp,
  database,
  apiNeeds,
  requiredAgents,
  marketing,
  seo,
  launch,
  monetization,
  risks,
  recommendation,
} from "./generators.js";

/**
 * The Idea Builder — Alfy2's 0→1 engine (docs/adr/ADR-0008-idea-builder.md).
 * Trigger phrase: "I have an idea." `build()` produces a complete fifteen-section workup and STOPS at
 * an approval gate — `status: "awaiting_approval"`, `approved: false`. It NEVER begins building.
 * `handoff()` (the bridge to actually building) throws unless the blueprint is approved.
 */

/** The phrase that launches the Idea Builder. */
export const IDEA_BUILDER_TRIGGER = "I have an idea.";

export class IdeaApprovalError extends Error {
  constructor() {
    super("The Idea Builder never begins building until approved (blueprint.approved is false).");
    this.name = "IdeaApprovalError";
  }
}

/** Optional capture port — satisfied by MemoryEngine (remember the idea as kind `idea`). */
export interface IdeaMemory {
  remember(tenantId: string, input: CreateMemoryInput): Promise<MemoryRecord>;
}

export interface IdeaBuilderOptions {
  clock?: () => Date;
  idFactory?: () => string;
  /** If provided, the idea is captured to memory (kind `idea`) when built. */
  memory?: IdeaMemory;
}

/** What WOULD be built after approval — produced only once the operator approves. */
export interface HandoffPlan {
  agents: AgentNeed[];
  mvp_tasks: string[];
  note: string;
}

function deriveTitle(text: string): string {
  const cleaned = text
    .replace(/^\s*i have an idea[:,.\-]?\s*/i, "")
    .replace(/^\s*(a|an|the)\s+/i, "")
    .trim();
  const firstSentence = cleaned.split(/[.!?\n]/)[0]!.trim() || cleaned || "New idea";
  const words = firstSentence.split(/\s+/).slice(0, 7).join(" ");
  const t = words.charAt(0).toUpperCase() + words.slice(1);
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
}

export class IdeaBuilder {
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly memory: IdeaMemory | undefined;

  constructor(
    private readonly decisions: DecisionEngine,
    options: IdeaBuilderOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.memory = options.memory;
  }

  /** Produce the full fifteen-section workup. Always stops at the approval gate — builds nothing. */
  async build(tenantId: string, input: IdeaInput): Promise<IdeaBlueprint> {
    const { text } = IdeaInputSchema.parse(input);
    const now = this.clock();
    const id = this.newId();
    const title = deriveTitle(text);

    // Classify + score the idea via the Decision Engine.
    const decision = await this.decisions.decide(tenantId, { text, source: "idea-builder", context: {} });
    const shape = analyzeShape(text, title, decision.primary_category, decision.priority_score);

    const riskSection = risks(shape);
    const blueprint: IdeaBlueprint = {
      id,
      tenant_id: tenantId,
      idea_text: text,
      title,
      category: decision.primary_category,
      priority_score: decision.priority_score,
      market_research: marketResearch(shape),
      competitors: competitors(shape),
      pricing: pricing(shape),
      offer: offer(shape),
      positioning: positioning(shape),
      mvp: mvp(shape),
      database: database(shape),
      api_needs: apiNeeds(shape),
      required_agents: requiredAgents(shape),
      marketing: marketing(shape),
      seo: seo(shape),
      launch: launch(),
      monetization: monetization(shape),
      risks: riskSection,
      recommendation: recommendation(shape, riskSection.overall),
      approved: false,
      status: "awaiting_approval",
      explanation:
        `Full workup for "${title}" complete across all fifteen sections. ` +
        `Recommendation: ${recommendation(shape, riskSection.overall).verdict}. ` +
        `Nothing has been built — awaiting your approval before any building begins.`,
      created_at: now.toISOString(),
    };

    const result = IdeaBlueprintSchema.parse(blueprint);

    // Capture the idea so it's remembered (this is recording, NOT building).
    if (this.memory) {
      await this.memory.remember(tenantId, {
        kind: "idea",
        title,
        body: text,
        attributes: { idea_blueprint_id: id, category: result.category, priority_score: result.priority_score },
        importance: result.priority_score,
        confidence: 0.7,
        source: "operator",
        keywords: shape.keywords,
        expires_at: null,
      });
    }

    return result;
  }

  /**
   * The bridge to actually building. THROWS unless the blueprint is approved. Returns the plan of
   * what would be built (agents to create via the Agent Factory, MVP tasks) — it does not itself
   * create anything; the operator drives the build steps from here.
   */
  handoff(blueprint: IdeaBlueprint): HandoffPlan {
    const bp = IdeaBlueprintSchema.parse(blueprint);
    if (!bp.approved) throw new IdeaApprovalError();
    return {
      agents: bp.required_agents.agents,
      mvp_tasks: bp.mvp.must_have,
      note: `Approved. Next: create the required agents via the Agent Factory and scope the MVP. Build proceeds only from here.`,
    };
  }
}
