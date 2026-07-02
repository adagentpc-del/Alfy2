/**
 * Divini Pay — privacy-first, lower-fee payment OS for the Divini ecosystem (docs/DIVINI_PAY_SPEC.md).
 *
 * LEGAL POSTURE (binding, docs/DIVINI_PAY_COMPLIANCE_CHECKLIST.md): this system is NOT designed to
 * evade lawful oversight — AML/KYC, tax reporting, sanctions screening, Nacha rules, money-transmitter
 * law, and consumer protection are design inputs. "Privacy-first" means privacy from commercial
 * exploitation: no selling transaction data, no ad targeting, data minimization — full lawful
 * auditability preserved (that is what the immutable ledger + audit trail are FOR).
 *
 * Phase 1 (Lite, this module): non-custodial — Divini Pay never holds balances; funds move directly
 * processor→payee. Phase 2 marketplace flows compute splits + hold PAYOUT APPROVAL, not funds.
 * Phase 3 wallet is DESIGNED but hard-locked until compliance review (see WALLET_DESIGN).
 *
 * Mock engine: deterministic, store-injectable, browser+node. Real rails arrive later as processor
 * adapters behind the same surface (tokenized instruments only — no PANs, no bank credentials, ever).
 * Every money movement (payout, refund, milestone release) parks in the Approval Center as
 * `move_money` — always-approve class, no auto-execute.
 */
import * as svc from "./services.mjs";

// --- store ------------------------------------------------------------------------------------------
const memoryStore = () => { const m = new Map(); return { get: (k) => m.get(k), set: (k, v) => m.set(k, v) }; };
const localStore = (prefix = "alfy2_pay_") => ({
  get: (k) => { try { const r = globalThis.localStorage.getItem(prefix + k); return r ? JSON.parse(r) : undefined; } catch { return undefined; } },
  set: (k, v) => { try { globalThis.localStorage.setItem(prefix + k, JSON.stringify(v)); } catch { /* ignore */ } },
});
let store = typeof globalThis.localStorage !== "undefined" ? localStore() : memoryStore();
let clock = () => new Date();
let seq = 0;
const newId = (p) => `${p}_${clock().getTime().toString(36)}${(++seq).toString(36)}`;
export function configure(o = {}) { if (o.store) store = o.store; if (o.clock) clock = o.clock; }
export const stores = { memoryStore, localStore };
const load = (k, seed = []) => store.get(k) ?? seed;
const save = (k, v) => store.set(k, v);
const put = (k, item, seed) => { save(k, [...load(k, seed), item]); return item; };

// --- RBAC (least privilege) + audit trail (append-only) ----------------------------------------------
export const ROLES = {
  owner: ["*"],
  finance_admin: ["link.create", "invoice.create", "party.onboard", "payout.request", "refund.request", "dispute.manage", "split.manage", "export.reconciliation", "w9.manage", "override.request"],
  ops: ["link.create", "invoice.create", "party.onboard", "w9.manage"],
  auditor: ["export.reconciliation"],
  viewer: [],
};
export function checkPermission(role, action) {
  const grants = ROLES[role];
  if (!grants) throw new Error(`unknown role: ${role}`);
  return grants.includes("*") || grants.includes(action);
}
function audit(actor_role, action, detail, flags = {}) {
  return put("audit", { id: newId("aud"), at: clock().toISOString(), actor_role, action, detail, ...flags });
}
export const getAuditTrail = () => load("audit");
const requirePerm = (role, action) => {
  if (!checkPermission(role, action)) {
    audit(role, action, "DENIED — insufficient permission", { denied: true });
    throw new Error(`role "${role}" lacks permission for ${action}`);
  }
};

// --- fee engine (transparent; the reason Divini Pay exists) -------------------------------------------
export const RAILS = {
  ach: { label: "ACH / pay-by-bank", pct: 0.008, cap_cents: 500, fixed_cents: 0, settles: "1–3 business days" },
  card: { label: "Card (processor abstraction)", pct: 0.029, cap_cents: null, fixed_cents: 30, settles: "2 business days" },
  instant: { label: "Instant payout (RTP/FedNow via bank partner)", pct: 0.01, cap_cents: null, fixed_cents: 25, settles: "seconds" },
};
export function feeFor(rail, amount_cents) {
  const r = RAILS[rail];
  if (!r) throw new Error(`unknown rail: ${rail}`);
  let fee = Math.round(amount_cents * r.pct) + r.fixed_cents;
  if (r.cap_cents != null) fee = Math.min(fee, r.cap_cents);
  return fee;
}
export function compareFees(amount_cents) {
  return Object.keys(RAILS).map((rail) => ({
    rail, label: RAILS[rail].label, settles: RAILS[rail].settles,
    fee_cents: feeFor(rail, amount_cents), net_cents: amount_cents - feeFor(rail, amount_cents),
  })).sort((a, b) => a.fee_cents - b.fee_cents);
}

