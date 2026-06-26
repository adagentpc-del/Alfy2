/**
 * Mission Control read-model PORT (§28). The engine reads the world through this single interface so it
 * stays infrastructure-free. The production adapter (Pg, composing revenue-command / ai-org /
 * executive-inbox / persistent-approval / org-health / business-profile / follow-up / agent-observability)
 * is built later by another agent against {@link MissionControlReadModel}. An in-memory fixture-backed
 * reference implementation ships here for tests and the smoke.
 *
 * The {@link MissionControlAggregate} is the plain, already-summarized shape the engine consumes. It is
 * intentionally NOT the contract snapshot — the engine maps + derives alerts/priorities from it.
 */

/** A pending approval as seen by Mission Control (one row of the approval queue). */
export interface MissionControlPendingApproval {
  id: string;
  /** The action class (e.g. move_money, deploy, send_contract) — drives high-risk alerting. */
  action_class: string;
  risk: string;
  summary: string;
  requires_approval: boolean;
  /** ISO timestamp the approval entered the queue — drives the >24h escalation rule. */
  created_at: string;
}

/** The aggregate the read-model returns and the engine composes from. All fields already summarized. */
export interface MissionControlAggregate {
  as_of: string;
  revenue_today: number;
  cash_position: number;
  cash_runway_days: number | null;
  pending_approvals: MissionControlPendingApproval[];
  open_inbox_count: number;
  blocked: { id: string; label: string }[];
  opportunities: { label: string; value: number; status: string }[];
  active_builds: { label: string; pct: number }[];
  /** dept -> "green" | "amber" | "red" | "idle". */
  department_health: Record<string, string>;
  founder_capacity: { score: number | null; mode: string };
  follow_ups_due: { id: string; label: string; due: string }[];
  meetings: { id: string; label: string; at: string }[];
  /** scope -> readiness fraction 0..1. */
  launch_readiness: Record<string, number>;
}

/** The PORT the engine reads through. The concrete Pg implementation is built later by another agent. */
export interface MissionControlReadModel {
  aggregate(tenantId: string, businessId?: string): Promise<MissionControlAggregate>;
}

/**
 * Reference {@link MissionControlReadModel} that returns a fixture passed to its constructor. For tests
 * and the smoke only — the production store is the Pg read-model adapter.
 */
export class InMemoryMissionControlReadModel implements MissionControlReadModel {
  constructor(private fixture: MissionControlAggregate) {}

  async aggregate(_tenantId: string, _businessId?: string): Promise<MissionControlAggregate> {
    return structuredClone(this.fixture);
  }
}
