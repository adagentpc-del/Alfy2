import {
  CreateFollowUpInputSchema,
  FollowUpSchema,
  FollowUpSignalSchema,
  type CreateFollowUpInput,
  type FollowUp,
  type FollowUpSignal,
  type SequenceStep,
  type FollowUpStatus,
  type FollowUpStopReason,
} from "@alfy2/shared";

/**
 * The Follow-Up Execution Engine (docs/adr/ADR-0033-follow-up-execution-engine.md). Alyssa's follow-up
 * never depends on memory or energy: the engine tracks leads, warm contacts, deals, vendors, investors,
 * clients, partners, unanswered emails, and stale opportunities, runs follow-up sequences with an
 * approval queue and reminders, and — once approved — keeps going until a response arrives, the goal is
 * reached, the sequence completes, a risk appears, or Alyssa pauses it. Deterministic. Tenant-scoped.
 */

export class FollowUpEngineError extends Error {}

const ACTIVE: FollowUpStatus = "active";
const TERMINAL: ReadonlySet<FollowUpStatus> = new Set<FollowUpStatus>(["completed", "stopped"]);
const DAY = 86_400_000;

/** The default cadence used when no sequence is supplied: 24h / 3d / 7d / 14d / 30d. */
export const DEFAULT_CADENCE_DAYS = [1, 3, 7, 14, 30];

