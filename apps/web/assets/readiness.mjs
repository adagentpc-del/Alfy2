/**
 * Enterprise readiness verification — proves the command orchestration center is loaded, connected,
 * and governed: every agent carries knowledge/skills/roles/responsibilities, reports up the hierarchy
 * (agent → Alfy2 → Alyssa), sits behind guardrails + approvals, and owns KPIs; every functional layer
 * (services, factories, studio, avatar, brain, R&D bench) exposes its full contracted surface.
 * Presence + wiring are verified here; BEHAVIOR is verified by the smokes
 * (ui/factorymodes/studio/orch — all runnable via package.json). Read-only: never mutates state.
 */
import * as data from "./data.mjs";
import * as svc from "./services.mjs";
import * as fac from "./factories.mjs";
import * as studio from "./media-studio.mjs";
import * as pay from "./divini-pay.mjs";

const AUTHORITY_TIERS = ["research_only", "recommend_only", "draft_only", "create_internal_task", "prepare_external_asset", "execute_low_risk", "execute_with_approval"];
const CABINET_TITLES = [
  "Chief Strategy Agent", "Chief Venture Architect Agent", "Chief Product Officer Agent",
  "Chief Technology Officer Agent", "Chief Revenue Officer Agent", "Chief Marketing Officer Agent",
  "Chief Sales Officer Agent", "Chief Media Officer Agent", "Chief Finance Officer Agent",
  "Chief Operations Officer Agent", "Chief People / HR Agent", "Chief Legal & Risk Agent",
  "Chief Security Agent", "Chief Knowledge Officer Agent", "Chief Automation Officer Agent",
  "Chief Data & Analytics Agent",
];
const PORTFOLIO_TITLES = [
  "Divini Procure Agent", "Move Mi Agent", "StrataLogic Agent", "FounderOS Agent", "Oralia Agent",
  "DatingModern.ai Agent", "Divini Partner Agent", "Black Flag Innocence Agent", "Decoded Podcast Agent",
  "AI Builder Pro Agent",
];
const DOSSIER_FIELDS = ["title", "department", "mission", "responsibilities", "authority_level", "approval_requirements", "owned_workflows", "kpis", "status", "next_action", "risks", "reporting_cadence"];
const SERVICE_FNS = ["getAgents", "getAgentById", "getPortfolioCompanies", "getCompanyOS", "createApprovalRequest", "approveRequest", "rejectRequest", "createActionLog", "generateWeeklyOperatingReport", "getExecutiveDashboardSummary"];
const FACTORY_FNS = ["createFactoryRequest", "generateCompanyPacket", "generateSoftwareBuildPacket", "generateGTMPacket", "generateMediaPacket", "createPacketVersion", "submitPacketForApproval", "exportPacketForAgent", "exportPacketToObsidian", "exportPacketToMarkdown"];
const STUDIO_FNS = ["createPodcastSeries", "createEpisode", "generateEpisodeResearch", "generateHooks", "generateEpisodeOutline", "createRecordingChecklist", "importTranscript", "detectClipCandidates", "generateClipPlan", "generateTitles", "generateDescription", "generateThumbnailBrief", "runMonetizationReview", "generateRepurposingAssets", "createPublishingJob", "createAvatarScript", "createAvatarVideoJob", "generateAvatarVendorPacket", "submitAvatarForApproval", "logAvatarUsage"];
const STUDIO_READS = ["getMediaProjects", "getPodcastSeries", "getEpisodes", "getEpisodeResearch", "getOutline", "getHookBank", "getRecordingSession", "getTranscript", "getClipCandidates", "getClipAssets", "getTitles", "getDescription", "getThumbnailBrief", "getPublishingJobs", "getMonetizationReview", "getSponsorCtas", "getRepurposingAssets", "getAvatarProfiles", "getVoiceProfiles", "getAvatarScripts", "getAvatarVideoJobs", "getAvatarUsageLogs"];

const check = (label, pass, detail = "") => ({ label, pass: Boolean(pass), detail });

