/**
 * Alfy2 Enterprise Command Center — SPA shell. Vanilla ES modules, no build step (ADR-0127).
 * Routes: /command-center /agents /agents/:id /portfolio /portfolio/:id /approvals /reports/weekly /brain
 * Path routing on http(s) (Vercel rewrite → index.html); hash routing on file://.
 * All data flows through services.mjs; approve/deny mutate local preview state (docs/APPROVAL_CENTER_SPEC.md).
 */
import * as svc from "./services.mjs";
import * as fac from "./factories.mjs";
import * as studio from "./media-studio.mjs";

const outlet = document.getElementById("outlet");
const HASH_MODE = location.protocol === "file:";

// ---------- tiny html helpers ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => "$" + Number(n || 0).toLocaleString();
const dep = (id) => svc.getDepartments().find((d) => d.id === id)?.name ?? id;
const statusPill = (s) => ({ active: '<span class="pill green">active</span>', standby: '<span class="pill gray">standby</span>', blocked: '<span class="pill red">blocked</span>' }[s] ?? `<span class="pill gray">${esc(s)}</span>`);
const compDot = (s) => `<span class="dot ${esc(s)}"></span>`;
const classPill = (c) => `<span class="pill ${c === "internal_action" ? "gray" : c === "send_contract" || c === "change_pricing" ? "red" : "amber"}">${esc(c)}</span>`;
const fmtTs = (ts) => new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// ---------- router ----------
const routes = [
  { re: /^\/?$/, view: () => go("/command-center", true) },
  { re: /^\/command-center$/, view: viewCommandCenter, nav: "command-center" },
  { re: /^\/agents$/, view: viewAgents, nav: "agents" },
  { re: /^\/agents\/([\w-]+)$/, view: (m) => viewAgentDetail(m[1]), nav: "agents" },
  { re: /^\/portfolio$/, view: viewPortfolio, nav: "portfolio" },
  { re: /^\/portfolio\/([\w-]+)$/, view: (m) => viewCompanyOS(m[1]), nav: "portfolio" },
  { re: /^\/approvals$/, view: viewApprovals, nav: "approvals" },
  { re: /^\/reports\/weekly$/, view: viewWeeklyReport, nav: "reports" },
  { re: /^\/brain$/, view: viewBrain, nav: "brain" },
  { re: /^\/factory$/, view: viewFactoryHub, nav: "factory" },
  { re: /^\/factory\/(company|software|gtm|media)$/, view: (m) => viewFactoryForm(m[1]), nav: "factory" },
  { re: /^\/factory\/packets\/([\w-]+)$/, view: (m) => viewPacket(m[1]), nav: "factory" },
  { re: /^\/studio$/, view: viewStudio, nav: "studio" },
  { re: /^\/studio\/episodes\/([\w-]+)$/, view: (m) => viewEpisode(m[1]), nav: "studio" },
  { re: /^\/studio\/avatar$/, view: viewAvatarCenter, nav: "avatar" },
];

function currentPath() {
  return HASH_MODE ? (location.hash.replace(/^#/, "") || "/") : location.pathname;
}
export function go(path, replace = false) {
  if (HASH_MODE) { location.hash = path; }
  else { history[replace ? "replaceState" : "pushState"]({}, "", path); render(); }
}
window.addEventListener("popstate", render);
window.addEventListener("hashchange", render);
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-nav]");
  if (!a) return;
  e.preventDefault();
  go(a.getAttribute("data-nav"));
});

function render() {
  const path = currentPath();
  const r = routes.find((r) => r.re.test(path)) ?? routes[1];
  const m = path.match(r.re);
  document.querySelectorAll(".navitem[data-navkey]").forEach((b) =>
    b.classList.toggle("active", b.dataset.navkey === r.nav));
  const html = r.view(m);
  if (typeof html === "string") { outlet.innerHTML = html; afterRender(); }
  updateBadges();
  window.scrollTo(0, 0);
}

function updateBadges() {
  const n = svc.getApprovalRequests("pending").length;
  const b = document.getElementById("apr-badge");
  if (b) { b.textContent = n; b.style.display = n ? "" : "none"; }
}

let afterHooks = [];
const onAfter = (fn) => afterHooks.push(fn);
function afterRender() { const hooks = afterHooks; afterHooks = []; hooks.forEach((f) => f()); }

// ---------- shared fragments ----------
const preview = `<div class="preview-banner">Preview · mock operating data — decisions you make here are stored in this browser only.</div>`;

function approvalRow(r, withActions) {
  const decided = r.status !== "pending";
  return `<div class="apr">
    <div class="body">
      <div class="t">${esc(r.title)}</div>
      <div class="ask">${esc(r.ask)}</div>
      <div class="meta">${classPill(r.action_class)} · requested by <a data-nav="/agents/${esc(r.requested_by)}" style="color:var(--gold);font-weight:600">${esc(svc.getAgentById(r.requested_by)?.title ?? r.requested_by)}</a>
        ${r.business_id ? `· <a data-nav="/portfolio/${esc(r.business_id)}" style="font-weight:600">${esc(svc.getCompanyById(r.business_id)?.name ?? r.business_id)}</a>` : ""}
        · ${fmtTs(r.requested_at)}${decided ? ` · <b>${esc(r.status)}</b> by ${esc(r.decided_by)} ${r.denial_reason ? `— “${esc(r.denial_reason)}”` : ""}` : ""}</div>
      ${r.impact ? `<div class="impact">${esc(r.impact)}</div>` : ""}
    </div>
    ${withActions && !decided ? `<div class="btns">
      <button class="btn danger" data-deny="${esc(r.id)}">Deny</button>
      <button class="btn gold" data-approve="${esc(r.id)}">Approve</button>
    </div>` : decided ? `<span class="pill ${r.status === "approved" ? "green" : "red"}">${esc(r.status)}</span>` : ""}
  </div>`;
}

function wireApprovalButtons() {
  outlet.querySelectorAll("[data-approve]").forEach((b) => b.addEventListener("click", () => {
    svc.approveRequest(b.dataset.approve); render();
  }));
  outlet.querySelectorAll("[data-deny]").forEach((b) => b.addEventListener("click", () => {
    const reason = window.prompt("Reason for denial (recorded in the log):", "");
    if (reason === null) return;
    svc.rejectRequest(b.dataset.deny, reason); render();
  }));
}

function kpiTable(kpis) {
  return `<table class="kpis"><tr><th>KPI</th><th>Target</th><th>Current</th></tr>
    ${kpis.map((k) => `<tr><td>${esc(k.name)}</td><td class="mono neutral">${esc(k.target)}</td>
      <td class="mono trend-${esc(k.trend)}">${esc(k.current)}</td></tr>`).join("")}</table>`;
}

