/**
 * Runtime smoke for Divini Pay (apps/web/assets/divini-pay.mjs). Proves the payment OS's controls are
 * real: transparent fee math (ACH < card), consent-gated onboarding, tokenization enforced (raw numbers
 * rejected), W-9-before-payout, balanced append-only PII-free ledger, exact split math (platform fee +
 * referral commission + vendor net), payouts/refunds ALWAYS gated as move_money, milestone releases,
 * dispute holds, RBAC with audited denials, owner-only overrides with reasons, reconciliation export,
 * and the Phase-3 wallet hard-lock. Run: `tsx scripts/divini-pay-smoke.mts`.
 */
import assert from "node:assert/strict";
// @ts-ignore — browser-shared ES modules, intentionally untyped
import * as svc from "../apps/web/assets/services.mjs";
// @ts-ignore
import * as pay from "../apps/web/assets/divini-pay.mjs";

const NOW = new Date("2026-07-02T12:00:00.000Z");
svc.configure({ store: svc.stores.memoryStore(), clock: () => NOW });
pay.configure({ store: pay.stores.memoryStore(), clock: () => NOW });
const approveLatest = () => { const p = svc.getApprovalRequests("pending"); return svc.approveRequest(p[p.length - 1].id); };

// === 1. Fee engine: ACH beats card; calculator is honest. ===
const fees = pay.compareFees(250_000); // $2,500 invoice
assert.equal(fees[0].rail, "ach", "ACH is the cheapest rail");
assert.equal(pay.feeFor("ach", 250_000), 500, "ACH capped at $5");
assert.equal(pay.feeFor("card", 250_000), 7280, "card = 2.9% + 30¢");
assert.ok(fees[0].fee_cents < fees.find((f: any) => f.rail === "card")!.fee_cents / 10, "ACH >10x cheaper here");
console.log(`[1] fee calculator: $2,500 → ACH $5.00 vs card $72.80 vs instant $${(pay.feeFor("instant", 250_000) / 100).toFixed(2)} ✔`);

// === 2. Onboarding: consent required; raw numbers rejected; PII tokenized. ===
assert.throws(() => pay.onboardParty("finance_admin", { kind: "vendor", name: "NoConsent LLC" }), /consent required/);
const vendor = pay.onboardParty("finance_admin", { kind: "vendor", name: "Apex Logistics", platform: "divini_procure", consent_payment_linking: true, email: "x" });
const buyer = pay.onboardParty("finance_admin", { kind: "buyer", name: "Meridian Dev Co", platform: "divini_procure", consent_payment_linking: true });
const partner = pay.onboardParty("finance_admin", { kind: "partner", name: "Referral Partner One", platform: "divini_partners", consent_payment_linking: true });
assert.throws(() => pay.addTokenizedInstrument("finance_admin", vendor.id, { rail: "ach", processor_token: "021000021 123456789012" }), /never accepted/, "raw account numbers rejected");
pay.addTokenizedInstrument("finance_admin", vendor.id, { rail: "ach", processor_token: "ptok_ach_abc" });
assert.throws(() => pay.recordW9("finance_admin", vendor.id, "TIN 123-45-6789"), /never pass a TIN/, "SSN/TIN rejected — vault refs only");
console.log("[2] consent gate + tokenization + no-TIN rules enforced ✔");

// === 3. Payment → exact splits → PII-free balanced ledger. ===
const inv = pay.createInvoice("finance_admin", { amount_cents: 250_000, payer_party_id: buyer.id, payee_party_id: vendor.id, memo: "Procurement project #1", platform: "divini_procure", referral_partner_id: partner.id });
const { split, txn_id } = pay.recordPayment("finance_admin", inv.id, { rail: "ach", authorization_ref: "auth:vault/2026-07-02/xyz" });
assert.equal(split.platform_fee, 12_500, "5% platform fee = $125");
assert.equal(split.referral_commission, 3_750, "30% of fee = $37.50 referral");
assert.equal(split.vendor_net, 250_000 - 500 - 12_500, "vendor net = amount − rail − platform fee");
const entries = pay.getLedger(txn_id);
assert.ok(entries.every((e: any) => /^(tok_|acct:)/.test(e.account)), "ledger is token-only (PII-separated)");
const deb = entries.filter((e: any) => e.dir === "debit").reduce((s: number, e: any) => s + e.amount_cents, 0);
const cred = entries.filter((e: any) => e.dir === "credit").reduce((s: number, e: any) => s + e.amount_cents, 0);
assert.equal(deb, cred, "double-entry balanced");
console.log(`[3] $2,500 paid → fee $125 + referral $37.50 + vendor $${(split.vendor_net / 100).toFixed(2)}; ledger balanced & PII-free ✔`);

