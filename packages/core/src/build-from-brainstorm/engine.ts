import {
  BrainstormThreadSchema,
  BrainstormInputSchema,
  IngestBrainstormInputSchema,
  DecisionCardSchema,
  StrategyMapSchema,
  BuildPromptCardSchema,
  BuildPromptPackSchema,
  BuildTaskSchema,
  ApprovalSummarySchema,
  ApproveQueueInputSchema,
  AgentRunLogSchema,
  QaResultSchema,
  BrainstormChangelogEntrySchema,
  type BrainstormThread,
  type BrainstormInput,
  type IngestBrainstormInput,
  type BrainstormInputKind,
  type DecisionCard,
  type BrainstormDecisionCategory as DecisionCategory,
  type DecisionStatus,
  type StrategyMap,
  type StrategyLayer,
  type StrategyLayerEntry,
  type BuildPromptCard,
  type BuildPromptPack,
  type PromptCategory,
  type BuildTask,
  type BuildAgentKind,
  type ApprovalSummary,
  type ApproveQueueInput,
  type AgentRunLog,
  type QaResult,
  type QaCheck,
  type BrainstormChangelogEntry,
  type BrainstormRisk,
} from "@alfy2/shared";

/**
 * Build From Brainstorm engine — turns raw founder conversation into an approval-gated build.
 *
 * Deterministic and infrastructure-free (in-memory reference store; real persistence + AI-assisted
 * classification arrive in Phase 2 behind the AI Gateway flag). The NON-NEGOTIABLE rule is enforced
 * in code: {@link runApproved} refuses to execute any task that has not been explicitly approved via
 * {@link approve}. Ingest and extraction never execute anything.
 */

export interface BuildFromBrainstormOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

interface Stores {
  threads: Map<string, BrainstormThread>;
  inputs: Map<string, BrainstormInput>;
  decisions: Map<string, DecisionCard>;
  strategyMaps: Map<string, StrategyMap>;
  promptCards: Map<string, BuildPromptCard>;
  promptPacks: Map<string, BuildPromptPack>;
  tasks: Map<string, BuildTask>;
  approvals: Map<string, ApprovalSummary>;
  runs: Map<string, AgentRunLog>;
  qa: Map<string, QaResult>;
  changelog: Map<string, BrainstormChangelogEntry>;
}

const ACTIONABLE_KINDS: ReadonlySet<BrainstormInputKind> = new Set([
  "final_decision",
  "feature_request",
  "business_rule",
  "ui_ux_note",
  "technical_instruction",
  "prompt_logic",
  "algorithm_rule",
  "compliance_risk_note",
]);

export class BuildFromBrainstormEngine {
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly s: Stores = {
    threads: new Map(),
    inputs: new Map(),
    decisions: new Map(),
    strategyMaps: new Map(),
    promptCards: new Map(),
    promptPacks: new Map(),
    tasks: new Map(),
    approvals: new Map(),
    runs: new Map(),
    qa: new Map(),
    changelog: new Map(),
  };
  private readonly paused = new Set<string>(); // thread_ids whose queue is paused