// ---------- view: command center ----------
function viewCommandCenter() {
  const s = svc.getExecutiveDashboardSummary();
  const date = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const green = s.business_status.filter((b) => b.status === "green").length;
  onAfter(() => { wireApprovalButtons(); mountBrain("brain-mini", 320); wireLive(); });
  return `
  <div class="head"><div><div class="crumb">Divini Group · Enterprise OS</div><h1>Command Center</h1></div>
    <div class="btns"><button class="btn" id="btn-connect">Connect live API</button><span class="chip">Founder mode · normal</span></div></div>
  <div class="sub">${date} · one screen for everything that needs you</div>
  <span id="live-banner">${preview}</span>

  <div class="nba"><div><div class="k">Next best action</div><div class="a">${esc(s.next_best_action)}</div></div>
    <div class="go"><button class="btn gold" data-nav="/approvals">Open Approval Center</button></div></div>

  <div class="metrics">
    <div class="metric goldline"><div class="l">Portfolio revenue · MTD</div><div class="v mono" id="live-rev">${money(s.revenue_mtd)}</div><div class="d">target ${money(s.revenue_target)}</div></div>
    <div class="metric"><div class="l">Needs you</div><div class="v mono" id="live-needs">${s.pending_approvals.length}</div><div class="d warn">${s.pending_approvals.filter((r) => r.action_class === "send_contract" || r.action_class === "change_pricing").length} high-risk</div></div>
    <div class="metric"><div class="l">Companies green</div><div class="v mono">${green}<span class="thin" style="font-size:15px;color:var(--mut)">/${s.business_status.length}</span></div><div class="d">${esc(s.business_status.find((b) => b.status === "amber")?.name ?? "")} watch</div></div>
    <div class="metric"><div class="l">Agents on post</div><div class="v mono">${s.agent_counts.total - s.agent_counts.blocked}<span class="thin" style="font-size:15px;color:var(--mut)">/${s.agent_counts.total}</span></div><div class="d ${s.agent_counts.blocked ? "danger" : ""}">${s.agent_counts.blocked} blocked</div></div>
    <div class="metric"><div class="l">Blocked workflows</div><div class="v mono">${s.blocked_workflows.length}</div><div class="d">across the portfolio</div></div>
  </div>

  <div class="grid g2">
    <div class="card"><div class="cardhead"><span class="t">Business status</span><a data-nav="/portfolio">Portfolio →</a></div>
      <div class="rows-tight" style="padding-bottom:6px">
        ${svc.getPortfolioCompanies().map((c) => `<div class="row"><div><a data-nav="/portfolio/${c.id}" class="t" style="font-weight:600">${compDot(c.status)}${esc(c.name)}</a><div class="s" style="margin-left:16px">${esc(c.revenue_priority)}</div></div><span class="mono" style="font-size:12.5px">${c.revenue_mtd ? money(c.revenue_mtd) : "—"}</span></div>`).join("")}
      </div></div>

    <div>
      <div class="card"><div class="cardhead"><span class="t">Pending approvals</span><a data-nav="/approvals">Approval Center →</a></div>
        ${s.pending_approvals.slice(0, 3).map((r) => approvalRow(r, true)).join("") || '<div class="empty">Queue clear.</div>'}
      </div>
      <div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">Blocked workflows</span></div>
        <div class="rows-tight" style="padding-bottom:6px">
        ${s.blocked_workflows.map((b) => `<div class="row"><div class="t"><span class="dot red"></span>${esc(b.workflow)}</div><span class="s">${esc(b.company)}</span></div>`).join("") || '<div class="empty">Nothing blocked.</div>'}
        </div></div>
    </div>
  </div>

  <div class="sec">Revenue priority</div>
  <div class="card"><div class="pad" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
    <span class="pill gold">P1</span><div style="flex:1;font-size:14px">${esc(s.revenue_priority)}</div>
    <button class="btn primary" data-nav="/portfolio/move_mi">Open Move Mi OS</button></div></div>

  <div class="grid g2" style="margin-top:16px">
    <div class="card"><div class="cardhead"><span class="t">Agent recommendations</span><a data-nav="/agents">Cabinet →</a></div>
      ${s.agent_recommendations.slice(0, 4).map((r) => `<div class="row"><div><div class="t">${esc(r.text)}</div><div class="s">${esc(r.from)}</div></div><span class="pill ${r.kind === "unblock" ? "red" : r.kind === "revenue" ? "gold" : "navy"}">${esc(r.kind)}</span></div>`).join("")}
    </div>
    <div class="card"><div class="cardhead"><span class="t">Active campaigns</span></div>
      <div class="rows-tight" style="padding-bottom:6px">
      ${s.active_campaigns.slice(0, 6).map((c) => `<div class="row"><span class="t">${esc(c.campaign)}</span><span class="s">${esc(c.company)}</span></div>`).join("") || '<div class="empty">No active campaigns.</div>'}
      </div></div>
  </div>

  <div class="sec">Weekly operating summary</div>
  <div class="card"><div class="pad">
    ${s.weekly_summary ? `<div style="font-family:var(--serif);font-size:15.5px">“${esc(s.weekly_summary.headline)}”</div>
      <div class="s" style="color:var(--mut);font-size:11.5px;margin:4px 0 10px">${esc(s.weekly_summary.week)} · generated ${fmtTs(s.weekly_summary.generated_at)}</div>
      <div style="font-size:13px">${esc(s.weekly_summary.sections.revenue)}</div>` : "No report yet."}
    <div style="margin-top:12px"><button class="btn primary" data-nav="/reports/weekly">Open weekly report</button></div>
  </div></div>

  <div class="sec">Brain center</div>
  <div class="brainwrap" style="height:320px">
    <canvas id="brain-mini"></canvas>
    <div class="brainhead"><div class="t">Knowledge brain</div><div class="s">companies · cabinet · knowledge domains, one graph</div></div>
    <div class="brainhint">click any node · <a data-nav="/brain" style="color:var(--gold-bright)">expand →</a></div>
    ${brainLegend()}
  </div>`;
}

// ---------- live hook (preserved from v1: talks to the real API when connected) ----------
function wireLive() {
  const btn = document.getElementById("btn-connect");
  if (btn) btn.addEventListener("click", () => {
    const api = window.prompt("API URL (e.g. https://alfie-api.onrender.com):", localStorage.getItem("alfie_api") || "");
    if (api === null) return;
    const token = window.prompt("Your API token:", localStorage.getItem("alfie_token") || "");
    if (token === null) return;
    localStorage.setItem("alfie_api", api.trim().replace(/\/+$/, ""));
    localStorage.setItem("alfie_token", token.trim());
    loadLive();
  });
  loadLive();
}
async function loadLive() {
  const slot = document.getElementById("live-banner");
  if (!svc.liveEnabled() || !slot) return;
  try {
    const [{ snapshot: s = {} }, pending] = await Promise.all([
      svc.getLiveMissionControl(),
      svc.getLiveApprovals("pending"),
    ]);
    const rev = document.getElementById("live-rev");
    if (rev && s.revenue_today != null) rev.textContent = money(s.revenue_today);
    const needs = document.getElementById("live-needs");
    if (needs) needs.textContent = pending.length;
    slot.innerHTML = `<div class="live-banner">Live · connected to ${esc(localStorage.getItem("alfie_api"))} — revenue + needs-you tiles and the Approval Center queue are live; other cards are preview.</div>`;
  } catch (e) {
    slot.innerHTML = `<div class="preview-banner">Could not reach the API (${esc(e.message)}). Showing preview.</div>`;
  }
}

// ---------- live approvals (the real gate) ----------
function liveApprovalRow(r) {
  return `<div class="apr">
    <div class="body">
      <div class="t">${esc(r.summary || `${r.method} ${r.route}`)}</div>
      <div class="meta">${classPill(r.action_class ?? "other")} · <span class="mono">${esc(r.method)} ${esc(r.route)}</span> · requested by ${esc(r.requested_by)} · ${fmtTs(r.created_at)}</div>
      <div class="impact">Deciding here consumes the real gate: an approval mints a one-time token bound to this exact route.</div>
    </div>
    <div class="btns">
      <button class="btn danger" data-live-deny="${esc(r.id)}">Deny</button>
      <button class="btn gold" data-live-approve="${esc(r.id)}">Approve</button>
    </div>
  </div>`;
}
async function mountLiveApprovals() {
  const box = document.getElementById("live-apr");
  if (!box) return;
  if (!svc.liveEnabled()) {
    box.innerHTML = `<div class="empty">Not connected — use “Connect live API” on the Command Center to decide real gate requests here.</div>`;
    return;
  }
  try {
    const pending = await svc.getLiveApprovals("pending");
    box.innerHTML = pending.map(liveApprovalRow).join("") ||
      '<div class="empty">Live queue clear — no parked gate requests.</div>';
    box.querySelectorAll("[data-live-approve],[data-live-deny]").forEach((b) => b.addEventListener("click", async () => {
      const approve = b.hasAttribute("data-live-approve");
      const id = b.getAttribute(approve ? "data-live-approve" : "data-live-deny");
      let reason;
      if (!approve) { reason = window.prompt("Reason for denial:", ""); if (reason === null) return; }
      b.disabled = true; b.textContent = "…";
      try { await svc.decideLiveApproval(id, approve ? "approved" : "denied", reason); await mountLiveApprovals(); }
      catch (e) { b.disabled = false; b.textContent = approve ? "Approve" : "Deny"; window.alert("Decision failed: " + e.message); }
    }));
  } catch (e) {
    box.innerHTML = `<div class="empty">Could not load the live queue (${esc(e.message)}).</div>`;
  }
}

// ---------- view: agents ----------
function agentCard(a) {
  return `<a class="acard" data-nav="/agents/${a.id}">
    <div class="top"><span class="pill navy">${esc(dep(a.department))}</span>${statusPill(a.status)}</div>
    <h3>${esc(a.title)}</h3>
    <div class="m">${esc(a.mission)}</div>
    <div class="na"><b>Next action</b>${esc(a.next_action)}</div></a>`;
}
function viewAgents() {
  return `
  <div class="head"><div><div class="crumb">Enterprise Agent Cabinet</div><h1>Agents</h1></div>
    <span class="chip">${svc.getAgents().length} on the org chart</span></div>
  <div class="sub">The cabinet runs the enterprise; portfolio agents run each company. Authority per <a data-nav="/agents" style="color:var(--gold)">docs/AGENT_AUTHORITY_MATRIX.md</a> — nothing external moves without approval.</div>
  ${preview}
  <div class="sec">Executive cabinet · ${svc.getAgents({ layer: "cabinet" }).length}</div>
  <div class="cards">${svc.getAgents({ layer: "cabinet" }).map(agentCard).join("")}</div>
  <div class="sec">Portfolio agents · ${svc.getAgents({ layer: "portfolio" }).length}</div>
  <div class="cards">${svc.getAgents({ layer: "portfolio" }).map(agentCard).join("")}</div>`;
}

