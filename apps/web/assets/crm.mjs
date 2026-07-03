/**
 * Divini CRM — the native GoHighLevel replacement, Phase 1 (docs/SOVEREIGN_PRODUCT_SUITE.md).
 *
 * Directive (2026-07-03): own the product, not the wrapper. Phase 1 is the CRM core GHL is actually
 * used for: contacts (with explicit comms consent — no consent, no outreach), pipelines with stages,
 * deals with values, activities/notes, follow-up tasks, and tags. Outreach NEVER sends from here:
 * composing creates a DRAFT parked as a send_message approval; delivery happens via the self-hosted
 * relay (Postal — Forge Phase 6) for email, and a rented carrier gateway for SMS (regulated pipe:
 * you own the software, you rent the wire — that is physics, not a SaaS dependency).
 *
 * What Phase 2 adds (spec'd, not faked here): campaign sequences, calendar booking, form capture.
 * Local-first store; syncs through the Vault/Pg custody layer like every module.
 */
import { createActionLog, createApprovalRequest } from "./services.mjs";

const memoryStore = () => { const m = new Map(); return { get: (k) => m.get(k), set: (k, v) => m.set(k, v) }; };
const localStore = (prefix = "alfy2_crm_") => ({
  get: (k) => { try { const r = globalThis.localStorage.getItem(prefix + k); return r ? JSON.parse(r) : undefined; } catch { return undefined; } },
  set: (k, v) => { try { globalThis.localStorage.setItem(prefix + k, JSON.stringify(v)); } catch { /* ignore */ } },
});
let store = typeof globalThis.localStorage !== "undefined" ? localStore() : memoryStore();
let clock = () => new Date();
let seq = 0;
const newId = (p) => `${p}-${clock().getTime().toString(36)}-${(++seq).toString(36)}`;
export function configureCrm(o = {}) { if (o.store) store = o.store; if (o.clock) clock = o.clock; }
export const crmStores = { memoryStore, localStore };
const load = (k, seed = []) => store.get(k) ?? seed;
const save = (k, v) => store.set(k, v);

// --- pipelines (per-business; stages are ordered) -------------------------------------------------
export const PIPELINE_SEED = [
  { id: "pipe-move-mi", name: "Move Mi · Bookings", business_id: "move_mi",
    stages: ["New lead", "Quoted", "Follow-up", "Booked", "Completed", "Reviewed"] },
  { id: "pipe-procure", name: "Divini Procure · Mandates", business_id: "divini_procure",
    stages: ["Prospect", "Discovery", "Proposal", "Negotiation", "Won"] },
  { id: "pipe-founderos", name: "FounderOS · Beta", business_id: "founderos",
    stages: ["Waitlist", "Invited", "Activated", "Paying"] },
];
export const getPipelines = () => load("pipelines", PIPELINE_SEED);
export function createPipeline(name, businessId, stages) {
  if (!name?.trim() || !Array.isArray(stages) || stages.length < 2) throw new Error("a pipeline needs a name and at least 2 stages");
  const p = { id: newId("pipe"), name: name.trim(), business_id: businessId ?? null, stages };
  save("pipelines", [...getPipelines(), p]);
  return p;
}

// --- contacts (consent is a first-class field — deny-by-default outreach) --------------------------
const CONTACT_SEED = [
  { id: "ct-001", name: "Henderson Family", email: "henderson@example.com", phone: "+1-702-555-0142",
    business_id: "move_mi", source: "web form", tags: ["hot", "residential"],
    consent: { email: true, sms: true, recorded_at: "2026-06-28", basis: "web form opt-in" },
    created_at: "2026-06-28T15:00:00.000Z" },
  { id: "ct-002", name: "A3 Visual (Marcus)", email: "marcus@a3visual.example", phone: "",
    business_id: "divini_procure", source: "referral", tags: ["vendor", "repeat"],
    consent: { email: true, sms: false, recorded_at: "2026-06-20", basis: "existing business relationship" },
    created_at: "2026-06-20T15:00:00.000Z" },
  { id: "ct-003", name: "Office Relocation Inquiry (Dana)", email: "dana@example.com", phone: "",
    business_id: "move_mi", source: "phone", tags: ["commercial"],
    consent: { email: false, sms: false, recorded_at: null, basis: null },
    created_at: "2026-07-01T15:00:00.000Z" },
];
export const getContacts = (filter = {}) => {
  let list = load("contacts", CONTACT_SEED);
  if (filter.business_id) list = list.filter((c) => c.business_id === filter.business_id);
  if (filter.tag) list = list.filter((c) => c.tags.includes(filter.tag));
  return list;
};
export const getContact = (id) => getContacts().find((c) => c.id === id);
export function createContact(input) {
  if (!input?.name?.trim()) throw new Error("a contact needs a name");
  const c = {
    id: newId("ct"), name: input.name.trim(), email: input.email ?? "", phone: input.phone ?? "",
    business_id: input.business_id ?? null, source: input.source ?? "manual", tags: input.tags ?? [],
    consent: input.consent ?? { email: false, sms: false, recorded_at: null, basis: null },
    created_at: clock().toISOString(),
  };
  save("contacts", [...load("contacts", CONTACT_SEED), c]);
  createActionLog({ agent_id: "chief-revenue", action: `CRM: contact "${c.name}" added (${c.source})`, status: "succeeded", business_id: c.business_id });
  return c;
}
export function recordConsent(contactId, channel, granted, basis) {
  if (!["email", "sms"].includes(channel)) throw new Error("channel must be email or sms");
  if (granted && !basis?.trim()) throw new Error("consent needs a recorded basis (how it was given)");
  const list = load("contacts", CONTACT_SEED);
  const i = list.findIndex((c) => c.id === contactId);
  if (i === -1) throw new Error("contact not found");
  list[i] = { ...list[i], consent: { ...list[i].consent, [channel]: granted, recorded_at: clock().toISOString().slice(0, 10), basis: granted ? basis.trim() : list[i].consent.basis } };
  save("contacts", list);
  createActionLog({ agent_id: "chief-legal", action: `CRM: ${channel} consent ${granted ? "recorded" : "revoked"} for ${list[i].name}${granted ? ` (${basis.trim()})` : ""}`, status: "succeeded", business_id: list[i].business_id });
  return list[i];
}
export function tagContact(contactId, tag) {
  const list = load("contacts", CONTACT_SEED);
  const i = list.findIndex((c) => c.id === contactId);
  if (i === -1) throw new Error("contact not found");
  if (!list[i].tags.includes(tag)) { list[i] = { ...list[i], tags: [...list[i].tags, tag] }; save("contacts", list); }
  return list[i];
}

