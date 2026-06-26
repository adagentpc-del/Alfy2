import {
  SwarmRunSchema,
  StartSwarmRunInputSchema,
  SwarmCandidateSchema,
  SwarmClusterSchema,
  SwarmReportSchema,
  type SwarmRun,
  type StartSwarmRunInput,
  type SwarmCandidate,
  type SwarmCluster,
  type SwarmReport,
  type SwarmRunStatus,
} from "@alfy2/shared";

/**
 * Swarm Lab engine — the R&D department's bounded swarm ("Swarm" tab).
 *
 * Borrows swarm-style parallelism (many agents exploring at once) WITHOUT giving up accountability:
 * a run belongs to R&D, must be authorized by a delegation packet, is permission-scoped to
 * draft/recommend only, and produces CANDIDATES it can never execute. Top candidates are promoted
 * into the approval-gated pipeline. Deterministic here; real per-agent generation is injected later
 * behind the AI Gateway flag.
 */

export interface SwarmLabOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

/** Pluggable per-agent generator (Phase 2 wires a real model behind the AI Gateway). */
export type SwarmGenerator = (
  args: { objective: string; mode: SwarmRun["mode"]; index: number; angle: string },
) => { content: string; novelty: number; feasibility: number };

const ANGLES = [
  "contrarian",
  "cheapest path",
  "fastest path",
  "premium positioning",
  "partnership-led",
  "automation-first",
  "viral hook",
  "niche-down",
  "data-driven",
  "founder-led story",
  "bundle / upsell",
  "referral engine",
];

const round2 = (n: number): number => Math.round(n * 100) / 100;

export class SwarmLabEngine {
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly runs = new Map<string, SwarmRun>();
  private readonly candidates = new Map<string, SwarmCandidate>();
  private readonly clusters = new Map<string, SwarmCluster>();
  private readonly reports = new Map<string, SwarmReport>();

