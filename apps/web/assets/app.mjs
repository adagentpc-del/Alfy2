/**
 * Alfy2 Enterprise Command Center — SPA shell. Vanilla ES modules, no build step (ADR-0127).
 * Routes: /command-center /agents /agents/:id /portfolio /portfolio/:id /approvals /reports/weekly /brain
 * Path routing on http(s) (Vercel rewrite → index.html); hash routing on file://.
 * All data flows through services.mjs; approve/deny mutate local preview state (docs/APPROVAL_CENTER_SPEC.md).
 */
import * as svc from "./services.mjs";
import * as fac from "./factories.mjs";
import * as studio from "./media-studio.mjs";
import * as ready from "./readiness.mjs";
import * as pay from "./divini-pay.mjs";
import * as forge from "./forge.mjs";

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
  { re: /^\/readiness$/, view: viewReadiness, nav: "readiness" },
  { re: /^\/pay$/, view: viewDiviniPay, nav: "pay" },
  { re: /^\/forge$/, view: viewForge, nav: "forge" },
  { re: /^\/forge\/new$/, view: viewForgeWizard, nav: "forge" },
  { re: /^\/forge\/projects\/([\w-]+)$/, view: (m) => viewForgeProject(m[1]), nav: "forge" },
  { re: /^\/forge\/registry$/, view: viewForgeRegistry, nav: "forge" },
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

/** Executive summary strip — the nine facts every screen answers in three seconds. Empty cells drop. */
function execStrip(cells) {
  const filled = cells.filter((c) => c && c.v != null && String(c.v).trim() !== "");
  return `<div class="execstrip">${filled.map((c) =>
    `<div class="cell${c.cls ? " " + c.cls : ""}"><div class="k">${esc(c.k)}</div><div class="v">${c.raw ?? esc(c.v)}</div></div>`).join("")}</div>`;
}
const lastUpdated = () => { const l = svc.getActionLogs(1)[0]; return l ? fmtTs(l.ts) : "—"; };

// ---------- drawer (approval detail) ----------
const drawerEl = document.getElementById("drawer");
const scrimEl = document.getElementById("scrim");
function openDrawer(html) { drawerEl.innerHTML = html; drawerEl.classList.add("open"); scrimEl.classList.add("open"); drawerEl.setAttribute("aria-hidden", "false"); }
function closeDrawer() { drawerEl.classList.remove("open"); scrimEl.classList.remove("open"); drawerEl.setAttribute("aria-hidden", "true"); }
scrimEl.addEventListener("click", closeDrawer);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
document.addEventListener("click", (e) => {
  const open = e.target.closest("[data-apr-drawer]");
  if (open) { openApprovalDrawer(open.dataset.aprDrawer); return; }
  if (e.target.closest("[data-drawer-close]")) { closeDrawer(); return; }
  const ap = e.target.closest("[data-drawer-approve]");
  if (ap) { svc.approveRequest(ap.dataset.drawerApprove); closeDrawer(); render(); return; }
  const dn = e.target.closest("[data-drawer-deny]");
  if (dn) {
    const reason = window.prompt("Reason for denial (recorded in the log):", "");
    if (reason === null) return;
    svc.rejectRequest(dn.dataset.drawerDeny, reason); closeDrawer(); render();
  }
});
function openApprovalDrawer(id) {
  const r = svc.getApprovalRequests().find((x) => x.id === id);
  if (!r) return;
  const agent = svc.getAgentById(r.requested_by);
  const decided = r.status !== "pending";
  openDrawer(`
    <div class="dhead"><span class="t">Approval · ${esc(r.action_class)}</span><button data-drawer-close>Close ✕</button></div>
    <div class="dbody">
      <div style="font-family:var(--serif);font-size:17px;line-height:1.4">${esc(r.title)}</div>
      <div style="margin-top:6px">${classPill(r.action_class)} <span class="pill ${decided ? (r.status === "approved" ? "green" : "red") : "amber"}">${esc(r.status)}</span></div>
      <div class="dk">The ask</div><div class="dv">${esc(r.ask)}</div>
      <div class="dk">Impact</div><div class="dv">${esc(r.impact || "—")}</div>
      <div class="dk">Evidence</div><div class="dv" style="overflow-wrap:anywhere">${esc(r.evidence || "—")}</div>
      <div class="dk">Requested by</div><div class="dv">${agent ? `<a data-nav="/agents/${agent.id}" data-drawer-close style="color:var(--gold);font-weight:600">${esc(agent.title)}</a>` : esc(r.requested_by)} · ${fmtTs(r.requested_at)}</div>
      ${r.business_id ? `<div class="dk">Business</div><div class="dv"><a data-nav="/portfolio/${esc(r.business_id)}" data-drawer-close style="color:var(--gold);font-weight:600">${esc(svc.getCompanyById(r.business_id)?.name ?? r.business_id)}</a></div>` : ""}
      ${decided ? `<div class="dk">Decision</div><div class="dv">${esc(r.status)} by ${esc(r.decided_by)} · ${fmtTs(r.decided_at)}${r.denial_reason ? ` — “${esc(r.denial_reason)}”` : ""}</div>` : ""}
      ${!decided ? `<div class="btns" style="margin-top:20px">
        <button class="btn danger" data-drawer-deny="${esc(r.id)}">Deny</button>
        <button class="btn gold" data-drawer-approve="${esc(r.id)}">Approve</button>
      </div>` : ""}
      <div class="dk" style="margin-top:22px">Gate mechanics</div>
      <div class="dv" style="font-size:11.5px;color:var(--mut)">Approving mints a one-time token bound to this exact action class. Execution steps carry their own tokens — approving a plan never auto-executes anything external.</div>
    </div>`);
}