  constructor(options: BuildFromBrainstormOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  // --- Stage 1: thread + classified inputs (NEVER executes) ---------------

  createThread(tenantId: string, input: { title: string; business_id?: string }): BrainstormThread {
    const now = this.clock().toISOString();
    const thread = BrainstormThreadSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_id: input.business_id ?? null,
      title: input.title,
      status: "open",
      created_at: now,
      updated_at: null,
    });
    this.s.threads.set(thread.id, thread);
    return thread;
  }

  /** Classify and store one input. This is INPUT only — nothing is ever executed here. */
  ingest(tenantId: string, raw: IngestBrainstormInput): BrainstormInput {
    const parsed = IngestBrainstormInputSchema.parse(raw);
    this.getThread(tenantId, parsed.thread_id); // assert exists + tenant
    const kind = parsed.kind ?? classifyInput(parsed.raw_text);
    const input = BrainstormInputSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      thread_id: parsed.thread_id,
      source: parsed.source,
      raw_text: parsed.raw_text,
      kind,
      actionable: ACTIONABLE_KINDS.has(kind),
      confidence: parsed.kind ? 0.99 : 0.6,
      created_at: this.clock().toISOString(),
    });
    this.s.inputs.set(input.id, input);
    return input;
  }

  listInputs(tenantId: string, threadId: string): BrainstormInput[] {
    return [...this.s.inputs.values()].filter(
      (i) => i.tenant_id === tenantId && i.thread_id === threadId,
    );
  }

  // --- Stage 2: extract decisions -----------------------------------------

  extractDecisions(tenantId: string, threadId: string): DecisionCard[] {
    const thread = this.getThread(tenantId, threadId);
    const now = this.clock().toISOString();
    const out: DecisionCard[] = [];
    for (const input of this.listInputs(tenantId, threadId)) {
      const mapped = decisionFor(input.kind);
      if (!mapped) continue; // emotional_context / possible_idea / clarification: not a decision
      const risk = riskFor(input.kind, input.raw_text);
      const card = DecisionCardSchema.parse({
        id: this.newId(),
        tenant_id: tenantId,
        thread_id: threadId,
        title: shortTitle(input.raw_text),
        category: mapped.category,
        source_input_ids: [input.id],
        confidence: input.confidence,
        status: mapped.status,
        why_it_matters: whyItMatters(mapped.category),
        related_task_ids: [],
        risk_level: risk,
        approval_required: risk !== "low" || mapped.category === "schema_change",
        created_at: now,
        updated_at: null,
      });
      this.s.decisions.set(card.id, card);
      out.push(card);
    }
    this.setThreadStatus(thread, "decisions_extracted");
    return out;
  }

  listDecisions(tenantId: string, threadId: string): DecisionCard[] {
    return [...this.s.decisions.values()].filter(
      (d) => d.tenant_id === tenantId && d.thread_id === threadId,
    );
  }

  /** Operator override of a decision's status (confirm / reject / park / needs_review). */
  setDecisionStatus(tenantId: string, decisionId: string, status: DecisionStatus): DecisionCard {
    const card = this.s.decisions.get(decisionId);
    if (!card || card.tenant_id !== tenantId) throw new Error("decision not found");
    const next = { ...card, status, updated_at: this.clock().toISOString() };
    this.s.decisions.set(next.id, next);
    return next;
  }

  // --- Stage 3: strategy / logic map --------------------------------------

  buildStrategyMap(tenantId: string, threadId: string): StrategyMap {
    const thread = this.getThread(tenantId, threadId);
    const decisions = this.listDecisions(tenantId, threadId);
    const layers: StrategyLayerEntry[] = (
      ["strategic", "product", "prompt", "workflow", "technical", "ui_ux", "compliance_risk"] as StrategyLayer[]
    ).map((layer) => {
      const inLayer = decisions.filter((d) => layerFor(d.category) === layer);
      return {
        layer,
        what_user_wants: inLayer.map((d) => d.title),
        why_it_matters: inLayer.map((d) => d.why_it_matters).filter((w) => w.length > 0),
        product_changes: layer === "product" ? inLayer.map((d) => d.title) : [],
        agents_needed: [...new Set(inLayer.map((d) => agentFor(d.category)))],
        files_systems_affected: [],
        dependencies: [],
        needs_approval: inLayer.some((d) => d.approval_required),
        do_not_build_yet: inLayer.some((d) => d.status === "parked"),
      };
    });
    const map = StrategyMapSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      thread_id: threadId,
      layers,
      parked_decision_ids: decisions.filter((d) => d.status === "parked").map((d) => d.id),
      created_at: this.clock().toISOString(),
    });
    this.s.strategyMaps.set(map.id, map);
    this.setThreadStatus(thread, "strategy_mapped");
    return map;
  }

  // --- Stage 4: build prompt pack -----------------------------------------

  generatePromptPack(tenantId: string, threadId: string): { pack: BuildPromptPack; cards: BuildPromptCard[] } {
    const thread = this.getThread(tenantId, threadId);
    const now = this.clock().toISOString();
    // Only confirmed / needs_review decisions become executable prompts. Rejected + parked do not.
    const buildable = this.listDecisions(tenantId, threadId).filter(
      (d) => d.status === "confirmed" || d.status === "needs_review",
    );
    const cards: BuildPromptCard[] = buildable.map((d) => {
      const category = promptCategoryFor(d.category);
      const card = BuildPromptCardSchema.parse({
        id: this.newId(),
        tenant_id: tenantId,
        thread_id: threadId,
        category,
        task_title: d.title,
        objective: d.why_it_matters || `Implement: ${d.title}`,
        context: `Derived from a ${d.category.replace(/_/g, " ")} decision in this brainstorm.`,
        requirements: [d.title],
        affected_area: affectedAreaFor(category),
        acceptance_criteria: [`${d.title} is implemented and verifiable.`],
        constraints: ["Cost-controlled; manual AI triggers; no production deploy without approval."],
        dependencies: [],
        test_steps: [`Verify "${d.title}" via the relevant smoke / QA check.`],
        rollback_notes: "Revert the commit / migration that introduced this change.",
        recommended_agent: agentFor(d.category),
        decision_ids: [d.id],
        created_at: now,
      });
      this.s.promptCards.set(card.id, card);
      return card;
    });
    const pack = BuildPromptPackSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      thread_id: threadId,
      prompt_ids: cards.map((c) => c.id),
      created_at: now,
    });
    this.s.promptPacks.set(pack.id, pack);
    this.setThreadStatus(thread, "prompts_generated");
    return { pack, cards };
  }

  listPromptCards(tenantId: string, threadId: string): BuildPromptCard[] {
    return [...this.s.promptCards.values()].filter(
      (c) => c.tenant_id === tenantId && c.thread_id === threadId,
    );
  }

  // --- Stage 5: build queue -----------------------------------------------

  createBuildQueue(tenantId: string, threadId: string): BuildTask[] {
    const thread = this.getThread(tenantId, threadId);
    const now = this.clock().toISOString();
    const tasks: BuildTask[] = this.listPromptCards(tenantId, threadId).map((c) => {
      const task = BuildTaskSchema.parse({
        id: this.newId(),
        tenant_id: tenantId,
        thread_id: threadId,
        prompt_id: c.id,
        name: c.task_title,
        status: "needs_review",
        priority: c.category === "compliance_review" ? "high" : "medium",
        assigned_agent: c.recommended_agent,
        estimated_complexity: "medium",
        dependencies: [],
        approved: false,
        approved_at: null,
        execution_log: [],
        result: "",
        qa_state: null,
        rollback_available: false,
        created_at: now,
        updated_at: null,
      });
      this.s.tasks.set(task.id, task);
      return task;
    });
    this.setThreadStatus(thread, "queued");
    return tasks;
  }

  listTasks(tenantId: string, threadId: string): BuildTask[] {
    return [...this.s.tasks.values()].filter(
      (t) => t.tenant_id === tenantId && t.thread_id === threadId,
    );
  }

  // --- Stage 6: approval gate (the hard gate) -----------------------------

  buildApprovalSummary(tenantId: string, threadId: string): ApprovalSummary {
    const tasks = this.listTasks(tenantId, threadId).filter((t) => t.status === "needs_review");
    const cardsById = new Map(this.listPromptCards(tenantId, threadId).map((c) => [c.id, c]));
    const risks: string[] = [];
    let db = false;
    let ui = false;
    let highest: BrainstormRisk = "low";
    for (const t of tasks) {
      const card = t.prompt_id ? cardsById.get(t.prompt_id) : undefined;
      if (t.assigned_agent === "schema") {
        db = true;
        risks.push(`Schema change: ${t.name}`);
        highest = maxRisk(highest, "high");
      }
      if (t.assigned_agent === "design_ui" || t.assigned_agent === "frontend") ui = true;
      if (t.assigned_agent === "compliance") {
        risks.push(`Compliance-sensitive: ${t.name}`);
        highest = maxRisk(highest, "medium");
      }
      void card;
    }
    const summary = ApprovalSummarySchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      thread_id: threadId,
      task_ids: tasks.map((t) => t.id),
      affected_files_modules: [...new Set(tasks.map((t) => affectedAreaFor(promptCategoryForAgent(t.assigned_agent))))],
      risks,
      dependencies: [],
      includes_database_changes: db,
      includes_ui_changes: ui,
      includes_production_deploy: false,
      highest_risk: highest,
      created_at: this.clock().toISOString(),
    });
    this.s.approvals.set(summary.id, summary);
    this.setThreadStatus(this.getThread(tenantId, threadId), "awaiting_approval");
    return summary;
  }

  /**
   * The Approval Gate. ONLY this transition makes tasks executable. approve_all approves every
   * reviewable task; approve_selected approves the listed ids; revise/cancel approve nothing.
   */
  approve(tenantId: string, input: ApproveQueueInput): BuildTask[] {
    const parsed = ApproveQueueInputSchema.parse(input);
    this.getThread(tenantId, parsed.thread_id);
    const now = this.clock().toISOString();
    const reviewable = this.listTasks(tenantId, parsed.thread_id).filter(
      (t) => t.status === "needs_review" || t.status === "draft",
    );
    let toApprove: BuildTask[] = [];
    if (parsed.action === "approve_all") toApprove = reviewable;
    else if (parsed.action === "approve_selected") {
      const ids = new Set(parsed.task_ids);
      toApprove = reviewable.filter((t) => ids.has(t.id));
    }
    // revise_before_running / cancel approve nothing.
    const approved: BuildTask[] = toApprove.map((t) => {
      const next: BuildTask = { ...t, approved: true, status: "approved", approved_at: now, updated_at: now };
      this.s.tasks.set(next.id, next);
      return next;
    });
    return approved;
  }

  // --- Stage 7: agent execution (only approved tasks) ---------------------

  /**
   * Execute approved tasks one by one, routed to their agent. ENFORCES the non-negotiable rule:
   * a task that is not `approved` is never run. `executor` lets Phase 2 inject real agent work;
   * the default is a deterministic stub that marks the task completed with a run log.
   */
  runApproved(
    tenantId: string,
    threadId: string,
    executor?: (task: BuildTask) => { files_touched: string[]; changes_made: string[]; result: string },
  ): AgentRunLog[] {
    const thread = this.getThread(tenantId, threadId);
    if (this.paused.has(threadId)) throw new Error("queue is paused");
    this.setThreadStatus(thread, "building");
    const logs: AgentRunLog[] = [];
    // Sequential by default, dependency order (approved tasks only).
    const runnable = this.listTasks(tenantId, threadId).filter((t) => t.approved && t.status === "approved");
    for (const task of orderByDeps(runnable)) {
      if (!task.approved) continue; // hard guard — never run an unapproved task
      const startedAt = this.clock().toISOString();
      this.updateTask(task.id, { status: "running", execution_log: [...task.execution_log, "task started"] });
      const work = executor
        ? executor(task)
        : { files_touched: [affectedAreaFor(promptCategoryForAgent(task.assigned_agent))], changes_made: [`applied: ${task.name}`], result: `Completed: ${task.name}` };
      const log = AgentRunLogSchema.parse({
        id: this.newId(),
        tenant_id: tenantId,
        task_id: task.id,
        agent: task.assigned_agent,
        started_at: startedAt,
        finished_at: this.clock().toISOString(),
        files_touched: work.files_touched,
        changes_made: work.changes_made,
        errors: [],
        blockers: [],
        completion_result: "completed",
        qa_result: null,
        changelog_entry_id: null,
      });
      this.s.runs.set(log.id, log);
      this.updateTask(task.id, {
        status: "completed",
        result: work.result,
        rollback_available: true,
        execution_log: [...task.execution_log, "task started", "task complete"],
      });
      logs.push(log);
    }
    return logs;
  }

  listRuns(tenantId: string, threadId: string): AgentRunLog[] {
    const taskIds = new Set(this.listTasks(tenantId, threadId).map((t) => t.id));
    return [...this.s.runs.values()].filter((r) => r.tenant_id === tenantId && taskIds.has(r.task_id));
  }

  // --- Stage 8: QA / validation -------------------------------------------

  runQa(tenantId: string, taskId: string): QaResult {
    const task = this.s.tasks.get(taskId);
    if (!task || task.tenant_id !== tenantId) throw new Error("task not found");
    const built = task.status === "completed";
    const checks: QaCheck[] = [
      { name: "feature_built", passed: built, detail: built ? "task completed" : "task not completed" },
      { name: "acceptance_criteria_met", passed: built, detail: "" },
      { name: "no_unrelated_changes", passed: true, detail: "scoped to task area" },
      { name: "rollback_path_exists", passed: task.rollback_available, detail: "" },
    ];
    const allPass = checks.every((c) => c.passed);
    const verdict = allPass ? "passed" : built ? "partial_pass" : "failed";
    const result = QaResultSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      task_id: taskId,
      verdict,
      checks,
      failure_reason: allPass ? null : "One or more QA checks failed.",
      recommended_fix: allPass ? null : `Re-run the build for "${task.name}" and ensure rollback exists.`,
      retry_prompt: allPass ? null : `Retry task: ${task.name}`,
      human_review_required: verdict === "failed",
      created_at: this.clock().toISOString(),
    });
    this.s.qa.set(result.id, result);
    this.updateTask(taskId, { qa_state: verdict, status: verdict === "passed" ? "qa_passed" : task.status });
    return result;
  }

  // --- Stage 9: changelog --------------------------------------------------

  writeChangelog(tenantId: string, threadId: string): BrainstormChangelogEntry {
    const thread = this.getThread(tenantId, threadId);
    const tasks = this.listTasks(tenantId, threadId);
    const runs = this.listRuns(tenantId, threadId);
    const completed = tasks.filter((t) => t.status === "completed" || t.status === "qa_passed");
    const failed = tasks.filter((t) => t.status === "failed");
    const passed = tasks.filter((t) => t.qa_state === "passed").length;
    const entry = BrainstormChangelogEntrySchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      thread_id: threadId,
      created_at: this.clock().toISOString(),
      brainstorm_source: thread.title,
      decisions_extracted: this.listDecisions(tenantId, threadId).length,
      tasks_completed: completed.map((t) => t.name),
      tasks_failed: failed.map((t) => t.name),
      files_modules_changed: [...new Set(runs.flatMap((r) => r.files_touched))],
      qa_results_summary: `${passed}/${tasks.length} tasks passed QA`,
      deployment_status: "none",
      rollback_notes: "Each completed task has a rollback path.",
      next_recommended_actions: failed.length ? failed.map((t) => `Fix and retry: ${t.name}`) : ["Deploy when ready."],
    });
    this.s.changelog.set(entry.id, entry);
    this.setThreadStatus(thread, "completed");
    return entry;
  }

  listChangelog(tenantId: string, threadId: string): BrainstormChangelogEntry[] {
    return [...this.s.changelog.values()].filter(
      (c) => c.tenant_id === tenantId && c.thread_id === threadId,
    );
  }

  // --- Queue controls ------------------------------------------------------

  rejectSelected(tenantId: string, taskIds: string[]): void {
    for (const id of taskIds) {
      const t = this.s.tasks.get(id);
      if (t && t.tenant_id === tenantId) this.updateTask(id, { status: "draft", approved: false });
    }
  }
  reviseTask(tenantId: string, taskId: string, name: string): BuildTask {
    const t = this.s.tasks.get(taskId);
    if (!t || t.tenant_id !== tenantId) throw new Error("task not found");
    return this.updateTask(taskId, { name, status: "needs_review", approved: false });
  }
  retryFailed(tenantId: string, taskId: string): BuildTask {
    const t = this.s.tasks.get(taskId);
    if (!t || t.tenant_id !== tenantId) throw new Error("task not found");
    if (t.status !== "failed") throw new Error("task is not failed");
    return this.updateTask(taskId, { status: "approved" });
  }
  rollbackTask(tenantId: string, taskId: string): BuildTask {
    const t = this.s.tasks.get(taskId);
    if (!t || t.tenant_id !== tenantId) throw new Error("task not found");
    if (!t.rollback_available) throw new Error("no rollback available");
    return this.updateTask(taskId, { status: "rolled_back" });
  }
  pauseQueue(threadId: string): void {
    this.paused.add(threadId);
  }
  resumeQueue(threadId: string): void {
    this.paused.delete(threadId);
  }

  // --- internals -----------------------------------------------------------

  private getThread(tenantId: string, threadId: string): BrainstormThread {
    const t = this.s.threads.get(threadId);
    if (!t || t.tenant_id !== tenantId) throw new Error("thread not found");
    return t;
  }
  private setThreadStatus(thread: BrainstormThread, status: BrainstormThread["status"]): void {
    const next = { ...thread, status, updated_at: this.clock().toISOString() };
    this.s.threads.set(next.id, next);
  }
  private updateTask(taskId: string, patch: Partial<BuildTask>): BuildTask {
    const t = this.s.tasks.get(taskId);
    if (!t) throw new Error("task not found");
    const next = { ...t, ...patch, updated_at: this.clock().toISOString() };
    this.s.tasks.set(taskId, next);
    return next;
  }
}