// ---------- view: agent detail ----------
function viewAgentDetail(id) {
  const a = svc.getAgentById(id);
  if (!a) return `<div class="empty">Unknown agent “${esc(id)}”. <a data-nav="/agents" style="color:var(--gold)">Back to the cabinet</a></div>`;
  const biz = a.linked_business ? svc.getCompanyById(a.linked_business) : null;
  const logs = svc.getActionLogs(50).filter((l) => l.agent_id === a.id).slice(0, 6);
  const approvals = svc.getApprovalRequests().filter((r) => r.requested_by === a.id);
  onAfter(wireApprovalButtons);
  return `
  <div class="crumb"><a data-nav="/agents">Agent Cabinet</a> / ${esc(dep(a.department))}</div>
  <div class="head"><h1>${esc(a.title)}</h1><div class="btns">${statusPill(a.status)}<span class="pill gold">${esc(a.authority_level)}</span></div></div>
  <div class="sub">${esc(a.mission)}</div>
  <div class="nba"><div><div class="k">Next action</div><div class="a">${esc(a.next_action)}</div></div></div>

  <div class="dossier" style="margin-top:16px">
    <div>
      <div class="card"><div class="cardhead"><span class="t">Dossier</span></div><div class="kv">
        <span class="k">Department</span><span>${esc(dep(a.department))}</span>
        <span class="k">Layer</span><span>${a.layer === "cabinet" ? "Executive cabinet" : "Portfolio operations"}</span>
        <span class="k">Linked business</span><span>${biz ? `<a data-nav="/portfolio/${biz.id}" style="color:var(--gold);font-weight:600">${esc(biz.name)}</a>` : "—"}</span>
        <span class="k">Reporting cadence</span><span>${esc(a.reporting_cadence)} · chain of command per <i>AGENT_REPORTING_STRUCTURE</i></span>
        <span class="k">Registry ref</span><span>${a.role_card_ref ? `ai-org role card: ${esc(a.role_card_ref)}` : "cabinet-level (not in the 78-card registry)"}</span>
      </div></div>
      <div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">Responsibilities</span></div>
        <ul class="list">${a.responsibilities.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div>
      <div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">Owned KPIs</span></div>${kpiTable(a.kpis)}</div>
      <div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">Recent actions</span></div>
        <div class="rows-tight" style="padding-bottom:6px">
        ${logs.map((l) => `<div class="row"><div><div class="t" style="font-size:12.5px">${esc(l.action)}</div><div class="s">${fmtTs(l.ts)}</div></div><span class="pill ${l.status === "succeeded" ? "green" : l.status === "denied" ? "red" : "amber"}">${esc(l.status)}</span></div>`).join("") || '<div class="empty">No logged actions.</div>'}
        </div></div>
    </div>
    <div>
      <div class="card"><div class="cardhead"><span class="t">Authority & approvals</span></div><div class="pad" style="font-size:12.5px">
        <div style="margin-bottom:8px"><span class="pill gold">${esc(a.authority_level)}</span></div>
        <b style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)">Requires approval for</b>
        <ul style="margin:6px 0 0 16px">${a.approval_requirements.map((r) => `<li style="margin:4px 0">${esc(r)}</li>`).join("")}</ul>
      </div></div>
      <div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">Owned workflows</span></div>
        <ul class="list">${a.owned_workflows.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>
      <div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">Risks & blockers</span></div>
        <ul class="list">${a.risks.map((r) => `<li class="${a.status === "blocked" ? "danger" : ""}">${esc(r)}</li>`).join("")}</ul></div>
      ${approvals.length ? `<div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">Approvals raised</span></div>
        ${approvals.slice(0, 3).map((r) => approvalRow(r, true)).join("")}</div>` : ""}
    </div>
  </div>`;
}

// ---------- view: portfolio ----------
function viewPortfolio() {
  const cs = svc.getPortfolioCompanies();
  return `
  <div class="head"><div><div class="crumb">Portfolio Company OS</div><h1>Portfolio</h1></div>
    <span class="chip">${cs.length} companies</span></div>
  <div class="sub">Every company runs the same OS: departments, playbooks, asset checklist, fastest path to cash.</div>
  ${preview}
  <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">
    ${cs.map((c) => {
      const os = svc.getCompanyOS(c.id);
      const agent = c.agent_id ? svc.getAgentById(c.agent_id) : null;
      const pct = c.revenue_target ? Math.min(100, Math.round((c.revenue_mtd / c.revenue_target) * 100)) : 0;
      return `<a class="acard" data-nav="/portfolio/${c.id}">
        <div class="top"><span class="pill navy">${esc(c.kind)}</span><span>${compDot(c.status)}<span class="s" style="font-size:11px;color:var(--mut)">${esc(c.stage)}</span></span></div>
        <h3>${esc(c.name)}</h3>
        <div class="m">${esc(c.summary)}</div>
        <div class="barrow" style="margin:4px 0 8px"><b class="mono" style="min-width:0">${c.revenue_target ? money(c.revenue_mtd) : "—"}</b><div class="bar"><i style="width:${pct}%"></i></div><span class="pct mono">${c.revenue_target ? money(c.revenue_target) : ""}</span></div>
        <div class="s" style="font-size:11px;color:var(--mut)">${esc(c.revenue_priority)} · ${c.active_campaigns.length} campaign${c.active_campaigns.length === 1 ? "" : "s"} · ${os?.blocked_workflows.length ? `<span class="danger">${os.blocked_workflows.length} blocked</span>` : "no blocks"}${agent ? ` · ${esc(agent.title)}` : ""}</div>
        <div class="na"><b>Fastest path</b>${esc(c.fastest_path)}</div></a>`;
    }).join("")}
  </div>`;
}

// ---------- view: company OS ----------
function viewCompanyOS(id) {
  const c = svc.getCompanyById(id);
  if (!c) return `<div class="empty">Unknown company “${esc(id)}”. <a data-nav="/portfolio" style="color:var(--gold)">Back to portfolio</a></div>`;
  const os = svc.getCompanyOS(id);
  const agent = c.agent_id ? svc.getAgentById(c.agent_id) : null;
  const approvals = svc.getApprovalRequests().filter((r) => r.business_id === id);
  const logs = svc.getActionLogs(50).filter((l) => l.business_id === id).slice(0, 6);
  onAfter(wireApprovalButtons);
  return `
  <div class="crumb"><a data-nav="/portfolio">Portfolio</a> / ${esc(c.kind)}</div>
  <div class="head"><h1>${esc(c.name)}</h1><div class="btns">${compDot(c.status)}<span class="pill gold">${esc(c.revenue_priority)}</span><span class="pill gray">${esc(c.stage)}</span></div></div>
  <div class="sub">${esc(c.summary)}</div>
  <div class="nba"><div><div class="k">Fastest path to cash</div><div class="a">${esc(c.fastest_path)}</div></div>
    ${approvals.some((r) => r.status === "pending") ? `<div class="go"><button class="btn gold" data-nav="/approvals">Decide ${approvals.filter((r) => r.status === "pending").length} pending</button></div>` : ""}</div>

  <div class="metrics">
    <div class="metric goldline"><div class="l">Revenue · MTD</div><div class="v mono">${c.revenue_target ? money(c.revenue_mtd) : "—"}</div><div class="d">target ${c.revenue_target ? money(c.revenue_target) : "—"}</div></div>
    <div class="metric"><div class="l">Departments active</div><div class="v mono">${os.departments_active}<span style="font-size:15px;color:var(--mut)">/13</span></div><div class="d">business template</div></div>
    <div class="metric"><div class="l">SOP coverage</div><div class="v mono">${os.sop_coverage}%</div><div class="d">ops maturity</div></div>
    <div class="metric"><div class="l">Asset checklist</div><div class="v mono">${os.asset_checklist_complete}%</div><div class="d">of the 25 key assets</div></div>
  </div>

  <div class="grid g2">
    <div>
      <div class="card"><div class="cardhead"><span class="t">Operating system</span></div><div class="pad">
        <div class="barrow" style="margin-bottom:8px"><b>SOP coverage</b><div class="bar"><i style="width:${os.sop_coverage}%"></i></div><span class="pct mono">${os.sop_coverage}%</span></div>
        <div class="barrow" style="margin-bottom:14px"><b>Asset checklist</b><div class="bar"><i style="width:${os.asset_checklist_complete}%"></i></div><span class="pct mono">${os.asset_checklist_complete}%</span></div>
        <b style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)">Playbooks</b>
        <ul style="margin:6px 0 12px 16px;font-size:13px">${os.playbooks.map((p) => `<li style="margin:4px 0">${esc(p)}</li>`).join("")}</ul>
        <b style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)">Connected tools</b>
        <div style="margin-top:7px;display:flex;gap:6px;flex-wrap:wrap">${os.connected_tools.map((t) => `<span class="pill ${t.includes("live") ? "green" : "gray"}">${esc(t)}</span>`).join("") || '<span class="s">none — connectors are mock-first</span>'}</div>
      </div></div>
      <div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">Workflows</span></div>
        <div class="rows-tight" style="padding-bottom:6px">
          ${os.open_workflows.map((w) => `<div class="row"><span class="t"><span class="dot green"></span>${esc(w)}</span><span class="pill green">open</span></div>`).join("")}
          ${os.blocked_workflows.map((w) => `<div class="row"><span class="t"><span class="dot red"></span>${esc(w)}</span><span class="pill red">blocked</span></div>`).join("")}
        </div></div>
      <div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">Weekly focus</span></div>
        <div class="pad" style="font-family:var(--serif);font-size:15px">“${esc(os.weekly_focus)}”</div></div>
    </div>
    <div>
      ${agent ? `<div class="card"><div class="cardhead"><span class="t">Operating agent</span><a data-nav="/agents/${agent.id}">Dossier →</a></div>
        <div class="pad"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="font-family:var(--serif);font-size:15px">${esc(agent.title)}</b>${statusPill(agent.status)}</div>
        <div class="s" style="margin:6px 0 8px;color:var(--mut)">${esc(agent.mission)}</div>
        <div class="na" style="border-top:1px solid var(--line);padding-top:8px;font-size:11.5px"><b style="color:var(--gold);font-size:10px;letter-spacing:.1em;text-transform:uppercase;display:block;margin-bottom:2px">Next action</b>${esc(agent.next_action)}</div></div></div>` : ""}
      ${c.active_campaigns.length ? `<div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">Active campaigns</span></div>
        <div class="rows-tight" style="padding-bottom:6px">${c.active_campaigns.map((x) => `<div class="row"><span class="t">${esc(x)}</span><span class="pill gold">running</span></div>`).join("")}</div></div>` : ""}
      <div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">Approvals · ${esc(c.name)}</span></div>
        ${approvals.map((r) => approvalRow(r, true)).join("") || '<div class="empty">None for this company.</div>'}</div>
      <div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">Action log</span></div>
        <div class="rows-tight" style="padding-bottom:6px">
        ${logs.map((l) => `<div class="row"><div><div class="t" style="font-size:12.5px">${esc(l.action)}</div><div class="s">${fmtTs(l.ts)}</div></div></div>`).join("") || '<div class="empty">No entries.</div>'}
        </div></div>
    </div>
  </div>`;
}