// --- parties (PII lives HERE, tokenized; the ledger only ever sees party tokens) -----------------------
// KYB/KYC READINESS: fields exist; collect only what the phase needs (data minimization).
export function onboardParty(role, input) {
  requirePerm(role, "party.onboard");
  if (!input?.kind || !input?.name) throw new Error("party needs kind (vendor|buyer|partner) and name");
  if (!input.consent_payment_linking) throw new Error("consent required before any bank/payment linking (privacy rule 4)");
  const party = put("parties", {
    id: newId("pty"), token: newId("tok"), kind: input.kind, name: input.name,
    platform: input.platform ?? null, // data boundary: which Divini company this party belongs to
    email_ref: input.email ? `enc:${newId("e")}` : null, // stored encrypted server-side; mock keeps a ref only
    kyc: { status: "not_started", fields_ready: ["legal_name", "entity_type", "country", "dob_or_ein"], collected: [] },
    instruments: [], // tokenized only — never raw PANs / bank credentials
    w9: { status: input.kind === "vendor" ? "required" : "not_required", tin_on_file: false, doc_ref: null },
    risk: { score: 50, flags: [] },
    consent_payment_linking: true,
    created_at: clock().toISOString(),
  });
  audit(role, "party.onboard", `${party.kind} "${party.name}" → ${party.token} (platform: ${party.platform ?? "—"})`);
  return party;
}
export const getParties = (kind) => load("parties").filter((p) => !kind || p.kind === kind);
const partyByToken = (t) => load("parties").find((p) => p.token === t || p.id === t);

export function addTokenizedInstrument(role, partyId, input) {
  requirePerm(role, "party.onboard");
  if (!input?.rail || !input?.processor_token) throw new Error("instrument needs rail + processor_token");
  if (/\d{12,}/.test(input.processor_token)) throw new Error("raw card/account numbers are never accepted — tokenize at the processor");
  const parties = load("parties");
  const i = parties.findIndex((p) => p.id === partyId);
  if (i === -1) throw new Error("party not found");
  parties[i].instruments.push({ id: newId("ins"), rail: input.rail, processor_token: input.processor_token, added_at: clock().toISOString() });
  save("parties", parties);
  audit(role, "instrument.add", `${input.rail} instrument tokenized for ${parties[i].token}`);
  return parties[i];
}

export function recordW9(role, partyId, docRef) {
  requirePerm(role, "w9.manage");
  const parties = load("parties");
  const i = parties.findIndex((p) => p.id === partyId);
  if (i === -1) throw new Error("party not found");
  if (/\b\d{3}-?\d{2}-?\d{4}\b/.test(String(docRef))) throw new Error("never pass a TIN/SSN through this system — store the vault document reference only");
  parties[i].w9 = { status: "received", tin_on_file: true, doc_ref: docRef, received_at: clock().toISOString() };
  save("parties", parties);
  audit(role, "w9.received", `W-9 on file for ${parties[i].token} (doc ref only; 1099 threshold tracking on)`);
  return parties[i];
}

// --- ledger (append-only, double-entry, PII-free) -------------------------------------------------------
function postEntries(txn_id, entries, meta) {
  const debits = entries.filter((e) => e.dir === "debit").reduce((s, e) => s + e.amount_cents, 0);
  const credits = entries.filter((e) => e.dir === "credit").reduce((s, e) => s + e.amount_cents, 0);
  if (debits !== credits) throw new Error(`unbalanced transaction: debits ${debits} != credits ${credits}`);
  for (const e of entries) {
    if (!/^(tok_|acct:)/.test(e.account)) throw new Error("ledger accounts are party tokens or system accounts — never PII");
    put("ledger", { id: newId("led"), txn_id, at: clock().toISOString(), ...e, ...meta });
  }
  return getLedger(txn_id);
}
export const getLedger = (txn_id) => load("ledger").filter((e) => !txn_id || e.txn_id === txn_id);