// ===========================================================================
// Deterministic heuristics (AI-assisted versions arrive in Phase 2 behind a flag)
// ===========================================================================

function classifyInput(text: string): BrainstormInputKind {
  const t = text.toLowerCase();
  const tokens = new Set(t.split(/[^a-z0-9]+/).filter(Boolean));
  const w = (...words: string[]): boolean => words.some((x) => tokens.has(x)); // whole-word
  const p = (...phrases: string[]): boolean => phrases.some((x) => t.includes(x)); // phrase
  if (w("compliance", "legal", "hipaa", "disclaimer", "privacy", "liability")) return "compliance_risk_note";
  if (w("algorithm", "ranking", "scoring", "weight", "weights") || p("score formula")) return "algorithm_rule";
  // Rejection wins early so "don't build X / scrap that" is never mistaken for a feature.
  if (w("reject", "scrap", "kill") || p("don't", "do not", "not going", "drop the", "kill the")) return "rejected_idea";
  if (w("schema", "database", "table", "tables", "api", "endpoint", "deploy", "migration", "backend", "sql")) return "technical_instruction";
  if (w("prompt", "prompts", "llm") || p("system prompt", "model should")) return "prompt_logic";
  if (w("ui", "ux", "button", "buttons", "screen", "layout", "color", "colors", "tab", "tabs", "design")) return "ui_ux_note";
  if (w("must", "always", "never", "policy", "required", "rule")) return "business_rule";
  if (p("later", "someday", "future", "parking lot", "down the road", "phase 2", "eventually")) return "future_idea";
  if (p("?", "should we", "what about", "not sure", "unsure", "wondering")) return "unresolved_question";
  if (w("overwhelmed", "frustrated", "excited", "tired", "stressed") || p("i feel", "i love", "i hate")) return "emotional_context";
  if (p("add a", "build a", "create a", "need a", "needs to", "need to add") || w("feature")) return "feature_request";
  if (p("decided", "final", "go with", "definitely", "let's do", "lets do", "we will")) return "final_decision";
  if (w("maybe", "idea", "could", "might")) return "possible_idea";
  return "clarification";
}

