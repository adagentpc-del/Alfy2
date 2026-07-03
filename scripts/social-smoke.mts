/**
 * Runtime smoke for Divini Social (apps/web/assets/social.mjs) — the native scheduler. Proves
 * per-channel validation, the compose → publish_public approval → execute chain (manual packets
 * until platform keys exist — never a fake "posted"), queue slots + calendar projection, the studio
 * import, and the results ledger. Run with: `tsx scripts/social-smoke.mts`.
 */
import assert from "node:assert/strict";
// @ts-ignore — browser-shared ES module, intentionally untyped
import * as svc from "../apps/web/assets/services.mjs";
// @ts-ignore — browser-shared ES module, intentionally untyped
import * as social from "../apps/web/assets/social.mjs";

const NOW = new Date("2026-07-03T12:00:00.000Z");
svc.configure({ store: svc.stores.memoryStore(), clock: () => NOW });
social.configureSocial({ store: social.socialStores.memoryStore(), clock: () => NOW });

// === 1. Channels are official-API adapters; middleman = none. ===
const channels = social.getChannels();
assert.equal(channels.length, 6, "6 channel adapters");
assert.ok(channels.every((c: any) => c.api && c.key_ref.startsWith("vault:")), "every channel: official API + vault key ref");
assert.ok(channels.every((c: any) => c.transport.includes("no third-party scheduler")), "no middleman in any path");
console.log("[1] 6 official-API channel adapters, zero middlemen ✔");

// === 2. Validation catches platform rules before anything schedules. ===
const long = "x".repeat(300);
const problems = social.validateForChannels(long, ["x", "instagram"], false, false);
assert.ok(problems.some((p: string) => p.includes("X (Twitter): 300/280")), "length rule per channel");
assert.ok(problems.some((p: string) => p.includes("Instagram") && p.includes("image or video")), "media rule per channel");
assert.throws(() => social.composePost({ brand: "decoded", text: long, channels: ["x"] }), /fix before scheduling/);
console.log("[2] per-channel validation (chars + media) blocks bad posts ✔");

// === 3. Compose → approval gate → execute (manual packets until keys). ===
const post = social.composePost({
  brand: "decoded", text: "New Decoded episode: the machine that runs eleven companies. Link in bio.",
  channels: ["x", "linkedin"], scheduled_for: "2026-07-04T15:00:00.000Z",
});
assert.equal(post.status, "draft", "starts as draft");
assert.throws(() => social.publishApprovedPost(post.id), /no approved publish_public token/, "publish before approval blocked");
const submitted = social.submitPostForApproval(post.id);
assert.equal(submitted.status, "pending_approval");
const req = svc.getApprovalRequests("pending").find((r: any) => r.id === submitted.approval_id);
assert.equal(req.action_class, "publish_public", "publish_public class");
assert.ok(req.evidence.includes(post.text.slice(0, 60)), "exact copy in the approval evidence");
assert.throws(() => social.publishApprovedPost(post.id), /no approved/, "still blocked while pending");
svc.approveRequest(req.id);
const done = social.publishApprovedPost(post.id); // no keys yet
assert.equal(done.status, "ready_manual", "no keys → honest manual mode, not fake 'posted'");
assert.equal(done.publish_results.length, 2, "one packet per channel");
assert.ok(done.publish_results.every((r: any) => r.mode === "manual_packet" && r.packet.copy === post.text), "packets carry the exact approved copy");
const withKeys = social.composePost({ brand: "decoded", text: "Second post", channels: ["x"] });
social.submitPostForApproval(withKeys.id);
svc.approveRequest(social.getPosts("pending_approval")[0].approval_id);
const api = social.publishApprovedPost(withKeys.id, { keysPresent: true });
assert.equal(api.publish_results[0].mode, "api", "with keys → official API path");
assert.equal(api.publish_results[0].key_ref, "vault:social/x-api", "key stays a vault ref");
console.log("[3] compose → publish_public gate → manual packets / official API ✔");

// === 4. Queue slots + 14-day calendar projection + studio import. ===
assert.equal(social.getQueueSlots().length, 3, "3 seed queue slots");
social.addQueueSlot({ brand: "oralia", label: "Oralia · product story", channels: ["instagram"], weekday: 1, time: "12:00" });
const cal = social.getCalendar(14);
assert.equal(cal.length, 14, "14-day calendar");
assert.ok(cal.some((d: any) => d.slots.length > 0), "queue slots project onto days");
assert.ok(cal.some((d: any) => d.posts.length > 0), "scheduled post appears on its date");
const imported = social.importFromStudio({ text: "Clip: 'governance is the product' — 42s", brand: "decoded", channels: ["x"] });
assert.equal(imported.source, "media_studio", "studio import tagged");
console.log("[4] queue rhythm + calendar + Media Studio import ✔");

// === 5. Results ledger + rollup. ===
social.recordResult(post.id, "x", { impressions: 0, likes: 0 });
assert.equal(social.getResults().length, 1, "results ledger appends");
const sum = social.socialSummary();
assert.ok(sum.channels === 6 && sum.channels_live === 0 && sum.queue_slots === 4, "rollup honest (0 live until keys)");
console.log("[5] results ledger + honest rollup ✔");

console.log("\nDIVINI SOCIAL SMOKE OK — native scheduler: per-platform validation, publish_public-gated posts, manual packets until YOUR platform keys go in (official APIs only — the middleman SaaS is gone), queue slots, 14-day calendar, studio import, results ledger.");
