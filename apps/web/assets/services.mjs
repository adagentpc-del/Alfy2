/**
 * Service layer for the Enterprise Command Center. Pure ES module — runs in the browser and under
 * node (scripts/enterprise-ui-smoke.mts). All reads are synchronous over the mock dataset; all writes
 * go through an injectable store so the browser persists to localStorage while tests use memory.
 * The function surface mirrors the future API so views never change when fetch() replaces this.
 * Approval semantics follow docs/APPROVAL_CENTER_SPEC.md: pending → approved/denied, decisions logged.
 */
import {
  ACTION_LOGS,
  AGENTS,
  AGENT_AUTHORITIES,
  AGENT_KPIS,
  AGENT_ROLES,
  APPROVAL_REQUESTS,
  BRAIN_GRAPH,
  COMPANY_OPERATING_SYSTEMS,
  DEPARTMENTS,
  OPERATING_REPORTS,
  PORTFOLIO_COMPANIES,
} from "./data.mjs";

// --- store: overlay of mutable state (approvals, logs, generated reports) over the mock seed -----

const memoryStore = () => {
  const m = new Map();
  return { get: (k) => m.get(k), set: (k, v) => m.set(k, v) };
};

const localStorageStore = (prefix = "alfy2_ops_") => ({
  get: (k) => {
    try { const raw = globalThis.localStorage.getItem(prefix + k); return raw ? JSON.parse(raw) : undefined; }
    catch { return undefined; }
  },
  set: (k, v) => { try { globalThis.localStorage.setItem(prefix + k, JSON.stringify(v)); } catch { /* private mode */ } },
});

let store = typeof globalThis.localStorage !== "undefined" ? localStorageStore() : memoryStore();
let clock = () => new Date();
let seq = 0;
const newId = (p) => `${p}-${clock().getTime().toString(36)}-${(++seq).toString(36)}`;

/** Test/embedding hook: swap the store and clock (returns the previous store). */
export function configure(options = {}) {
  const prev = store;
  if (options.store) store = options.store;
  if (options.clock) clock = options.clock;
  return prev;
}
export const stores = { memoryStore, localStorageStore };

const overlay = (key, seed) => store.get(key) ?? seed;
const saveOverlay = (key, value) => store.set(key, value);

// --- reads ---------------------------------------------------------------------------------------

export function getDepartments() { return DEPARTMENTS; }
export function getAgents(filter = {}) {
  let list = AGENTS;
  if (filter.layer) list = list.filter((a) => a.layer === filter.layer);
  if (filter.department) list = list.filter((a) => a.department === filter.department);
  if (filter.status) list = list.filter((a) => a.status === filter.status);
  return list;
}
export function getAgentById(id) { return AGENTS.find((a) => a.id === id); }
export function getAgentRoles() { return AGENT_ROLES; }
export function getAgentAuthorities() { return AGENT_AUTHORITIES; }
export function getAgentKpis(agentId) {
  return agentId ? AGENT_KPIS.filter((k) => k.agent_id === agentId) : AGENT_KPIS;
}
export function getPortfolioCompanies() { return PORTFOLIO_COMPANIES; }
export function getCompanyById(id) { return PORTFOLIO_COMPANIES.find((c) => c.id === id); }
export function getCompanyOS(companyId) {
  return COMPANY_OPERATING_SYSTEMS.find((o) => o.company_id === companyId);
}
export function getBrainGraph() { return BRAIN_GRAPH; }

export function getApprovalRequests(status) {
  const list = overlay("approvals", APPROVAL_REQUESTS);
  return status ? list.filter((r) => r.status === status) : list;
}

export function getActionLogs(limit = 20) {
  const list = overlay("logs", ACTION_LOGS);
  return [...list].sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, limit);
}

export function getOperatingReports() {
  return overlay("reports", OPERATING_REPORTS);
}

// --- writes (approval center + logs) ---------------------------------------------------------------

export function createApprovalRequest(input) {
  const required = ["action_class", "title", "requested_by", "ask"];
  for (const f of required) if (!input?.[f]) throw new Error(`approval request missing ${f}`);
  const list = overlay("approvals", APPROVAL_REQUESTS);
  const req = {
    id: newId("apr"), status: "pending", business_id: null, impact: "", evidence: "",
    requested_at: clock().toISOString(), ...input,
  };
  saveOverlay("approvals", [...list, req]);
  createActionLog({ agent_id: req.requested_by, action: `Queued approval: ${req.title} (${req.id})`, status: "parked_for_approval", business_id: req.business_id });
  return req;
}