function approvalRow(r, withActions) {
  const decided = r.status !== "pending";
  return `<div class="apr">
    <div class="body">
      <div class="t" data-apr-drawer="${esc(r.id)}" style="cursor:pointer">${esc(r.title)}</div>
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
  ${execStrip([
    { k: "Status", v: s.pending_approvals.length ? "needs you" : "steady", cls: s.pending_approvals.length ? "" : "" },
    { k: "Priority", v: s.business_status.find((b) => b.status === "amber")?.name ?? "hold course" },
    { k: "Owner", v: "Chief of Staff" },
    { k: "Blocked", v: `${s.blocked_workflows.length} workflows` },
    { k: "Approvals", v: `${s.pending_approvals.length} pending` },
    { k: "Revenue", v: `${money(s.revenue_mtd)} / ${money(s.revenue_target)}` },
    { k: "Updated", v: lastUpdated() },
    { k: "Recommended decision", v: s.next_best_action, cls: "decision" },
  ])}
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

  <div class="sec">Sovereign infrastructure · Alfy Forge</div>
  <div class="card"><div class="pad" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">
    ${(() => {
      const reg = forge.getRegistry();
      const warns = reg.map((p) => ({ p, w: forge.missingInfrastructure(p) })).filter((x) => x.w.length);
      const plans = forge.getMigrationPlans();
      const worst = warns.sort((a, b) => b.w.length - a.w.length)[0];
      return `<div style="flex:1;min-width:220px">
        <div style="font-family:var(--serif);font-size:15px">${reg.length} platforms on the ledger · ${plans.length} migration plan${plans.length === 1 ? "" : "s"} drafted</div>
        <div class="s" style="color:var(--mut);margin-top:3px">${warns.reduce((s, x) => s + x.w.length, 0)} infrastructure warnings — worst: <b>${esc(worst?.p.platform_name ?? "—")}</b> (${worst?.w.length ?? 0})</div>
      </div>
      <div class="btns"><button class="btn primary" data-nav="/forge/registry">Open Platform Registry</button><button class="btn" data-nav="/forge/new">Create Platform</button></div>`;
    })()}
  </div></div>

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
  ${(() => {
    const blocked = svc.getAgents({ status: "blocked" });
    return execStrip([
      { k: "Status", v: `${svc.getAgents().length - blocked.length}/${svc.getAgents().length} on post` },
      { k: "Priority", v: blocked.length ? "unblock first" : "hold course" },
      { k: "Owner", v: "Executive Governor" },
      { k: "Blocked", v: blocked.map((a) => a.title).join(", ") || "none" },
      { k: "Approvals", v: `${svc.getApprovalRequests("pending").length} pending` },
      { k: "Revenue", v: "CRO carries the number" },
      { k: "Updated", v: lastUpdated() },
      { k: "Recommended decision", v: blocked[0]?.next_action ?? "Grade the monthly scorecards.", cls: "decision" },
    ]);
  })()}
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
  ${execStrip([
    { k: "Status", v: a.status },
    { k: "Priority", v: a.layer === "cabinet" ? "cabinet seat" : "portfolio ops" },
    { k: "Owner", v: a.title },
    { k: "Blocked", v: a.status === "blocked" ? a.risks[0] : "no" },
    { k: "Approvals", v: `${approvals.filter((r) => r.status === "pending").length} raised · ${esc(a.authority_level)}` },
    { k: "Revenue", v: biz ? `${biz.name} ${biz.revenue_mtd ? money(biz.revenue_mtd) : ""}` : a.kpis[0] ? `${a.kpis[0].name}: ${a.kpis[0].current}` : "—" },
    { k: "Cadence", v: a.reporting_cadence },
    { k: "Recommended decision", v: a.next_action, cls: "decision" },
  ])}
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
  ${(() => {
    const s = svc.getExecutiveDashboardSummary();
    const p1 = cs.find((c) => c.revenue_priority.startsWith("P1"));
    return execStrip([
      { k: "Status", v: `${cs.filter((c) => c.status === "green").length} green · ${cs.filter((c) => c.status === "amber").length} watch` },
      { k: "Priority", v: p1?.name ?? "—" },
      { k: "Owner", v: "Portfolio Strategist" },
      { k: "Blocked", v: `${s.blocked_workflows.length} workflows` },
      { k: "Approvals", v: `${s.pending_approvals.length} pending` },
      { k: "Revenue", v: `${money(s.revenue_mtd)} MTD` },
      { k: "Updated", v: lastUpdated() },
      { k: "Recommended decision", v: p1?.fastest_path ?? "Run the monthly re-rank.", cls: "decision" },
    ]);
  })()}
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
  ${execStrip([
    { k: "Status", v: `${c.status} · ${c.stage}` },
    { k: "Priority", v: c.revenue_priority },
    { k: "Owner", v: agent?.title ?? "Portfolio Strategist" },
    { k: "Blocked", v: os.blocked_workflows[0] ?? "no" },
    { k: "Approvals", v: `${approvals.filter((r) => r.status === "pending").length} pending` },
    { k: "Revenue", v: c.revenue_target ? `${money(c.revenue_mtd)} / ${money(c.revenue_target)}` : "pre-revenue" },
    { k: "Updated", v: logs[0] ? fmtTs(logs[0].ts) : "—" },
    { k: "Recommended decision", v: approvals.find((r) => r.status === "pending")?.title ?? c.fastest_path, cls: "decision" },
  ])}
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
  <div class="sub">Nothing external — sends, publishes, contracts, pricing — moves without your token (docs/APPROVAL_CENTER_SPEC.md). Click any title for the full drawer.</div>
  ${preview}
  ${(() => {
    const money1 = pending.find((r) => ["send_contract", "change_pricing", "move_money", "charge"].includes(r.action_class));
    const oldest = [...pending].sort((a, b) => (a.requested_at < b.requested_at ? -1 : 1))[0];
    return execStrip([
      { k: "Status", v: pending.length ? `${pending.length} waiting` : "queue clear" },
      { k: "Priority", v: money1 ? "money & contracts first" : "sends & publishes" },
      { k: "Owner", v: "Alyssa — only token minter" },
      { k: "Blocked", v: `${svc.getExecutiveDashboardSummary().blocked_workflows.length} workflows wait downstream` },
      { k: "Oldest", v: oldest ? fmtTs(oldest.requested_at) : "—" },
      { k: "Revenue", v: pending.some((r) => r.business_id === "move_mi") ? "Move Mi cash in queue" : "—" },
      { k: "Updated", v: lastUpdated() },
      { k: "Recommended decision", v: (money1 ?? oldest)?.title ?? "Nothing needs you.", cls: "decision" },
    ]);
  })()}
  <div class="sec">Live gate queue · from the connected API</div>
  <div class="card" id="live-apr"><div class="pad">
    <div class="skel" style="height:13px;width:85%;margin-bottom:9px">.</div>
    <div class="skel" style="height:13px;width:60%">.</div>
  </div></div>
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
  ${(() => {
    const s = svc.getExecutiveDashboardSummary();
    return execStrip([
      { k: "Status", v: latest ? `${latest.week} on file` : "no report yet" },
      { k: "Priority", v: "cadence: weekly, never skipped twice" },
      { k: "Owner", v: "Chief of Staff · Data & Analytics" },
      { k: "Blocked", v: `${s.blocked_workflows.length} carried into next week` },
      { k: "Approvals", v: `${s.pending_approvals.length} open going into the week` },
      { k: "Revenue", v: `${money(s.revenue_mtd)} MTD` },
      { k: "Updated", v: latest ? fmtTs(latest.generated_at) : "—" },
      { k: "Recommended decision", v: "Generate this week's report, then decide its top three next actions.", cls: "decision" },
    ]);
  })()}
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
  ${(() => {
    const drafts = packets.filter((p) => p.status === "draft");
    return execStrip([
      { k: "Status", v: `${packets.length} packets · ${drafts.length} draft` },
      { k: "Priority", v: "GTM before build spend" },
      { k: "Owner", v: "Venture Architect · CTO · CMO · CMO(media)" },
      { k: "Blocked", v: "no" },
      { k: "Approvals", v: `${packets.filter((p) => p.status === "submitted").length} go-aheads pending` },
      { k: "Revenue", v: "packets feed the revenue engine" },
      { k: "Updated", v: packets[0] ? fmtTs(packets[0].updated_at ?? packets[0].created_at) : "—" },
      { k: "Recommended decision", v: drafts[0] ? `Finish and submit "${drafts[0].name}".` : "Create the next packet from the July focus memo.", cls: "decision" },
    ]);
  })()}
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
  ${(() => {
    const waiting = episodes.filter((e) => ["concept_submitted"].includes(studio.episodeStage(e)));
    const ready = episodes.filter((e) => studio.episodeStage(e) === "ready_to_publish");
    return execStrip([
      { k: "Status", v: `${episodes.length} episodes · ${ready.length} ready` },
      { k: "Priority", v: "weekly cadence protected" },
      { k: "Owner", v: "Chief Media Officer · Decoded Agent" },
      { k: "Blocked", v: waiting.length ? `${waiting.length} at a gate` : "no" },
      { k: "Approvals", v: `${svc.getApprovalRequests("pending").filter((r) => r.title.startsWith("Studio gate")).length} studio gates pending` },
      { k: "Revenue", v: "authority engine — feeds every pipeline" },
      { k: "Updated", v: lastUpdated() },
      { k: "Recommended decision", v: ready[0] ? `Publish "${ready[0].working_title}".` : "Run the weekly batch-approval session.", cls: "decision" },
    ]);
  })()}
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
  ${(() => {
    const gates = [ep.concept_approval_id, ep.outline_approval_id, ep.clips_approval_id, ep.pack_approval_id];
    const pendingGates = gates.filter((g) => studio.gateStatus(g) === "pending").length;
    return execStrip([
      { k: "Status", v: STAGE_LABELS[stage] ?? stage },
      { k: "Priority", v: "weekly cadence" },
      { k: "Owner", v: "Decoded Podcast Agent" },
      { k: "Blocked", v: pendingGates ? `${pendingGates} gate${pendingGates > 1 ? "s" : ""} awaiting you` : "no" },
      { k: "Approvals", v: `${gates.filter((g) => studio.gateStatus(g) === "approved").length}/4 gates approved` },
      { k: "Revenue", v: monet?.sponsor ? `sponsor: ${monet.sponsor}` : "authority + sponsor slot" },
      { k: "Updated", v: fmtTs(ep.created_at) },
      { k: "Recommended decision", v: pendingGates ? "Decide the pending studio gates in the Approval Center." : stage === "ready_to_publish" ? "Publish — all gates green." : "Advance the next module below.", cls: "decision" },
    ]);
  })()}
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
  ${(() => {
    const inReview = jobs.filter((j) => j.status === "in_review");
    const drafts = scripts.filter((s) => studio.gateStatus(s.approval_id) === "not_submitted");
    return execStrip([
      { k: "Status", v: `${jobs.length} jobs · ${jobs.filter((j) => j.status === "published").length} published` },
      { k: "Priority", v: "consent + disclosure absolute" },
      { k: "Owner", v: "Chief Media Officer" },
      { k: "Blocked", v: inReview.length ? `${inReview.length} awaiting output review` : "no" },
      { k: "Approvals", v: `${scripts.filter((s) => studio.gateStatus(s.approval_id) === "pending").length} scripts pending` },
      { k: "Revenue", v: "scales Alyssa's presence, not her hours" },
      { k: "Updated", v: usage[0] ? fmtTs(usage[0].at) : "—" },
      { k: "Recommended decision", v: inReview[0] ? `Review output of ${inReview[0].id}.` : drafts[0] ? `Submit script "${drafts[0].title}".` : "Draft the next intro script.", cls: "decision" },
    ]);
  })()}
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

// ---------- view: enterprise readiness ----------
function orgNode(label, sub, cls = "") {
  return `<div style="text-align:center;padding:10px 16px;background:${cls === "gold" ? "linear-gradient(135deg,var(--gold-bright),var(--gold))" : cls === "navy" ? "var(--navy)" : "var(--surface)"};
    color:${cls === "gold" ? "var(--navy)" : cls === "navy" ? "#f2eddc" : "var(--ink)"};border:1px solid ${cls ? "transparent" : "var(--line)"};
    border-radius:12px;box-shadow:var(--shadow);display:inline-block;min-width:210px">
    <div style="font-family:var(--serif);font-size:${cls === "gold" ? "16px" : "14px"};font-weight:600">${esc(label)}</div>
    <div style="font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;opacity:.75;font-weight:600;margin-top:1px">${esc(sub)}</div></div>`;
}
function viewReadiness() {
  const report = ready.runReadinessCheck();
  const org = ready.getOrgChart();
  const rnd = ready.getRndAssets();
  return `
  <div class="head"><div><div class="crumb">Enterprise verification · runs live on every visit</div><h1>Readiness</h1></div>
    <span class="chip">${report.passed}/${report.total} checks</span></div>
  <div class="sub">Proof the command orchestration center is loaded, connected, and governed — hierarchy, dossiers, guardrails, approvals, KPIs, functional layers, avatar governance, and the R&D bench. Behavior is separately proven by the smoke suites.</div>
  ${execStrip([
    { k: "Status", v: report.ready ? "READY" : "NOT READY" },
    { k: "Priority", v: "governance before growth" },
    { k: "Owner", v: "Alfy2 — Chief Operating Intelligence System" },
    { k: "Blocked", v: report.ready ? "no" : `${report.total - report.passed} failing checks` },
    { k: "Approvals", v: `${svc.getApprovalRequests("pending").length} pending in the center` },
    { k: "Revenue", v: "trust is the asset" },
    { k: "Updated", v: fmtTs(report.at) },
    { k: "Recommended decision", v: report.ready ? "The cabinet is seated and governed — proceed to live data (Render re-sync)." : "Fix the failing checks before anything else.", cls: "decision" },
  ])}
  <div class="nba"><div><div class="k">Verdict</div><div class="a">${report.ready ? `All ${report.total} checks green. Alyssa DelTorre commands 1 operating intelligence system, 16 cabinet seats, and 10 portfolio agents — every one reporting up, gated, and measured.` : "Failing checks below — the machine does not claim readiness it hasn't earned."}</div></div></div>

  <div class="sec">Chain of command</div>
  <div class="card"><div class="pad" style="text-align:center">
    ${orgNode(org.founder.name, org.founder.title, "gold")}
    <div style="width:1px;height:18px;background:var(--gold);margin:4px auto"></div>
    ${orgNode(org.system.name, org.system.title, "navy")}
    <div style="width:1px;height:18px;background:var(--line2);margin:4px auto"></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:10px">
      ${org.cabinet.map((a) => `<a data-nav="/agents/${a.id}" class="pill navy" style="cursor:pointer">${esc(a.title.replace(/ (Officer )?Agent$/, ""))}</a>`).join("")}
    </div>
    <div style="font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);font-weight:700;margin:2px 0 8px">Executive cabinet · 16 seats</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center">
      ${org.portfolio.map((a) => `<a data-nav="/agents/${a.id}" class="pill gold" style="cursor:pointer">${esc(a.title.replace(/ Agent$/, ""))}</a>`).join("")}
    </div>
    <div style="font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);font-weight:700;margin-top:8px">Portfolio agents · 10, each sponsored by a cabinet seat</div>
  </div></div>

  <div class="sec">Verification · ${report.passed}/${report.total}</div>
  <div class="grid g2">
    ${report.sections.map((s) => `<div class="card"><div class="cardhead"><span class="t">${esc(s.name)}</span>
      <span class="pill ${s.checks.every((c) => c.pass) ? "green" : "red"}">${s.checks.filter((c) => c.pass).length}/${s.checks.length}</span></div>
      <div class="rows-tight" style="padding-bottom:6px">
      ${s.checks.map((c) => `<div class="row"><div class="t" style="font-size:12.5px"><span class="dot ${c.pass ? "green" : "red"}"></span>${esc(c.label)}</div><span class="pill ${c.pass ? "green" : "red"}">${c.pass ? "pass" : "FAIL"}</span></div>`).join("")}
      </div></div>`).join("")}
  </div>

  <div class="sec">R&D bench · vetted external research</div>
  ${rnd.map((r) => `<div class="card"><div class="cardhead"><span class="t">${esc(r.name)}</span>
      <div class="btns"><span class="pill gold">${esc(r.license)}</span><span class="pill amber">${esc(r.status.replace(/_/g, " "))}</span></div></div>
    <div class="pad" style="font-size:12.5px">
      <div>${esc(r.what_it_is)}</div>
      <div class="dk" style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);font-weight:700;margin:10px 0 3px">Why the R&D department wants it</div>
      <div>${esc(r.why_it_matters)}</div>
      <div class="dk" style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--red);font-weight:700;margin:10px 0 3px">Safety facts · guardrails binding</div>
      <div style="margin-bottom:5px">${esc(r.safety_facts)}</div>
      <ul style="margin:0 0 8px 16px">${r.guardrails.map((g) => `<li style="margin:3px 0">${esc(g)}</li>`).join("")}</ul>
      <div class="s" style="color:var(--mut)">Owner: <a data-nav="/agents/${esc(r.owner)}" style="color:var(--gold);font-weight:600">${esc(svc.getAgentById(r.owner)?.title ?? r.owner)}</a>
        · Steward: <a data-nav="/agents/${esc(r.steward)}" style="color:var(--gold);font-weight:600">${esc(svc.getAgentById(r.steward)?.title ?? r.steward)}</a>
        · Record: ${esc(r.doc)} · Source: ${esc(r.source)}</div>
    </div></div>`).join("")}`;
}

// ---------- view: Divini Pay ----------
function payDemoScenario() {
  const vendor = pay.onboardParty("finance_admin", { kind: "vendor", name: "Apex Logistics", platform: "divini_procure", consent_payment_linking: true });
  const buyer = pay.onboardParty("finance_admin", { kind: "buyer", name: "Meridian Dev Co", platform: "divini_procure", consent_payment_linking: true });
  const partner = pay.onboardParty("finance_admin", { kind: "partner", name: "Referral Partner One", platform: "divini_partners", consent_payment_linking: true });
  pay.addTokenizedInstrument("finance_admin", vendor.id, { rail: "ach", processor_token: "ptok_demo_ach" });
  pay.recordW9("finance_admin", vendor.id, "vault:tax/w9/apex-2026");
  pay.createPaymentLink("finance_admin", { amount_cents: 240_000, memo: "Henderson full-house move", payee_party_id: vendor.id, platform: "move_mi" });
  const inv = pay.createInvoice("finance_admin", { amount_cents: 250_000, payer_party_id: buyer.id, payee_party_id: vendor.id, memo: "Procurement project #1", platform: "divini_procure", referral_partner_id: partner.id });
  pay.recordPayment("finance_admin", inv.id, { rail: "ach", authorization_ref: "auth:vault/demo" });
  const po = pay.getPayouts().find((p) => p.kind === "vendor_payout");
  pay.requestPayoutRelease("finance_admin", po.id);
}
function viewDiviniPay() {
  const ledger = pay.getLedger();
  const invoices = pay.getInvoices();
  const payouts = pay.getPayouts();
  const parties = pay.getParties();
  const disputes = pay.getDisputes();
  const priv = pay.getPrivacyDashboard();
  const desk = pay.getPayAgents();
  const audits = pay.getAuditTrail().slice(-6).reverse();
  const pendingPo = payouts.filter((p) => ["pending_approval", "awaiting_money_movement_approval", "milestone_released", "awaiting_milestones"].includes(p.status));
  const calcAmount = 250_000;
  onAfter(() => {
    document.getElementById("pay-demo")?.addEventListener("click", () => tryDo(payDemoScenario));
    document.getElementById("pay-reset")?.addEventListener("click", () => tryDo(() => pay.resetPayState()));
    document.getElementById("pay-recon")?.addEventListener("click", () => tryDo(() => download("divini-pay-reconciliation.csv", pay.exportReconciliation("owner"), "text/csv")));
    document.getElementById("fee-amt")?.addEventListener("input", (e) => {
      const cents = Math.round(Number(e.target.value || 0) * 100);
      const box = document.getElementById("fee-out");
      if (!cents) { box.innerHTML = ""; return; }
      box.innerHTML = pay.compareFees(cents).map((f, i) => `<div class="row"><div class="t">${i === 0 ? "★ " : ""}${esc(f.label)}<div class="s">${esc(f.settles)}</div></div><div style="text-align:right"><b class="mono">$${(f.fee_cents / 100).toFixed(2)} fee</b><div class="s mono">net $${(f.net_cents / 100).toFixed(2)}</div></div></div>`).join("");
    });
    outlet.querySelectorAll("[data-po-exec]").forEach((b) => b.addEventListener("click", () => tryDo(() => pay.executeApprovedPayout("finance_admin", b.dataset.poExec))));
  });
  return `
  <div class="head"><div><div class="crumb">Divini Pay · privacy-first payment OS · Phase 1 Lite (mock rails)</div><h1>Divini Pay</h1></div>
    <div class="btns"><button class="btn" id="pay-demo">Load demo scenario</button><button class="btn" id="pay-recon">Export reconciliation</button><button class="btn" id="pay-reset">Reset</button></div></div>
  <div class="sub">Non-custodial payment layer: ACH-first routing, tokenized instruments only, PII-separated ledger, every money movement approval-gated. <b>Privacy from commercial exploitation — never from lawful oversight</b> (docs/DIVINI_PAY_COMPLIANCE_CHECKLIST.md).</div>
  ${preview}
  ${execStrip([
    { k: "Status", v: `Phase 1 Lite · ${ledger.length} ledger entries` },
    { k: "Priority", v: "ACH-first, cheapest compliant rail" },
    { k: "Owner", v: "Chief Finance · 12-agent payments desk" },
    { k: "Blocked", v: pay.WALLET_DESIGN.activated ? "—" : "wallet locked pending compliance review" },
    { k: "Approvals", v: `${payouts.filter((p) => p.status === "awaiting_money_movement_approval").length} money movements awaiting tokens` },
    { k: "Revenue", v: "modeled ~62% fee savings vs card baseline" },
    { k: "Updated", v: audits[0] ? fmtTs(audits[0].at) : "—" },
    { k: "Recommended decision", v: payouts.some((p) => p.status === "awaiting_money_movement_approval") ? "Decide the pending move_money approvals — funds move only on your token." : "Load the demo scenario, then walk one payout through the gate.", cls: "decision" },
  ])}
  <div class="metrics">
    <div class="metric goldline"><div class="l">Volume (ledger)</div><div class="v mono">$${(ledger.filter((e) => e.kind === "payment" && e.dir === "debit").reduce((s, e) => s + e.amount_cents, 0) / 100).toLocaleString()}</div><div class="d">gross processed (mock)</div></div>
    <div class="metric"><div class="l">Open invoices</div><div class="v mono">${invoices.filter((i) => i.status === "open").length}</div><div class="d">${invoices.length} total</div></div>
    <div class="metric"><div class="l">Payouts pending</div><div class="v mono">${pendingPo.length}</div><div class="d warn">gated as move_money</div></div>
    <div class="metric"><div class="l">Disputes</div><div class="v mono">${disputes.filter((d) => d.status === "open").length}</div><div class="d">holds enforced</div></div>
    <div class="metric"><div class="l">Parties</div><div class="v mono">${parties.length}</div><div class="d">${parties.filter((p) => p.w9?.tin_on_file).length} W-9 on file</div></div>
  </div>
  <div class="grid g2">
    <div>
      <div class="card"><div class="cardhead"><span class="t">Fee calculator · the reason this exists</span></div><div class="pad">
        <label style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);font-weight:700">Amount (USD)</label>
        <input id="fee-amt" type="number" value="${calcAmount / 100}" style="width:100%;padding:9px 12px;border:1px solid var(--line2);border-radius:9px;margin:5px 0 4px;background:var(--bg);font-family:var(--sans);font-size:14px" />
        <div id="fee-out" class="rows-tight">${pay.compareFees(calcAmount).map((f, i) => `<div class="row"><div class="t">${i === 0 ? "★ " : ""}${esc(f.label)}<div class="s">${esc(f.settles)}</div></div><div style="text-align:right"><b class="mono">$${(f.fee_cents / 100).toFixed(2)} fee</b><div class="s mono">net $${(f.net_cents / 100).toFixed(2)}</div></div></div>`).join("")}</div>
      </div></div>
      <div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">Payouts · every release needs your token</span><a data-nav="/approvals">Approval Center →</a></div>
        <div class="rows-tight" style="padding-bottom:6px">
        ${payouts.map((p) => `<div class="row"><div><div class="t" style="font-size:12.5px">${esc(p.kind.replace(/_/g, " "))} · <b class="mono">$${(p.amount_cents / 100).toFixed(2)}</b> → <span class="mono">${esc(p.payee_token)}</span></div><div class="s">${esc(p.invoice_id)}</div></div>
          <div class="btns"><span class="pill ${p.status === "paid" ? "green" : p.status === "dispute_hold" ? "red" : "amber"}">${esc(p.status.replace(/_/g, " "))}</span>
          ${p.status === "awaiting_money_movement_approval" && svc.getApprovalRequests().find((r) => r.id === p.approval_id)?.status === "approved" ? `<button class="btn gold" data-po-exec="${p.id}" style="padding:3px 10px;font-size:11px">Execute</button>` : ""}</div></div>`).join("") || '<div class="empty">No payouts yet — load the demo scenario.</div>'}
        </div></div>
      <div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">Privacy dashboard · promises, verified</span></div>
        <div class="rows-tight" style="padding-bottom:6px">
        ${priv.commitments.map((c) => `<div class="row"><span class="t" style="font-size:12px">${esc(c.rule)}</span><span class="pill ${c.status.includes("VIOLATION") ? "red" : "green"}" style="max-width:52%;white-space:normal;text-align:right">${esc(c.status)}</span></div>`).join("")}
        </div><div class="pad" style="font-size:11px;color:var(--mut);border-top:1px solid var(--line)">${esc(priv.lawful_oversight)}</div></div>
    </div>
    <div>
      <div class="card"><div class="cardhead"><span class="t">Transaction ledger · append-only, token-only</span></div>
        <div class="rows-tight" style="padding-bottom:6px">
        ${ledger.slice(-8).reverse().map((e) => `<div class="row"><div class="t mono" style="font-size:11.5px">${esc(e.account)} <span class="pill ${e.dir === "debit" ? "red" : "green"}">${e.dir}</span></div><span class="mono" style="font-size:12px">$${(e.amount_cents / 100).toFixed(2)}</span></div>`).join("") || '<div class="empty">Ledger empty.</div>'}
        </div></div>
      <div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">Divini Wallet · Phase 3</span><span class="pill red">locked</span></div><div class="pad" style="font-size:12px">
        Designed, not activated. Unlock requires:
        <ul style="margin:6px 0 0 16px">${pay.WALLET_DESIGN.activation_requires.slice(0, 4).map((r) => `<li style="margin:3px 0">${esc(r)}</li>`).join("")}</ul>
        <div class="s" style="margin-top:7px;color:var(--mut)">MTL tracker: ${pay.WALLET_DESIGN.licensing_tracker.states_cleared}/${pay.WALLET_DESIGN.licensing_tracker.states_total} states · model decision ${esc(pay.WALLET_DESIGN.licensing_tracker.model_decision)}</div>
      </div></div>
      <div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">Payments desk · 12 agents → Chief Finance</span></div>
        <div class="rows-tight" style="padding-bottom:6px">
        ${desk.map((a) => `<div class="row"><div><div class="t" style="font-size:12.5px;font-weight:600">${esc(a.title)}</div><div class="s">${esc(a.mission)}</div></div><span class="pill navy" style="white-space:normal;text-align:right;max-width:34%">${esc(a.kpis[0].name)}: ${esc(a.kpis[0].current)}</span></div>`).join("")}
        </div></div>
      <div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">Audit trail (latest)</span></div>
        <div class="rows-tight" style="padding-bottom:6px">
        ${audits.map((a) => `<div class="row"><div><div class="t" style="font-size:11.5px">${esc(a.action)} — ${esc(a.detail)}</div><div class="s">${fmtTs(a.at)} · ${esc(a.actor_role)}</div></div>${a.denied ? '<span class="pill red">denied</span>' : a.override ? '<span class="pill gold">override</span>' : ""}</div>`).join("") || '<div class="empty">No actions yet.</div>'}
        </div></div>
    </div>
  </div>`;
}

// ---------- views: Alfy Forge (Divini Sovereign Cloud) ----------
function viewForge() {
  const projects = forge.getProjects().slice().reverse();
  const live = forge.SECTIONS.filter((s) => s.live);
  const readiness = forge.EXISTING_PLATFORMS.map((p) => ({ p, r: forge.migrationReadiness(p.key) }));
  return `
  <div class="head"><div><div class="crumb">Alfy Forge · Divini Sovereign Cloud · Phase 1 of 9</div><h1>Alfy Forge</h1></div>
    <button class="btn gold" data-nav="/forge/new">Create Platform</button></div>
  <div class="sub">The private build cloud: one flow creates repo packets, docs, schema, secrets references, deploy configs, and backup policies — no bouncing between GitHub, Supabase, Vercel, and scattered dashboards. Sovereign replacements arrive phase by phase, never faked as live.</div>
  ${preview}
  ${execStrip([
    { k: "Status", v: `Phase 1 live · ${live.length}/17 sections active` },
    { k: "Priority", v: "simple + stable before sovereign" },
    { k: "Owner", v: "Chief Infrastructure Architect · 14-agent desk" },
    { k: "Blocked", v: "phases 2–9 staged (Forgejo → k3s)" },
    { k: "Approvals", v: `${svc.getApprovalRequests("pending").filter((r) => r.action_class === "deploy").length} deploys awaiting tokens` },
    { k: "Revenue", v: "SaaS fees → $0 on the sovereign path" },
    { k: "Updated", v: lastUpdated() },
    { k: "Recommended decision", v: projects.length ? `Review "${projects[0].name}" and decide its deploy.` : "Create the first platform through the wizard — everything else generates from it.", cls: "decision" },
  ])}
  <div class="sec">Platforms built in Forge · ${projects.length}</div>
  <div class="card rows-tight">${projects.map((p) => `<div class="row"><div><a class="t" data-nav="/forge/projects/${p.id}" style="font-weight:600">${esc(p.name)}</a>
      <div class="s">${esc(p.answers.surface.replace(/_/g, " "))} · ${esc(p.answers.environment)} · ${esc(p.domain.name)} · ${fmtTs(p.created_at)}</div></div>
      <span class="pill ${forge.deployStatus(p) === "approved" ? "green" : "navy"}">${p.steps.filter((s) => s.status === "done").length}/24 · deploy ${esc(forge.deployStatus(p).replace(/_/g, " "))}</span></div>`).join("") || '<div class="empty">Nothing forged yet — Create Platform runs the whole pipeline.</div>'}</div>

  <div class="sec">Platform registry · migration readiness</div>
  <div class="card rows-tight">
    <div class="row"><span class="t" style="font-weight:600">${forge.getRegistry().length} platforms on the ledger — providers, risks, and next actions per platform</span>
      <button class="btn gold" data-nav="/forge/registry" style="padding:4px 14px;font-size:11.5px">Open Platform Registry</button></div>
    ${readiness.slice(0, 5).map(({ p, r }) => `<div class="row"><div><div class="t" style="font-weight:600">${esc(p.name)}</div>
      <div class="s">deps: ${p.dependencies.join(", ") || "none"}</div></div>
      <div style="display:flex;align-items:center;gap:10px;min-width:180px"><div class="bar"><i style="width:${r.score}%"></i></div><span class="mono s" style="min-width:52px;text-align:right">${r.score}/100</span></div></div>`).join("")}
  </div>

  <div class="sec">The seventeen sections · honest phase labels</div>
  <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">
    ${forge.SECTIONS.map((s) => `<div class="acard" style="cursor:default"><div class="top"><span class="pill ${s.live ? "green" : "gray"}">${s.live ? "live" : `phase ${s.phase}`}</span></div>
      <h3 style="font-size:14px">${esc(s.label)}</h3>
      <div class="m" style="-webkit-line-clamp:2">${esc(s.note ?? s.outcome)}</div>
      <div class="na"><b>Outcome</b>${esc(s.outcome)}</div></div>`).join("")}
  </div>

  <div class="grid g2" style="margin-top:16px">
    <div class="card"><div class="cardhead"><span class="t">Infrastructure desk · 14 agents → CTO</span></div>
      <div class="rows-tight" style="padding-bottom:6px">
      ${forge.getForgeAgents().map((a) => `<div class="row"><div><div class="t" style="font-size:12.5px;font-weight:600">${esc(a.title)}</div><div class="s">${esc(a.mission)}</div></div></div>`).join("")}
      </div></div>
    <div>
      <div class="card"><div class="cardhead"><span class="t">Sovereign stack · 9 phases</span></div>
        <div class="rows-tight" style="padding-bottom:6px">
        ${forge.STACK.map((s) => `<div class="row"><div><div class="t" style="font-size:12.5px">${esc(s.tool)}</div><div class="s">replaces ${esc(s.replaces)}</div></div><span class="pill ${s.status === "live" ? "green" : s.status === "policy" ? "gold" : "gray"}">${s.status === "policy" ? "policy" : `P${s.phase} ${s.status}`}</span></div>`).join("")}
        </div></div>
      <div class="card" style="margin-top:16px"><div class="cardhead"><span class="t">Secrets vault audit</span></div>
        <div class="rows-tight" style="padding-bottom:6px">
        ${forge.getVaultAudit().slice(-5).reverse().map((a) => `<div class="row"><div><div class="t" style="font-size:11.5px">${esc(a.detail)}</div><div class="s">${fmtTs(a.at)}</div></div><span class="pill ${a.action === "REJECTED" ? "red" : a.action === "GRANTED" ? "gold" : "green"}">${esc(a.action)}</span></div>`).join("") || '<div class="empty">No vault activity yet.</div>'}
        </div></div>
    </div>
  </div>`;
}

function viewForgeWizard() {
  onAfter(() => {
    document.getElementById("forge-create").addEventListener("click", () => tryDo(() => {
      const a = {};
      for (const q of forge.WIZARD_QUESTIONS) {
        const el = document.getElementById("fw-" + q.k);
        a[q.k] = q.type === "bool" ? el.value === "yes" : el.value.trim();
        if (q.type === "bool") a[q.k] = el.value === "yes";
      }
      const p = forge.createPlatform(a);
      go("/forge/projects/" + p.id);
    }));
  });
  const field = (q) => {
    if (q.type === "bool") return `<select id="fw-${q.k}" style="width:100%;padding:8px 10px;border:1px solid var(--line2);border-radius:9px;background:var(--bg);font-family:var(--sans);font-size:13px"><option value="no">No</option><option value="yes">Yes</option></select>`;
    if (q.type === "select") return `<select id="fw-${q.k}" style="width:100%;padding:8px 10px;border:1px solid var(--line2);border-radius:9px;background:var(--bg);font-family:var(--sans);font-size:13px">${q.options.map((o) => `<option>${o}</option>`).join("")}</select>`;
    return `<input id="fw-${q.k}" placeholder="${esc(q.ph ?? "")}" style="width:100%;padding:8px 10px;border:1px solid var(--line2);border-radius:9px;background:var(--bg);font-family:var(--sans);font-size:13px" />`;
  };
  return `
  <div class="crumb"><a data-nav="/forge">Alfy Forge</a> / New Platform Wizard</div>
  <div class="head"><h1>Create Platform</h1><span class="chip">12 questions → 24 automatic steps</span></div>
  <div class="sub">Answer once. Forge generates the project record, folder structure, six source-of-truth docs, scaffold, schema, migrations, env template, secret references, storage/auth/email configs, deploy service, backup policy, and the execution packets — with remote deploys gated.</div>
  <div class="card" style="max-width:680px"><div class="pad">
    ${forge.WIZARD_QUESTIONS.map((q) => `<div style="margin-bottom:12px">
      <label style="font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);font-weight:600;display:block;margin-bottom:4px">${esc(q.q)}</label>${field(q)}</div>`).join("")}
    <div class="btns" style="margin-top:14px"><button class="btn gold" id="forge-create">Create Platform</button><button class="btn" data-nav="/forge">Cancel</button></div>
  </div></div>`;
}

function viewForgeProject(id) {
  const p = forge.getProjectById(id);
  if (!p) return `<div class="empty">Unknown project. <a data-nav="/forge" style="color:var(--gold)">Back to Forge</a></div>`;
  const ds = forge.deployStatus(p);
  const done = p.steps.filter((s) => s.status === "done").length;
  onAfter(() => {
    document.getElementById("fp-deploy")?.addEventListener("click", () => tryDo(() => forge.submitDeployForApproval(id)));
    document.getElementById("fp-bundle").addEventListener("click", () => download(`${p.slug}-forge-bundle.md`, forge.exportProjectBundle(id)));
    document.getElementById("fp-runner").addEventListener("click", () => {
      const target = window.prompt("Runner? (claude / fable / openclaw / hermes)", "claude");
      if (target) download(`${p.slug}.${target}.forge.json`, JSON.stringify(forge.exportForRunner(id, target), null, 2), "application/json");
    });
  });
  return `
  <div class="crumb"><a data-nav="/forge">Alfy Forge</a> / ${esc(p.answers.surface.replace(/_/g, " "))}</div>
  <div class="head"><h1>${esc(p.name)}</h1><div class="btns"><span class="pill navy">${done}/24 done</span><span class="pill ${ds === "approved" ? "green" : ds === "pending" ? "amber" : "gray"}">deploy ${esc(ds.replace(/_/g, " "))}</span></div></div>
  <div class="sub">${esc(p.answers.type)} · ${esc(p.domain.name)} · privacy ${esc(p.answers.privacy_level)} · created ${fmtTs(p.created_at)}</div>
  <div class="nba"><div><div class="k">${ds === "approved" ? "Cleared" : "Go-ahead"}</div>
    <div class="a">${ds === "approved" ? "Deploy approved — execute the Coolify packet when ready." : ds === "pending" ? "Deploy waiting in the Approval Center." : p.answers.environment === "local_only" ? "Local-only platform — run the local preview packet." : "Submit the preview deploy for approval (deploy-class token)."}</div></div>
    <div class="go btns">
      ${ds === "not_submitted" && p.answers.environment !== "local_only" ? `<button class="btn gold" id="fp-deploy">Submit deploy</button>` : ""}
      <button class="btn" id="fp-bundle" style="background:transparent;color:#f4efe4;border-color:rgba(233,228,216,.35)">Bundle (.md)</button>
      <button class="btn" id="fp-runner" style="background:transparent;color:#f4efe4;border-color:rgba(233,228,216,.35)">Runner packet</button>
    </div></div>
  <div class="sec">Pipeline · 24 steps</div>
  ${p.steps.map((s) => `<div class="card" style="margin-bottom:10px"><div class="cardhead"><span class="t">${esc(s.title)}</span>
      <span class="pill ${s.status === "done" ? "green" : s.status === "packet_ready" ? "navy" : s.status === "awaiting_approval" ? "amber" : "gray"}">${esc(s.status.replace(/_/g, " "))}</span></div>
    <div class="pad" style="font-size:12px;white-space:pre-wrap;font-family:${["drizzle_schema", "env_template"].includes(s.key) ? "ui-monospace,Menlo,monospace" : "var(--sans)"}">${esc(s.content)}${s.packet?.commands ? `\n\n${s.packet.commands.join("\n")}` : ""}</div></div>`).join("")}`;
}

// ---------- view: Forge Platform Registry (MVP feature #1) ----------
const riskPill = (level) => `<span class="pill ${level === "high" || level === "regulated" ? "red" : level === "medium" || level === "sensitive" ? "amber" : "green"}">${esc(level)}</span>`;
function viewForgeRegistry() {
  const platforms = forge.getRegistry();
  const plans = forge.getMigrationPlans();
  const warnTotal = platforms.reduce((s, p) => s + forge.missingInfrastructure(p).length, 0);
  onAfter(() => {
    outlet.querySelectorAll("[data-reg-migrate]").forEach((b) => b.addEventListener("click", () => tryDo(() => {
      const plan = forge.createMigrationPlan(b.dataset.regMigrate);
      window.alert(`Migration plan ${plan.id} drafted for ${plan.platform_name}:\n\nPreconditions:\n- ${plan.preconditions.join("\n- ")}\n\nSteps:\n- ${plan.steps.join("\n- ")}\n\nRules: ${plan.rules[0]}. Nothing executes without your tokens.`);
    })));
    outlet.querySelectorAll("[data-reg-docs]").forEach((b) => b.addEventListener("click", () => tryDo(() => {
      svc.createActionLog({ agent_id: "forge-truth", action: `Registry: source-of-truth doc generation queued for ${b.dataset.regDocs} (wizard generator attaches in the next slice)`, status: "parked_for_approval", business_id: null });
      window.alert("Queued: the wizard's doc generator will attach to existing platforms in the next build slice (placeholder action, logged).");
    })));
    outlet.querySelectorAll("[data-reg-switch]").forEach((b) => b.addEventListener("click", () => tryDo(() => {
      const key = b.dataset.regSwitch;
      const field = window.prompt("Which field? (repo_url_or_local_path, database_provider, auth_provider, storage_provider, deployment_provider, email_provider, payment_provider, dns_provider, secrets_location, status, priority, next_action)", "deployment_provider");
      if (!field) return;
      const p = forge.getRegistryPlatform(key);
      const value = window.prompt(`New value for ${field} (current: "${p[field]}")\nTip: sovereign targets — forgejo:${key} · Coolify (P3) · self-hosted Postgres (P4) · MinIO (P5) · Postal relay (P6) · Divini Pay`, String(p[field]));
      if (value === null) return;
      forge.updatePlatformField(key, field, value);
      render();
    })));
    document.getElementById("reg-add")?.addEventListener("click", () =>
      window.alert("Add Platform opens the New Platform Wizard for net-new builds; registering an EXISTING external platform gets its own intake form in the next slice (placeholder)."));
  });
  return `
  <div class="crumb"><a data-nav="/forge">Alfy Forge</a> / Platform Registry</div>
  <div class="head"><h1>Platform Registry</h1>
    <div class="btns"><button class="btn" id="reg-add">Add Platform</button><button class="btn gold" data-nav="/forge/new">Create Platform</button></div></div>
  <div class="sub">Every platform, every provider, one private ledger. Current builds live as-is — switch any provider per platform, and “Migrate to Divini Forge” drafts the reversible cutover plan. Nothing migrates without your tokens.</div>
  ${preview}
  ${execStrip([
    { k: "Status", v: `${platforms.length} platforms · ${plans.length} migration plans drafted` },
    { k: "Priority", v: platforms.filter((p) => p.priority === "P1").map((p) => p.platform_name).slice(0, 3).join(", ") },
    { k: "Owner", v: "Chief Infrastructure Architect" },
    { k: "Blocked", v: `${warnTotal} infrastructure warnings across the ledger` },
    { k: "Approvals", v: "migrations execute only with tokens" },
    { k: "Revenue", v: "every migrated provider = one less subscription" },
    { k: "Updated", v: lastUpdated() },
    { k: "Recommended decision", v: warnTotal ? "Clear the top warnings (backups + secrets to vault refs) before any migration." : "Draft the first migration plan.", cls: "decision" },
  ])}
  <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(340px,1fr))">
    ${platforms.map((p) => {
      const warns = forge.missingInfrastructure(p);
      const r = forge.migrationReadiness(p.key);
      const plan = plans.filter((m) => m.platform_key === p.key).pop();
      return `<div class="acard" style="cursor:default">
        <div class="top"><span class="pill navy">${esc(p.platform_type)}</span>
          <span><span class="pill ${p.status === "active" ? "green" : p.status === "build" ? "navy" : "gray"}">${esc(p.status)}</span> <span class="pill gold">${esc(p.priority)}</span></span></div>
        <h3>${esc(p.platform_name)}</h3>
        <div class="s" style="color:var(--mut);margin:2px 0 8px">${esc(p.parent_company)} · owner <a data-nav="/agents/${esc(p.operational_owner)}" style="color:var(--gold);font-weight:600">${esc(svc.getAgentById(p.operational_owner)?.title ?? forge.getForgeAgents().find((a) => a.id === p.operational_owner)?.title ?? pay.getPayAgents().find((a) => a.id === p.operational_owner)?.title ?? p.operational_owner)}</a> · reviewed ${esc(p.last_reviewed_at)}</div>
        <div style="font-size:11px;line-height:1.8;border-top:1px solid var(--line);padding-top:7px">
          <b style="letter-spacing:.08em;text-transform:uppercase;font-size:9px;color:var(--mut)">Providers</b><br/>
          repo <b>${esc(p.repo_url_or_local_path.split(" ")[0])}</b> · db <b>${esc(p.database_provider)}</b> · auth <b>${esc(p.auth_provider)}</b><br/>
          deploy <b>${esc(p.deployment_provider)}</b> · storage <b>${esc(p.storage_provider)}</b> · dns <b>${esc(p.dns_provider)}</b><br/>
          email <b>${esc(p.email_provider)}</b> · payments <b>${esc(p.payment_provider)}</b><br/>
          secrets <b>${esc(p.secrets_location)}</b> · backups <b>${esc(p.backup_status)}</b>
        </div>
        <div style="margin:8px 0 6px;font-size:11px">compliance ${riskPill(p.compliance_risk_level)} privacy ${riskPill(p.privacy_risk_level)}
          <span style="float:right" class="mono s">migration ${r.score}/100</span></div>
        ${warns.length ? `<div style="font-size:11px;background:var(--amberbg);border-radius:8px;padding:6px 10px;margin-bottom:7px;color:var(--amber)"><b>⚠ ${warns.length}:</b> ${warns.map(esc).join(" · ")}</div>` : ""}
        <div style="font-size:11.5px;margin-bottom:8px"><b style="color:var(--gold);font-size:9px;letter-spacing:.1em;text-transform:uppercase">Next action</b><br/>${esc(p.next_action)}</div>
        ${p.notes ? `<div class="s" style="font-size:10.5px;color:var(--mut);margin-bottom:8px">${esc(p.notes)}</div>` : ""}
        <div class="btns" style="flex-wrap:wrap;border-top:1px solid var(--line);padding-top:9px">
          ${p.deployment_url ? `<a class="btn" href="${esc(p.deployment_url)}" target="_blank" rel="noopener" style="padding:4px 10px;font-size:10.5px">Open Platform</a>` : `<button class="btn" disabled style="padding:4px 10px;font-size:10.5px;opacity:.5">Open Platform</button>`}
          <button class="btn" data-reg-switch="${p.key}" style="padding:4px 10px;font-size:10.5px">Switch provider</button>
          <button class="btn" data-reg-docs="${p.key}" style="padding:4px 10px;font-size:10.5px">Generate docs</button>
          <button class="btn ${plan ? "" : "gold"}" data-reg-migrate="${p.key}" style="padding:4px 10px;font-size:10.5px">${plan ? "Re-plan migration" : "Migrate to Divini Forge"}</button>
        </div>
        ${plan ? `<div class="s" style="font-size:10px;color:var(--mut);margin-top:6px">plan ${esc(plan.id)} · ${esc(plan.status)} · ${plan.steps.length} cutover steps · created ${fmtTs(plan.created_at)}</div>` : ""}
      </div>`;
    }).join("")}
  </div>`;
}

// ---------- boot ----------
document.getElementById("btn-reset")?.addEventListener("click", () => {
  if (window.confirm("Reset all local demo decisions, logs, factory packets, and studio state to the seed?")) {
    svc.resetLocalState(); fac.resetFactoryState(); studio.resetStudioState(); render();
  }
});
render();
