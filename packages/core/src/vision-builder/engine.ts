import {
  ExploreIdeaInputSchema,
  VisionArtifactSchema,
  VisionSessionSchema,
  type ExploreIdeaInput,
  type VisionArtifact,
  type VisionSession,
} from "@alfy2/shared";

/**
 * Vision Builder (docs/adr/ADR-0125-vision-builder.md). When Alyssa says "I have an idea…", Alfy² enters
 * collaborative thinking mode: it explores, challenges, strengthens, and risk-checks the idea, then generates
 * a full set of artifact PLANS (architecture → roadmap) — never executing them. `explore()` produces one
 * VisionSession that always awaits approval; Vision Builder never auto-executes. APPEND-ONLY, deterministic,
 * tenant-scoped.
 */

/** The nine artifact kinds Vision Builder always plans — these are PLANS, not execution. */
const ARTIFACT_KINDS: VisionArtifact["kind"][] = [
  "architecture",
  "implementation_plan",
  "business_model",
  "marketing",
  "monetization",
  "assets",
  "agents",
  "workflows",
  "roadmap",
];

/** Templated one-line outline per artifact kind, derived from the idea. */
const ARTIFACT_OUTLINE: Record<VisionArtifact["kind"], (idea: string) => string> = {
  architecture: (idea) => `Architecture plan for "${idea}": the components, data flow, and boundaries it would need.`,
  implementation_plan: (idea) => `Implementation plan for "${idea}": the phased build sequence from foundation to launch.`,
  business_model: (idea) => `Business model for "${idea}": who pays, for what value, and how the economics work.`,
  marketing: (idea) => `Marketing plan for "${idea}": the positioning, channels, and message to reach the right buyers.`,
  monetization: (idea) => `Monetization plan for "${idea}": pricing, packaging, and the fastest path to first revenue.`,
  assets: (idea) => `Assets plan for "${idea}": the reusable assets to build so the work compounds.`,
  agents: (idea) => `Agents plan for "${idea}": the agents that would run it without constant founder input.`,
  workflows: (idea) => `Workflows plan for "${idea}": the repeatable workflows that keep it operating reliably.`,
  roadmap: (idea) => `Roadmap for "${idea}": the milestones from first version to a compounding system.`,
};

/** Clamp a number into [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class VisionBuilder {
  private readonly sessions = new Map<string, VisionSession>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /**
   * Enter collaborative thinking mode for an idea. Produces a VisionSession: thought-partner phases
   * (exploration, challenges, strengthened, risks, opportunities) scaled by the signals, plus a full set of
   * artifact PLANS — all awaiting approval. APPEND-ONLY: persists and returns the session.
   */
  explore(tenantId: string, input: ExploreIdeaInput): VisionSession {
    const i = ExploreIdeaInputSchema.parse(input);
    const idea = i.idea;

    const exploration: string[] = [
      `Let's think about "${idea}" together — what's the sharpest version of this idea?`,
      `One angle on "${idea}": who feels this problem most acutely, and what would they pay to make it go away?`,
    ];
    if (i.novelty >= 0.5 || i.market_pull >= 0.5) {
      exploration.push(`Another angle on "${idea}": where could this become a system that compounds rather than a one-off?`);
    }

    const challenges: string[] = [
      `What has to be true for "${idea}" to actually work?`,
      `What's the hardest objection a skeptic would raise about "${idea}"?`,
    ];
    if (i.novelty >= 0.7) {
      challenges.push(`"${idea}" is novel — is the market ready for it, or are we early?`);
    }
    if (i.founder_fit < 0.4) {
      challenges.push(`Does "${idea}" really fit you, or is it pulling you away from where you're strongest?`);
    }

    const strengthened: string[] = [
      `Strengthen "${idea}" by narrowing to the single highest-value use case first.`,
      `Strengthen "${idea}" by attaching it to an existing audience instead of building one from zero.`,
    ];
    if (i.complexity >= 0.5) {
      strengthened.push(`Strengthen "${idea}" by shipping a deliberately small first version to cut the complexity.`);
    }

    const risks: string[] = [
      `Risk for "${idea}": demand may be assumed rather than proven — validate before building.`,
    ];
    if (i.complexity >= 0.5) {
      risks.push(`Risk for "${idea}": the build is complex — scope creep could stall it before it earns.`);
    }
    if (i.complexity >= 0.7) {
      risks.push(`Risk for "${idea}": high complexity raises execution and maintenance cost — keep it lean.`);
    }

    const opportunities: string[] = [
      `Opportunity for "${idea}": turn the first solution into a reusable asset others would pay for.`,
    ];
    if (i.market_pull >= 0.5) {
      opportunities.push(`Opportunity for "${idea}": there's real pull here — move fast while the window is open.`);
    }
    if (i.market_pull >= 0.7) {
      opportunities.push(`Opportunity for "${idea}": strong demand could let this expand across adjacent markets.`);
    }

    const artifacts: VisionArtifact[] = ARTIFACT_KINDS.map((kind) =>
      VisionArtifactSchema.parse({
        kind,
        outline: ARTIFACT_OUTLINE[kind](idea),
      }),
    );

    const promise = clamp(i.novelty * 0.2 + i.market_pull * 0.4 + i.founder_fit * 0.3 - i.complexity * 0.2, 0, 1);

    const session = VisionSessionSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      idea,
      exploration,
      challenges,
      strengthened,
      risks,
      opportunities,
      artifacts,
      promise,
      awaiting_approval: true,
      created_at: this.clock().toISOString(),
    });
    this.sessions.set(session.id, session);
    return session;
  }

  get(tenantId: string, id: string): VisionSession | undefined {
    const s = this.sessions.get(id);
    return s && s.tenant_id === tenantId ? s : undefined;
  }

  list(tenantId: string): VisionSession[] {
    return [...this.sessions.values()].filter((s) => s.tenant_id === tenantId);
  }
}