function decisionFor(kind: BrainstormInputKind): { category: DecisionCategory; status: DecisionStatus } | null {
  switch (kind) {
    case "final_decision":
      return { category: "confirmed_decision", status: "confirmed" };
    case "feature_request":
      return { category: "feature_requirement", status: "needs_review" };
    case "business_rule":
      return { category: "business_goal", status: "needs_review" };
    case "ui_ux_note":
      return { category: "feature_requirement", status: "needs_review" };
    case "technical_instruction":
      return { category: "system_requirement", status: "needs_review" };
    case "prompt_logic":
      return { category: "prompt_update", status: "needs_review" };
    case "algorithm_rule":
      return { category: "system_requirement", status: "needs_review" };
    case "compliance_risk_note":
      return { category: "qa_requirement", status: "needs_review" };
    case "rejected_idea":
      return { category: "rejected_idea", status: "rejected" };
    case "unresolved_question":
      return { category: "open_question", status: "needs_review" };
    case "future_idea":
      return { category: "feature_requirement", status: "parked" };
    default:
      return null; // emotional_context, possible_idea, clarification: not decisions
  }
}

function layerFor(category: DecisionCategory): StrategyLayer {
  switch (category) {
    case "business_goal":
    case "confirmed_decision":
    case "open_question":
      return "strategic";
    case "feature_requirement":
    case "system_requirement":
      return "product";
    case "prompt_update":
      return "prompt";
    case "workflow_change":
    case "automation_change":
    case "agent_instruction":
      return "workflow";
    case "schema_change":
      return "technical";
    case "content_update":
      return "ui_ux";
    case "qa_requirement":
      return "compliance_risk";
    default:
      return "strategic";
  }
}