// --- velocity + anomaly (security req. 11–12) ------------------------------------------------------------
const DAY_VELOCITY_LIMIT_CENTS = 2_500_000; // $25k/day/party before step-up
function velocityCheck(partyToken, amount_cents) {
  const today = clock().toISOString().slice(0, 10);
  const todayTotal = load("ledger").filter((e) => e.account === partyToken && e.at.startsWith(today)).reduce((s, e) => s + e.amount_cents, 0);
  if (todayTotal + amount_cents > DAY_VELOCITY_LIMIT_CENTS) {
    put("risk_queue", { id: newId("rsk"), at: clock().toISOString(), kind: "velocity", party: partyToken, detail: `daily volume would exceed $${DAY_VELOCITY_LIMIT_CENTS / 100}` });
    return { ok: false, reason: "velocity limit — step-up authentication + review required" };
  }
  return { ok: true };
}
export const getRiskQueue = () => load("risk_queue");

// --- payment links & invoices -----------------------------------------------------------------------------
export function createPaymentLink(role, input) {
  requirePerm(role, "link.create");
  if (!input?.amount_cents || !input?.memo || !input?.payee_party_id) throw new Error("link needs amount_cents, memo, payee_party_id");
  const payee = partyByToken(input.payee_party_id) ?? load("parties").find((p) => p.id === input.payee_party_id);
  if (!payee) throw new Error("payee party not found");
  const link = put("links", {
    id: newId("plk"), url_slug: `pay.divini/${newId("s")}`, amount_cents: input.amount_cents, memo: input.memo,
    payee_token: payee.token, platform: input.platform ?? payee.platform,
    preferred_rail: input.preferred_rail ?? "ach", fees: compareFees(input.amount_cents),
    status: "active", created_at: clock().toISOString(),
  });
  audit(role, "link.create", `${link.url_slug} · $${(link.amount_cents / 100).toFixed(2)} → ${payee.token}`);
  return link;
}
export const getPaymentLinks = () => load("links");

export function createInvoice(role, input) {
  requirePerm(role, "invoice.create");
  const required = ["amount_cents", "payer_party_id", "payee_party_id", "memo"];
  for (const f of required) if (!input?.[f]) throw new Error(`invoice missing ${f}`);
  const payer = partyByToken(input.payer_party_id), payee = partyByToken(input.payee_party_id);
  if (!payer || !payee) throw new Error("payer/payee not found");
  const inv = put("invoices", {
    id: newId("inv"), number: `DP-${String(load("invoices").length + 1).padStart(4, "0")}`,
    amount_cents: input.amount_cents, memo: input.memo, platform: input.platform ?? payee.platform,
    payer_token: payer.token, payee_token: payee.token,
    project_id: input.project_id ?? null, milestones: input.milestones ?? null,
    referral_partner_id: input.referral_partner_id ?? null,
    status: "open", rail: null, created_at: clock().toISOString(),
  });
  audit(role, "invoice.create", `${inv.number} $${(inv.amount_cents / 100).toFixed(2)} ${payer.token}→${payee.token}`);
  return inv;
}
export const getInvoices = (status) => load("invoices").filter((i) => !status || i.status === status);

// --- revenue split rules ------------------------------------------------------------------------------------
export const DEFAULT_SPLIT = { platform_fee_pct: 0.05, referral_pct_of_fee: 0.30 };
export function setSplitRule(role, platform, rule) {
  requirePerm(role, "split.manage");
  const rules = load("split_rules");
  save("split_rules", [...rules.filter((r) => r.platform !== platform), { platform, ...DEFAULT_SPLIT, ...rule, updated_at: clock().toISOString() }]);
  audit(role, "split.manage", `split rule for ${platform}: ${JSON.stringify(rule)}`);
  return load("split_rules").find((r) => r.platform === platform);
}
export const getSplitRule = (platform) => load("split_rules").find((r) => r.platform === platform) ?? { platform, ...DEFAULT_SPLIT };

export function computeSplit(invoice) {
  const rule = getSplitRule(invoice.platform);
  const rail_fee = feeFor(invoice.rail ?? "ach", invoice.amount_cents);
  const platform_fee = Math.round(invoice.amount_cents * rule.platform_fee_pct);
  const referral_commission = invoice.referral_partner_id ? Math.round(platform_fee * rule.referral_pct_of_fee) : 0;
  return { rail_fee, platform_fee, referral_commission, vendor_net: invoice.amount_cents - rail_fee - platform_fee };
}