  constructor(options: SwarmLabOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Create a (draft) swarm run. It cannot run until authorized by a delegation packet. */
  startRun(tenantId: string, input: StartSwarmRunInput): SwarmRun {
    const parsed = StartSwarmRunInputSchema.parse(input);
    const now = this.clock().toISOString();
    const run = SwarmRunSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_id: parsed.business_id ?? null,
      department_key: "research_development",
      packet_id: parsed.packet_id ?? null,
      objective: parsed.objective,
      mode: parsed.mode,
      agent_count: parsed.agent_count,
      permission_scope: parsed.permission_scope,
      reports_to: "R&D Lead",
      status: "draft",
      created_at: now,
      updated_at: null,
    });
    this.runs.set(run.id, run);
    return run;
  }

  /**
   * Run the swarm: spin up `agent_count` parallel explorers, each producing one non-executing
   * candidate. ENFORCES the chain of command — a run with no delegation packet is refused.
   */
  runSwarm(tenantId: string, runId: string, generator?: SwarmGenerator): SwarmCandidate[] {
    const run = this.getRun(tenantId, runId);
    if (run.packet_id === null) {
      throw new Error(
        "SwarmLab: a swarm cannot start without a delegation packet (chain of command). Attach packet_id first.",
      );
    }
    const now = this.clock().toISOString();
    const out: SwarmCandidate[] = [];
    for (let i = 0; i < run.agent_count; i++) {
      const angle = ANGLES[i % ANGLES.length] ?? "exploration";
      const gen = generator
        ? generator({ objective: run.objective, mode: run.mode, index: i, angle })
        : {
            content: `${angle} approach to: ${run.objective}`,
            novelty: round2(0.4 + (0.5 * ((i * 7) % 10)) / 10),
            feasibility: round2(0.4 + (0.5 * ((i * 3) % 10)) / 10),
          };
      const candidate = SwarmCandidateSchema.parse({
        id: this.newId(),
        tenant_id: tenantId,
        run_id: runId,
        agent_label: `swarm-agent-${i + 1}`,
        angle,
        content: gen.content,
        novelty: gen.novelty,
        feasibility: gen.feasibility,
        score: round2((gen.novelty + gen.feasibility) / 2),
        created_at: now,
      });
      this.candidates.set(candidate.id, candidate);
      out.push(candidate);
    }
    this.setStatus(run, "running");
    return out;
  }

  listCandidates(tenantId: string, runId: string): SwarmCandidate[] {
    return [...this.candidates.values()].filter(
      (c) => c.tenant_id === tenantId && c.run_id === runId,
    );
  }

  /** Cluster + rank the candidates; mark the top `topN` (default 3) as picks. */
  converge(tenantId: string, runId: string, topN = 3): SwarmCluster[] {
    const run = this.getRun(tenantId, runId);
    const now = this.clock().toISOString();
    const cands = this.listCandidates(tenantId, runId);
    // Group by angle (the cheap deterministic "theme"); rank groups by best candidate score.
    const byAngle = new Map<string, SwarmCandidate[]>();
    for (const c of cands) {
      const arr = byAngle.get(c.angle) ?? [];
      arr.push(c);
      byAngle.set(c.angle, arr);
    }
    const groups = [...byAngle.entries()]
      .map(([theme, members]) => ({
        theme,
        members,
        best: Math.max(...members.map((m) => m.score)),
      }))
      .sort((a, b) => b.best - a.best);
    const out: SwarmCluster[] = groups.map((g, idx) => {
      const cluster = SwarmClusterSchema.parse({
        id: this.newId(),
        tenant_id: tenantId,
        run_id: runId,
        theme: g.theme,
        candidate_ids: g.members.map((m) => m.id),
        pick: idx < topN,
        rank: idx + 1,
        rationale:
          idx < topN
            ? `Top-${topN} theme by candidate score (best ${round2(g.best)}).`
            : `Lower-ranked theme (best ${round2(g.best)}).`,
        created_at: now,
      });
      this.clusters.set(cluster.id, cluster);
      return cluster;
    });
    this.setStatus(run, "converged");
    return out;
  }

  listClusters(tenantId: string, runId: string): SwarmCluster[] {
    return [...this.clusters.values()].filter(
      (c) => c.tenant_id === tenantId && c.run_id === runId,
    );
  }

  /** Produce the report that flows UP to the R&D leader. Non-executing — recommends a next step. */
  report(tenantId: string, runId: string): SwarmReport {
    const run = this.getRun(tenantId, runId);
    const picks = this.listClusters(tenantId, runId).filter((c) => c.pick);
    const topCandidateIds = picks.flatMap((c) => c.candidate_ids).slice(0, 5);
    const report = SwarmReportSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      run_id: runId,
      top_candidate_ids: topCandidateIds,
      clusters_summary: `${picks.length} top theme(s): ${picks.map((c) => c.theme).join(", ")}.`,
      recommended_next_step:
        "Promote the top candidates into Build From Brainstorm (approval-gated) — do not execute from the swarm.",
      escalated: false,
      created_at: this.clock().toISOString(),
    });
    this.reports.set(report.id, report);
    this.setStatus(run, "reported");
    return report;
  }

  /**
   * Promote a reported run: marks it promoted and hands back the top candidates as a NON-EXECUTING
   * payload for the approval-gated pipeline. The swarm itself never acts.
   */
  promote(tenantId: string, runId: string): { run: SwarmRun; top_candidates: SwarmCandidate[] } {
    const run = this.getRun(tenantId, runId);
    const report = [...this.reports.values()].find(
      (r) => r.tenant_id === tenantId && r.run_id === runId,
    );
    const ids = new Set(report?.top_candidate_ids ?? []);
    const top = this.listCandidates(tenantId, runId).filter((c) => ids.has(c.id));
    this.setStatus(run, "promoted");
    return { run: this.getRun(tenantId, runId), top_candidates: top };
  }

  listRuns(tenantId: string): SwarmRun[] {
    return [...this.runs.values()].filter((r) => r.tenant_id === tenantId);
  }

  getRun(tenantId: string, runId: string): SwarmRun {
    const r = this.runs.get(runId);
    if (!r || r.tenant_id !== tenantId) throw new Error("swarm run not found");
    return r;
  }

  listReports(tenantId: string, runId: string): SwarmReport[] {
    return [...this.reports.values()].filter(
      (r) => r.tenant_id === tenantId && r.run_id === runId,
    );
  }

  private setStatus(run: SwarmRun, status: SwarmRunStatus): void {
    const next: SwarmRun = { ...run, status, updated_at: this.clock().toISOString() };
    this.runs.set(next.id, next);
  }
}
