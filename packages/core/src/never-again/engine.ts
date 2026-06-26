import {
  CaptureFrustrationInputSchema,
  NeverAgainSolutionSchema,
  type CaptureFrustrationInput,
  type NeverAgainSolution,
  type FrustrationTrigger,
} from "@alfy2/shared";

/**
 * Never Again Engine (docs/adr/ADR-0116-never-again.md). When Alyssa signals a repeated frustration —
 * "I forgot", "this happened again", "this is annoying", "I hate this", "this always breaks", "this wastes
 * time" — it converts the frustration into permanent infrastructure: a templated root cause and a workflow,
 * automation, agent, checklist, SOP, reminder, knowledge update, and policy so nothing annoys Alyssa twice.
 * Priority rises with how often it has recurred. Deterministic, append-only. Tenant-scoped.
 */

interface TriggerTemplate {
  root_cause: (d: string) => string;
  permanent_solution: (d: string) => string;
  workflow: (d: string) => string;
  automation: (d: string) => string;
  agent: (d: string) => string;
  sop: (d: string) => string;
  reminder: (d: string) => string;
  knowledge_update: (d: string) => string;
  policy: (d: string) => string;
}

const TEMPLATES: Record<FrustrationTrigger, TriggerTemplate> = {
  i_forgot: {
    root_cause: (d) => `"${d}" had no reliable reminder or system to carry it, so it depended on memory.`,
    permanent_solution: (d) => `Make "${d}" impossible to forget by encoding it into a scheduled, owned step.`,
    workflow: (d) => `Workflow that schedules and tracks "${d}" to completion.`,
    automation: (d) => `Automation that triggers "${d}" on its due date without being asked.`,
    agent: (d) => `Reminder agent that watches for and surfaces "${d}" before it slips.`,
    sop: (d) => `SOP: "${d}" runs on a fixed cadence with a named owner.`,
    reminder: (d) => `Recurring reminder set for "${d}".`,
    knowledge_update: (d) => `Document that "${d}" must always be scheduled, never remembered.`,
    policy: (d) => `Policy: anything like "${d}" is captured as a scheduled task, not left to memory.`,
  },
  happened_again: {
    root_cause: (d) => `"${d}" recurred because the first occurrence was patched, not permanently fixed.`,
    permanent_solution: (d) => `Eliminate the recurrence of "${d}" at the source with a durable fix.`,
    workflow: (d) => `Workflow that detects and resolves "${d}" before it repeats.`,
    automation: (d) => `Automation that prevents the conditions that cause "${d}".`,
    agent: (d) => `Monitor agent that flags "${d}" the moment it starts to recur.`,
    sop: (d) => `SOP: every occurrence of "${d}" is root-caused, not just resolved.`,
    reminder: (d) => `Reminder to verify "${d}" no longer recurs.`,
    knowledge_update: (d) => `Record the permanent fix for "${d}" so it is never re-patched.`,
    policy: (d) => `Policy: repeated issues like "${d}" require a permanent fix, not a patch.`,
  },
  annoying: {
    root_cause: (d) => `"${d}" is friction that was tolerated instead of designed away.`,
    permanent_solution: (d) => `Remove the friction in "${d}" so it stops being annoying.`,
    workflow: (d) => `Streamlined workflow that removes the manual steps in "${d}".`,
    automation: (d) => `Automation that handles "${d}" end to end.`,
    agent: (d) => `Agent that absorbs "${d}" so Alyssa never touches it.`,
    sop: (d) => `SOP: "${d}" is handled by the system, not manually.`,
    reminder: (d) => `Reminder to confirm "${d}" has been automated away.`,
    knowledge_update: (d) => `Note that "${d}" should never be done by hand again.`,
    policy: (d) => `Policy: recurring friction like "${d}" is automated, not endured.`,
  },
  i_hate_this: {
    root_cause: (d) => `"${d}" is a low-value chore that drains energy without needing a human.`,
    permanent_solution: (d) => `Delegate "${d}" entirely so Alyssa never has to do it.`,
    workflow: (d) => `Workflow that fully delegates "${d}".`,
    automation: (d) => `Automation that performs "${d}" automatically.`,
    agent: (d) => `Dedicated agent that owns "${d}" from start to finish.`,
    sop: (d) => `SOP: "${d}" is owned by an agent with a clear escalation path.`,
    reminder: (d) => `Reminder to verify the agent is handling "${d}".`,
    knowledge_update: (d) => `Document how "${d}" is delegated and monitored.`,
    policy: (d) => `Policy: tasks Alyssa hates, like "${d}", are delegated by default.`,
  },
  always_breaks: {
    root_cause: (d) => `"${d}" lacks the validation, retries, or alerting to keep it reliable.`,
    permanent_solution: (d) => `Harden "${d}" so it stops breaking and self-heals when it does.`,
    workflow: (d) => `Resilient workflow for "${d}" with validation and retries.`,
    automation: (d) => `Automation that retries "${d}" with backoff and alerts on failure.`,
    agent: (d) => `Reliability agent that monitors "${d}" and reroutes around failures.`,
    sop: (d) => `SOP: "${d}" defines failure handling and an alert path up front.`,
    reminder: (d) => `Reminder to review the health of "${d}".`,
    knowledge_update: (d) => `Document the failure modes of "${d}" and their fixes.`,
    policy: (d) => `Policy: fragile steps like "${d}" must be observable and retryable.`,
  },
  wastes_time: {
    root_cause: (d) => `"${d}" consumes time that a system or template could give back.`,
    permanent_solution: (d) => `Reclaim the time spent on "${d}" by systematizing it.`,
    workflow: (d) => `Workflow that compresses "${d}" into a single fast step.`,
    automation: (d) => `Automation that does "${d}" in the background.`,
    agent: (d) => `Agent that handles "${d}" so the time is returned to Alyssa.`,
    sop: (d) => `SOP: "${d}" runs from a reusable template, not from scratch.`,
    reminder: (d) => `Reminder to confirm "${d}" no longer consumes manual time.`,
    knowledge_update: (d) => `Capture the reusable template for "${d}".`,
    policy: (d) => `Policy: time-wasting tasks like "${d}" are systematized on first sight.`,
  },
};