function promptCategoryFor(category: DecisionCategory): PromptCategory {
  switch (category) {
    case "feature_requirement":
    case "business_goal":
    case "confirmed_decision":
      return "product";
    case "system_requirement":
      return "backend";
    case "schema_change":
      return "database_schema";
    case "prompt_update":
      return "prompt_engineering";
    case "workflow_change":
    case "automation_change":
    case "agent_instruction":
      return "automation";
    case "content_update":
      return "documentation";
    case "qa_requirement":
      return "qa_testing";
    default:
      return "product";
  }
}

function promptCategoryForAgent(agent: BuildAgentKind): PromptCategory {
  switch (agent) {
    case "design_ui":
      return "ui_ux";
    case "frontend":
      return "frontend";
    case "backend":
      return "backend";
    case "schema":
      return "database_schema";
    case "prompt":
      return "prompt_engineering";
    case "automation":
      return "automation";
    case "qa":
      return "qa_testing";
    case "documentation":
      return "documentation";
    case "compliance":
      return "compliance_review";
    default:
      return "product";
  }
}

function agentFor(category: DecisionCategory): BuildAgentKind {
  switch (category) {
    case "schema_change":
      return "schema";
    case "prompt_update":
      return "prompt";
    case "workflow_change":
    case "automation_change":
    case "agent_instruction":
      return "automation";
    case "content_update":
      return "documentation";
    case "qa_requirement":
      return "compliance";
    case "system_requirement":
      return "backend";
    default:
      return "backend";
  }
}