// --- deals (a contact moving through a pipeline, with money attached) ------------------------------
const DEAL_SEED = [
  { id: "dl-001", title: "Henderson move (2BR + storage)", contact_id: "ct-001", pipeline_id: "pipe-move-mi",
    stage: "Follow-up", value_usd: 2400, expected_close: "2026-07-08", owner: "agent-move-mi",
    created_at: "2026-06-28T16:00:00.000Z", stage_history: [{ stage: "New lead", at: "2026-06-28T16:00:00.000Z" }, { stage: "Quoted", at: "2026-06-29T10:00:00.000Z" }, { stage: "Follow-up", at: "2026-07-01T09:00:00.000Z" }] },
  { id: "dl-002", title: "Dana office relocation", contact_id: "ct-003", pipeline_id: "pipe-move-mi",
    stage: "Quoted", value_usd: 5800, expected_close: "2026-07-20", owner: "agent-move-mi",
    created_at: "2026-07-01T16:00:00.000Z", stage_history: [{ stage: "New lead", at: "2026-07-01T16:00:00.000Z" }, { stage: "Quoted", at: "2026-07-02T09:00:00.000Z" }] },
];
export const getDeals = (filter = {}) => {
  let list = load("deals", DEAL_SEED);
  if (filter.pipeline_id) list = list.filter((d) => d.pipeline_id === filter.pipeline_id);
  if (filter.stage) list = list.filter((d) => d.stage === filter.stage);
  return list;
};
export function createDeal(input) {
  const required = ["title", "contact_id", "pipeline_id"];
  for (const f of required) if (!input?.[f]) throw new Error(`deal missing ${f}`);
  const pipe = getPipelines().find((p) => p.id === input.pipeline_id);
  if (!pipe) throw new Error("unknown pipeline");
  if (!getContact(input.contact_id)) throw new Error("unknown contact");
  const d = {
    id: newId("dl"), title: input.title.trim(), contact_id: input.contact_id, pipeline_id: input.pipeline_id,
    stage: input.stage ?? pipe.stages[0], value_usd: input.value_usd ?? 0,
    expected_close: input.expected_close ?? null, owner: input.owner ?? "chief-revenue",
    created_at: clock().toISOString(), stage_history: [{ stage: input.stage ?? pipe.stages[0], at: clock().toISOString() }],
  };
  save("deals", [...load("deals", DEAL_SEED), d]);
  createActionLog({ agent_id: d.owner, action: `CRM: deal "${d.title}" opened at ${d.stage} ($${d.value_usd.toLocaleString()})`, status: "succeeded", business_id: pipe.business_id });
  return d;
}
export function moveDealStage(dealId, stage) {
  const list = load("deals", DEAL_SEED);
  const i = list.findIndex((d) => d.id === dealId);
  if (i === -1) throw new Error("deal not found");
  const pipe = getPipelines().find((p) => p.id === list[i].pipeline_id);
  if (!pipe.stages.includes(stage)) throw new Error(`stage "${stage}" is not in ${pipe.name}`);
  list[i] = { ...list[i], stage, stage_history: [...list[i].stage_history, { stage, at: clock().toISOString() }] };
  save("deals", list);
  createActionLog({ agent_id: list[i].owner, action: `CRM: "${list[i].title}" → ${stage}`, status: "succeeded", business_id: pipe.business_id });
  return list[i];
}