export function runReadinessCheck() {
  const sections = [];
  const cabinet = svc.getAgents({ layer: "cabinet" });
  const portfolio = svc.getAgents({ layer: "portfolio" });
  const byId = (id) => svc.getAgentById(id);

  // --- 1. Hierarchy & reporting -------------------------------------------------------------------
  const chainOk = (a) => a.reports_to === "alfy2" && data.ALFY2_SYSTEM.reports_to === "alyssa";
  sections.push({
    name: "Hierarchy & reporting",
    checks: [
      check("Alyssa DelTorre seated as Founder / CEO / Chairwoman", data.FOUNDER?.title === "Founder / CEO / Chairwoman"),
      check("Alfy2 seated as Chief Operating Intelligence System, reporting to Alyssa", data.ALFY2_SYSTEM?.title === "Chief Operating Intelligence System" && data.ALFY2_SYSTEM.reports_to === "alyssa"),
      check("16/16 executive cabinet seats filled with the exact requested titles", CABINET_TITLES.every((t) => cabinet.some((a) => a.title === t)) && cabinet.length === 16, cabinet.map((a) => a.title).join(" · ")),
      check("10/10 portfolio agents present", PORTFOLIO_TITLES.every((t) => portfolio.some((a) => a.title === t)) && portfolio.length === 10),
      check("Every agent reports up the chain (agent → Alfy2 → Alyssa)", svc.getAgents().every(chainOk)),
      check("Every portfolio agent has a cabinet sponsor that resolves", portfolio.every((a) => a.cabinet_sponsor && byId(a.cabinet_sponsor)?.layer === "cabinet"), portfolio.map((a) => `${a.title}→${byId(a.cabinet_sponsor)?.title ?? "?"}`).join(" · ")),
      check("Every portfolio agent links to a real company (and back)", portfolio.every((a) => svc.getCompanyById(a.linked_business)?.agent_id === a.id)),
    ],
  });

  // --- 2. Knowledge, skills, roles & responsibilities ----------------------------------------------
  sections.push({
    name: "Knowledge, skills, roles & responsibilities",
    checks: [
      check("All 26 dossiers complete (mission, responsibilities, workflows, cadence, …)", svc.getAgents().every((a) => DOSSIER_FIELDS.every((f) => { const v = a[f]; return v != null && (typeof v !== "string" || v.trim()) && (!Array.isArray(v) || v.length); }))),
      check("Every agent owns ≥1 KPI with target + current + trend", svc.getAgents().every((a) => a.kpis.length >= 1 && a.kpis.every((k) => k.name && k.target && k.current && k.trend))),
      check("Every agent owns named workflows", svc.getAgents().every((a) => a.owned_workflows.length >= 1)),
      check("Every agent has a current status and a concrete next action", svc.getAgents().every((a) => ["active", "standby", "blocked"].includes(a.status) && a.next_action.length > 10)),
      check("Departments registry covers every seat", cabinet.every((a) => data.DEPARTMENTS.some((d) => d.id === a.department))),
      check("Derived registries loaded (roles/authorities/KPIs)", svc.getAgentRoles().length === 26 && svc.getAgentAuthorities().length === 26 && svc.getAgentKpis().length >= 26),
    ],
  });

  // --- 3. Guardrails & approvals --------------------------------------------------------------------
  sections.push({
    name: "Guardrails & approvals",
    checks: [
      check("Every agent's authority level is a valid tier (docs/AGENT_AUTHORITY_MATRIX.md)", svc.getAgents().every((a) => AUTHORITY_TIERS.includes(a.authority_level))),
      check("Every agent carries explicit approval requirements", svc.getAgents().every((a) => a.approval_requirements.length >= 1)),
      check("Approval Center surface complete (create/approve/reject/log)", SERVICE_FNS.slice(4, 8).every((f) => typeof svc[f] === "function")),
      check("Live gate bridge present (getLiveApprovals/decideLiveApproval)", typeof svc.getLiveApprovals === "function" && typeof svc.decideLiveApproval === "function"),
      check("Factory go-aheads carry action classes (media→publish_public, gtm→send_message)", fac.FACTORY_KINDS.media?.approval_class === "publish_public" && fac.FACTORY_KINDS.gtm?.approval_class === "send_message"),
      check("Studio gate submitters present (concept/outline/clips/pack)", ["submitConceptForApproval", "submitOutlineForApproval", "submitClipsForApproval", "submitPublishingPackForApproval"].every((f) => typeof studio[f] === "function")),
    ],
  });

  // --- 4. Functional layers loaded -------------------------------------------------------------------
  const missing = (mod, fns) => fns.filter((f) => typeof mod[f] !== "function");
  const brain = svc.getBrainGraph();
  const ids = new Set(brain.nodes.map((n) => n.id));
  sections.push({
    name: "Functional layers loaded & connected",
    checks: [
      check("Enterprise services: 10/10 functions", missing(svc, SERVICE_FNS).length === 0, missing(svc, SERVICE_FNS).join(",") || "all present"),
      check("Creation factories: 4 modes, 10/10 functions", Object.keys(fac.FACTORY_KINDS).length === 4 && missing(fac, FACTORY_FNS).length === 0),
      check("Media Studio: 20/20 service functions", missing(studio, STUDIO_FNS).length === 0, missing(studio, STUDIO_FNS).join(",") || "all present"),
      check("Media Studio: 22/22 data objects readable", missing(studio, STUDIO_READS).length === 0),
      check("Companies: 11 on the roster, every one with an operating system", svc.getPortfolioCompanies().length === 11 && svc.getPortfolioCompanies().every((c) => svc.getCompanyOS(c.id))),
      check("Knowledge brain graph intact (every edge resolves)", brain.edges.every((e) => ids.has(e.from) && ids.has(e.to)), `${brain.nodes.length} nodes · ${brain.edges.length} edges`),
      check("Weekly operating report + executive summary composable", typeof svc.generateWeeklyOperatingReport === "function" && Object.keys(svc.getExecutiveDashboardSummary()).length >= 8),
    ],
  });

  // --- 5. AI avatar governance ------------------------------------------------------------------------
  const profiles = studio.getAvatarProfiles();
  sections.push({
    name: "AI avatar governance",
    checks: [
      check("Every avatar profile is authorized with a documented consent record", profiles.length >= 1 && profiles.every((p) => p.authorized && p.consent?.document_ref)),
      check("Approved-use-case allowlist enforced at script creation", Array.isArray(studio.APPROVED_USE_CASES) && studio.APPROVED_USE_CASES.length >= 4 && typeof studio.createAvatarScript === "function"),
      check("Script approvals bind to a content hash (edits invalidate)", typeof studio.scriptHash === "function" && studio.scriptHash("a") !== studio.scriptHash("b")),
      check("Output review gate + usage log present", typeof studio.submitAvatarOutputForReview === "function" && typeof studio.getAvatarUsageLogs === "function"),
      check("Voice profile consent references the same rights record", studio.getVoiceProfiles().every((v) => v.consent_ref)),
    ],
  });

  // --- Divini Pay ----------------------------------------------------------------------------------------
  const PAY_FNS = ["createPaymentLink", "createInvoice", "compareFees", "onboardParty", "recordW9", "recordPayment", "requestPayoutRelease", "executeApprovedPayout", "releaseMilestone", "requestRefund", "openDispute", "resolveDispute", "adminOverride", "exportReconciliation", "getPrivacyDashboard", "checkPermission"];
  const PAY_FIELDS = ["mission", "responsibilities", "inputs", "outputs", "decision_rules", "escalation_triggers", "compliance_warnings", "kpis"];
  sections.push({
    name: "Divini Pay",
    checks: [
      check("Payment OS surface complete (16 control functions)", PAY_FNS.every((f) => typeof pay[f] === "function")),
      check("Three rails priced (ACH / card / instant) with honest comparison", Object.keys(pay.RAILS).length === 3 && pay.compareFees(250000)[0].rail === "ach"),
      check("Wallet designed but HARD-LOCKED pending compliance review", pay.WALLET_DESIGN.activated === false && (() => { try { pay.walletOperation(); return false; } catch { return true; } })()),
      check("12-agent payments desk seated, all 8 dossier fields each, reporting to Chief Finance", pay.getPayAgents().length === 12 && pay.getPayAgents().every((a) => a.reports_to === "chief-finance" && PAY_FIELDS.every((f) => a[f]?.length))),
      check("RBAC roles defined with least privilege (viewer has none)", Object.keys(pay.ROLES).length >= 5 && pay.ROLES.viewer.length === 0),
      check("Lawful-oversight posture on the privacy dashboard", pay.getPrivacyDashboard().lawful_oversight.includes("never from lawful compliance")),
    ],
  });

  // --- 6. R&D bench --------------------------------------------------------------------------------------
  const asi = data.RND_ASSETS.find((r) => r.id === "rnd-asi-arch");
  sections.push({
    name: "R&D bench",
    checks: [
      check("ASI-Arch vetted into the R&D department (Apache-2.0, sandbox-only)", asi?.license === "Apache-2.0" && asi?.disposition === "evaluate_in_sandbox"),
      check("ASI-Arch guardrails on record (≥4, incl. never-in-runtime)", (asi?.guardrails?.length ?? 0) >= 4 && asi.guardrails[0].includes("NEVER")),
      check("R&D ownership assigned (CTO owner, CKO steward)", byId(asi?.owner)?.title === "Chief Technology Officer Agent" && byId(asi?.steward)?.title === "Chief Knowledge Officer Agent"),
    ],
  });

  const all = sections.flatMap((s) => s.checks);
  const passed = all.filter((c) => c.pass).length;
  return { sections, passed, total: all.length, ready: passed === all.length, at: new Date().toISOString() };
}

export function getRndAssets() { return data.RND_ASSETS; }
export function getOrgChart() {
  return {
    founder: data.FOUNDER,
    system: data.ALFY2_SYSTEM,
    cabinet: svc.getAgents({ layer: "cabinet" }),
    portfolio: svc.getAgents({ layer: "portfolio" }),
  };
}