export interface FollowUpEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export class FollowUpExecutionEngine {
  private readonly followups = new Map<string, FollowUp>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: FollowUpEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Create a follow-up (pending approval). A default sequence is generated if none supplied. */
  create(tenantId: string, input: CreateFollowUpInput): FollowUp {
    const i = CreateFollowUpInputSchema.parse(input);
    const sequence: SequenceStep[] = i.sequence.length
      ? i.sequence
      : DEFAULT_CADENCE_DAYS.map((d) => ({
          day_offset: d,
          channel: "email",
          template: `Follow-up to ${i.entity_name} (day ${d})`,
        }));
    const now = this.clock().toISOString();
    const fu = FollowUpSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      entity_kind: i.entity_kind,
      entity_name: i.entity_name,
      business_id: i.business_id,
      goal_id: i.goal_id,
      sequence,
      current_step: 0,
      status: "pending_approval",
      stop_reason: null,
      no_response_policy: i.no_response_policy,
      reactivation: i.reactivation,
      last_touch_at: null,
      next_touch_at: null,
      created_at: now,
      updated_at: now,
    });
    this.followups.set(fu.id, fu);
    return fu;
  }

  /** Approve a follow-up → it runs. Schedules the first touch. */
  approve(tenantId: string, id: string): FollowUp {
    const fu = this.require(tenantId, id);
    if (TERMINAL.has(fu.status)) throw new FollowUpEngineError(`Follow-up ${id} is ${fu.status}.`);
    const now = this.clock();
    return this.save({
      ...fu,
      status: ACTIVE,
      stop_reason: null,
      next_touch_at: new Date(now.getTime() + fu.sequence[0]!.day_offset * DAY).toISOString(),
    });
  }

  /**
   * Advance the follow-up (the autopilot). Keeps going UNLESS a stop condition fires, in priority order:
   * needs-human → escalate to Alyssa (escalated); a response arrives (stopped: response_received); a
   * meeting is booked (completed: meeting_booked); the deal closes (completed: deal_closed); the goal is
   * reached (completed: goal_reached); a risk appears (stopped: risk); or the sequence is exhausted
   * (completed: sequence_completed). Otherwise it sends the next touch. Only meaningful while active.
   * Escalation happens ONLY when human judgment is needed — everything else stays on autopilot.
   */
  advance(tenantId: string, id: string, signal: FollowUpSignal = FollowUpSignalSchema.parse({})): FollowUp {
    const fu = this.require(tenantId, id);
    if (fu.status !== ACTIVE) return fu;
    const s = FollowUpSignalSchema.parse(signal);

    if (s.needs_human) return this.escalate(fu, s.escalation_reason || "Human judgment required.");
    if (s.response_received) return this.halt(fu, "stopped", "response_received");
    if (s.meeting_booked) return this.halt(fu, "completed", "meeting_booked");
    if (s.deal_closed) return this.halt(fu, "completed", "deal_closed");
    if (s.goal_reached) return this.halt(fu, "completed", "goal_reached");
    if (s.risk) return this.halt(fu, "stopped", "risk");

    const nextStep = fu.current_step + 1;
    const now = this.clock();
    // Record this touch.
    const touched: FollowUp = { ...fu, current_step: nextStep, last_touch_at: now.toISOString() };

    if (nextStep >= fu.sequence.length) {
      // Sequence exhausted — complete (and flag reactivation if configured).
      const completed = this.halt(touched, "completed", "sequence_completed");
      return completed;
    }
    return this.save({
      ...touched,
      next_touch_at: new Date(now.getTime() + fu.sequence[nextStep]!.day_offset * DAY).toISOString(),
    });
  }

  /** Pause a running follow-up (can be approved again). */
  pause(tenantId: string, id: string): FollowUp {
    const fu = this.require(tenantId, id);
    if (TERMINAL.has(fu.status)) throw new FollowUpEngineError(`Follow-up ${id} is ${fu.status}.`);
    return this.save({ ...fu, status: "paused", stop_reason: "paused" });
  }

  /** Start a reactivation pass on a completed/stopped follow-up (resets it to pending approval). */
  reactivate(tenantId: string, id: string): FollowUp {
    const fu = this.require(tenantId, id);
    if (!fu.reactivation) throw new FollowUpEngineError(`Follow-up ${id} is not configured for reactivation.`);
    return this.save({ ...fu, status: "pending_approval", stop_reason: null, current_step: 0, next_touch_at: null });
  }

  /** Follow-ups whose next touch is due at/before `now` (the reminders worklist). */
  dueForTouch(tenantId: string, now?: Date): FollowUp[] {
    const at = (now ?? this.clock()).getTime();
    return [...this.followups.values()].filter(
      (fu) => fu.tenant_id === tenantId && fu.status === ACTIVE && fu.next_touch_at !== null && new Date(fu.next_touch_at).getTime() <= at,
    );
  }

  /** Follow-ups awaiting approval (the approval queue). */
  pendingApproval(tenantId: string): FollowUp[] {
    return [...this.followups.values()].filter((fu) => fu.tenant_id === tenantId && fu.status === "pending_approval");
  }

  /** Currently-running follow-ups. */
  active(tenantId: string): FollowUp[] {
    return [...this.followups.values()].filter((fu) => fu.tenant_id === tenantId && fu.status === ACTIVE);
  }

  /** Follow-ups escalated to a human — the only ones needing Alyssa's judgment. */
  escalated(tenantId: string): FollowUp[] {
    return [...this.followups.values()].filter((fu) => fu.tenant_id === tenantId && fu.status === "escalated");
  }

  get(tenantId: string, id: string): FollowUp | undefined {
    const fu = this.followups.get(id);
    return fu && fu.tenant_id === tenantId ? fu : undefined;
  }

  // --- internals ---

  private halt(fu: FollowUp, status: Extract<FollowUpStatus, "completed" | "stopped">, reason: FollowUpStopReason): FollowUp {
    return this.save({ ...fu, status, stop_reason: reason, next_touch_at: null });
  }

  private escalate(fu: FollowUp, reason: string): FollowUp {
    return this.save({ ...fu, status: "escalated", stop_reason: "escalated", escalation_reason: reason, next_touch_at: null });
  }

  private save(fu: FollowUp): FollowUp {
    const next = FollowUpSchema.parse({ ...fu, updated_at: this.clock().toISOString() });
    this.followups.set(next.id, next);
    return next;
  }

  private require(tenantId: string, id: string): FollowUp {
    const fu = this.get(tenantId, id);
    if (!fu) throw new FollowUpEngineError(`No follow-up ${id} in tenant ${tenantId}.`);
    return fu;
  }
}
