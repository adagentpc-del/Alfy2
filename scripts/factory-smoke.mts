/**
 * Runtime smoke for the four creation factories (apps/web/assets/factories.mjs). Proves each factory
 * generates its full section set deterministically (company 14, software 12, gtm 13, media 17), missing
 * inputs become explicit TO-ANSWER prompts (never invented facts), editing bumps versions with history,
 * submit-for-approval lands in the Approval Center queue with the right action class, and all three
 * exports (markdown / obsidian / agent JSON) are well-formed. Run: `tsx scripts/factory-smoke.mts`.
 */
import assert from "node:assert/strict";
// @ts-ignore — browser-shared ES modules, intentionally untyped
import * as svc from "../apps/web/assets/services.mjs";
// @ts-ignore
import * as fac from "../apps/web/assets/factories.mjs";

const NOW = new Date("2026-07-02T12:00:00.000Z");
svc.configure({ store: svc.stores.memoryStore(), clock: () => NOW });
fac.configure({ store: fac.stores.memoryStore(), clock: () => NOW });

// === 1. All four factories generate their full packet shape. ===
const company = fac.generateCompanyPacket({ name: "Oralia Retail", one_liner: "Calmer mouth care in retail", industry: "consumer wellness" });
const software = fac.generateSoftwareBuildPacket({ name: "GrantTracker", purpose: "Track grant deadlines to submission", users_hint: "foundation ops", platform: "web" });
const gtm = fac.generateGTMPacket({ offer_name: "FounderOS Beta", promise: "Run your company from one command center", business_key: "founderos", channels: ["email", "social"], revenue_target: "$10k MRR" });
const media = fac.generateMediaPacket({ topic: "Why founders drown in tools", series_name: "Decoded", audience_hint: "solo founders" });
assert.equal(company.sections.length, 14, "company packet: 14 sections");
assert.equal(software.sections.length, 12, "software packet: 12 sections");
assert.equal(gtm.sections.length, 13, "gtm packet: 13 sections");
assert.equal(media.sections.length, 17, "media packet: 17 sections");
assert.equal(fac.getFactoryRequests().length, 4, "4 factory requests recorded");
assert.equal(fac.getGeneratedAssets(company.id).length, 14, "each section becomes a generated asset");
console.log("[1] four factories generate full packets (14/12/13/17 sections) + requests + assets ✔");

// === 2. Deterministic + honest: given facts appear, missing facts become TO ANSWER prompts. ===
const md = fac.exportPacketToMarkdown(gtm.id);
assert.ok(md.includes("Run your company from one command center"), "given promise used verbatim");
assert.ok(md.includes("> TO ANSWER:"), "missing facts become explicit questions");
const again = fac.generateGTMPacket({ offer_name: "FounderOS Beta", promise: "Run your company from one command center", business_key: "founderos", channels: ["email", "social"], revenue_target: "$10k MRR" });
assert.deepEqual(again.sections, gtm.sections, "same input → identical sections (deterministic)");
console.log("[2] deterministic generation; no invented facts ✔");

// === 3. Editing a section bumps the version and keeps history. ===
const v2 = fac.updatePacketSection(company.id, "mission", "Make daily oral care a moment of calm, not a chore.");
assert.equal(v2.version, 2, "edit bumps to v2");
assert.equal(fac.getPacketVersions(company.id).length, 2, "both versions kept");
assert.ok(v2.sections.find((s: any) => s.key === "mission")!.content.includes("moment of calm"), "edit applied");
console.log("[3] section edit → v2 with full version history ✔");

// === 4. Submit for approval lands in the Approval Center with the right action class. ===
const before = svc.getApprovalRequests("pending").length;
const submitted = fac.submitPacketForApproval(media.id);
assert.equal(submitted.status, "submitted");
const pending = svc.getApprovalRequests("pending");
assert.equal(pending.length, before + 1, "approval queue grew");
const apr = pending.find((r: any) => r.id === submitted.approval_id);
assert.equal(apr.action_class, "publish_public", "media go-ahead gates as publish_public");
assert.throws(() => fac.submitPacketForApproval(media.id), /already submitted/, "no double-submit");
const gtmSub = fac.submitPacketForApproval(gtm.id);
assert.equal(svc.getApprovalRequests("pending").find((r: any) => r.id === gtmSub.approval_id).action_class, "send_message", "gtm go-ahead gates as send_message");
console.log("[4] submit-for-approval → Approval Center queue with correct action classes ✔");

// === 5. Exports: markdown, obsidian (frontmatter), agent JSON (guardrails + unresolved questions). ===
const obs = fac.exportPacketToObsidian(media.id);
assert.ok(obs.startsWith("---\n") && obs.includes("type: alfy2/media-packet") && obs.includes("tags: [alfy2, factory, media]"), "obsidian frontmatter");
const agent = fac.exportPacketForAgent(software.id, "openclaw");
assert.equal(agent.target, "openclaw");
assert.ok(agent.guardrails.length >= 4 && agent.sections.length === 12, "agent packet carries guardrails + sections");
assert.ok(agent.unresolved.length > 0 && agent.unresolved[0].question.length > 5, "unresolved TO-ANSWER questions extracted");
console.log(`[5] exports OK (markdown ${md.length} chars; obsidian frontmatter; agent packet with ${agent.unresolved.length} unresolved questions) ✔`);

// === 6. Software packet carries the three runner prompt packets. ===
const keys = software.sections.map((s: any) => s.key);
for (const k of ["fable_prompt_packet", "claude_prompt_packet", "openclaw_execution_packet"]) assert.ok(keys.includes(k), `${k} present`);
const mediaKeys = media.sections.map((s: any) => s.key);
assert.ok(mediaKeys.includes("ai_avatar_job"), "media packet includes the AI avatar job placeholder");
console.log("[6] Fable/Claude/OpenClaw prompt packets + avatar job placeholder present ✔");

console.log("\nFACTORY SMOKE OK — four factories generate deterministic editable packets (14/12/13/17 sections), missing facts stay explicit questions, versions tracked, go-aheads route to the Approval Center with correct action classes, and markdown/obsidian/agent exports are well-formed.");
