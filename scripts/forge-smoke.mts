/**
 * Runtime smoke for Alfy Forge / Divini Sovereign Cloud (apps/web/assets/forge.mjs). Proves: the
 * 12-question wizard runs the 24-step pipeline with honest statuses (done / packet_ready / skipped /
 * awaiting_approval), answers condition the artifacts (no-db run skips schema), Drizzle schema + env
 * template generate correctly, the secrets vault rejects raw material and gates AI exposure behind
 * reasoned grants, remote deploys are deploy-class gated (local-only refuses), the 14-agent desk is
 * seated, the platform registry scores migration readiness with real blockers, and exports carry
 * guardrails. Run: `tsx scripts/forge-smoke.mts`.
 */
import assert from "node:assert/strict";
// @ts-ignore — browser-shared ES modules, intentionally untyped
import * as svc from "../apps/web/assets/services.mjs";
// @ts-ignore
import * as forge from "../apps/web/assets/forge.mjs";

const NOW = new Date("2026-07-02T12:00:00.000Z");
svc.configure({ store: svc.stores.memoryStore(), clock: () => NOW });
forge.configure({ store: forge.stores.memoryStore(), clock: () => NOW });

// === 1. Full wizard → 24 steps, honest statuses. ===
const answers = {
  name: "Donor Portal", type: "donor management portal", surface: "app",
  auth: true, database: true, storage: true, email: true, payments: true, ai: false,
  environment: "staging", domain: "donors.blackflag.org", privacy_level: "sensitive",
};
const proj = forge.createPlatform(answers);
assert.equal(proj.steps.length, 24, "24 pipeline steps");
const by = (k: string) => proj.steps.find((s: any) => s.key === k);
assert.equal(by("prd").status, "done");
assert.equal(by("private_repo").status, "packet_ready", "repo is a packet (Forgejo is Phase 2 — never faked live)");
assert.equal(by("deploy_preview").status, "awaiting_approval", "remote deploy waits on the gate");
assert.ok(by("drizzle_schema").content.includes("pgTable") && by("drizzle_schema").content.includes("passkey_credential_ref"), "Drizzle schema with WebAuthn user table");
assert.ok(by("drizzle_schema").content.includes("Divini Pay"), "payments → integrate Divini Pay, no local payment tables");
assert.ok(by("env_template").content.includes("vault:forge/donor-portal"), "env template uses vault references");
console.log("[1] wizard → 24 steps: artifacts done, infra as packets, deploy gated ✔");

// === 2. Answers condition the pipeline. ===
const lite = forge.createPlatform({ name: "Landing Page", type: "brochure site", surface: "public_website", auth: false, database: false, storage: false, email: false, payments: false, ai: false, environment: "local_only", domain: "promo.divinigroup.com", privacy_level: "standard" });
assert.equal(lite.steps.find((s: any) => s.key === "drizzle_schema").status, "skipped", "no db → schema skipped");
assert.equal(lite.steps.find((s: any) => s.key === "deploy_preview").status, "skipped", "local-only → no remote deploy");
assert.throws(() => forge.submitDeployForApproval(lite.id), /local-only/, "cannot submit a local-only deploy");
assert.throws(() => forge.createPlatform({ name: "Incomplete" }), /wizard answer missing/, "all 12 answers required");
console.log("[2] conditional pipeline (skips honest) + 12-answer validation ✔");

// === 3. Secrets vault: references only, audited, AI exposure gated. ===
assert.throws(() => forge.storeSecretRef(proj.id, "API_KEY", "sk-live-abc123realsecret"), /references only/, "raw secret material rejected");
assert.ok(forge.getVaultAudit().some((a: any) => a.action === "REJECTED"), "rejection audited");
const sec = forge.getSecrets(proj.id)[0];
assert.equal(sec.ai_exposure, false, "agents see nothing by default");
assert.throws(() => forge.grantSecretToAgent(sec.id, "forge-runner", "because"), /substantive reason/);
forge.grantSecretToAgent(sec.id, "forge-runner", "Runner needs DB access for the staging migration task, revoke after");
assert.ok(forge.getVaultAudit().some((a: any) => a.action === "GRANTED"), "grant audited");
console.log("[3] vault: raw secrets rejected, AI exposure off by default, reasoned grants audited ✔");

// === 4. Deploy gate: submit → approve → status. ===
forge.submitDeployForApproval(proj.id);
const p2 = forge.getProjectById(proj.id);
assert.equal(forge.deployStatus(p2), "pending");
const pending = svc.getApprovalRequests("pending");
const dep = pending.find((r: any) => r.action_class === "deploy" && r.title.includes("Donor Portal"));
assert.ok(dep, "deploy approval in the center");
svc.approveRequest(dep.id);
assert.equal(forge.deployStatus(forge.getProjectById(proj.id)), "approved");
console.log("[4] deploy-class gate: submitted → approved via the Approval Center ✔");

// === 5. Desk (14 agents, 8 fields), sections (17), stack phases honest. ===
assert.equal(forge.getForgeAgents().length, 14);
const FIELDS = ["mission", "responsibilities", "inputs", "outputs", "decision_rules", "escalation_triggers", "security_warnings", "kpis"];
for (const a of forge.getForgeAgents()) for (const f of FIELDS) assert.ok((a as any)[f]?.length, `${a.id} has ${f}`);
assert.equal(forge.getForgeAgents().filter((a: any) => a.reports_to === "forge-architect").length, 13, "13 report to the Chief Infrastructure Architect");
assert.equal(forge.SECTIONS.length, 17, "17 dashboard sections");
assert.ok(forge.SECTIONS.filter((s: any) => s.live).length >= 6 && forge.SECTIONS.some((s: any) => !s.live && s.note), "live vs staged labeled honestly");
console.log("[5] 14-agent desk (8 fields each) · 17 sections with honest phase labels ✔");

// === 6. Platform registry + migration readiness with real blockers. ===
assert.equal(forge.EXISTING_PLATFORMS.length, 12, "12 existing platforms registered");
const mr = forge.migrationReadiness("move_mi");
assert.ok(mr.score > 0 && mr.score < 100, "score is honest (Phase 1: replacements not live yet)");
assert.ok(mr.blocked_on.some((b: string) => b.includes("Forgejo")), "blockers name the sovereign replacement + phase");
const tasks = forge.generateMigrationTasks("move_mi");
assert.ok(tasks.length >= 6 && tasks.some((t: string) => t.includes("vault references")), "manual tasks generated");
console.log(`[6] registry: 12 platforms · Move Mi readiness ${mr.score}/100, blocked on ${mr.blocked_on.length} deps · ${tasks.length} tasks ✔`);

// === 7. Exports carry guardrails. ===
const bundle = forge.exportProjectBundle(proj.id);
assert.ok(bundle.includes("PRD") && bundle.includes("SECURITY_CHECKLIST") && bundle.length > 2000, "full bundle");
const runner = forge.exportForRunner(proj.id, "openclaw");
assert.ok(runner.guardrails.some((g: string) => g.includes("vault references")) && runner.guardrails.some((g: string) => g.includes("deploy-class")), "runner guardrails");
console.log("[7] bundle + runner exports with guardrails ✔");

console.log("\nALFY FORGE SMOKE OK — 12-question wizard → 24 honest steps, conditional artifacts, reference-only vault with gated AI exposure, deploy-class gate, 14-agent desk, 17 sections, 12-platform registry with migration-readiness scoring and task generation, guardrailed exports.");
