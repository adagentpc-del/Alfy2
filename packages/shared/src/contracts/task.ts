import { z } from "zod";

/**
 * The envelope the core sends an agent (core -> agent). See docs/TECH_SPEC.md §3.1.
 * Agents validate this on receipt and return a SignalToAction result.
 */

export const TaskBudgetSchema = z.object({
  /** Hard ceiling on model tokens for this task (0 = no AI permitted). */
  max_tokens: z.number().int().nonnegative(),
  /** Hard ceiling on estimated spend in USD for this task. */
  max_cost_usd: z.number().nonnegative(),
  /** Wall-clock timeout for the agent in milliseconds. */
  timeout_ms: z.number().int().positive(),
});
export type TaskBudget = z.infer<typeof TaskBudgetSchema>;

export const TaskSchema = z.object({
  task_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  /** Agent registry key, e.g. "research.web". */
  agent: z.string().min(1),
  /** Requested capability, e.g. "summarize". */
  capability: z.string().min(1),
  /** Capability-specific input. Validated per-capability downstream. */
  input: z.record(z.unknown()).default({}),
  budget: TaskBudgetSchema,
  /** Ties this task to the Event Log. */
  trace_id: z.string().uuid(),
});
export type Task = z.infer<typeof TaskSchema>;
