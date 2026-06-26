import {
  StartVentureInputSchema,
  VentureStudioSessionSchema,
  type StartVentureInput,
  type VentureStudioSession,
  type VentureStudioStage,
  type VentureStageProgress,
} from "@alfy2/shared";

const STAGE_ORDER: VentureStudioStage[] = [
  "discovery", "validation", "market", "business_model", "pricing", "brand", "technology",
  "architecture", "agents", "automation", "marketing", "sales", "finance", "legal", "launch",
  "kpis", "founderos_integration",
];

/**
 * Venture Studio (docs/adr/ADR-0131-venture-studio.md). start() opens a 17-stage company-build at discovery
 * (every company inherits the enterprise operating standards — no business starts from zero). advance() marks
 * the current stage complete and moves to the next. approveLaunch() clears the launch hold. Nothing launches
 * without approval. Deterministic. Tenant-scoped. Mutable in-memory store.
 */
export class VentureStudio {
  private readonly sessions = new Map<string, VentureStudioSession>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  start(tenantId: string, input: StartVentureInput): VentureStudioSession {
    const i = StartVentureInputSchema.parse(input);
    const now = this.clock().toISOString();
    const stages: VentureStageProgress[] = STAGE_ORDER.map((stage) => ({
      stage,
      status: stage === "discovery" ? "in_progress" : "not_started",
      artifact_summary: "",
    }));
    const session = VentureStudioSessionSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      idea: i.idea,
      working_name: i.working_name,
      current_stage: "discovery",
      stages,
      inherits_operating_standards: true,
      awaiting_launch_approval: true,
      created_at: now,
      updated_at: now,
    });
    this.sessions.set(session.id, session);
    return session;
  }

  advance(tenantId: string, id: string, artifactSummary = ""): VentureStudioSession {
    const s = this.require(tenantId, id);
    const idx = STAGE_ORDER.indexOf(s.current_stage);
    const next = STAGE_ORDER[idx + 1];
    if (!next) return s; // already at founderos_integration
    const stages: VentureStageProgress[] = s.stages.map((p) => {
      if (p.stage === s.current_stage) return { ...p, status: "complete", artifact_summary: artifactSummary || p.artifact_summary };
      if (p.stage === next) return { ...p, status: "in_progress" };
      return p;
    });
    const updated = VentureStudioSessionSchema.parse({ ...s, current_stage: next, stages, updated_at: this.clock().toISOString() });
    this.sessions.set(id, updated);
    return updated;
  }

  approveLaunch(tenantId: string, id: string): VentureStudioSession {
    const s = this.require(tenantId, id);
    const updated = VentureStudioSessionSchema.parse({ ...s, awaiting_launch_approval: false, updated_at: this.clock().toISOString() });
    this.sessions.set(id, updated);
    return updated;
  }

  get(tenantId: string, id: string): VentureStudioSession | undefined {
    const s = this.sessions.get(id);
    return s && s.tenant_id === tenantId ? s : undefined;
  }

  list(tenantId: string): VentureStudioSession[] {
    return [...this.sessions.values()].filter((s) => s.tenant_id === tenantId);
  }

  private require(tenantId: string, id: string): VentureStudioSession {
    const s = this.get(tenantId, id);
    if (!s) throw new Error(`Venture session ${id} not found for tenant ${tenantId}.`);
    return s;
  }
}
