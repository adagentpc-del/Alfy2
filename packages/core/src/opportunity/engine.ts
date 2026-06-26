import {
  AnalyzeInputSchema,
  OpportunityIntelSchema,
  ScoreWeightsSchema,
  type AnalyzeInput,
  type OpportunityIntel,
  type OpportunityStatus,
  type ScoreWeights,
} from "@alfy2/shared";
import { match, type Candidate } from "./matchers.js";
import { scoreCandidate } from "./scoring.js";

/**
 * Opportunity Intelligence (docs/adr/ADR-0019-opportunity-intelligence.md). Continuously analyzes the
 * ten entity sources — contacts, businesses, vendors, investors, clients, ideas, GitHub repos, assets,
 * conversations, market trends — finds relationships between them (e.g. "this repo solves Move Mi",
 * "this investor should meet this project"), and surfaces ranked opportunities scored on revenue,
 * probability, effort, risk, and strategic value. Deterministic. Tenant-scoped.
 */

export class OpportunityEngineError extends Error {}

const DISMISSED: ReadonlySet<OpportunityStatus> = new Set<OpportunityStatus>(["dismissed", "acted"]);

export interface OpportunityEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
  weights?: ScoreWeights;
}

/** Stable signature for an opportunity so re-analysis upserts instead of duplicating. */
const signature = (c: Candidate): string => `${c.kind}|${c.source.ref_id}|${c.target.ref_id}`;

export class OpportunityEngine {
  private readonly opportunities = new Map<string, OpportunityIntel>();
  /** signature → opportunity id, for dedupe across re-analysis. */
  private readonly bySignature = new Map<string, string>();
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly weights: ScoreWeights;

  constructor(options: OpportunityEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.weights = options.weights ?? ScoreWeightsSchema.parse({});
  }

  /**
   * Analyze a corpus of entities: find every relationship across all pairs, score each, and return the
   * opportunities ranked by composite score (desc). Re-analysis upserts by signature, preserving the
   * status/id of opportunities already surfaced or decided.
   */
  analyze(tenantId: string, input: AnalyzeInput): OpportunityIntel[] {
    const { entities } = AnalyzeInputSchema.parse(input);
    const now = this.clock().toISOString();
    const found: OpportunityIntel[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < entities.length; i += 1) {
      for (let j = i + 1; j < entities.length; j += 1) {
        for (const c of match(entities[i]!, entities[j]!)) {
          const sig = `${tenantId}|${signature(c)}`;
          if (seen.has(sig)) continue;
          seen.add(sig);
          const scores = scoreCandidate(c, this.weights);

          const existingId = this.bySignature.get(sig);
          if (existingId) {
            const prev = this.opportunities.get(existingId)!;
            const updated: OpportunityIntel = OpportunityIntelSchema.parse({
              ...prev,
              title: c.title,
              rationale: c.rationale,
              evidence: c.evidence,
              recommended_action: c.recommended_action,
              recommended_agents: c.recommended_agents,
              scores,
              updated_at: now,
            });
            this.opportunities.set(existingId, updated);
            found.push(updated);
          } else {
            const opp: OpportunityIntel = OpportunityIntelSchema.parse({
              id: this.newId(),
              tenant_id: tenantId,
              kind: c.kind,
              title: c.title,
              source: c.source,
              target: c.target,
              rationale: c.rationale,
              evidence: c.evidence,
              scores,
              recommended_action: c.recommended_action,
              recommended_agents: c.recommended_agents,
              status: "new",
              created_at: now,
              updated_at: now,
            });
            this.opportunities.set(opp.id, opp);
            this.bySignature.set(sig, opp.id);
            found.push(opp);
          }
        }
      }
    }
    return this.rank(found);
  }

  /**
   * Surface the strongest opportunities automatically: mark `new` opportunities at/above the composite
   * threshold as `surfaced` and return them ranked. Default threshold 0.5.
   */
  surface(tenantId: string, threshold = 0.5): OpportunityIntel[] {
    const now = this.clock().toISOString();
    const surfaced: OpportunityIntel[] = [];
    for (const o of this.opportunities.values()) {
      if (o.tenant_id !== tenantId) continue;
      if (o.status === "new" && o.scores.composite >= threshold) {
        const next = { ...o, status: "surfaced" as OpportunityStatus, updated_at: now };
        this.opportunities.set(o.id, next);
        surfaced.push(next);
      } else if (o.status === "surfaced") {
        surfaced.push(o);
      }
    }
    return this.rank(surfaced);
  }

  accept(tenantId: string, id: string): OpportunityIntel {
    return this.transition(tenantId, id, "accepted");
  }

  dismiss(tenantId: string, id: string): OpportunityIntel {
    return this.transition(tenantId, id, "dismissed");
  }

  markActed(tenantId: string, id: string): OpportunityIntel {
    return this.transition(tenantId, id, "acted");
  }

  get(tenantId: string, id: string): OpportunityIntel | undefined {
    const o = this.opportunities.get(id);
    return o && o.tenant_id === tenantId ? o : undefined;
  }

  /** All opportunities for a tenant (optionally by status), ranked by composite. */
  list(tenantId: string, status?: OpportunityStatus): OpportunityIntel[] {
    return this.rank(
      [...this.opportunities.values()].filter(
        (o) => o.tenant_id === tenantId && (status ? o.status === status : true),
      ),
    );
  }

  /** Top-N opportunities not yet dismissed/acted, ranked. */
  top(tenantId: string, n: number): OpportunityIntel[] {
    return this.list(tenantId)
      .filter((o) => !DISMISSED.has(o.status))
      .slice(0, n);
  }

  // --- internals ---

  private rank(list: OpportunityIntel[]): OpportunityIntel[] {
    return [...list].sort((a, b) => b.scores.composite - a.scores.composite);
  }

  private transition(tenantId: string, id: string, status: OpportunityStatus): OpportunityIntel {
    const o = this.get(tenantId, id);
    if (!o) throw new OpportunityEngineError(`No opportunity ${id} in tenant ${tenantId}.`);
    const next = OpportunityIntelSchema.parse({ ...o, status, updated_at: this.clock().toISOString() });
    this.opportunities.set(id, next);
    return next;
  }
}