// ---------- view: approvals ----------
function viewApprovals() {
  const pending = svc.getApprovalRequests("pending");
  const decided = svc.getApprovalRequests().filter((r) => r.status !== "pending")
    .sort((a, b) => ((a.decided_at ?? "") < (b.decided_at ?? "") ? 1 : -1));
  onAfter(() => { wireApprovalButtons(); mountLiveApprovals(); });
  return `
  <div class="head"><div><div class="crumb">Approval Center · gate is deny-by-default</div><h1>Approvals</h1></div>
    <span class="chip">${pending.length} waiting</span></div>
  <div class="sub">Nothing external — sends, publishes, contracts, pricing — moves without your token (docs/APPROVAL_CENTER_SPEC.md).</div>
  ${preview}
  <div class="sec">Live gate queue · from the connected API</div>
  <div class="card" id="live-apr"><div class="empty">Checking the live queue…</div></div>
  <div class="sec">Waiting on you · money & contracts first (preview)</div>
  <div class="card">${pending
    .sort((a, b) => (["send_contract", "change_pricing"].includes(b.action_class) ? 1 : 0) - (["send_contract", "change_pricing"].includes(a.action_class) ? 1 : 0))
    .map((r) => approvalRow(r, true)).join("") || '<div class="empty">Queue clear — the machine keeps working.</div>'}</div>
  <div class="sec">Decided</div>
  <div class="card">${decided.map((r) => approvalRow(r, false)).join("") || '<div class="empty">No decisions yet.</div>'}</div>`;
}