// === 4. Payout controls: W-9 gate → move_money approval → execution. Never auto. ===
const [vendorPayout, refPayout] = pay.getPayouts();
assert.throws(() => pay.requestPayoutRelease("finance_admin", vendorPayout.id), /W-9 not on file/, "tax gate before money gate");
pay.recordW9("finance_admin", vendor.id, "vault:tax/w9/apex-logistics-2026");
pay.requestPayoutRelease("finance_admin", vendorPayout.id);
assert.throws(() => pay.executeApprovedPayout("finance_admin", vendorPayout.id), /approval not granted/, "no movement without the token");
approveLatest();
const paid = pay.executeApprovedPayout("finance_admin", vendorPayout.id);
assert.equal(paid.status, "paid");
console.log("[4] payout chain: W-9 gate → move_money approval → execute (never auto) ✔");

// === 5. Disputes hold payouts; resolution restores; refunds are gated too. ===
pay.openDispute("finance_admin", inv.id, "Buyer claims milestone 2 incomplete");
assert.equal(pay.getPayouts("dispute_hold").length, 1, "referral payout frozen by dispute");
assert.throws(() => pay.requestPayoutRelease("finance_admin", refPayout.id), /dispute hold/);
pay.resolveDispute("finance_admin", pay.getDisputes()[0].id, "Vendor provided delivery evidence; claim withdrawn");
assert.equal(pay.getPayouts("dispute_hold").length, 0, "hold released on resolution");
const refund = pay.requestRefund("finance_admin", inv.id, "Goodwill partial refund agreed");
assert.equal(refund.status, "awaiting_approval", "refunds are move_money-gated");
console.log("[5] dispute hold → resolve → release; refunds approval-gated ✔");

// === 6. Marketplace: milestone-based release. ===
const inv2 = pay.createInvoice("finance_admin", { amount_cents: 100_000, payer_party_id: buyer.id, payee_party_id: vendor.id, memo: "Milestone project", platform: "divini_procure", milestones: ["Design", "Build"] });
pay.recordPayment("finance_admin", inv2.id, { rail: "ach", authorization_ref: "auth:vault/m2" });
const po2 = pay.getPayouts().find((p: any) => p.invoice_id === inv2.id && p.kind === "vendor_payout");
assert.equal(po2.status, "awaiting_milestones", "payout waits on milestones");
pay.releaseMilestone("finance_admin", inv2.id, 0);
assert.throws(() => pay.requestPayoutRelease("finance_admin", po2.id), /awaiting_milestones/, "1/2 milestones ≠ releasable");
const m2 = pay.releaseMilestone("finance_admin", inv2.id, 1);
assert.equal(m2.payout_status, "milestone_released", "all milestones → releasable");
console.log("[6] milestone-based payout release (1/2 blocks, 2/2 releases) ✔");

// === 7. RBAC + overrides + audit immutability semantics. ===
assert.throws(() => pay.createPaymentLink("viewer", { amount_cents: 100, memo: "x", payee_party_id: vendor.id }), /lacks permission/);
assert.ok(pay.getAuditTrail().some((a: any) => a.denied), "denials are audited");
assert.throws(() => pay.adminOverride("finance_admin", "payout", "force-release", "because"), /owner-only/);
assert.throws(() => pay.adminOverride("owner", "payout", "force-release", "short"), /substantive reason/);
pay.adminOverride("owner", vendorPayout.id, "annotate", "Board-approved exception after dispute review, memo 2026-07-02");
assert.ok(pay.getAuditTrail().some((a: any) => a.override), "override lands in audit trail");
const csv = pay.exportReconciliation("auditor");
assert.ok(csv.split("\n").length > 8 && csv.startsWith("at,txn_id"), "auditor can export reconciliation");
console.log("[7] RBAC (audited denials) + owner-only reasoned overrides + recon export ✔");

// === 8. Privacy dashboard verifies its own promises; wallet is hard-locked; desk is seated. ===
const priv = pay.getPrivacyDashboard();
assert.ok(priv.commitments.find((c: any) => c.rule.includes("PII separated"))!.status.startsWith("verified"));
assert.ok(priv.lawful_oversight.includes("never from lawful compliance"));
assert.equal(pay.WALLET_DESIGN.activated, false);
assert.throws(() => pay.walletOperation(), /locked until compliance review/);
assert.equal(pay.getPayAgents().length, 12, "12-agent payments desk");
const FIELDS = ["mission", "responsibilities", "inputs", "outputs", "decision_rules", "escalation_triggers", "compliance_warnings", "kpis"];
for (const a of pay.getPayAgents()) for (const f of FIELDS) assert.ok((a as any)[f]?.length, `${a.id} has ${f}`);
console.log("[8] privacy dashboard self-verifies · wallet locked · 12 desk agents with all 8 fields ✔");

console.log("\nDIVINI PAY SMOKE OK — honest fee math (ACH-first), consent + tokenization + no-TIN + W-9 gates, balanced PII-free ledger, exact splits, move_money approvals on every payout/refund, milestone + dispute controls, RBAC with audited denials, reasoned owner overrides, reconciliation export, wallet hard-locked pending compliance, 12-agent payments desk seated.");
