import {
  StartPipelineInputSchema,
  ConversationToCodeRunSchema,
  type StartPipelineInput,
  type ConversationToCodeRun,
  type PipelineStage,
  type PipelineStageStatus,
} from "@alfy2/shared";

/** The canonical 12-stage order. The run is not done until it has produced a compounding asset. */
const STAGE_ORDER: PipelineStage[] = [
  "conversation", "structured_spec", "build_packet", "security_review", "code_agent_handoff",
  "implementation", "review", "testing", "approval", "deployment", "documentation", "compounding_asset",
];

/**
 * Conversation-to-Code Pipeline (docs/adr/ADR-0141-conversation-to-code.md). Tracks one idea's journey
 * through the 12 stages. start() opens a run at the conversation stage with every stage pending. advance()
 * marks the current stage complete and moves to the next; deployment cannot complete while awaiting_approval
 * is true. The terminal stage is compounding_asset — every build feeds the Compounding Engine. Deterministic.
 * Tenant-scoped. Mutable in-memory store.
 */
export class ConversationToCodePipeline {
  private readonly runs = new Map<string, ConversationToCodeRun>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  start(tenantId: string, input: StartPipelineInput): ConversationToCodeRun {
    const i = StartPipelineInputSchema.parse(input);
    const now = this.clock().toISOString();
    const stages: PipelineStageStatus[] = STAGE_ORDER.map((stage) => ({
      stage,
      status: stage === "conversation" ? "in_progress" : "pending",
      note: "",
    }));
    const run = ConversationToCodeRunSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      idea: i.idea,
      working_name: i.working_name,
      current_stage: "conversation",
      stages,
      feeds_compounding_engine: true,
      awaiting_approval: true,
      created_at: now,
      updated_at: now,
    });
    this.runs.set(run.id, run);
    return run;
  }

  /** Complete the current stage and advance to the next. Approve via setApproval() before deployment. */
  advance(tenantId: string, id: string, note = ""): ConversationToCodeRun {
    const run = this.require(tenantId, id);
    const idx = STAGE_ORDER.indexOf(run.current_stage);
    const next = STAGE_ORDER[idx + 1];
    if (!next) return run; // already at compounding_asset

    if (next === "deployment" && run.awaiting_approval) {
      throw new Error(`Run ${id} cannot reach deployment while awaiting approval. Call setApproval() first.`);
    }

    const stages: PipelineStageStatus[] = run.stages.map((s) => {
      if (s.stage === run.current_stage) return { ...s, status: "complete", note: note || s.note };
      if (s.stage === next) return { ...s, status: "in_progress" };
      return s;
    });
    const updated = ConversationToCodeRunSchema.parse({
      ...run,
      current_stage: next,
      stages,
      updated_at: this.clock().toISOString(),
    });
    this.runs.set(id, updated);
    return updated;
  }

  /** Record Alyssa's approval so the run may proceed past the approval stage to deployment. */
  setApproval(tenantId: string, id: string, approved: boolean): ConversationToCodeRun {
    const run = this.require(tenantId, id);
    const updated = ConversationToCodeRunSchema.parse({
      ...run,
      awaiting_approval: !approved,
      updated_at: this.clock().toISOString(),
    });
    this.runs.set(id, updated);
    return updated;
  }

  get(tenantId: string, id: string): ConversationToCodeRun | undefined {
    const r = this.runs.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  list(tenantId: string): ConversationToCodeRun[] {
    return [...this.runs.values()].filter((r) => r.tenant_id === tenantId);
  }

  private require(tenantId: string, id: string): ConversationToCodeRun {
    const r = this.get(tenantId, id);
    if (!r) throw new Error(`Pipeline run ${id} not found for tenant ${tenantId}.`);
    return r;
  }
}
