/**
 * Runtime smoke test for the Goal Engine. Proves: all nine goal types analyze; every goal gets the
 * three paths (fastest / lowest-resistance / highest-ROI) plus a generated plan (weekly plan, daily
 * priorities, recommended agents/automations, expected completion, risk analysis); draft→approve makes
 * a goal actively pursued; a change auto-recalculates and bumps the version; hitting the target
 * auto-completes; the lifecycle states behave (pause/cancel/review_required, terminal states locked);
 * "never stop pursuing until completed/paused/cancelled/review_required"; and tenant isolation.
 * Run with: `tsx scripts/goal-engine-smoke.mts`.
 */
import assert from "node:assert/strict";
import { GoalEngine } from "@alfy2/core";
import { CreateGoalInputSchema, type CreateGoalInput, type GoalType } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

const engine = new GoalEngine({ clock: () => NOW, idFactory: id });

const input = (over: Partial<CreateGoalInput>): CreateGoalInput =>
  CreateGoalInputSchema.parse({
    type: "business",
    title: "Goal",
    current_state: "Starting point.",
    desired_state: "Target outcome.",
    ...over,
  });

// === 1. All nine goal types analyze and produce three paths + a plan. ===
const TYPES: GoalType[] = [
  "personal", "financial", "business", "health", "learning",
  "relationships", "launches", "sales", "cash_flow",
];
for (const t of TYPES) {
  const g = await engine.define(TENANT, input({ type: t, title: `${t} goal` }));
  assert.equal(g.status, "draft", `${t} starts as draft`);
  assert.equal(g.approved, false, `${t} starts unapproved`);
  // three distinct paths
  assert.equal(g.analysis.fastest_path.kind, "fastest");
  assert.equal(g.analysis.lowest_resistance_path.kind, "lowest_resistance");
  assert.equal(g.analysis.highest_roi_path.kind, "highest_roi");
  assert.ok(["fastest", "lowest_resistance", "highest_roi"].includes(g.analysis.recommended_path));
  assert.ok(g.analysis.gap.length > 0 && g.analysis.best_opportunities.length > 0);
  // plan completeness
  assert.ok(g.plan.weekly_plan.length >= 1, `${t} has a weekly plan`);
  assert.ok(g.plan.daily_priorities.length >= 1, `${t} has daily priorities`);
  assert.ok(g.plan.recommended_agents.length >= 1, `${t} has recommended agents`);
  assert.ok(g.plan.recommended_automations.length >= 1, `${t} has recommended automations`);
  assert.ok(g.plan.expected_completion > NOW.toISOString(), `${t} has a future completion`);
  assert.ok(g.plan.risk_analysis.length >= 1 && g.plan.risk_summary.length > 0, `${t} has risk analysis`);
}
console.log("[1] all 9 goal types: current/desired/gap, 3 paths, full plan ✔");

// === 2. Path selection responds to deadline and constraints. ===
const tight = await engine.define(TENANT, input({ deadline: "2026-07-10T00:00:00.000Z" })); // ~15 days
assert.equal(tight.analysis.recommended_path, "fastest", "near deadline → fastest path");
const constrained = await engine.define(TENANT, input({ constraints: ["No budget and cannot hire"] }));
assert.equal(constrained.analysis.recommended_path, "lowest_resistance", "hard constraint → lowest-resistance");
const roomy = await engine.define(TENANT, input({ deadline: "2027-06-01T00:00:00.000Z" }));
assert.equal(roomy.analysis.recommended_path, "highest_roi", "lots of room → highest-ROI");
console.log("[2] path selection: deadline→fastest, constraint→lowest-resistance, room→highest-ROI ✔");

// === 3. Approve makes a goal actively pursued; only active goals are "pursued". ===
const cash = await engine.define(TENANT, input({
  type: "cash_flow",
  title: "Reach $50k MRR",
  metric: "mrr",
  unit: "usd",
  baseline_value: 18000,
  current_value: 22000,
  target_value: 50000,
}));
assert.equal(engine.activeGoals(TENANT).length, 0, "no goals pursued before approval");
const approved = engine.approve(TENANT, cash.id);
assert.equal(approved.status, "active");
assert.equal(approved.approved, true);
assert.ok(engine.activeGoals(TENANT).some((g) => g.id === cash.id), "approved goal is actively pursued");
console.log("[3] approve → active; only approved goals are pursued ✔");

// === 4. A change auto-recalculates: re-plans and bumps the version. ===
const v1 = engine.get(TENANT, cash.id)!;
const recalced = await engine.recalculate(TENANT, cash.id, { ...empty(), target_value: 75000 });
assert.equal(recalced.version, v1.version + 1, "recalculation bumps version");
assert.equal(recalced.target_value, 75000, "change applied");
assert.ok(recalced.last_recalculated_at, "recalculation timestamped");
assert.ok(recalced.analysis.gap.includes("75000"), "gap reflects the new target");
console.log("[4] goal change → automatic recalculation + version bump ✔");

// === 5. Recording progress that hits target auto-completes; otherwise recalculates. ===
const partial = await engine.recordProgress(TENANT, cash.id, 40000);
assert.equal(partial.status, "active", "below target stays active");
assert.equal(partial.current_value, 40000);
assert.ok(partial.version > recalced.version, "partial progress recalculated the plan");
const done = await engine.recordProgress(TENANT, cash.id, 80000);
assert.equal(done.status, "completed", "reaching target auto-completes");
console.log("[5] progress: below target → recalc; target reached → auto-complete ✔");

// === 6. Lifecycle: pursued until completed/paused/cancelled/review_required; terminals are locked. ===
const g6 = engine.approve(TENANT, (await engine.define(TENANT, input({ title: "Lifecycle" }))).id);
assert.equal(engine.pause(TENANT, g6.id).status, "paused", "can pause");
assert.equal(engine.approve(TENANT, g6.id).status, "active", "paused can be re-approved");
assert.equal(engine.requireReview(TENANT, g6.id).status, "review_required", "can flag for review");
assert.ok(!engine.activeGoals(TENANT).some((g) => g.id === g6.id), "review_required is not pursued");
// a recalculation resolves the review back to active
const resumed = await engine.recalculate(TENANT, g6.id, { ...empty(), desired_state: "Refined target." });
assert.equal(resumed.status, "active", "recalculation resolves review → active");
const cancelled = engine.cancel(TENANT, g6.id);
assert.equal(cancelled.status, "cancelled");
assert.throws(() => engine.approve(TENANT, g6.id), /cannot be approved/i, "cancelled is terminal");
await assert.rejects(engine.recalculate(TENANT, g6.id, empty()), /cannot be recalculated/i, "terminal can't recalc");
console.log("[6] lifecycle: pause/review/cancel; terminals locked; review resolved by recalc ✔");

// === 7. Tenant isolation. ===
assert.equal(engine.get(OTHER, cash.id), undefined, "no cross-tenant read");
assert.equal(engine.activeGoals(OTHER).length, 0, "no cross-tenant pursued goals");
console.log("[7] tenant isolation ✔");

console.log(
  "\nGOAL ENGINE SMOKE OK — 9 goal types analyzed (current/desired/gap, constraints, resources, opportunities), three paths (fastest/lowest-resistance/highest-ROI), full plan (weekly/daily/agents/automations/completion/risk), approve→pursue, automatic recalculation + version bump on change, auto-complete on target, full lifecycle (never stops until completed/paused/cancelled/review_required), tenant isolation.",
);

function empty() {
  return {
    desired_state: null,
    target_value: null,
    current_value: null,
    deadline: null,
    add_constraints: [],
    add_resources: [],
  };
}
