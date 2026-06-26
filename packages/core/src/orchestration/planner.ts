import type { Task } from "@alfy2/shared";

/**
 * Planner interface (ARCHITECTURE.md §4 step 2). A Planner turns an operator intent — with help
 * from the relevant Module(s) — into an ordered Plan of Tasks. Concrete planning logic arrives with
 * modules (Phase 4); the kernel only defines the shape.
 */

export interface OperatorIntent {
  tenant_id: string;
  trace_id: string;
  /** The module this intent targets (registry id). */
  module: string;
  /** The requested capability. */
  capability: string;
  /** Free-form input for the capability. */
  input: Record<string, unknown>;
}

export interface Plan {
  trace_id: string;
  tasks: Task[];
  /** Plain-language rationale for the plan — recorded in the Decision Log. */
  rationale: string;
}

export interface Planner {
  plan(intent: OperatorIntent): Promise<Plan>;
}