// --- payment capture (buyer pays) ----------------------------------------------------------------------------
export function recordPayment(role, invoiceId, { rail = "ach", authorization_ref } = {}) {
  requirePerm(role, "invoice.create");
  if (!authorization_ref) throw new Error("payment authorization record required (stored by reference)");
  const invoices = load("invoices");
  const i = invoices.findIndex((x) => x.id === invoiceId);
  if (i === -1) throw new Error("invoice not found");
  if (invoices[i].status !== "open") throw new Error(`invoice is ${invoices[i].status}`);
  const inv = { ...invoices[i], rail, status: "paid", paid_at: clock().toISOString(), authorization_ref };
  invoices[i] = inv; save("invoices", invoices);
  const split = computeSplit(inv);
  const txn = newId("txn");
  postEntries(txn, [
    { account: inv.payer_token, dir: "debit", amount_cents: inv.amount_cents },
    { account: "acct:rail_fees", dir: "credit", amount_cents: split.rail_fee },
    { account: "acct:platform_revenue", dir: "credit", amount_cents: split.platform_fee - split.referral_commission },
    ...(split.referral_commission ? [{ account: "acct:referral_payable", dir: "credit", amount_cents: split.referral_commission }] : []),
    { account: "acct:vendor_payable", dir: "credit", amount_cents: split.vendor_net },
  ], { kind: "payment", invoice_id: inv.id, rail });
  // vendor payout + referral commission become PENDING payouts (approval-gated, not auto-moved)
  const mkPayout = (payee_token, amount_cents, kind) => put("payouts", {
    id: newId("po"), invoice_id: inv.id, txn_id: txn, payee_token, amount_cents, kind,
    status: inv.milestones ? "awaiting_milestones" : "pending_approval", approval_id: null, created_at: clock().toISOString(),
  });
  mkPayout(inv.payee_token, split.vendor_net, "vendor_payout");
  if (split.referral_commission) {
    const partner = partyByToken(inv.referral_partner_id);
    mkPayout(partner?.token ?? inv.referral_partner_id, split.referral_commission, "referral_commission");
  }
  audit(role, "payment.recorded", `${inv.number} paid via ${rail}; split fee=$${(split.platform_fee / 100).toFixed(2)} ref=$${(split.referral_commission / 100).toFixed(2)} vendor=$${(split.vendor_net / 100).toFixed(2)}`);
  return { invoice: inv, split, txn_id: txn };
}
export const getPayouts = (status) => load("payouts").filter((p) => !status || p.status === status);

// --- payout release (move_money — ALWAYS approval-gated) -------------------------------------------------------
export function requestPayoutRelease(role, payoutId) {
  requirePerm(role, "payout.request");
  const payouts = load("payouts");
  const i = payouts.findIndex((p) => p.id === payoutId);
  if (i === -1) throw new Error("payout not found");
  const po = payouts[i];
  if (po.status === "dispute_hold") throw new Error("payout is under dispute hold");
  if (!["pending_approval", "milestone_released"].includes(po.status)) throw new Error(`payout is ${po.status}`);
  const payee = partyByToken(po.payee_token);
  if (po.kind === "vendor_payout" && payee?.w9?.status !== "not_required" && !payee?.w9?.tin_on_file) {
    throw new Error("vendor payout blocked: W-9 not on file (Tax Reporting rule — collect before releasing)");
  }
  const v = velocityCheck(po.payee_token, po.amount_cents);
  if (!v.ok) throw new Error(v.reason);
  const req = svc.createApprovalRequest({
    action_class: "move_money",
    title: `Divini Pay: release ${po.kind.replace(/_/g, " ")} $${(po.amount_cents / 100).toFixed(2)} → ${po.payee_token}`,
    requested_by: "chief-finance",
    ask: "Approve moving real funds to the payee via the selected rail. Never auto-executed.",
    impact: "Reversible: no (funds move). Ledger + audit entries on execution.",
    evidence: `payout ${po.id} · invoice ${po.invoice_id} · txn ${po.txn_id}`,
  });
  payouts[i] = { ...po, status: "awaiting_money_movement_approval", approval_id: req.id };
  save("payouts", payouts);
  audit(role, "payout.request", `${po.id} parked for move_money approval (${req.id})`);
  return payouts[i];
}
export function executeApprovedPayout(role, payoutId) {
  requirePerm(role, "payout.request");
  const payouts = load("payouts");
  const i = payouts.findIndex((p) => p.id === payoutId);
  const po = payouts[i];
  const approval = svc.getApprovalRequests().find((r) => r.id === po?.approval_id);
  if (approval?.status !== "approved") throw new Error("move_money approval not granted");
  const txn = newId("txn");
  postEntries(txn, [
    { account: po.kind === "referral_commission" ? "acct:referral_payable" : "acct:vendor_payable", dir: "debit", amount_cents: po.amount_cents },
    { account: po.payee_token, dir: "credit", amount_cents: po.amount_cents },
  ], { kind: "payout_execution", payout_id: po.id });
  payouts[i] = { ...po, status: "paid", paid_at: clock().toISOString(), execution_txn: txn };
  save("payouts", payouts);
  audit(role, "payout.executed", `${po.id} → ${po.payee_token} $${(po.amount_cents / 100).toFixed(2)} (approval ${po.approval_id} consumed)`);
  return payouts[i];
}