// ---------- view: weekly report ----------
function viewWeeklyReport() {
  const reports = svc.getOperatingReports();
  const latest = reports[reports.length - 1];
  onAfter(() => {
    document.getElementById("gen-report")?.addEventListener("click", () => { svc.generateWeeklyOperatingReport(); render(); });
  });
  return `
  <div class="head"><div><div class="crumb">Operating cadence · weekly</div><h1>Weekly Operating Report</h1></div>
    <button class="btn gold" id="gen-report">Generate this week's report</button></div>
  <div class="sub">Composed live from portfolio state, the approval queue, and agent status — docs/AGENT_OPERATING_CADENCE.md.</div>
  ${preview}
  ${latest ? `<div class="report card"><div class="pad">
    <div class="s" style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);font-weight:700">${esc(latest.week)} · generated ${fmtTs(latest.generated_at)}</div>
    <div class="hl">${esc(latest.headline)}</div>
    <h2>Revenue</h2><p>${esc(latest.sections.revenue)}</p>
    ${latest.sections.companies ? `<h2>Companies</h2><ul>${latest.sections.companies.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
    ${latest.sections.shipped ? `<h2>Shipped</h2><p>${esc(latest.sections.shipped)}</p>` : ""}
    <h2>Approvals</h2><p>${esc(latest.sections.approvals)}</p>
    <h2>Blocked</h2>${Array.isArray(latest.sections.blocked) ? `<ul>${latest.sections.blocked.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p>${esc(latest.sections.blocked)}</p>`}
    ${latest.sections.agents ? `<h2>Agents</h2><p>${esc(latest.sections.agents)}</p>` : ""}
    <h2>Next</h2>${Array.isArray(latest.sections.next) ? `<ul>${latest.sections.next.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p>${esc(latest.sections.next)}</p>`}
  </div></div>` : '<div class="empty">No reports yet — generate one.</div>'}
  ${reports.length > 1 ? `<div class="sec">Previous</div><div class="card rows-tight">${reports.slice(0, -1).reverse().map((r) => `<div class="row"><div><div class="t">${esc(r.week)} — ${esc(r.headline)}</div><div class="s">${fmtTs(r.generated_at)}</div></div></div>`).join("")}</div>` : ""}`;
}

// ---------- view + renderer: the brain ----------
function brainLegend() {
  return `<div class="brainlegend">
    <span><i style="background:var(--gold-bright)"></i>Alyssa</span>
    <span><i style="background:#e9e4d8"></i>companies</span>
    <span><i style="background:#6f8fbf"></i>agents</span>
    <span><i style="background:var(--violet)"></i>knowledge</span></div>`;
}
function viewBrain() {
  onAfter(() => mountBrain("brain-full", Math.max(560, window.innerHeight - 260)));
  return `
  <div class="head"><div><div class="crumb">Knowledge brain · one graph, never re-learned</div><h1>Brain Center</h1></div>
    <span class="chip">${svc.getBrainGraph().nodes.length} nodes · ${svc.getBrainGraph().edges.length} links</span></div>
  <div class="sub">Companies, the cabinet, and knowledge domains as one living graph — the Obsidian-style view of docs/KNOWLEDGE_BRAIN_SYNC_SPEC.md. Click a node to open it.</div>
  <div class="brainwrap" style="height:${Math.max(560, window.innerHeight - 260)}px">
    <canvas id="brain-full"></canvas>
    <div class="brainhead"><div class="t">Enterprise knowledge graph</div><div class="s">drag to nudge · click to open</div></div>
    ${brainLegend()}
  </div>`;
}

const NODE_STYLE = {
  founder: { r: 13, color: "#c9a24b", glow: "rgba(201,162,75,.55)" },
  company: { r: 8, color: "#e9e4d8", glow: "rgba(233,228,216,.35)" },
  agent: { r: 4.5, color: "#6f8fbf", glow: "rgba(111,143,191,.3)" },
  knowledge: { r: 6.5, color: "#8b7fb8", glow: "rgba(139,127,184,.4)" },
};

function mountBrain(canvasId, height) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const wrap = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const W = wrap.clientWidth, H = height;
  canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.height = H + "px";
  const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);

  const g = svc.getBrainGraph();
  const idx = new Map(g.nodes.map((n, i) => [n.id, i]));
  // deterministic seeded layout (golden-angle spiral by kind ring)
  const nodes = g.nodes.map((n, i) => {
    const ring = n.kind === "founder" ? 0 : n.kind === "company" ? 0.42 : n.kind === "knowledge" ? 0.62 : 0.95;
    const ang = i * 2.399963;
    return { ...n, x: W / 2 + Math.cos(ang) * ring * Math.min(W, H) * 0.42, y: H / 2 + Math.sin(ang) * ring * H * 0.42, vx: 0, vy: 0 };
  });
  const edges = g.edges.map((e) => ({ a: idx.get(e.from), b: idx.get(e.to) })).filter((e) => e.a != null && e.b != null);

  let hover = -1, dragging = -1;
  const step = () => {
    // forces: mild center pull, pair repulsion, spring on edges
    for (const n of nodes) { n.vx += (W / 2 - n.x) * 0.0006; n.vy += (H / 2 - n.y) * 0.0009; }
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      let dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
      if (d2 < 1) d2 = 1;
      if (d2 < 22000) { const f = 480 / d2; dx *= f; dy *= f; a.vx += dx; a.vy += dy; b.vx -= dx; b.vy -= dy; }
    }
    for (const e of edges) {
      const a = nodes[e.a], b = nodes[e.b];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      const want = (NODE_STYLE[a.kind].r + NODE_STYLE[b.kind].r) * 6 + 34;
      const f = (d - want) * 0.004;
      a.vx += (dx / d) * f; a.vy += (dy / d) * f; b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
    }
    for (const n of nodes) {
      if (nodes[dragging] === n) continue;
      n.vx *= 0.82; n.vy *= 0.82; n.x += n.vx; n.y += n.vy;
      n.x = Math.max(18, Math.min(W - 18, n.x)); n.y = Math.max(18, Math.min(H - 18, n.y));
    }
  };
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 0.6;
    for (const e of edges) {
      const a = nodes[e.a], b = nodes[e.b];
      const lit = hover === e.a || hover === e.b;
      ctx.strokeStyle = lit ? "rgba(201,162,75,.65)" : "rgba(233,228,216,.14)";
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i], st = NODE_STYLE[n.kind] ?? NODE_STYLE.agent;
      const r = st.r * (hover === i ? 1.5 : 1);
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 3.2);
      grad.addColorStop(0, st.glow); grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(n.x, n.y, r * 3.2, 0, 7); ctx.fill();
      ctx.fillStyle = st.color; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 7); ctx.fill();
      if (hover === i || n.kind === "founder" || (n.kind === "company" && H > 400)) {
        ctx.font = `${hover === i ? "600 12px" : "10.5px"} ${getComputedStyle(document.body).fontFamily}`;
        ctx.fillStyle = hover === i ? "#f4efe4" : "rgba(233,228,216,.62)";
        ctx.textAlign = "center";
        ctx.fillText(n.label, n.x, n.y - r - 6);
      }
    }
  };
  let frames = 0; let alive = true;
  const loop = () => {
    if (!alive || !document.getElementById(canvasId)) { alive = false; return; }
    step(); draw();
    frames++;
    requestAnimationFrame(loop);
  };
  loop();

  const hit = (mx, my) => nodes.findIndex((n) => { const r = (NODE_STYLE[n.kind]?.r ?? 5) + 6; return (n.x - mx) ** 2 + (n.y - my) ** 2 < r * r; });
  const pos = (ev) => { const b = canvas.getBoundingClientRect(); return [ev.clientX - b.left, ev.clientY - b.top]; };
  canvas.addEventListener("mousemove", (ev) => {
    const [mx, my] = pos(ev);
    if (dragging >= 0) { nodes[dragging].x = mx; nodes[dragging].y = my; return; }
    hover = hit(mx, my);
    canvas.style.cursor = hover >= 0 ? "pointer" : "default";
  });
  canvas.addEventListener("mousedown", (ev) => { const [mx, my] = pos(ev); dragging = hit(mx, my); });
  canvas.addEventListener("mouseup", (ev) => {
    const [mx, my] = pos(ev);
    const i = hit(mx, my);
    if (dragging === i && i >= 0) {
      const n = nodes[i];
      if (n.kind === "company") go("/portfolio/" + n.id);
      else if (n.kind === "agent") go("/agents/" + n.id);
    }
    dragging = -1;
  });
  canvas.addEventListener("mouseleave", () => { hover = -1; dragging = -1; });
}

// ---------- views: creation factories ----------
const FACTORY_META = {
  company: { icon: "◆", desc: "Idea → registered portfolio company: profile, model, ICP, offers, departments, SOPs, risks, launch plan.", sections: 14, generate: fac.generateCompanyPacket },
  software: { icon: "⌘", desc: "Product → build-ready packet: brief, spec, schema, UI map, stack, plus Fable / Claude / OpenClaw prompt packets.", sections: 12, generate: fac.generateSoftwareBuildPacket },
  gtm: { icon: "▲", desc: "Offer → launch: thesis, positioning, funnel, copy, sequences, calendar, KPIs, 30/60/90 — every send pre-gated.", sections: 13, generate: fac.generateGTMPacket },
  media: { icon: "◉", desc: "Topic → episode engine: hooks, outline, clips, titles, SEO, repurposing map, avatar job placeholder.", sections: 17, generate: fac.generateMediaPacket },
};
const FACTORY_FORMS = {
  company: [
    { k: "name", label: "Company name", ph: "e.g. Oralia Retail" },
    { k: "one_liner", label: "One-liner", ph: "what it does, for whom, in one sentence" },
    { k: "industry", label: "Industry", ph: "e.g. consumer wellness" },
    { k: "icp_hint", label: "Who is it for?", ph: "who feels the pain this week?" },
    { k: "offer_hint", label: "Core offer", ph: "the wedge offer" },
    { k: "price_hint", label: "Entry price", ph: "$—" },
  ],
  software: [
    { k: "name", label: "Platform name", ph: "e.g. GrantTracker" },
    { k: "purpose", label: "The job it does", ph: "one sentence" },
    { k: "users_hint", label: "Day-one users", ph: "who uses it first?" },
    { k: "platform", label: "Form factor", ph: "web / mobile / API" },
    { k: "integrations_hint", label: "Integrations wishlist", ph: "optional" },
  ],
  gtm: [
    { k: "offer_name", label: "Offer name", ph: "e.g. FounderOS Beta" },
    { k: "promise", label: "The promise", ph: "the outcome, verbatim" },
    { k: "icp_hint", label: "Target segment", ph: "role, situation, trigger" },
    { k: "channels", label: "Channels (comma-sep)", ph: "email, social, podcast, partners, paid, community" },
    { k: "price_point", label: "Price point", ph: "$—" },
    { k: "revenue_target", label: "Revenue target", ph: "e.g. $10k MRR in 90 days" },
    { k: "business_key", label: "Business key", ph: "e.g. founderos (optional)" },
  ],
  media: [
    { k: "topic", label: "Topic", ph: "what is this piece about?" },
    { k: "series_name", label: "Series", ph: "e.g. Decoded (or standalone)" },
    { k: "audience_hint", label: "Audience", ph: "who must feel it was made for them?" },
    { k: "sponsor_hint", label: "Sponsor / CTA", ph: "sponsor or house offer (optional)" },
  ],
};

function packetRow(p) {
  return `<div class="row"><div><a class="t" data-nav="/factory/packets/${p.id}" style="font-weight:600">${esc(p.name)}</a>
    <div class="s">${esc(fac.FACTORY_KINDS[p.kind].factory)} · v${p.version} · ${p.sections.length} sections · ${fmtTs(p.created_at)}</div></div>
    <span class="pill ${p.status === "submitted" ? "amber" : p.status === "draft" ? "gray" : "green"}">${esc(p.status)}</span></div>`;
}

function viewFactoryHub() {
  const packets = fac.getPackets().slice().reverse();
  return `
  <div class="head"><div><div class="crumb">Creation modes · four factories</div><h1>Factory</h1></div>
    <span class="chip">${packets.length} packet${packets.length === 1 ? "" : "s"}</span></div>
  <div class="sub">Everything Alfy2 creates starts here: a structured, editable packet — deterministic templates now, AI generation later. Go-aheads route to the Approval Center; execution steps keep their own gates.</div>
  ${preview}
  <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">
    ${Object.entries(FACTORY_META).map(([kind, m]) => `<a class="acard" data-nav="/factory/${kind}">
      <div class="top"><span style="font-size:22px;color:var(--gold)">${m.icon}</span><span class="pill navy">${esc(fac.FACTORY_KINDS[kind].factory)}</span></div>
      <h3>${esc(fac.FACTORY_KINDS[kind].label)}</h3>
      <div class="m" style="-webkit-line-clamp:3">${esc(m.desc)}</div>
      <div class="na"><b>Produces</b>${m.sections}-section packet → Approval Center → export to agents/Obsidian</div></a>`).join("")}
  </div>
  <div class="sec">Recent packets</div>
  <div class="card rows-tight">${packets.slice(0, 12).map(packetRow).join("") || '<div class="empty">Nothing created yet — pick a mode above.</div>'}</div>`;
}

function viewFactoryForm(kind) {
  const meta = FACTORY_META[kind];
  onAfter(() => {
    document.getElementById("factory-generate").addEventListener("click", () => {
      const input = {};
      for (const f of FACTORY_FORMS[kind]) {
        let v = document.getElementById("ff-" + f.k).value.trim();
        if (f.k === "channels") v = v ? v.split(",").map((x) => x.trim()).filter(Boolean) : [];
        if (v && v.length) input[f.k] = v;
      }
      const p = meta.generate(input);
      go("/factory/packets/" + p.id);
    });
  });
  return `
  <div class="crumb"><a data-nav="/factory">Factory</a> / ${esc(fac.FACTORY_KINDS[kind].factory)}</div>
  <div class="head"><h1>${esc(fac.FACTORY_KINDS[kind].label)}</h1><span class="chip">${meta.sections} sections</span></div>
  <div class="sub">${esc(meta.desc)} Leave anything blank — it becomes an explicit “to answer” prompt, never an invented fact.</div>
  <div class="card" style="max-width:660px"><div class="pad">
    ${FACTORY_FORMS[kind].map((f) => `<div style="margin-bottom:13px">
      <label style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);font-weight:600;display:block;margin-bottom:4px">${esc(f.label)}</label>
      <input id="ff-${f.k}" placeholder="${esc(f.ph)}" style="width:100%;padding:9px 12px;border:1px solid var(--line2);border-radius:9px;font-size:13.5px;font-family:var(--sans);background:var(--bg)" />
    </div>`).join("")}
    <div class="btns" style="margin-top:16px"><button class="btn gold" id="factory-generate">Generate packet</button>
      <button class="btn" data-nav="/factory">Cancel</button></div>
  </div></div>`;
}

function download(filename, content, type = "text/markdown") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function viewPacket(id) {
  const p = fac.getPacketById(id);
  if (!p) return `<div class="empty">Unknown packet “${esc(id)}”. <a data-nav="/factory" style="color:var(--gold)">Back to the factory</a></div>`;
  const meta = fac.FACTORY_KINDS[p.kind];
  const versions = fac.getPacketVersions(id).slice().reverse();
  const unresolved = fac.exportPacketForAgent(id).unresolved;
  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  onAfter(() => {
    document.getElementById("pkt-submit")?.addEventListener("click", () => { fac.submitPacketForApproval(id); render(); });
    document.getElementById("pkt-md").addEventListener("click", () => download(`${slug}.md`, fac.exportPacketToMarkdown(id)));
    document.getElementById("pkt-obsidian").addEventListener("click", () => download(`${slug}.obsidian.md`, fac.exportPacketToObsidian(id)));
    document.getElementById("pkt-agent").addEventListener("click", () => {
      const target = window.prompt("Export for which runner? (fable / claude / openclaw)", "claude");
      if (target === null) return;
      download(`${slug}.${target}.packet.json`, JSON.stringify(fac.exportPacketForAgent(id, target), null, 2), "application/json");
    });
    outlet.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
      const key = b.dataset.edit;
      const box = document.getElementById("sec-" + key);
      const ta = box.querySelector("textarea");
      if (ta) { fac.updatePacketSection(id, key, ta.value); render(); return; }
      const s = fac.getPacketById(id).sections.find((x) => x.key === key);
      box.innerHTML = `<textarea style="width:100%;min-height:170px;padding:10px 12px;border:1px solid var(--gold);border-radius:9px;font-size:12.5px;font-family:var(--sans);background:#fffdf7">${esc(s.content)}</textarea>`;
      b.textContent = "Save";
    }));
  });
  return `
  <div class="crumb"><a data-nav="/factory">Factory</a> / ${esc(meta.factory)}</div>
  <div class="head"><h1>${esc(p.name)}</h1>
    <div class="btns"><span class="pill navy">v${p.version}</span><span class="pill ${p.status === "submitted" ? "amber" : "gray"}">${esc(p.status)}</span></div></div>
  <div class="sub">${esc(meta.label)} · ${p.sections.length} sections · created ${fmtTs(p.created_at)}${p.business_key ? ` · <a data-nav="/portfolio/${esc(p.business_key)}" style="color:var(--gold);font-weight:600">${esc(svc.getCompanyById(p.business_key)?.name ?? p.business_key)}</a>` : ""}</div>
  <div class="nba"><div><div class="k">${p.status === "draft" ? "Go-ahead" : "Status"}</div>
    <div class="a">${p.status === "draft" ? `Submit for approval — ${esc(meta.approval_note)}.` : `Submitted to the Approval Center (${esc(p.approval_id ?? "")}). Execution steps keep their own gates.`}</div></div>
    <div class="go btns">
      ${p.status === "draft" ? `<button class="btn gold" id="pkt-submit">Submit for approval</button>` : ""}
      <button class="btn" id="pkt-md" style="background:transparent;color:#f4efe4;border-color:rgba(233,228,216,.35)">Markdown</button>
      <button class="btn" id="pkt-obsidian" style="background:transparent;color:#f4efe4;border-color:rgba(233,228,216,.35)">Obsidian</button>
      <button class="btn" id="pkt-agent" style="background:transparent;color:#f4efe4;border-color:rgba(233,228,216,.35)">Agent JSON</button>
    </div></div>
  ${unresolved.length ? `<div class="card" style="margin-top:14px;border-color:var(--gold)"><div class="cardhead"><span class="t">Open questions · ${unresolved.length}</span></div>
    <ul class="list">${unresolved.map((q) => `<li><b>${esc(q.section)}</b>: ${esc(q.question)}</li>`).join("")}</ul></div>` : ""}
  <div class="sec">Packet sections · click edit to refine (each save = new version)</div>
  ${p.sections.map((s) => `<div class="card" style="margin-bottom:12px"><div class="cardhead"><span class="t">${esc(s.title)}</span>
      <button class="btn" data-edit="${esc(s.key)}" style="padding:3px 11px;font-size:11px">Edit</button></div>
    <div class="pad" id="sec-${esc(s.key)}" style="font-size:12.5px;white-space:pre-wrap;font-family:var(--sans)">${esc(s.content)}</div></div>`).join("")}
  <div class="sec">Version history</div>
  <div class="card rows-tight">${versions.map((v) => `<div class="row"><span class="t">v${v.version} — ${esc(v.note)}</span><span class="s">${fmtTs(v.created_at)}</span></div>`).join("")}</div>`;
}

// ---------- views: media studio ----------
const tryDo = (fn) => { try { fn(); render(); } catch (e) { window.alert(e.message); } };
const gatePill = (id) => {
  const s = studio.gateStatus(id);
  return `<span class="pill ${s === "approved" ? "green" : s === "pending" ? "amber" : s === "denied" ? "red" : "gray"}">${esc(s.replace(/_/g, " "))}</span>`;
};
const STAGE_LABELS = {
  concept_draft: "Concept draft", concept_submitted: "Concept submitted", in_production: "In production",
  outline_draft: "Outline draft", recording_ready: "Recording-ready", recording_prep: "Recording prep",
  transcribed: "Transcribed", clips_planned: "Clips planned", clips_approved: "Clips approved",
  publish_pack_draft: "Publish pack draft", ready_to_publish: "Ready to publish",
};

function viewStudio() {
  const series = studio.getPodcastSeries();
  const episodes = studio.getEpisodes().slice().reverse();
  const scripts = studio.getAvatarScripts();
  const jobs = studio.getAvatarVideoJobs();
  onAfter(() => {
    document.getElementById("ep-create")?.addEventListener("click", () => tryDo(() => {
      const ep = studio.createEpisode(document.getElementById("ep-series").value, {
        working_title: document.getElementById("ep-title").value.trim(),
        concept: document.getElementById("ep-concept").value.trim(),
        audience_hint: document.getElementById("ep-audience").value.trim(),
      });
      go("/studio/episodes/" + ep.id);
    }));
  });
  return `
  <div class="head"><div><div class="crumb">Media Studio · professional workflow, external tools</div><h1>Media Studio</h1></div>
    <div class="btns"><span class="chip">${episodes.length} episode${episodes.length === 1 ? "" : "s"}</span><button class="btn" data-nav="/studio/avatar">Avatar Studio →</button></div></div>
  <div class="sub">Series → episode → research → hooks → outline → record (Riverside-style, external) → transcript → clips → publish pack → monetization → repurposing. Five gates; nothing publishes without a token (docs/MEDIA_STUDIO_SPEC.md).</div>
  ${preview}
  <div class="grid g2">
    <div class="card"><div class="cardhead"><span class="t">New episode</span></div><div class="pad">
      <label style="font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);font-weight:600">Series</label>
      <select id="ep-series" style="width:100%;padding:8px 10px;border:1px solid var(--line2);border-radius:9px;margin:4px 0 10px;background:var(--bg);font-family:var(--sans)">${series.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select>
      ${[["ep-title", "Working title", "e.g. Why founders drown in tools"], ["ep-concept", "Concept", "the core idea in one line"], ["ep-audience", "Audience", "who must feel it was made for them"]].map(([id, l, ph]) =>
        `<label style="font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);font-weight:600">${l}</label>
         <input id="${id}" placeholder="${ph}" style="width:100%;padding:8px 10px;border:1px solid var(--line2);border-radius:9px;margin:4px 0 10px;background:var(--bg);font-family:var(--sans);font-size:13px" />`).join("")}
      <button class="btn gold" id="ep-create">Create episode</button>
    </div></div>
    <div>
      <div class="card"><div class="cardhead"><span class="t">Series</span></div>
        <div class="rows-tight" style="padding-bottom:6px">${series.map((s) => `<div class="row"><div><div class="t" style="font-weight:600">${esc(s.name)}</div><div class="s">${esc(s.premise)} · ${esc(s.cadence)}</div></div><span class="pill gold">${studio.getEpisodes(s.id).length} eps</span></div>`).join("")}</div></div>
      <div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">AI avatar queue</span><a data-nav="/studio/avatar">Open →</a></div>
        <div class="pad" style="font-size:12.5px">${scripts.length} script${scripts.length === 1 ? "" : "s"} · ${jobs.length} job${jobs.length === 1 ? "" : "s"} · every output flagged <span class="pill navy">ai_generated</span></div></div>
    </div>
  </div>
  <div class="sec">Episodes</div>
  <div class="card rows-tight">${episodes.map((e) => {
    const stage = studio.episodeStage(e);
    return `<div class="row"><div><a class="t" data-nav="/studio/episodes/${e.id}" style="font-weight:600">${esc(e.working_title)}</a>
      <div class="s">${esc(studio.getSeriesById(e.series_id)?.name ?? "")} · created ${fmtTs(e.created_at)}</div></div>
      <span class="pill ${stage === "ready_to_publish" ? "green" : stage.includes("submitted") ? "amber" : "navy"}">${esc(STAGE_LABELS[stage] ?? stage)}</span></div>`;
  }).join("") || '<div class="empty">No episodes yet — create one.</div>'}</div>`;
}

function moduleCard(title, inner, actions = "") {
  return `<div class="card" style="margin-bottom:14px"><div class="cardhead"><span class="t">${title}</span><div class="btns">${actions}</div></div>
    <div class="pad" style="font-size:12.5px">${inner}</div></div>`;
}
const actBtn = (id, label, gold = false) => `<button class="btn ${gold ? "gold" : ""}" id="${id}" style="padding:4px 12px;font-size:11px">${label}</button>`;

function viewEpisode(id) {
  const ep = studio.getEpisodeById(id);
  if (!ep) return `<div class="empty">Unknown episode. <a data-nav="/studio" style="color:var(--gold)">Back to the studio</a></div>`;
  const stage = studio.episodeStage(ep);
  const research = studio.getEpisodeResearch(id);
  const hooks = studio.getHookBank(id);
  const outline = studio.getOutline(id);
  const session = studio.getRecordingSession(id);
  const transcript = studio.getTranscript(id);
  const cands = studio.getClipCandidates(id);
  const clips = studio.getClipAssets(id);
  const titles = studio.getTitles(id);
  const desc = studio.getDescription(id);
  const thumb = studio.getThumbnailBrief(id);
  const monet = studio.getMonetizationReview(id);
  const repurp = studio.getRepurposingAssets(id);
  const pubJobs = studio.getPublishingJobs(id);
  const epScripts = studio.getAvatarScripts().filter((s) => s.episode_id === id);
  onAfter(() => {
    const on = (bid, fn) => document.getElementById(bid)?.addEventListener("click", () => tryDo(fn));
    on("g-concept", () => studio.submitConceptForApproval(id));
    on("g-research", () => studio.generateEpisodeResearch(id));
    on("g-hooks", () => studio.generateHooks(id));
    on("g-outline", () => studio.generateEpisodeOutline(id));
    on("g-outline-submit", () => studio.submitOutlineForApproval(id));
    on("g-record", () => studio.createRecordingChecklist(id));
    on("g-transcript", () => studio.importTranscript(id, document.getElementById("tr-text").value, { source: "manual_paste" }));
    on("g-cands", () => studio.detectClipCandidates(id));
    on("g-clipplan", () => studio.generateClipPlan(id));
    on("g-clips-submit", () => studio.submitClipsForApproval(id));
    on("g-pack", () => { studio.generateTitles(id); studio.generateDescription(id); studio.generateThumbnailBrief(id); });
    on("g-pack-submit", () => studio.submitPublishingPackForApproval(id));
    on("g-monet", () => studio.runMonetizationReview(id, {
      sponsor: document.getElementById("mo-sponsor").value.trim() || undefined,
      sponsor_copy: document.getElementById("mo-copy").value.trim() || undefined,
    }));
    on("g-repurp", () => studio.generateRepurposingAssets(id));
    on("g-publish", () => studio.createPublishingJob(id, { channel: document.getElementById("pub-channel").value }));
  });
  return `
  <div class="crumb"><a data-nav="/studio">Media Studio</a> / ${esc(studio.getSeriesById(ep.series_id)?.name ?? "")}</div>
  <div class="head"><h1>${esc(ep.working_title)}</h1><span class="pill navy">${esc(STAGE_LABELS[stage] ?? stage)}</span></div>
  <div class="sub">${esc(ep.concept || "—")} · audience: ${esc(ep.audience_hint || "—")}</div>
  <div class="card" style="margin:6px 0 18px"><div class="pad" style="display:flex;gap:16px;flex-wrap:wrap;font-size:11.5px;align-items:center">
    <b style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut)">Gates</b>
    <span>Concept ${gatePill(ep.concept_approval_id)}</span>
    <span>Talking points ${gatePill(ep.outline_approval_id)}</span>
    <span>Clips ${gatePill(ep.clips_approval_id)}</span>
    <span>Publish pack ${gatePill(ep.pack_approval_id)}</span>
    <span>Claims ${monet ? (monet.flags?.length ? gatePill(monet.approval_id) : '<span class="pill green">clean</span>') : '<span class="pill gray">not run</span>'}</span>
    <a data-nav="/approvals" style="color:var(--gold);font-weight:600;margin-left:auto">Decide in the Approval Center →</a>
  </div></div>
  <div class="grid g2">
  <div>
    ${moduleCard("1 · Concept gate", `Approve the episode concept before production.`,
      studio.gateStatus(ep.concept_approval_id) === "not_submitted" ? actBtn("g-concept", "Submit concept", true) : gatePill(ep.concept_approval_id))}
    ${moduleCard("2 · Research board", research.length ? `<ul class="list" style="padding:0 0 0 2px">${research.map((r) => `<li><b>${esc(r.angle.replace(/_/g, " "))}</b> — ${esc(r.note)}</li>`).join("")}</ul>` : "No research yet.", actBtn("g-research", research.length ? "Regenerate" : "Generate"))}
    ${moduleCard("3 · Hook bank", hooks ? `<ul class="list" style="padding:0 0 0 2px">${hooks.hooks.map((h) => `<li><span class="pill gold">${esc(h.style)}</span> ${esc(h.text)}</li>`).join("")}</ul>` : "No hooks yet.", actBtn("g-hooks", hooks ? "Regenerate" : "Generate"))}
    ${moduleCard("4 · Outline (talking points)", outline ? `<ul class="list" style="padding:0 0 0 2px">${outline.beats.map((b) => `<li><b>${esc(b.title)}</b> (${b.mins}m) — ${esc(b.detail)}</li>`).join("")}</ul>` : "Requires concept gate approved.",
      `${actBtn("g-outline", outline ? "Regenerate" : "Generate")}${outline && studio.gateStatus(ep.outline_approval_id) === "not_submitted" ? actBtn("g-outline-submit", "Submit for recording", true) : ""}`)}
    ${moduleCard("5 · Recording prep", session ? `<div class="s" style="margin-bottom:6px">${esc(session.recording_link)}</div><ul class="list" style="padding:0 0 0 2px">${session.checklist.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : "Requires talking points approved.", session ? `<span class="pill ${session.status === "recorded" ? "green" : "amber"}">${esc(session.status)}</span>` : actBtn("g-record", "Create checklist"))}
    ${moduleCard("6 · Transcript", transcript ? `<span class="pill green">imported</span> ${transcript.word_count} words · ${esc(transcript.source)}` :
      `<textarea id="tr-text" placeholder="Paste the Riverside/Descript transcript export here…" style="width:100%;min-height:110px;padding:9px 11px;border:1px solid var(--line2);border-radius:9px;font-size:12px;font-family:var(--sans);background:var(--bg)"></textarea>`,
      transcript ? "" : actBtn("g-transcript", "Import", true))}
  </div>
  <div>
    ${moduleCard("7 · Clip planner", `${cands.length ? `<b style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)">Candidates</b><ul class="list" style="padding:0 0 0 2px">${cands.map((c) => `<li>#${c.rank} (score ${c.score}) “${esc(c.quote)}”</li>`).join("")}</ul>` : "Import the transcript, then detect."}
      ${clips.length ? `<b style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)">Plan</b><ul class="list" style="padding:0 0 0 2px">${clips.map((c) => `<li>${esc(c.label)} · <span class="pill navy">${esc(c.platform)}</span></li>`).join("")}</ul>` : ""}`,
      `${actBtn("g-cands", cands.length ? "Re-detect" : "Detect candidates")}${cands.length ? actBtn("g-clipplan", clips.length ? "Regenerate plan" : "Clip plan") : ""}${clips.length && studio.gateStatus(ep.clips_approval_id) === "not_submitted" ? actBtn("g-clips-submit", "Submit clips", true) : ""}`)}
    ${moduleCard("8 · Publishing packet", titles ? `<b style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)">Titles</b><ul class="list" style="padding:0 0 0 2px">${titles.options.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      <b style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)">Thumbnail</b><div style="margin:4px 0 8px">${esc(thumb?.text_overlay ?? "")} — ${esc(thumb?.face ?? "")}</div>
      <b style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)">Description</b><div style="white-space:pre-wrap;margin-top:4px">${esc(desc?.copy ?? "")}</div>` : "Generate title options + description + thumbnail brief.",
      `${actBtn("g-pack", titles ? "Regenerate pack" : "Generate pack")}${titles && studio.gateStatus(ep.pack_approval_id) === "not_submitted" ? actBtn("g-pack-submit", "Submit pack", true) : ""}`)}
    ${moduleCard("9 · Monetization review", monet ? `<span class="pill ${monet.status === "clean" ? "green" : "amber"}">${esc(monet.status.replace(/_/g, " "))}</span> ${esc(monet.note)}${monet.flags?.length ? `<ul class="list" style="padding:0 0 0 2px">${monet.flags.map((f) => `<li><b>${esc(f.kind)}</b>: “${esc(f.match)}”</li>`).join("")}</ul>` : ""}` :
      `<input id="mo-sponsor" placeholder="Sponsor (optional)" style="width:100%;padding:7px 10px;border:1px solid var(--line2);border-radius:8px;margin-bottom:7px;background:var(--bg);font-family:var(--sans);font-size:12px" />
       <input id="mo-copy" placeholder="Sponsor read copy (optional)" style="width:100%;padding:7px 10px;border:1px solid var(--line2);border-radius:8px;background:var(--bg);font-family:var(--sans);font-size:12px" />`,
      monet ? actBtn("g-monet", "Re-run") : actBtn("g-monet", "Run review", true))}
    ${moduleCard("10 · Repurposing board", repurp.length ? `<ul class="list" style="padding:0 0 0 2px">${repurp.map((r) => `<li>${esc(r.title)} <span class="pill gray">${esc(r.status)}</span></li>`).join("")}</ul>` : "Requires clips gate approved.", actBtn("g-repurp", "Generate"))}
    ${moduleCard("11 · Publishing", `${pubJobs.length ? pubJobs.map((j) => `<div style="margin-bottom:6px"><span class="pill green">${esc(j.status)}</span> ${esc(j.channel)} · ${esc(j.note)}</div>`).join("") : "Requires clips + pack + claims gates."}
      <select id="pub-channel" style="padding:7px 10px;border:1px solid var(--line2);border-radius:8px;background:var(--bg);font-family:var(--sans);font-size:12px;margin-top:6px"><option>youtube</option><option>spotify</option><option>apple_podcasts</option></select>`,
      actBtn("g-publish", "Create publishing job", true))}
    ${moduleCard("12 · AI avatar queue", epScripts.length ? epScripts.map((s) => `<div style="margin-bottom:5px">“${esc(s.title)}” <span class="pill ${s.status === "submitted" ? "amber" : "gray"}">${esc(s.status)}</span> <span class="mono s">${esc(s.hash)}</span></div>`).join("") : "No avatar scripts for this episode.", `<button class="btn" data-nav="/studio/avatar" style="padding:4px 12px;font-size:11px">Avatar Studio →</button>`)}
  </div></div>`;
}

function viewAvatarCenter() {
  const profiles = studio.getAvatarProfiles();
  const voices = studio.getVoiceProfiles();
  const scripts = studio.getAvatarScripts().slice().reverse();
  const jobs = studio.getAvatarVideoJobs().slice().reverse();
  const usage = studio.getAvatarUsageLogs().slice().reverse().slice(0, 10);
  onAfter(() => {
    const on = (sel, fn) => outlet.querySelectorAll(sel).forEach((b) => b.addEventListener("click", () => tryDo(() => fn(b))));
    document.getElementById("scr-create")?.addEventListener("click", () => tryDo(() => studio.createAvatarScript(
      document.getElementById("scr-profile").value,
      { title: document.getElementById("scr-title").value.trim(), body: document.getElementById("scr-body").value.trim(), use_case: document.getElementById("scr-usecase").value })));
    on("[data-scr-submit]", (b) => studio.submitAvatarForApproval(b.dataset.scrSubmit));
    on("[data-scr-job]", (b) => studio.createAvatarVideoJob(b.dataset.scrJob));
    on("[data-job-packet]", (b) => {
      const pkt = studio.generateAvatarVendorPacket(b.dataset.jobPacket);
      download(`avatar-job-${pkt.job_id}.json`, JSON.stringify(pkt, null, 2), "application/json");
    });
    on("[data-job-output]", (b) => {
      const ref = window.prompt("Output reference from the vendor (URL or asset id):", "vendor://render/");
      if (ref) studio.recordAvatarOutput(b.dataset.jobOutput, ref);
    });
    on("[data-job-review]", (b) => studio.submitAvatarOutputForReview(b.dataset.jobReview));
    on("[data-job-publish]", (b) => studio.publishAvatarJob(b.dataset.jobPublish));
  });
  const p = profiles[0];
  return `
  <div class="head"><div><div class="crumb"><a data-nav="/studio">Media Studio</a> / digital double</div><h1>Avatar Studio</h1></div>
    <span class="chip">${jobs.length} job${jobs.length === 1 ? "" : "s"}</span></div>
  <div class="sub">Governed likeness only: documented consent, approved use cases, hash-bound script approvals, output review, and an always-on usage log (docs/AI_AVATAR_ENGINE_SPEC.md). Every output carries the <b>ai_generated</b> flag.</div>
  ${preview}
  <div class="grid g2">
    <div>
      <div class="card"><div class="cardhead"><span class="t">Avatar profile</span><span class="pill green">authorized</span></div><div class="kv">
        <span class="k">Likeness</span><span>${esc(p.name)}</span>
        <span class="k">Voice</span><span>${esc(voices[0]?.name ?? "—")}</span>
        <span class="k">Consent</span><span>${esc(p.consent.document_ref)} · granted ${esc(p.consent.granted_at.slice(0, 10))} · ${esc(p.consent.revocable)}</span>
        <span class="k">Scope</span><span>${esc(p.consent.scope)}</span>
        <span class="k">Use cases</span><span>${p.approved_use_cases.map((u) => `<span class="pill navy" style="margin:1px 3px 1px 0">${esc(u)}</span>`).join("")}</span>
        <span class="k">Hard rules</span><span>no third-party likeness/voice · no deceptive impersonation · every job logged · every output flagged AI-generated</span>
      </div></div>
      <div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">New script</span></div><div class="pad">
        <select id="scr-profile" style="width:100%;padding:8px 10px;border:1px solid var(--line2);border-radius:9px;margin-bottom:8px;background:var(--bg);font-family:var(--sans);font-size:12.5px">${profiles.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select>
        <select id="scr-usecase" style="width:100%;padding:8px 10px;border:1px solid var(--line2);border-radius:9px;margin-bottom:8px;background:var(--bg);font-family:var(--sans);font-size:12.5px">${studio.APPROVED_USE_CASES.map((u) => `<option>${esc(u)}</option>`).join("")}</select>
        <input id="scr-title" placeholder="Script title" style="width:100%;padding:8px 10px;border:1px solid var(--line2);border-radius:9px;margin-bottom:8px;background:var(--bg);font-family:var(--sans);font-size:12.5px" />
        <textarea id="scr-body" placeholder="The exact words the double will speak — approval binds to this text's hash." style="width:100%;min-height:100px;padding:9px 11px;border:1px solid var(--line2);border-radius:9px;font-size:12.5px;font-family:var(--sans);background:var(--bg)"></textarea>
        <div style="margin-top:9px"><button class="btn gold" id="scr-create">Create script</button></div>
      </div></div>
      <div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">Usage log · append-only</span></div>
        <div class="rows-tight" style="padding-bottom:6px">${usage.map((u) => `<div class="row"><div><div class="t" style="font-size:12px">${esc(u.note)}</div><div class="s">${fmtTs(u.at)}${u.job_id ? ` · ${esc(u.job_id)}` : ""}</div></div></div>`).join("") || '<div class="empty">No usage yet.</div>'}</div></div>
    </div>
    <div>
      <div class="card"><div class="cardhead"><span class="t">Scripts</span></div>
        ${scripts.map((s) => `<div class="apr"><div class="body">
          <div class="t">${esc(s.title)}</div>
          <div class="meta"><span class="pill navy">${esc(s.use_case)}</span> · <span class="mono">${esc(s.hash)}</span> · ${gatePill(s.approval_id)}</div>
          <div class="s" style="margin-top:5px">${esc(s.body.slice(0, 140))}${s.body.length > 140 ? "…" : ""}</div></div>
          <div class="btns">
            ${studio.gateStatus(s.approval_id) === "not_submitted" ? `<button class="btn gold" data-scr-submit="${s.id}">Submit</button>` : ""}
            ${studio.gateStatus(s.approval_id) === "approved" ? `<button class="btn primary" data-scr-job="${s.id}">Create job</button>` : ""}
          </div></div>`).join("") || '<div class="empty">No scripts yet.</div>'}</div>
      <div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">Video job queue</span></div>
        ${jobs.map((j) => `<div class="apr"><div class="body">
          <div class="t">${esc(j.id)} <span class="pill ${j.status === "published" ? "green" : j.status === "in_review" ? "amber" : "navy"}">${esc(j.status.replace(/_/g, " "))}</span> <span class="pill gold">ai_generated</span></div>
          <div class="meta">${esc(j.vendor)} · ${esc(j.format)}${j.output_ref ? ` · output: ${esc(j.output_ref)}` : ""}</div></div>
          <div class="btns">
            <button class="btn" data-job-packet="${j.id}">Vendor packet</button>
            ${!j.output_ref ? `<button class="btn" data-job-output="${j.id}">Record output</button>` : ""}
            ${j.output_ref && studio.gateStatus(j.output_approval_id) === "not_submitted" ? `<button class="btn gold" data-job-review="${j.id}">Submit for review</button>` : ""}
            ${studio.gateStatus(j.output_approval_id) === "approved" && j.status !== "published" ? `<button class="btn primary" data-job-publish="${j.id}">Mark published</button>` : ""}
          </div></div>`).join("") || '<div class="empty">No jobs — approve a script first.</div>'}</div>
    </div>
  </div>`;
}

// ---------- boot ----------
document.getElementById("btn-reset")?.addEventListener("click", () => {
  if (window.confirm("Reset all local demo decisions, logs, factory packets, and studio state to the seed?")) {
    svc.resetLocalState(); fac.resetFactoryState(); studio.resetStudioState(); render();
  }
});
render();