function decide(id, status, extra = {}) {
  const list = overlay("approvals", APPROVAL_REQUESTS);
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error(`approval ${id} not found`);
  if (list[idx].status !== "pending") throw new Error(`approval ${id} already ${list[idx].status}`);
  const decided = { ...list[idx], status, decided_at: clock().toISOString(), decided_by: "Alyssa", ...extra };
  const next = [...list]; next[idx] = decided;
  saveOverlay("approvals", next);
  createActionLog({
    agent_id: decided.requested_by, business_id: decided.business_id,
    action: `Approval ${status}: ${decided.title} (${decided.id})`,
    status: status === "approved" ? "succeeded" : "denied", approval_id: decided.id,
  });
  return decided;
}
export function approveRequest(id) { return decide(id, "approved"); }
export function rejectRequest(id, reason = "") { return decide(id, "denied", { denial_reason: reason }); }

export function createActionLog(input) {
  if (!input?.agent_id || !input?.action) throw new Error("action log needs agent_id and action");
  const list = overlay("logs", ACTION_LOGS);
  const entry = { id: newId("log"), ts: clock().toISOString(), status: "succeeded", business_id: null, ...input };
  saveOverlay("logs", [...list, entry]);
  return entry;
}

/** Reset all local decisions/logs back to the seed (Preview affordance). */
export function resetLocalState() {
  saveOverlay("approvals", APPROVAL_REQUESTS);
  saveOverlay("logs", ACTION_LOGS);
  saveOverlay("reports", OPERATING_REPORTS);
}

// --- live API bridge (Day-2 wiring) ----------------------------------------------------------------
// When the operator has connected (alfie_api + alfie_token in localStorage), these talk to the real
// gateway: GET /approvals, POST /approvals/:id/decide, GET /mission-control. Mock stays the fallback;
// views render preview data instantly and overlay live data when it arrives.

const liveCreds = () => {
  try {
    const api = globalThis.localStorage?.getItem("alfie_api");
    const token = globalThis.localStorage?.getItem("alfie_token");
    return api && token ? { api, token } : null;
  } catch { return null; }
};
export function liveEnabled() { return liveCreds() !== null; }

async function liveFetch(path, options = {}) {
  const creds = liveCreds();
  if (!creds) throw new Error("not connected");
  const res = await fetch(creds.api + path, {
    ...options,
    headers: { Authorization: "Bearer " + creds.token, "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  if (!res.ok) {
    let body = "";
    try { body = (await res.text()).slice(0, 180); } catch { /* opaque */ }
    throw new Error(`HTTP ${res.status} on ${path}${body ? ` — ${body}` : ""}`);
  }
  return res.json();
}

/** Live approval queue (ApprovalRequestSchema shape: summary/method/route/status/created_at…). */
export async function getLiveApprovals(status = "pending") {
  const data = await liveFetch(`/approvals?status=${encodeURIComponent(status)}`);
  return data.approvals ?? [];
}
/** Decide a live approval — this consumes the real gate. */
export async function decideLiveApproval(id, status, reason) {
  return liveFetch(`/approvals/${encodeURIComponent(id)}/decide`, {
    method: "POST",
    body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
  });
}
/** Live mission-control snapshot + alerts. */
export async function getLiveMissionControl() {
  return liveFetch("/mission-control");
}
/** Unauthenticated health probe with a generous timeout (free-tier cold starts take 30–60s). */
export async function probeLiveHealth(apiBase, timeoutMs = 75_000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(apiBase.replace(/\/+$/, "") + "/healthz", { signal: ctl.signal });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: e.name === "AbortError" ? `no response in ${timeoutMs / 1000}s` : e.message };
  } finally { clearTimeout(timer); }
}

// --- composition: weekly report + executive summary ------------------------------------------------

const isoWeek = (d) => {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};

/** Operating companies only — the holding parent is a roll-up and must not double-count. */
const operatingCompanies = () => getPortfolioCompanies().filter((c) => c.id !== "divini_group");
const sumRevMtd = () => operatingCompanies().reduce((s, c) => s + (c.revenue_mtd || 0), 0);
const sumRevTarget = () => operatingCompanies().reduce((s, c) => s + (c.revenue_target || 0), 0);