// --- milestones (Phase 2) ------------------------------------------------------------------------------------
export function releaseMilestone(role, invoiceId, milestoneIndex) {
  requirePerm(role, "payout.request");
  const inv = load("invoices").find((x) => x.id === invoiceId);
  if (!inv?.milestones?.[milestoneIndex]) throw new Error("milestone not found");
  const payouts = load("payouts");
  const i = payouts.findIndex((p) => p.invoice_id === invoiceId && p.kind === "vendor_payout");
  if (i === -1) throw new Error("no vendor payout for invoice");
  const done = (inv.milestones_released ?? 0) + 1;
  const invoices = load("invoices");
  invoices[invoices.findIndex((x) => x.id === invoiceId)].milestones_released = done;
  save("invoices", invoices);
  if (done >= inv.milestones.length) {
    payouts[i] = { ...payouts[i], status: "milestone_released" };
    save("payouts", payouts);
  }
  audit(role, "milestone.release", `${inv.number} milestone ${done}/${inv.milestones.length} ("${inv.milestones[milestoneIndex]}")`);
  return { released: done, of: inv.milestones.length, payout_status: payouts[i].status };
}

// --- refunds & disputes ---------------------------------------------------------------------------------------
export function requestRefund(role, invoiceId, reason) {
  requirePerm(role, "refund.request");
  const inv = load("invoices").find((x) => x.id === invoiceId);
  if (!inv || inv.status !== "paid") throw new Error("only paid invoices can be refunded");
  const req = svc.createApprovalRequest({
    action_class: "move_money",
    title: `Divini Pay: refund ${inv.number} $${(inv.amount_cents / 100).toFixed(2)} → ${inv.payer_token}`,
    requested_by: "chief-finance",
    ask: `Approve the refund. Reason: ${reason}`,
    impact: "Reversible: no. Vendor payout is clawed back or netted per refund rules.",
    evidence: `invoice ${inv.id}`,
  });
  const refund = put("refunds", { id: newId("rf"), invoice_id: invoiceId, reason, status: "awaiting_approval", approval_id: req.id, created_at: clock().toISOString() });
  audit(role, "refund.request", `${inv.number}: ${reason}`);
  return refund;
}
export const getRefunds = () => load("refunds");

export function openDispute(role, invoiceId, claim) {
  requirePerm(role, "dispute.manage");
  const payouts = load("payouts");
  for (let i = 0; i < payouts.length; i++) {
    if (payouts[i].invoice_id === invoiceId && !["paid"].includes(payouts[i].status)) {
      payouts[i] = { ...payouts[i], status: "dispute_hold", prior_status: payouts[i].status };
    }
  }
  save("payouts", payouts);
  const d = put("disputes", { id: newId("dsp"), invoice_id: invoiceId, claim, status: "open", timeline: [{ at: clock().toISOString(), event: "opened", detail: claim }], created_at: clock().toISOString() });
  audit(role, "dispute.open", `invoice ${invoiceId}: ${claim} — related payouts on dispute_hold`);
  return d;
}
export function resolveDispute(role, disputeId, resolution) {
  requirePerm(role, "dispute.manage");
  const disputes = load("disputes");
  const i = disputes.findIndex((d) => d.id === disputeId);
  if (i === -1) throw new Error("dispute not found");
  disputes[i] = { ...disputes[i], status: "resolved", resolution, timeline: [...disputes[i].timeline, { at: clock().toISOString(), event: "resolved", detail: resolution }] };
  save("disputes", disputes);
  const payouts = load("payouts");
  for (let j = 0; j < payouts.length; j++) {
    if (payouts[j].invoice_id === disputes[i].invoice_id && payouts[j].status === "dispute_hold") {
      payouts[j] = { ...payouts[j], status: payouts[j].prior_status ?? "pending_approval" };
    }
  }
  save("payouts", payouts);
  audit(role, "dispute.resolve", `${disputeId}: ${resolution}`);
  return disputes[i];
}
export const getDisputes = () => load("disputes");

