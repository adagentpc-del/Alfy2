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

// === 6. Platform Registry (MVP feature #1): 15 platforms × 24 fields, switchable, plannable. ===
assert.equal(forge.getRegistry().length, 15, "15 seed platforms");
assert.equal(forge.REGISTRY_FIELDS.length, 24, "24 registry fields");
for (const p of forge.getRegistry()) for (const f of forge.REGISTRY_FIELDS) assert.ok((p as any)[f] !== undefined && (p as any)[f] !== null, `${p.key}.${f} present`);
const mm = forge.getRegistryPlatform("move_mi");
assert.ok(forge.missingInfrastructure(mm).some((w: string) => w.includes("backup")), "missing-infra warnings work");
forge.updatePlatformField("move_mi", "email_provider", "Postal relay (planned P6)");
assert.equal(forge.getRegistryPlatform("move_mi").email_provider, "Postal relay (planned P6)", "provider switch persists");
assert.throws(() => forge.updatePlatformField("move_mi", "not_a_field", "x"), /unknown registry field/);
const plan = forge.createMigrationPlan("move_mi");
assert.ok(plan.steps.some((s: string) => s.includes("Forgejo")) && plan.steps.some((s: string) => s.includes("Divini Pay")), "plan covers repo + payments cutovers");
assert.ok(plan.preconditions.some((s: string) => s.includes("vault references")) && plan.rules.some((s: string) => s.includes("dual-run")), "preconditions + reversibility rules");
assert.ok(forge.getRegistryPlatform("move_mi").next_action.includes(plan.id), "next_action updated to the plan");
const mr = forge.migrationReadiness("move_mi");
assert.ok(mr.score > 0 && mr.score < 100, "readiness honest (replacements not live yet)");
const tasks = forge.generateMigrationTasks("move_mi");
assert.ok(tasks.length >= 5 && tasks.some((t: string) => t.includes("vault references")), "manual tasks generated");
console.log(`[6] registry: 15 platforms × 24 fields · switch persists · plan ${plan.id} (${plan.steps.length} cutovers) · readiness ${mr.score}/100 ✔`);

// === 7. Exports carry guardrails. ===
const bundle = forge.exportProjectBundle(proj.id);
assert.ok(bundle.includes("PRD") && bundle.includes("SECURITY_CHECKLIST") && bundle.length > 2000, "full bundle");
const runner = forge.exportForRunner(proj.id, "openclaw");
assert.ok(runner.guardrails.some((g: string) => g.includes("vault references")) && runner.guardrails.some((g: string) => g.includes("deploy-class")), "runner guardrails");
console.log("[7] bundle + runner exports with guardrails ✔");

// === 8. Registry doc generator: 6 docs from the 24 fields; docs_ready flips; readiness rises. ===
const before = forge.migrationReadiness("move_mi").score;
assert.ok(forge.missingInfrastructure(forge.getRegistryPlatform("move_mi")).some((w: string) => w.includes("source-of-truth")), "warning present before generation");
const rdoc = forge.generateRegistryDocs("move_mi");
assert.equal(rdoc.docs.length, 6, "6 source-of-truth docs");
assert.deepEqual(rdoc.docs.map((d: any) => d.file), ["PRD.md", "TECH_SPEC.md", "BUILD_PLAN.md", "SECURITY_CHECKLIST.md", "COST_CONTROL_PLAN.md", "CHANGELOG.md"], "the six canonical files");
assert.ok(rdoc.docs[0].content.includes("Move Mi") && rdoc.docs[0].content.includes("TO ANSWER"), "PRD from registry facts, unknowns prompted — never invented");
assert.ok(rdoc.docs[1].content.includes("Postal relay (planned P6)"), "TECH_SPEC reflects the LIVE registry (switched provider)");
assert.equal(forge.getRegistryPlatform("move_mi").docs_ready, true, "docs_ready flipped");
assert.ok(!forge.missingInfrastructure(forge.getRegistryPlatform("move_mi")).some((w: string) => w.includes("source-of-truth")), "warning cleared");
const after = forge.migrationReadiness("move_mi").score;
assert.ok(after >= before + 20, `readiness rose ${before} → ${after} (+20 for docs)`);
const md = forge.exportRegistryDocsMarkdown("move_mi");
assert.ok(md.includes("PRD.md") && md.includes("SECURITY_CHECKLIST.md") && md.length > 1500, "combined markdown bundle exports");
assert.throws(() => forge.generateRegistryDocs("nope"), /unknown platform/);
console.log(`[8] registry doc generator: 6 docs · docs_ready ✔ · readiness ${before} → ${after} · bundle exports ✔`);

console.log("\nALFY FORGE SMOKE OK — 12-question wizard → 24 honest steps, conditional artifacts, reference-only vault with gated AI exposure, deploy-class gate, 14-agent desk, 17 sections, 15-platform registry with migration-readiness scoring, task generation AND a live source-of-truth doc generator, guardrailed exports.");