export class NeverAgainEngine {
  private readonly solutions = new Map<string, NeverAgainSolution>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Turn a captured frustration into permanent infrastructure so it never happens again. */
  capture(tenantId: string, input: CaptureFrustrationInput): NeverAgainSolution {
    const i = CaptureFrustrationInputSchema.parse(input);
    const t = TEMPLATES[i.trigger];
    const d = i.description.trim();

    const checklist = [
      `Confirm the root cause of "${d}" is addressed, not just the symptom.`,
      "Deploy the workflow, automation, and agent that own it.",
      "Set the reminder and record the SOP, knowledge update, and policy.",
      "Verify it cannot recur on the next cycle.",
    ];

    const priority = clamp(Math.min(i.occurrences / 5, 1) * 0.7 + 0.3, 0, 1);

    const s = NeverAgainSolutionSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      trigger: i.trigger,
      problem: d,
      root_cause: t.root_cause(d),
      permanent_solution: t.permanent_solution(d),
      workflow: t.workflow(d),
      automation: t.automation(d),
      agent: t.agent(d),
      checklist,
      sop: t.sop(d),
      reminder: t.reminder(d),
      knowledge_update: t.knowledge_update(d),
      policy: t.policy(d),
      priority,
      created_at: this.clock().toISOString(),
    });
    this.solutions.set(s.id, s);
    return s;
  }

  get(tenantId: string, id: string): NeverAgainSolution | undefined {
    const s = this.solutions.get(id);
    return s && s.tenant_id === tenantId ? s : undefined;
  }

  list(tenantId: string): NeverAgainSolution[] {
    return [...this.solutions.values()].filter((s) => s.tenant_id === tenantId);
  }

  /** This tenant's solutions, highest priority first. */
  byPriority(tenantId: string): NeverAgainSolution[] {
    return this.list(tenantId).sort((a, b) => b.priority - a.priority);
  }
}

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