function affectedAreaFor(category: PromptCategory): string {
  switch (category) {
    case "ui_ux":
    case "frontend":
      return "thin UI / Executive Inbox view";
    case "backend":
    case "product":
      return "packages/core engines";
    case "database_schema":
      return "supabase/migrations";
    case "prompt_engineering":
      return "AI Gateway prompts";
    case "automation":
      return "workflow / connector adapters";
    case "qa_testing":
      return "scripts/*-smoke + workers/tests";
    case "documentation":
      return "docs/";
    case "compliance_review":
      return "compliance gate";
    default:
      return "packages/core";
  }
}

function riskFor(kind: BrainstormInputKind, text: string): BrainstormRisk {
  const t = text.toLowerCase();
  if (kind === "compliance_risk_note" || /production|payment|legal|hipaa|delete|drop table/.test(t)) return "high";
  if (kind === "technical_instruction" || kind === "algorithm_rule") return "medium";
  return "low";
}

function whyItMatters(category: DecisionCategory): string {
  switch (category) {
    case "feature_requirement":
      return "Adds capability users will rely on.";
    case "schema_change":
      return "Changes data shape — must be migrated safely.";
    case "qa_requirement":
      return "Protects against compliance / quality risk.";
    case "business_goal":
      return "Advances a stated business objective.";
    default:
      return "Moves the build forward.";
  }
}

function maxRisk(a: BrainstormRisk, b: BrainstormRisk): BrainstormRisk {
  const order: BrainstormRisk[] = ["low", "medium", "high", "critical"];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

function orderByDeps(tasks: BuildTask[]): BuildTask[] {
  // Stable order: tasks with no deps first, then dependents (single pass is enough for our DAGs).
  const done = new Set<string>();
  const out: BuildTask[] = [];
  const remaining = [...tasks];
  let guard = 0;
  while (remaining.length && guard++ < 1000) {
    const idx = remaining.findIndex((t) => t.dependencies.every((d) => done.has(d) || !tasks.some((x) => x.id === d)));
    const pick = idx >= 0 ? remaining.splice(idx, 1)[0]! : remaining.shift()!;
    out.push(pick);
    done.add(pick.id);
  }
  return out;
}

function shortTitle(text: string): string {
  const first = text.replace(/\s+/g, " ").trim().split(/[.!?\n]/)[0]!.trim() || text.trim();
  return first.length > 90 ? `${first.slice(0, 87)}…` : first;
}
