/**
 * Runtime smoke for Divini CRM (apps/web/assets/crm.mjs) — the native GoHighLevel replacement,
 * Phase 1. Proves contacts with first-class consent, pipeline/deal flow with stage history,
 * activities + follow-ups, the consent-then-approval outreach double gate (drafts only — nothing
 * transmits), and the deal → Divini Pay bridge. Run with: `tsx scripts/crm-smoke.mts`.
 */
import assert from "node:assert/strict";
// @ts-ignore — browser-shared ES module, intentionally untyped
import * as svc from "../apps/web/assets/services.mjs";
// @ts-ignore — browser-shared ES module, intentionally untyped
import * as crm from "../apps/web/assets/crm.mjs";

const NOW = new Date("2026-07-03T12:00:00.000Z");
svc.configure({ store: svc.stores.memoryStore(), clock: () => NOW });
crm.configureCrm({ store: crm.crmStores.memoryStore(), clock: () => NOW });

// === 1. Seeds: 3 contacts, 3 pipelines, 2 deals; consent is a field, not an afterthought. ===
assert.equal(crm.getContacts().length, 3, "3 seed contacts");
assert.equal(crm.getPipelines().length, 3, "3 seed pipelines");
assert.equal(crm.getDeals().length, 2, "2 seed deals");
assert.ok(crm.getContact("ct-001").consent.email && crm.getContact("ct-001").consent.basis, "consent carries a basis");
console.log("[1] seeds: contacts + pipelines + deals, consent first-class ✔");

// === 2. Contact lifecycle: create, tag, consent with mandatory basis. ===
const ct = crm.createContact({ name: "Strata prospect (Jules)", email: "jules@example.com", business_id: "stratalogic", source: "podcast" });
crm.tagContact(ct.id, "advisory");
assert.throws(() => crm.recordConsent(ct.id, "email", true, ""), /basis/, "consent without basis refused");
crm.recordConsent(ct.id, "email", true, "replied asking for the deck");
assert.equal(crm.getContact(ct.id).consent.email, true, "consent recorded");
console.log("[2] contact lifecycle + consent basis enforcement ✔");

// === 3. Deals: open, move through REAL stages only, history accumulates. ===
const deal = crm.createDeal({ title: "Strata advisory retainer", contact_id: ct.id, pipeline_id: "pipe-procure", value_usd: 4000 });
assert.equal(deal.stage, "Prospect", "opens at the pipeline's first stage");
assert.throws(() => crm.moveDealStage(deal.id, "Booked"), /not in/, "foreign stage refused");
crm.moveDealStage(deal.id, "Discovery");
crm.moveDealStage(deal.id, "Proposal");
const moved = crm.getDeals().find((d: any) => d.id === deal.id);
assert.equal(moved.stage_history.length, 3, "stage history accumulates");
console.log("[3] deal flow with stage validation + history ✔");

// === 4. The outreach double gate: consent first, then send_message approval; DRAFTS ONLY. ===
assert.throws(() => crm.composeOutreach("ct-003", "email", "Hi", "Quote attached"), /no recorded email consent/, "no consent → no draft");
const draft = crm.composeOutreach("ct-001", "email", "Your Henderson quote", "Hi! Locking your date this week — here is the quote link.");
assert.equal(draft.status, "pending_approval", "draft parks for approval");
assert.ok(draft.approval_id, "send_message approval created");
const req = svc.getApprovalRequests("pending").find((r: any) => r.id === draft.approval_id);
assert.equal(req.action_class, "send_message", "correct action class");
assert.ok(draft.transport.includes("self-hosted relay"), "email transport is OUR relay, not a SaaS");
const sms = crm.composeOutreach("ct-001", "sms", "", "Reminder: movers arrive 8am Sat.");
assert.ok(sms.transport.includes("carrier gateway"), "sms transport honest: rented wire, our software");
console.log("[4] outreach: consent gate + send_message gate, drafts only, honest transports ✔");

// === 5. Follow-ups + activities + the Divini Pay bridge + rollup. ===
crm.logActivity("ct-001", "call", "Confirmed inventory list");
assert.equal(crm.getActivities("ct-001").length, 3, "activities accrue (incl. draft logs)");
const fu = crm.createFollowUp("ct-003", "2026-07-05T09:00:00.000Z", "Call Dana re office quote");
assert.equal(crm.getFollowUps().length, 1, "open follow-up listed");
crm.completeFollowUp(fu.id);
assert.equal(crm.getFollowUps().length, 0, "completed follow-up leaves the queue");
const packet = crm.dealToPaymentPacket("dl-001");
assert.equal(packet.kind, "divini_pay_payment_link", "won-deal bridge targets Divini Pay");
assert.equal(packet.amount_usd, 2400, "amount carried");
assert.equal(packet.rail_preference, "ach_first", "ACH-first house rule");
const sum = crm.crmSummary();
assert.ok(sum.contacts === 4 && sum.open_deals === 3 && sum.pipeline_value_usd === 12200, "rollup honest");
assert.equal(sum.drafts_pending, 2, "pending drafts counted");
console.log("[5] follow-ups, activities, Divini Pay bridge, rollup ✔");

console.log("\nDIVINI CRM SMOKE OK — native CRM core: consent-first contacts, validated pipeline flow with history, double-gated draft-only outreach over OUR transports, follow-up queue, deal→Divini-Pay bridge. The GHL subscription this replaces sends nothing we can't.");