export function generateWeeklyOperatingReport() {
  const companies = getPortfolioCompanies();
  const approvals = getApprovalRequests();
  const pending = approvals.filter((r) => r.status === "pending");
  const decidedThisWeek = approvals.filter((r) => r.decided_at);
  const blocked = COMPANY_OPERATING_SYSTEMS.flatMap((o) =>
    o.blocked_workflows.map((w) => ({ company_id: o.company_id, workflow: w })));
  const revMtd = sumRevMtd();
  const revTarget = sumRevTarget();
  const attention = companies.filter((c) => c.status === "amber" || c.status === "red");
  const blockedAgents = getAgents({ status: "blocked" });

  const report = {
    id: newId("wor"), week: isoWeek(clock()), generated_at: clock().toISOString(),
    kind: "weekly_operating_report",
    headline: pending.length
      ? `${pending.length} decisions waiting on you; ${attention.map((c) => c.name).join(" & ") || "nothing"} needs attention.`
      : "Queue clear. Focus follows the fastest path to cash.",
    sections: {
      revenue: `Portfolio MTD $${revMtd.toLocaleString()} vs $${revTarget.toLocaleString()} target across ${companies.length} companies. Priority: ${companies.find((c) => c.revenue_priority.startsWith("P1"))?.name ?? "—"}.`,
      companies: companies.map((c) => `${c.name}: ${c.status.toUpperCase()} — ${c.fastest_path}`),
      approvals: `${pending.length} pending · ${decidedThisWeek.filter((r) => r.status === "approved").length} approved / ${decidedThisWeek.filter((r) => r.status === "denied").length} denied recently.`,
      blocked: blocked.map((b) => `${getCompanyById(b.company_id)?.name}: ${b.workflow}`),
      agents: `${getAgents().length} agents (${getAgents({ layer: "cabinet" }).length} cabinet, ${getAgents({ layer: "portfolio" }).length} portfolio); blocked: ${blockedAgents.map((a) => a.title).join(", ") || "none"}.`,
      next: [
        ...pending.slice(0, 3).map((r) => `Decide: ${r.title}`),
        ...blockedAgents.map((a) => a.next_action),
      ].slice(0, 5),
    },
  };
  const reports = overlay("reports", OPERATING_REPORTS);
  saveOverlay("reports", [...reports.filter((r) => r.week !== report.week || r.id.startsWith("wor-2026-w26")), report]);
  return report;
}

export function getExecutiveDashboardSummary() {
  const companies = getPortfolioCompanies();
  const pending = getApprovalRequests("pending");
  const blockedWorkflows = COMPANY_OPERATING_SYSTEMS.flatMap((o) =>
    o.blocked_workflows.map((w) => ({ company: getCompanyById(o.company_id)?.name, workflow: w })));
  const p1 = companies.find((c) => c.revenue_priority.startsWith("P1"));
  const recommendations = [
    ...getAgents({ status: "blocked" }).map((a) => ({ from: a.title, text: a.next_action, kind: "unblock" })),
    { from: "Chief Revenue Officer Agent", text: getAgentById("chief-revenue").next_action, kind: "revenue" },
    { from: "Chief Strategy Agent", text: getAgentById("chief-strategy").next_action, kind: "strategy" },
  ];
  const reports = getOperatingReports();
  return {
    revenue_mtd: sumRevMtd(),
    revenue_target: sumRevTarget(),
    revenue_priority: p1 ? `${p1.name} — ${p1.fastest_path}` : "—",
    business_status: companies.map((c) => ({ id: c.id, name: c.name, status: c.status, stage: c.stage })),
    active_campaigns: companies.flatMap((c) => c.active_campaigns.map((x) => ({ company: c.name, campaign: x }))),
    pending_approvals: pending,
    blocked_workflows: blockedWorkflows,
    agent_recommendations: recommendations,
    next_best_action: pending.length
      ? `Approve or deny "${pending[0].title}" — ${pending[0].impact.split(".")[0]}.`
      : (p1 ? p1.fastest_path : "Run the weekly operating report."),
    weekly_summary: reports[reports.length - 1] ?? null,
    agent_counts: { total: getAgents().length, cabinet: getAgents({ layer: "cabinet" }).length, portfolio: getAgents({ layer: "portfolio" }).length, blocked: getAgents({ status: "blocked" }).length },
  };
}