// --- activities + follow-up tasks ------------------------------------------------------------------
export function logActivity(contactId, kind, note) {
  if (!["call", "email", "sms", "meeting", "note"].includes(kind)) throw new Error("unknown activity kind");
  if (!getContact(contactId)) throw new Error("contact not found");
  const a = { id: newId("act"), contact_id: contactId, kind, note: note?.trim() ?? "", ts: clock().toISOString() };
  save("activities", [...load("activities"), a]);
  return a;
}
export const getActivities = (contactId) => load("activities").filter((a) => !contactId || a.contact_id === contactId).sort((a, b) => b.ts.localeCompare(a.ts));

export function createFollowUp(contactId, dueIso, note) {
  if (!getContact(contactId)) throw new Error("contact not found");
  const t = { id: newId("fu"), contact_id: contactId, due: dueIso, note: note?.trim() ?? "follow up", done: false, created_at: clock().toISOString() };
  save("followups", [...load("followups"), t]);
  return t;
}
export function completeFollowUp(id) {
  const list = load("followups");
  const i = list.findIndex((t) => t.id === id);
  if (i === -1) throw new Error("follow-up not found");
  list[i] = { ...list[i], done: true, completed_at: clock().toISOString() };
  save("followups", list);
  return list[i];
}
export const getFollowUps = (openOnly = true) => load("followups").filter((t) => !openOnly || !t.done).sort((a, b) => a.due.localeCompare(b.due));

// --- outreach: DRAFTS ONLY, consent-gated, approval-gated ------------------------------------------
/**
 * Compose outreach. Refuses without recorded consent for the channel. Creates a draft and parks a
 * send_message approval — NOTHING is transmitted from this module, ever. Delivery executes later via
 * the self-hosted relay (email) or carrier gateway (sms) only against an approved draft.
 */
export function composeOutreach(contactId, channel, subject, body) {
  const c = getContact(contactId);
  if (!c) throw new Error("contact not found");
  if (!["email", "sms"].includes(channel)) throw new Error("channel must be email or sms");
  if (!c.consent[channel]) throw new Error(`no recorded ${channel} consent for ${c.name} — record consent (with basis) first`);
  if (!body?.trim()) throw new Error("empty message");
  const draft = {
    id: newId("msg"), contact_id: contactId, channel, subject: subject?.trim() ?? "", body: body.trim(),
    status: "pending_approval", created_at: clock().toISOString(),
    transport: channel === "email" ? "self-hosted relay (Postal — Forge P6; until live: manual send from the draft)" : "carrier gateway (rented wire; software is ours)",
  };
  const req = createApprovalRequest({
    action_class: "send_message",
    title: `CRM: ${channel} to ${c.name}${draft.subject ? ` — “${draft.subject}”` : ""}`,
    requested_by: "chief-revenue",
    ask: `Approve sending this ${channel} draft (${draft.body.split(/\s+/).length} words). Consent on file: ${c.consent.basis}.`,
    impact: "External message to a real contact. Reversible: no (once sent).",
    evidence: `draft ${draft.id} · consent recorded ${c.consent.recorded_at}`,
    business_id: c.business_id,
  });
  draft.approval_id = req.id;
  save("messages", [...load("messages"), draft]);
  logActivity(contactId, channel, `[draft ${draft.id}] ${draft.subject || draft.body.slice(0, 60)}`);
  return draft;
}
export const getOutreachDrafts = () => load("messages");

// --- revenue bridge: deal won → Divini Pay invoice packet ------------------------------------------
/** A won deal produces a Divini Pay payment-link packet (ACH-first) — the CRM never touches money itself. */
export function dealToPaymentPacket(dealId) {
  const d = load("deals", DEAL_SEED).find((x) => x.id === dealId);
  if (!d) throw new Error("deal not found");
  const c = getContact(d.contact_id);
  return {
    kind: "divini_pay_payment_link", deal_id: d.id, payer: c.name,
    amount_usd: d.value_usd, rail_preference: "ach_first",
    note: `From CRM deal "${d.title}" — create the link in Divini Pay (/pay); payout release stays move_money-gated.`,
  };
}

// --- rollup -----------------------------------------------------------------------------------------
export function crmSummary() {
  const deals = getDeals();
  const open = deals.filter((d) => !/won|completed|reviewed|paying/i.test(d.stage));
  return {
    contacts: getContacts().length,
    pipelines: getPipelines().length,
    open_deals: open.length,
    pipeline_value_usd: open.reduce((s, d) => s + d.value_usd, 0),
    followups_due: getFollowUps().length,
    drafts_pending: getOutreachDrafts().filter((m) => m.status === "pending_approval").length,
    consent_gaps: getContacts().filter((c) => !c.consent.email && !c.consent.sms).length,
  };
}
export function resetCrmState() {
  for (const k of ["contacts", "deals", "pipelines", "activities", "followups", "messages"]) save(k, undefined);
}
