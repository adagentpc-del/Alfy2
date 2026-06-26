/**
 * Wave 2 (Launch & Infra + Human-in-the-loop) smoke. Verifies the build never stalls on a missing secret:
 * infra prepares with placeholders, Press Live blocks correctly, the Human Touch Queue batches the human 5%,
 * Permission Memory reuses access, and Batch Once refuses to ask twice. Run: pnpm humanloop:smoke
 */
import assert from "node:assert/strict";
import {
  InfrastructureLaunchEngine,
  PressLiveMode,
  HumanTouchQueue,
  PermissionMemory,
  BatchOnceEngine,
} from "@alfy2/core";

const T = "00000000-0000-0000-0000-0000000000bb";
let n = 0;
const idFactory = () => `00000000-0000-0000-0000-${String(++n).padStart(12, "0")}`;

// 1. Infra prepares 95% and never blocks on a missing secret; supplying the key flips it ready.
const infra = new InfrastructureLaunchEngine({ idFactory });
let plan = infra.prepare(T, { build_packet_id: idFactory(), providers: ["github", "supabase"], present_env_keys: ["GITHUB_TOKEN"] });
assert.equal(plan.never_blocks_on_secrets, true);
assert.ok(plan.prepared_pct < 1); // supabase keys missing
assert.ok(plan.blocking_items.length >= 1);
plan = infra.recordPresentKeys(T, plan.id, ["GITHUB_TOKEN", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);
assert.equal(plan.prepared_pct, 1);

// 2. Press Live: a missing secret blocks by secrets; full pass without approval is ready_to_launch, with is live.
const press = new PressLiveMode({ idFactory });
const blocked = press.run(T, {
  checks: [{ kind: "env_vars_present", passed: false, failure_kind: "secret", missing_item: "RESEND_API_KEY", where_to_get: "Resend dashboard", where_to_paste: ".env" }],
  alyssa_approved: true,
});
assert.equal(blocked.outcome, "blocked_by_secrets");
const allKinds = [
  "branch_clean", "env_vars_present", "no_secrets_committed", "migrations_ready", "rls_enabled",
  "hosting_config_ready", "email_domain_ready", "webhooks_configured", "tests_pass", "health_checks_pass",
  "rollback_exists", "audit_logging_enabled",
] as const;
const passing = allKinds.map((kind) => ({ kind, passed: true, failure_kind: "none" as const, missing_item: "", where_to_get: "", where_to_paste: "" }));
assert.equal(press.run(T, { checks: passing, alyssa_approved: false }).outcome, "ready_to_launch");
assert.equal(press.run(T, { checks: passing, alyssa_approved: true }).outcome, "live");

// 3. Human Touch Queue batches; final approval lands in ready_to_launch bucket.
const htq = new HumanTouchQueue({ idFactory });
htq.queue(T, { category: "paste_secret", title: "Add RESEND_API_KEY", risk_level: "low" });
htq.queue(T, { category: "final_launch_approval", title: "Approve Oralia launch", risk_level: "high" });
const summary = htq.summary(T);
assert.equal(summary.ready_to_launch.length, 1);
assert.ok(summary.summary.includes("pending"));

// 4. Permission Memory: reuse a remembered grant; missing → request_new.
const perm = new PermissionMemory({ idFactory });
perm.remember(T, { tool: "github", scope: "repo", risk_level: "low" });
assert.equal(perm.check(T, "github", { scope: "repo" }).decision, "reuse");
assert.equal(perm.check(T, "stripe").can_proceed, false);

// 5. Batch Once: ask once; after saving as SOP, do not ask again for same pattern+context.
const batch = new BatchOnceEngine({ idFactory });
assert.equal(batch.shouldAsk(T, "supabase_setup", "oralia"), true);
const setup = batch.detect(T, { pattern: "supabase_setup", tasks: ["create project", "set RLS"], business_context: "oralia" });
batch.verify(T, setup.id, ["supabase dashboard"]);
batch.saveAsSop(T, setup.id, "sop://supabase-setup");
assert.equal(batch.shouldAsk(T, "supabase_setup", "oralia"), false);
assert.equal(batch.shouldAsk(T, "supabase_setup", "move-mi"), true); // different context still asks

console.log("✓ human-loop smoke passed (5 engines; never stalls on secrets; never asks twice)");