// --- admin override (Phase 2 req. 12: allowed, but never silent) ------------------------------------------------
export function adminOverride(role, target, action, reason) {
  if (role !== "owner") { audit(role, "override.DENIED", `${action} on ${target}`, { denied: true }); throw new Error("admin override is owner-only"); }
  if (!reason || reason.length < 10) throw new Error("override requires a substantive reason (goes to the immutable audit trail)");
  return audit(role, "admin.override", `${action} on ${target} — REASON: ${reason}`, { override: true });
}

// --- reconciliation export ---------------------------------------------------------------------------------------
export function exportReconciliation(role) {
  requirePerm(role, "export.reconciliation");
  const rows = getLedger().map((e) => [e.at, e.txn_id, e.kind ?? "", e.account, e.dir, (e.amount_cents / 100).toFixed(2)].join(","));
  audit(role, "export.reconciliation", `${rows.length} ledger rows exported`);
  return ["at,txn_id,kind,account,dir,amount_usd", ...rows].join("\n");
}

// --- privacy dashboard (the promise, measurable) -------------------------------------------------------------------
export function getPrivacyDashboard() {
  const ledger = getLedger();
  return {
    commitments: [
      { rule: "No selling transaction data", status: "enforced — no data-out integrations exist" },
      { rule: "No ad targeting from financial data", status: "enforced — no ad systems connected" },
      { rule: "Consent before bank/payment linking", status: "enforced in onboardParty()" },
      { rule: "Data minimization", status: `parties carry ${4} KYC readiness fields; collected only when phase requires` },
      { rule: "PII separated from transactions", status: ledger.every((e) => /^(tok_|acct:)/.test(e.account)) ? "verified — ledger is token-only" : "VIOLATION" },
      { rule: "Retention schedule", status: "spec'd (docs/DIVINI_PAY_COMPLIANCE_CHECKLIST.md §Retention)" },
      { rule: "Export/delete requests", status: "workflow spec'd; honored where legally allowed (ledger/audit retained per law)" },
      { rule: "Staff access restrictions", status: "RBAC live — least privilege, denials audited" },
      { rule: "Vendor data segregation / platform boundaries", status: "every party + invoice carries its platform boundary" },
    ],
    lawful_oversight: "AML/KYC/tax/sanctions/Nacha obligations are design inputs — privacy here means privacy from commercial exploitation, never from lawful compliance.",
  };
}

// --- Phase 3: wallet — DESIGNED, HARD-LOCKED --------------------------------------------------------------------
export const WALLET_DESIGN = {
  activated: false,
  activation_requires: [
    "compliance review sign-off (Chief Compliance Officer + BSA/AML Officer)",
    "sponsor bank partnership executed",
    "state money-transmitter licensing map cleared (or bank-agency model confirmed)",
    "KYC/KYB gating live", "AML monitoring + suspicious-transaction queue live", "sanctions screening hooks live",
  ],
  planned_features: ["buyer wallet", "vendor wallet", "internal credits", "rewards", "referral balances", "instant withdrawal (RTP/FedNow via bank partner)", "ACH withdrawal"],
  licensing_tracker: { states_cleared: 0, states_total: 51, model_decision: "pending: MTL portfolio vs sponsor-bank agency" },
};
export function walletOperation() {
  throw new Error("Divini Wallet is not activated: stored-value functionality is locked until compliance review is complete (WALLET_DESIGN.activation_requires)");
}

