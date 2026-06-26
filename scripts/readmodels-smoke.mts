/**
 * Subsystem read-model engines smoke. Verifies the two generators/dashboards:
 * Supabase Architecture (FounderOS-ready table plans) and the Developer Command Center (glanceable status).
 * Run: pnpm readmodels:smoke
 */
import assert from "node:assert/strict";
import { SupabaseArchitectureEngine, DeveloperCommandCenterEngine } from "@alfy2/core";

// 1. Supabase Architecture: every generated table is tenant-scoped + audit-ready.
const arch = new SupabaseArchitectureEngine();
const plan = arch.plan({ module: "oralia", entities: ["reading", "compatibility report"] });
assert.equal(plan.founderos_multitenant_ready, true);
assert.equal(plan.tables.length, 2);
for (const t of plan.tables) {
  assert.equal(t.has_tenant_id, true);
  assert.ok(t.columns.some((c) => c.name === "tenant_id"));
  assert.ok(t.rls_rules.some((r) => r.includes("row level security")));
  assert.ok(t.migration_file.endsWith(".sql"));
}
assert.equal(plan.migration_sequence.length, 2);

// 2. Developer Command Center: counts derive from the inputs; summary is human-readable.
const dcc = new DeveloperCommandCenterEngine();
const snap = dcc.build({
  active_builds: [
    { name: "oralia-waitlist", stage: "implementation", agent: "claude-code", branch: "feature/abc", progress: 0.6, blocked: false },
    { name: "move-mi-booking", stage: "review", agent: "codex", branch: "feature/def", progress: 0.9, blocked: true },
  ],
  queued_packets: ["dating-modern-mvp"],
  open_prs: ["#12"],
  failed_tests: [],
  security_warnings: [],
  pending_migrations: ["0223_x"],
  approval_needs: ["ship move-mi-booking"],
  shipped_features: ["strata-os-tracker"],
});
assert.equal(snap.active_count, 2);
assert.equal(snap.blocked_count, 1);
assert.equal(snap.needs_approval_count, 1);
assert.ok(snap.summary.includes("2 active"));

console.log("✓ read-models smoke passed (Supabase Architecture + Developer Command Center)");
