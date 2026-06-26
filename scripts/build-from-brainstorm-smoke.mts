/**
 * Runtime smoke for Build From Brainstorm. Proves the full pipeline AND the non-negotiable rule:
 * raw conversation is input only; nothing executes until the build queue is explicitly approved.
 * Run: `tsx scripts/build-from-brainstorm-smoke.mts`.
 */
import assert from "node:assert/strict";
import { BuildFromBrainstormEngine } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-26T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const e = new BuildFromBrainstormEngine({ clock: () => NOW, idFactory: id });

// 1. Brain dump — a messy founder thread. Each line is classified, NOT executed.
const thread = e.createThread(TENANT, { title: "Make Alfie build from brainstorm" });
e.ingest(TENANT, { thread_id: thread.id, source: "voice", raw_text: "I want to build a feature that turns my brain dumps into a build queue so I stop copy pasting prompts." });
e.ingest(TENANT, { thread_id: thread.id, source: "text", raw_text: "It must always require my approval before anything runs." });
e.ingest(TENANT, { thread_id: thread.id, source: "text", raw_text: "Add a UI tab for the build queue with status colors." });
e.ingest(TENANT, { thread_id: thread.id, source: "text", raw_text: "We need a database table to store the tasks." });
e.ingest(TENANT, { thread_id: thread.id, source: "text", raw_text: "Maybe later add voice summaries from Loom." });
e.ingest(TENANT, { thread_id: thread.id, source: "text", raw_text: "I'm honestly overwhelmed by all the tools." });
e.ingest(TENANT, { thread_id: thread.id, source: "text", raw_text: "Don't build the analytics dashboard yet, scrap that." });

const inputs = e.listInputs(TENANT, thread.id);
assert.equal(inputs.length, 7, "all inputs captured");
assert.ok(inputs.some((i) => i.kind === "emotional_context" && !i.actionable), "emotional venting is captured but not actionable");
assert.ok(inputs.some((i) => i.kind === "rejected_idea"), "rejected idea classified");
assert.ok(inputs.some((i) => i.kind === "future_idea"), "future/parking-lot idea classified");
assert.ok(inputs.some((i) => i.kind === "ui_ux_note" && i.actionable), "UI note is actionable");

// 2. Extract decisions — only real decisions, not the emotional line.
const decisions = e.extractDecisions(TENANT, thread.id);
assert.ok(decisions.length >= 4, "extracted the actionable decisions");
assert.ok(!decisions.some((d) => d.title.toLowerCase().includes("overwhelmed")), "emotional line is not a decision");
assert.ok(decisions.some((d) => d.status === "rejected"), "rejected idea becomes a rejected decision");
assert.ok(decisions.some((d) => d.status === "parked"), "future idea is parked");

// 3. Strategy map — 7 logic layers.
const map = e.buildStrategyMap(TENANT, thread.id);
assert.equal(map.layers.length, 7, "strategy map separates all seven logic layers");

// 4. Build prompt pack — rejected + parked do NOT become prompts.
const { cards } = e.generatePromptPack(TENANT, thread.id);
assert.ok(cards.length >= 1, "buildable decisions become prompt cards");
assert.ok(cards.every((c) => c.acceptance_criteria.length > 0 && c.rollback_notes.length > 0), "each prompt has acceptance criteria + rollback");

// 5. Build queue.
const tasks = e.createBuildQueue(TENANT, thread.id);
assert.ok(tasks.length === cards.length, "one task per prompt");
assert.ok(tasks.every((t) => t.status === "needs_review" && !t.approved), "tasks start unapproved, needing review");

// 6. NON-NEGOTIABLE RULE: running before approval executes nothing.
const preApprovalRuns = e.runApproved(TENANT, thread.id);
assert.equal(preApprovalRuns.length, 0, "NOTHING runs before approval");
assert.ok(e.listTasks(TENANT, thread.id).every((t) => t.status !== "completed"), "no task completed before approval");

// Approval gate.
const summary = e.buildApprovalSummary(TENANT, thread.id);
assert.ok(summary.task_ids.length >= 1, "approval summary lists the tasks");
const approved = e.approve(TENANT, { thread_id: thread.id, action: "approve_all", task_ids: [] });
assert.equal(approved.length, tasks.length, "approve_all approves every reviewable task");

// 7. Agent execution — now (and only now) tasks run, routed to agents.
const runs = e.runApproved(TENANT, thread.id);
assert.equal(runs.length, tasks.length, "approved tasks execute one by one");
assert.ok(runs.every((r) => r.completion_result === "completed"), "each run completes");
const agents = new Set(runs.map((r) => r.agent));
assert.ok(agents.size >= 1, "tasks routed to agents");

// 8. QA each completed task.
for (const t of e.listTasks(TENANT, thread.id)) {
  if (t.status === "completed") {
    const qa = e.runQa(TENANT, t.id);
    assert.equal(qa.verdict, "passed", "completed task passes QA");
  }
}

// 9. Changelog.
const log = e.writeChangelog(TENANT, thread.id);
assert.ok(log.tasks_completed.length >= 1, "changelog records completed tasks");
assert.equal(e.listInputs("00000000-0000-0000-0000-0000000000ff", thread.id).length, 0, "another tenant sees nothing");

console.log(
  `BUILD FROM BRAINSTORM SMOKE OK — ${inputs.length} inputs classified, ${decisions.length} decisions, ` +
    `${cards.length} prompts, ${tasks.length} tasks, NOTHING ran before approval, ${runs.length} ran after, QA passed, changelog written`,
);