// --- the payments desk (12 agents, full dossiers) -------------------------------------------------------------------
const desk = (a) => ({ layer: "payments_desk", reports_to: "chief-finance", reporting_cadence: "weekly", ...a });
export const PAY_AGENTS = [
  desk({ id: "pay-fintech-architect", title: "Chief Fintech Architect", mission: "Own Divini Pay's architecture: non-custodial first, tokenized always, rails abstracted behind one surface.", responsibilities: ["processor/acquirer abstraction", "ledger + API design", "phase gating (Lite → marketplace → wallet)"], inputs: ["volume forecasts", "rail pricing", "compliance constraints"], outputs: ["architecture decisions", "adapter specs", "phase readiness memos"], decision_rules: ["non-custodial until wallet compliance clears", "no raw PANs/credentials ever", "cheapest compliant rail wins"], escalation_triggers: ["any design that would hold funds", "processor lock-in risk"], compliance_warnings: ["custody triggers money-transmitter analysis — CCO sign-off required"], kpis: [{ name: "Effective blended fee", target: "<1.4%", current: "2.6% (Stripe baseline)", trend: "down" }] }),
  desk({ id: "pay-cco", title: "Chief Compliance Officer", mission: "Make 'privacy-first' and 'fully lawful' the same system: every feature ships with its obligations mapped.", responsibilities: ["compliance checklist ownership", "KYC/KYB program design", "regulator/partner-bank readiness"], inputs: ["feature specs", "rule changes (Nacha/CFPB/FinCEN)"], outputs: ["go/no-go per phase", "obligation maps", "policy docs"], decision_rules: ["no feature ships without its checklist row", "when law and growth conflict, law wins"], escalation_triggers: ["anything resembling stored value", "cross-border flows"], compliance_warnings: ["this desk exists to PASS oversight, never to route around it"], kpis: [{ name: "Checklist coverage", target: "100%", current: "100% (Phase 1 spec)", trend: "flat" }] }),
  desk({ id: "pay-bsa-aml", title: "BSA/AML Officer", mission: "Detect and report what must be reported; keep the suspicious-activity queue honest and fast.", responsibilities: ["AML monitoring design", "SAR/CTR readiness", "suspicious-transaction queue triage"], inputs: ["ledger + risk queue", "typology updates"], outputs: ["monitoring rules", "case files", "training"], decision_rules: ["velocity/anomaly flags triage within 24h", "never tip off subjects"], escalation_triggers: ["structuring patterns", "sanctions ambiguity"], compliance_warnings: ["BSA obligations attach via partners even pre-wallet — act as if covered"], kpis: [{ name: "Flag triage time", target: "<24h", current: "n/a (pre-launch)", trend: "flat" }] }),
  desk({ id: "pay-rails", title: "Payments Rail Strategist", mission: "Route every dollar down the cheapest compliant rail: ACH-first, card as backup, instant when worth it.", responsibilities: ["rail pricing model", "processor negotiations", "fee calculator truth"], inputs: ["rail costs", "settlement SLAs", "decline data"], outputs: ["routing rules", "fee tables", "savings reports"], decision_rules: ["ACH default for invoices >$200", "instant only when payee opts into the premium"], escalation_triggers: ["rail outage", "pricing change >10bps"], compliance_warnings: ["Nacha rules govern ACH — debit authorizations retained per rule"], kpis: [{ name: "Savings vs Stripe baseline", target: ">50%", current: "modeled 62% on ACH", trend: "up" }] }),
  desk({ id: "pay-privacy", title: "Privacy Architect", mission: "Data minimization by default: collect the least, separate PII from money, prove it on the privacy dashboard.", responsibilities: ["PII/transaction separation", "retention schedule", "consent + export/delete workflows"], inputs: ["data maps", "feature specs"], outputs: ["privacy dashboard", "DPIAs", "boundary rules per platform"], decision_rules: ["ledger stays token-only — a PII field in a ledger row is a build-breaking defect", "no data leaves for commercial use, ever"], escalation_triggers: ["any request to join financial data with marketing"], compliance_warnings: ["privacy never overrides lawful process — subpoenas honored via counsel"], kpis: [{ name: "PII-free ledger", target: "100%", current: "100% (verified)", trend: "flat" }] }),
  desk({ id: "pay-ledger", title: "Ledger Engineer", mission: "One append-only, double-entry truth: every cent traceable, every export reconciles.", responsibilities: ["ledger integrity", "reconciliation exports", "balanced-entry enforcement"], inputs: ["processor settlement files", "payout events"], outputs: ["ledger", "recon reports", "break alerts"], decision_rules: ["unbalanced transactions are rejected, not fixed silently", "no updates — only entries"], escalation_triggers: ["any recon break >$1"], compliance_warnings: ["ledger is the audit substrate — retention per legal schedule"], kpis: [{ name: "Recon breaks", target: "0", current: "0", trend: "flat" }] }),
  desk({ id: "pay-treasury", title: "Treasury Operations Agent", mission: "Operate the money movement calendar: payout batches, settlement timing, cash visibility for CFO.", responsibilities: ["payout batch prep", "settlement tracking", "float/timing reports"], inputs: ["approved payouts", "settlement SLAs"], outputs: ["batch files (post-approval)", "timing dashboards"], decision_rules: ["nothing moves without a consumed move_money token", "batch ACH to minimize per-item cost"], escalation_triggers: ["settlement delay >1 day", "any payout without approval linkage"], compliance_warnings: ["treasury executes decisions; it never makes them"], kpis: [{ name: "On-time payouts", target: "100%", current: "n/a", trend: "flat" }] }),
  desk({ id: "pay-fraud", title: "Fraud/Risk Agent", mission: "Score vendors, watch velocity, catch the weird transaction before it settles.", responsibilities: ["vendor risk scoring", "velocity limits", "anomaly rules", "step-up triggers"], inputs: ["ledger patterns", "party profiles", "dispute history"], outputs: ["risk scores", "risk queue", "limit adjustments"], decision_rules: [">3x historical average → queue", "new vendor payouts held first 30 days unless overridden with audit"], escalation_triggers: ["confirmed fraud", "risk queue >10 items"], compliance_warnings: ["adverse actions need consistent, documented criteria"], kpis: [{ name: "Fraud loss rate", target: "<5bps", current: "0", trend: "flat" }] }),
  desk({ id: "pay-disputes", title: "Disputes Agent", mission: "Every dispute gets a hold, a timeline, and a fair fast resolution — no payout races a claim.", responsibilities: ["dispute intake + holds", "evidence assembly", "resolution execution"], inputs: ["claims", "contracts/milestones", "ledger"], outputs: ["dispute files", "resolutions", "refund requests"], decision_rules: ["hold first, investigate second", "milestone evidence beats assertions"], escalation_triggers: ["dispute >$5k", "pattern from one party"], compliance_warnings: ["card disputes follow network rules; consumer-protection clocks are real"], kpis: [{ name: "Median resolution", target: "<7 days", current: "n/a", trend: "flat" }] }),
  desk({ id: "pay-bank", title: "Partner Bank Agent", mission: "Land and keep the sponsor-bank relationship that unlocks RTP/FedNow and (later) wallet custody.", responsibilities: ["bank due-diligence package", "RTP/FedNow readiness", "oversight reporting to partner"], inputs: ["compliance posture", "volume forecasts"], outputs: ["partner packets", "integration readiness checklists"], decision_rules: ["over-disclose to the partner — surprises kill bank relationships"], escalation_triggers: ["partner audit findings", "program change requests"], compliance_warnings: ["the bank's rules become our rules — contractual compliance is compliance"], kpis: [{ name: "Partner readiness score", target: "bank-ready", current: "packet in draft", trend: "up" }] }),
  desk({ id: "pay-splits", title: "Revenue Split Agent", mission: "Compute every split — platform fee, referral commission, vendor net — exactly, transparently, per platform rule.", responsibilities: ["split rules per platform", "commission statements", "split accuracy audits"], inputs: ["split rules", "invoices", "referral registry"], outputs: ["split calculations", "partner statements"], decision_rules: ["splits computed at payment time from the rule on file — never retroactively without override+audit"], escalation_triggers: ["split disagreement with a partner"], compliance_warnings: ["referral comp in regulated verticals may need disclosure review"], kpis: [{ name: "Split accuracy", target: "100%", current: "100% (smoke-verified)", trend: "flat" }] }),
  desk({ id: "pay-tax", title: "Tax Reporting Agent", mission: "W-9s in before payouts out; 1099 thresholds tracked; filings ready without a January panic.", responsibilities: ["W-9 workflow", "1099-NEC/K threshold tracking", "filing prep packets"], inputs: ["party tax status", "payout ledger"], outputs: ["missing-W-9 blocklist", "1099 prep files"], decision_rules: ["no vendor payout release without W-9 on file", "TINs live in the vault, never this system"], escalation_triggers: ["backup-withholding conditions"], compliance_warnings: ["prep + analysis only — filings reviewed by a professional (house rule)"], kpis: [{ name: "W-9 coverage before payout", target: "100%", current: "100% (enforced)", trend: "flat" }] }),
];
export const getPayAgents = () => PAY_AGENTS;

export function resetPayState() {
  for (const k of ["audit", "parties", "links", "invoices", "ledger", "payouts", "refunds", "disputes", "split_rules", "risk_queue"]) store.set(k, undefined);
}
