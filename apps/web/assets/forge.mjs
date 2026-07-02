/**
 * Alfy Forge — Divini Sovereign Cloud (docs/ALFY_FORGE_SPEC.md). A private, local-first internal
 * developer platform: one flow creates the project record, folder structure, source-of-truth docs,
 * scaffold, schema, migrations, env template, secret REFERENCES, storage/auth/email configs,
 * deployment service, backup policy, and execution packets for the steps that touch real
 * infrastructure. Phase 1 (this module): local registry + generation + packets. Phases 2–9 (Forgejo,
 * Coolify, Postgres/Supabase, MinIO, Postal/Plunk, LocalStack, k3s) arrive as adapters behind the
 * same surface — statuses are staged HONESTLY, never faked as live.
 *
 * Constraints (binding): no proprietary code/UI/trade dress copied from any SaaS — equivalent
 * functionality via open-source/self-hosted tools + original Divini UX. Secrets are stored as
 * REFERENCES only (vault:/op:// style) — raw secret material is rejected at the boundary, and agents
 * never see secrets unless explicitly authorized per grant. Deploys are gated (deploy action class).
 */
import * as svc from "./services.mjs";

// --- store -------------------------------------------------------------------------------------------
const memoryStore = () => { const m = new Map(); return { get: (k) => m.get(k), set: (k, v) => m.set(k, v) }; };
const localStore = (prefix = "alfy2_forge_") => ({
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
const put = (k, item) => { save(k, [...load(k), item]); return item; };

// --- the sovereign stack (recommended, self-hosted; phases per MVP order) ------------------------------
export const STACK = [
  { tool: "Local registry + doc generation (this module)", replaces: "scattered dashboards/docs", phase: 1, status: "live" },
  { tool: "Forgejo", replaces: "GitHub (private git/issues/actions)", phase: 2, status: "staged" },
  { tool: "Docker → Coolify", replaces: "Vercel/Render (deploy + hosting)", phase: 3, status: "staged" },
  { tool: "Postgres + Drizzle (+ self-hosted Supabase)", replaces: "Supabase cloud", phase: 4, status: "staged" },
  { tool: "MinIO", replaces: "S3 (object storage)", phase: 5, status: "staged" },
  { tool: "Postal/Plunk (Mailu if mailboxes)", replaces: "Resend / email SaaS", phase: 6, status: "staged" },
  { tool: "LocalStack", replaces: "AWS for local testing", phase: 7, status: "staged" },
  { tool: "Encrypted backups + security hardening + logs + migration tools", replaces: "ad-hoc ops", phase: 8, status: "staged" },
  { tool: "k3s multi-server", replaces: "single-box limits (only after stable)", phase: 9, status: "staged" },
  { tool: "Tailscale/WireGuard private network", replaces: "public dashboards", phase: "1+", status: "policy" },
];

// --- the 15 dashboard sections (status = what Phase 1 truly provides) -----------------------------------
export const SECTIONS = [
  { key: "command_center", label: "Command Center", phase: 1, live: true, outcome: "See every platform's state" },
  { key: "wizard", label: "New Platform Wizard", phase: 1, live: true, outcome: "Create Platform" },
  { key: "repo_vault", label: "Repo Vault", phase: 2, live: false, outcome: "Own the code", note: "Phase 1 generates repo packets + doc sync; Forgejo integration is Phase 2" },
  { key: "database_studio", label: "Database Studio", phase: 4, live: false, outcome: "View Data", note: "Phase 1 generates Drizzle schema + migrations + RLS plan; live Postgres is Phase 4" },
  { key: "deployment_control", label: "Deployment Control", phase: 3, live: false, outcome: "Deploy / Fix Build / Roll back", note: "Phase 1 generates deploy configs + gated packets; Coolify is Phase 3" },
  { key: "storage_center", label: "Storage Center", phase: 5, live: false, outcome: "Store files privately", note: "bucket configs generated now; MinIO is Phase 5" },
  { key: "email_center", label: "Email Center", phase: 6, live: false, outcome: "Send Email", note: "templates + DKIM/SPF/DMARC checklist now; Postal/Plunk is Phase 6" },
  { key: "secrets_vault", label: "Secrets Vault", phase: 1, live: true, outcome: "Secure App", note: "reference-only storage live; encrypted vault service is Phase 8 hardening" },
  { key: "domain_dns", label: "Domain / DNS Manager", phase: 1, live: true, outcome: "Track domains + renewals" },
  { key: "logs_monitoring", label: "Logs & Monitoring", phase: 8, live: false, outcome: "See what happened", note: "action log live; runtime logs arrive with deployments" },
  { key: "backup_restore", label: "Backup & Restore", phase: 8, live: false, outcome: "Backup", note: "policies generated per project now" },
  { key: "security_center", label: "Security Center", phase: 8, live: false, outcome: "Secure App", note: "checklists generated now; scanning is Phase 8" },
  { key: "ai_build_agents", label: "AI Build Agents", phase: 1, live: true, outcome: "Run builds through agents" },
  { key: "migration_center", label: "Migration Center", phase: 8, live: false, outcome: "Leave SaaS on your schedule", note: "per-project migration map generated now" },
  { key: "operations_map", label: "Operations Map", phase: 1, live: true, outcome: "One map of everything" },
  { key: "platform_registry", label: "Platform Registry", phase: 1, live: true, outcome: "Every platform, one ledger" },
  { key: "payments_readiness", label: "Payment Infrastructure", phase: 1, live: true, outcome: "Track Payments", note: "Divini Pay Lite abstraction + tracking (docs/DIVINI_PAY_SPEC.md); wallet stays locked" },
];

// --- Platform Registry (MVP feature #1): every platform, every provider, one ledger -----------------------
// 24 fields per platform. Existing builds live AS-IS; providers are switchable per field ("toggle/switch"),
// and "Migrate to Divini Forge" generates a reversible cutover plan — nothing is removed or auto-migrated.
const P = (key, o) => ({
  key,
  platform_name: o.name,
  parent_company: o.parent ?? "Divini Group",
  platform_type: o.type ?? "web app",
  status: o.status ?? "active",
  priority: o.priority ?? "P2",
  repo_url_or_local_path: o.repo ?? `github:private/${key} (switchable → forgejo:${key})`,
  database_provider: o.db ?? "Supabase (Postgres)",
  database_name: o.dbname ?? key,
  auth_provider: o.auth ?? "Supabase Auth",
  storage_provider: o.stor ?? "Supabase Storage",
  deployment_provider: o.deploy ?? "Vercel",
  deployment_url: o.url ?? "",
  domain: o.domain ?? `${key.replace(/_/g, "")}.divinigroup.com`,
  dns_provider: o.dns ?? "registrar default (TO CONFIRM)",
  email_provider: o.email ?? "none",
  payment_provider: o.pay ?? "none",
  secrets_location: o.secrets ?? ".env files (move to vault references)",
  backup_status: o.backup ?? "none — policy needed",
  compliance_risk_level: o.crisk ?? "low",
  privacy_risk_level: o.prisk ?? "standard",
  operational_owner: o.owner ?? "chief-technology",
  last_reviewed_at: o.reviewed ?? "2026-07-02",
  next_action: o.next ?? "Generate source-of-truth docs; move secrets to vault references.",
  notes: o.notes ?? "",
  docs_ready: o.docs ?? false,
});
export const REGISTRY_SEED = [
  P("alfy2", { name: "Alfy2", type: "operating system", priority: "P1", deploy: "Vercel (web) + Render (API)", url: "https://alfy2.vercel.app", db: "Supabase (Postgres, 245 tables RLS)", backup: "migrations in git; DB backup policy needed", docs: true, owner: "chief-technology", next: "Render re-sync → live mode.", notes: "This OS. Fullest doc coverage in the group." }),
  P("divini_procure", { name: "Divini Procure", type: "marketplace", priority: "P1", pay: "Stripe (→ Divini Pay)", email: "Resend", crisk: "medium", next: "Marketplace flows onto Divini Pay abstraction.", owner: "agent-divini-procure" }),
  P("divini_partners", { name: "Divini Partners", type: "partner portal", pay: "Stripe (→ Divini Pay)", owner: "agent-divini-partner" }),
  P("move_mi", { name: "Move Mi", type: "booking platform", priority: "P1", pay: "Stripe (→ Divini Pay)", email: "Resend", url: "https://movemi.example (TO CONFIRM)", owner: "agent-move-mi", next: "Email connector; quotes onto Divini Pay links." }),
  P("stratalogic", { name: "StrataLogic", type: "advisory site", owner: "agent-stratalogic" }),
  P("strataos", { name: "StrataOS", type: "client platform", status: "build", owner: "agent-stratalogic", next: "Finish core loop; register build packets in Forge." }),
  P("strata_coach", { name: "Strata Coach", type: "coaching app", status: "build", owner: "agent-stratalogic" }),
  P("founderos", { name: "FounderOS", type: "SaaS", priority: "P1", status: "pre-launch", pay: "Stripe (→ Divini Pay)", owner: "agent-founderos", next: "Beta gated on Alfy2 live mode." }),
  P("divini_growth", { name: "Divini Growth OS", type: "growth platform", status: "build", owner: "chief-marketing" }),
  P("datingmodern", { name: "DatingModern.ai", type: "consumer app", status: "validation", priority: "P3", db: "none yet", auth: "none yet", stor: "none yet", owner: "agent-datingmodern", next: "Pre-verdict: no infra spend until the stage-4 go." }),
  P("oralia", { name: "Oralia", type: "e-commerce", status: "pre-launch", pay: "Stripe (→ Divini Pay)", crisk: "medium", prisk: "sensitive", owner: "agent-oralia", next: "Claims clearance before landing publish.", notes: "Health-adjacent claims path." }),
  P("black_flag", { name: "Black Flag Innocence Foundation", type: "nonprofit portal", email: "Resend", pay: "donations (→ Divini Pay)", crisk: "high", prisk: "regulated", owner: "agent-black-flag", next: "Case-data privacy boundary before any migration.", notes: "Strictest privacy boundary in the portfolio." }),
  P("ai_builder_pro", { name: "AI Builder Pro", type: "education platform", status: "validation", priority: "P3", db: "none yet", auth: "none yet", repo: "local:~/builds/ai-builder-pro", owner: "agent-ai-builder-pro" }),
  P("divini_pay", { name: "Divini Pay", type: "payment infrastructure", status: "build", priority: "P1", db: "local module (browser) → Postgres", auth: "n/a (inherits Alfy2)", deploy: "inside Alfy2", pay: "Stripe bridge → direct acquirer adapters", crisk: "high", prisk: "sensitive", owner: "pay-fintech-architect", docs: true, next: "Processor adapter #1 (ACH) after compliance pass.", notes: "Wallet locked pending compliance review." }),
  P("alfy_forge", { name: "Alfy Forge", type: "internal developer platform", status: "build", priority: "P1", db: "local module (browser) → Postgres", deploy: "inside Alfy2 (self-hosting target: Coolify)", repo: "this repo (apps/web/assets/forge.mjs)", secrets: "vault references (enforced)", backup: "git", docs: true, owner: "forge-architect", next: "Phase 2: private box (Docker+Tailscale+Forgejo).", notes: "Divini Sovereign Cloud." }),
];

const registry = () => load("registry", REGISTRY_SEED);
export const getRegistry = () => registry();
export const getRegistryPlatform = (key) => registry().find((p) => p.key === key);
// The 24 contract fields (docs_ready is an internal flag, not part of the registry contract).
export const REGISTRY_FIELDS = Object.keys(P("x", { name: "x" })).filter((k) => k !== "key" && k !== "docs_ready");

/** Switch/toggle a provider or field for one platform — audited; nothing is removed, only recorded. */
export function updatePlatformField(key, field, value) {
  if (!REGISTRY_FIELDS.includes(field)) throw new Error(`unknown registry field: ${field}`);
  const list = registry();
  const i = list.findIndex((p) => p.key === key);
  if (i === -1) throw new Error(`unknown platform: ${key}`);
  const prev = list[i][field];
  list[i] = { ...list[i], [field]: value, last_reviewed_at: clock().toISOString().slice(0, 10) };
  save("registry", list);
  svc.createActionLog({ agent_id: "forge-architect", action: `Registry: ${list[i].platform_name}.${field} switched "${prev}" → "${value}"`, status: "succeeded", business_id: null });
  return list[i];
}

/** Missing-infrastructure warnings per platform (the "what would bite us" list). */
export function missingInfrastructure(p) {
  const warn = [];
  if (/none/i.test(p.backup_status)) warn.push("no backup policy");
  if (/\.env/i.test(p.secrets_location)) warn.push("secrets in .env files — move to vault references");
  if (!p.docs_ready) warn.push("no source-of-truth docs");
  if (/TO CONFIRM/i.test(p.dns_provider)) warn.push("DNS provider unconfirmed");
  if (!p.deployment_url && !["build", "validation"].includes(p.status)) warn.push("no recorded deployment URL");
  if (/Stripe(?! bridge)/.test(p.payment_provider)) warn.push("payments on Stripe — Divini Pay abstraction planned");
  if (p.privacy_risk_level === "regulated" && !/vault/i.test(p.secrets_location)) warn.push("regulated data with unvaulted secrets");
  return warn;
}

/** "Migrate to Divini Forge": generates the reversible, dual-run cutover plan. Never auto-executes. */
export function createMigrationPlan(key) {
  const p = getRegistryPlatform(key);
  if (!p) throw new Error(`unknown platform: ${key}`);
  const providerSteps = [];
  const map = [
    ["repo_url_or_local_path", /github/i, "Repo → Forgejo (Phase 2): mirror-push both remotes for 2 weeks, then flip origin. Rollback: origin flip back."],
    ["database_provider", /supabase/i, "Database → self-hosted Postgres/Supabase (Phase 4): logical replication dual-write window, parity check, cutover. Rollback: repoint connection string."],
    ["deployment_provider", /vercel|render/i, "Deploy → Coolify/Docker (Phase 3): deploy both, weighted DNS or staging first. Rollback: DNS back."],
    ["storage_provider", /supabase|s3/i, "Storage → MinIO (Phase 5): sync buckets, verify signed URLs, flip endpoint. Rollback: endpoint back."],
    ["email_provider", /resend/i, "Email → Postal/Plunk relay (Phase 6): warm the IP/domain, split-send, watch deliverability. Rollback: relay switch."],
    ["payment_provider", /stripe/i, "Payments → Divini Pay rails (compliance pass first): new invoices on ACH-first links, Stripe drains naturally. Never break in-flight subscriptions."],
  ];
  for (const [field, re, step] of map) if (re.test(p[field])) providerSteps.push(step);
  const plan = put("migration_plans", {
    id: newId("mig"), platform_key: key, platform_name: p.platform_name,
    created_at: clock().toISOString(), status: "draft",
    readiness: migrationReadiness(key),
    preconditions: ["source-of-truth docs generated", "secrets moved to vault references", "backup policy live and drilled", ...(p.privacy_risk_level === "regulated" ? ["privacy-boundary review (regulated data)"] : [])],
    steps: providerSteps.length ? providerSteps : ["No SaaS dependencies detected — platform is already sovereign or pre-infra."],
    rules: ["dual-run window on every cutover (reversible)", "parity verification before flip", "destructive steps need approval tokens", "one platform at a time"],
  });
  updatePlatformField(key, "next_action", `Execute migration plan ${plan.id} (draft) — preconditions first.`);
  return plan;
}
export const getMigrationPlans = (key) => load("migration_plans").filter((m) => !key || m.platform_key === key);

// Back-compat dependency view (drives readiness scoring below).
const depsOf = (p) => [
  /github/i.test(p.repo_url_or_local_path) ? "GitHub" : null,
  /supabase/i.test(p.database_provider) ? "Supabase" : null,
  /vercel/i.test(p.deployment_provider) ? "Vercel" : null,
  /render/i.test(p.deployment_provider) ? "Render" : null,
  /stripe/i.test(p.payment_provider) ? (/bridge/i.test(p.payment_provider) ? "Stripe (bridge only)" : "Stripe") : null,
  /resend/i.test(p.email_provider) ? "Resend" : null,
].filter(Boolean);
export const EXISTING_PLATFORMS = REGISTRY_SEED.map((p) => ({
  key: p.key, name: p.platform_name, status: p.status, build_track: p.status,
  dependencies: depsOf(p), docs_ready: p.docs_ready, notes: p.notes,
}));

/** SaaS → sovereign replacement map (the migration thesis, per dependency). */
export const REPLACEMENT_MAP = {
  GitHub: { with: "Forgejo", phase: 2 }, Supabase: { with: "self-hosted Supabase / Postgres", phase: 4 },
  Vercel: { with: "Coolify + Docker", phase: 3 }, Render: { with: "Coolify + Docker", phase: 3 },
  Stripe: { with: "Divini Pay abstraction (compliant rails)", phase: "pay-1" },
  "Stripe (bridge only)": { with: "direct acquirer adapters", phase: "pay-1" },
  Resend: { with: "Postal/Plunk relay abstraction", phase: 6 },
  AWS: { with: "MinIO + LocalStack", phase: 5 },
};

/** Migration readiness score (0–100): how ready a platform is to move off its SaaS dependencies. */
export function migrationReadiness(platformKey) {
  const p = EXISTING_PLATFORMS.find((x) => x.key === platformKey);
  if (!p) throw new Error(`unknown platform: ${platformKey}`);
  let score = 20; const factors = ["registered in Forge (+20)"];
  if (p.docs_ready) { score += 20; factors.push("source-of-truth docs exist (+20)"); }
  const phasesLive = new Set(STACK.filter((s) => s.status === "live").map((s) => s.phase));
  const blocked = p.dependencies.filter((d) => !phasesLive.has(REPLACEMENT_MAP[d]?.phase));
  const ready = p.dependencies.length - blocked.length;
  score += Math.round((ready / Math.max(1, p.dependencies.length)) * 50);
  factors.push(`${ready}/${p.dependencies.length} dependencies have a LIVE sovereign replacement (+${Math.round((ready / Math.max(1, p.dependencies.length)) * 50)})`);
  if (p.status === "active") { score += 10; factors.push("operating platform — migration worth it (+10)"); }
  return { platform: p.name, score: Math.min(100, score), factors, blocked_on: blocked.map((d) => `${d} → ${REPLACEMENT_MAP[d]?.with ?? "?"} (phase ${REPLACEMENT_MAP[d]?.phase ?? "?"})`) };
}

/** Manual task generation per platform (Phase 1: tasks, not automation). */
export function generateMigrationTasks(platformKey) {
  const p = EXISTING_PLATFORMS.find((x) => x.key === platformKey);
  if (!p) throw new Error(`unknown platform: ${platformKey}`);
  return [
    !p.docs_ready ? `Generate source-of-truth docs for ${p.name} (PRD/TECH_SPEC/BUILD_PLAN via the wizard's doc generator)` : null,
    `Inventory env vars + secrets for ${p.name}; move all to vault references`,
    ...p.dependencies.map((d) => `Map ${d} usage in ${p.name} → plan cutover to ${REPLACEMENT_MAP[d]?.with ?? "sovereign equivalent"} (phase ${REPLACEMENT_MAP[d]?.phase ?? "TBD"}; dual-run window, reversible)`),
    `Add ${p.name} to the backup policy roster`,
  ].filter(Boolean);
}

// --- the infrastructure desk (14 agents, 8 fields each; leads report to the CTO cabinet seat) -----------
const infra = (a) => ({ layer: "forge_desk", reports_to: a.id === "forge-architect" ? "chief-technology" : "forge-architect", reporting_cadence: "weekly", ...a });
export const FORGE_AGENTS = [
  infra({ id: "forge-architect", title: "Chief Infrastructure Architect", mission: "Own the sovereign cloud: simple first, self-hosted where it pays, one dashboard for everything.", responsibilities: ["stack decisions per phase", "architecture reviews", "phase-gate readiness"], inputs: ["platform demand", "cost + risk reports"], outputs: ["architecture decisions", "phase go/no-go memos"], decision_rules: ["Docker before k3s — scale only after stable", "boring self-hosted beats shiny SaaS", "no phase skips"], escalation_triggers: ["any single point of failure on production", "phase-gate dispute"], security_warnings: ["private dashboards stay behind Tailscale/WireGuard — never public"], kpis: [{ name: "SaaS dependencies retired", target: "6", current: "0 (Phase 1)", trend: "flat" }] }),
  infra({ id: "forge-repo", title: "Repo Vault Agent", mission: "Every platform's code in private repos with clean branches, PRs, releases, and health scores.", responsibilities: ["repo/branch/release management", "AI commit summaries + code review", "repo health scoring", "doc syncing"], inputs: ["forge projects", "commits/PRs"], outputs: ["repos", "health scores", "changelog entries"], decision_rules: ["private by default", "no direct pushes to main once CI exists"], escalation_triggers: ["failed-build streak ≥3", "force-push to protected branch"], security_warnings: ["no secrets in repos — vault references only (scanned)"], kpis: [{ name: "Repo health", target: ">90", current: "n/a", trend: "flat" }] }),
  infra({ id: "forge-db", title: "Database Architect Agent", mission: "Postgres schemas born with RLS, migrations that never surprise, seeds that tell the truth.", responsibilities: ["schema + Drizzle generation", "migration safety checks", "RLS policies", "seed data"], inputs: ["PRDs", "schema requests"], outputs: ["Drizzle schemas", "migrations", "RLS plans"], decision_rules: ["RLS deny-by-default on every table (house rule)", "destructive migrations need explicit approval"], escalation_triggers: ["migration touching >1 table's data", "any RLS-off request"], security_warnings: ["production data never leaves the private network"], kpis: [{ name: "Migrations with rollback plans", target: "100%", current: "100%", trend: "flat" }] }),
  infra({ id: "forge-deploy", title: "Deployment Agent", mission: "Deploys so boring they're invisible: preview → staging → production, rollback always one step away.", responsibilities: ["app/worker/API/cron deploys", "build + runtime logs", "rollbacks", "domain/SSL mapping"], inputs: ["deploy packets", "build results"], outputs: ["deployments", "rollback records", "log summaries"], decision_rules: ["production deploys ALWAYS need a deploy-class token", "failed health check = auto-suggest rollback"], escalation_triggers: ["two failed deploys same app", "SSL/domain misconfig"], security_warnings: ["no deploy bypasses the gate — kill switch honored"], kpis: [{ name: "Rollback time", target: "<5 min", current: "n/a", trend: "flat" }] }),
  infra({ id: "forge-secrets", title: "Secrets Agent", mission: "Every credential a reference, every access audited, nothing raw anywhere ever.", responsibilities: ["env var templates", "secret reference custody", "rotation reminders", "access grants"], inputs: ["project needs", "rotation calendar"], outputs: ["vault records (refs)", "audit entries", "rotation alerts"], decision_rules: ["raw secret material rejected at the boundary", "AI agents get secrets ONLY via explicit per-secret grant"], escalation_triggers: ["any raw secret detected anywhere", "grant request for production keys"], security_warnings: ["password-manager references preferred over values, always"], kpis: [{ name: "Raw secrets stored", target: "0", current: "0 (enforced)", trend: "flat" }] }),
  infra({ id: "forge-storage", title: "Storage Agent", mission: "Private-first buckets with signed URLs, retention rules, and backups that actually restore.", responsibilities: ["bucket provisioning (MinIO)", "access policies", "signed URLs", "usage dashboards"], inputs: ["storage requests"], outputs: ["bucket configs", "retention rules"], decision_rules: ["private by default; public assets are an explicit exception", "every bucket gets a retention + backup rule at birth"], escalation_triggers: ["public bucket request", "usage anomaly"], security_warnings: ["no PII in public buckets, ever"], kpis: [{ name: "Buckets with retention rules", target: "100%", current: "100% (generated)", trend: "flat" }] }),
  infra({ id: "forge-email", title: "Email Infrastructure Agent", mission: "Transactional email that lands: templates versioned, DKIM/SPF/DMARC green, bounces handled.", responsibilities: ["template library", "domain health (DKIM/SPF/DMARC)", "send/bounce/suppression logs", "SMTP relay abstraction"], inputs: ["template requests", "deliverability data"], outputs: ["templates", "deliverability warnings", "suppression lists"], decision_rules: ["no send without unsubscribe logic where required", "suppression list is absolute"], escalation_triggers: ["bounce rate >2%", "DMARC failure"], security_warnings: ["marketing use of transactional data is a privacy violation (house rule)"], kpis: [{ name: "Deliverability", target: ">99%", current: "n/a", trend: "flat" }] }),
  infra({ id: "forge-security", title: "Security Hardening Agent", mission: "Scan configs, secrets, ports, and permissions before anyone else can.", responsibilities: ["config/port/permission scans", "security checklists per platform", "dependency alerts"], inputs: ["deploy configs", "scan results"], outputs: ["findings", "hardening checklists"], decision_rules: ["criticals block deploys", "least privilege on every service account"], escalation_triggers: ["exposed port/secret", "critical CVE in a base image"], security_warnings: ["findings are facts, not suggestions — CTO arbitrates, never ignores"], kpis: [{ name: "Open criticals", target: "0", current: "0", trend: "flat" }] }),
  infra({ id: "forge-backup", title: "Backup & Recovery Agent", mission: "Encrypted backups on schedule, restores rehearsed — a backup untested is a wish.", responsibilities: ["backup policies per project", "restore drills", "encryption custody"], inputs: ["data inventories", "RPO/RTO targets"], outputs: ["backup policies", "drill reports"], decision_rules: ["every platform gets a policy at creation (enforced in the wizard)", "quarterly restore drill minimum"], escalation_triggers: ["missed backup window", "failed drill"], security_warnings: ["backup keys separate from infrastructure keys"], kpis: [{ name: "Restore drill pass", target: "100%", current: "n/a", trend: "flat" }] }),
  infra({ id: "forge-observability", title: "Observability Agent", mission: "Logs, errors, uptime, and failed builds in one calm view — no terminal spelunking.", responsibilities: ["log aggregation", "uptime checks", "failed-build surfacing", "alert routing"], inputs: ["service logs", "build results"], outputs: ["dashboards", "alerts", "incident timelines"], decision_rules: ["every service ships with a health endpoint", "alert fatigue is a defect — tune or delete"], escalation_triggers: ["downtime >5 min", "silent service (no logs)"], security_warnings: ["logs never contain secrets or PII (scrubbed at source)"], kpis: [{ name: "Mean time to detect", target: "<5 min", current: "n/a", trend: "flat" }] }),
  infra({ id: "forge-cost", title: "Cost Control Agent", mission: "Flag every SaaS dependency and recurring fee; make sovereignty measurably cheaper.", responsibilities: ["dependency inventory", "recurring-fee ledger", "self-host ROI analyses"], inputs: ["invoices/subscriptions", "usage data"], outputs: ["cost reports", "retire-this-SaaS recommendations"], decision_rules: ["every new SaaS needs a self-hosted comparison first", "savings claims must show the ops-time cost too"], escalation_triggers: ["new recurring fee without review", "cost spike >20%"], security_warnings: ["cheap but unmaintained self-hosting is a security cost — say so"], kpis: [{ name: "Monthly SaaS spend", target: "↓ 50%", current: "baseline pending", trend: "flat" }] }),
  infra({ id: "forge-migration", title: "Migration Agent", mission: "Move platforms off GitHub/Supabase/Vercel/Render/Resend on Alyssa's schedule, with zero data loss.", responsibilities: ["migration maps per platform", "cutover plans", "parity verification"], inputs: ["current SaaS inventory", "phase readiness"], outputs: ["migration packets", "cutover checklists", "parity reports"], decision_rules: ["migrate only into a phase that's live and stable", "reversible cutovers only (dual-run window)"], escalation_triggers: ["parity gap post-migration", "vendor lock-in discovery"], security_warnings: ["export data over private channels only"], kpis: [{ name: "Platforms migrated", target: "all, eventually", current: "0 (by design)", trend: "flat" }] }),
  infra({ id: "forge-runner", title: "AI Build Runner Agent", mission: "Execute build tasks through Claude/Codex/OpenClaw/Hermes/local models — packets in, verified diffs out.", responsibilities: ["run execution packets", "model routing per task", "result verification + report-back"], inputs: ["agent packets (factories/forge)", "repo access grants"], outputs: ["diffs", "build reports", "failure repairs"], decision_rules: ["no packet, no work (house rule)", "runners never see secrets without an explicit grant", "verify before report"], escalation_triggers: ["repeated failed repair", "guardrail conflict in a packet"], security_warnings: ["runner sandboxes match the ASI-Arch rule: isolated, no production credentials"], kpis: [{ name: "Packet success rate", target: ">85%", current: "n/a", trend: "flat" }] }),
  infra({ id: "forge-truth", title: "Source of Truth Agent", mission: "PRDs, specs, build plans, changelogs, and SOPs stay current, linked, and in the repo — never in someone's head.", responsibilities: ["doc generation + freshness", "changelog discipline", "SOP library", "doc↔repo sync"], inputs: ["project events", "doc edits"], outputs: ["updated docs", "staleness alerts"], decision_rules: ["docs ship with changes, same commit (house rule)", "one source of truth per fact — link, don't restate"], escalation_triggers: ["doc older than its system by >30 days"], security_warnings: ["docs are private by default; publishing is publish_public-gated"], kpis: [{ name: "Doc freshness", target: "<7 days", current: "live", trend: "flat" }] }),
];
export const getForgeAgents = () => FORGE_AGENTS;

// --- secrets vault (reference-only, audited, AI-exposure off by default) ---------------------------------
const REF_PREFIXES = ["vault:", "op://", "env:", "bw://", "keychain:"];
export function storeSecretRef(projectId, key, ref, opts = {}) {
  if (!REF_PREFIXES.some((p) => String(ref).startsWith(p))) {
    vaultAudit("REJECTED", `${key} — value did not look like a reference (${REF_PREFIXES.join(" ")}); raw secret material is never stored`);
    throw new Error(`secrets are stored as references only (${REF_PREFIXES.join(", ")}) — never raw values`);
  }
  const rec = put("vault", {
    id: newId("sec"), project_id: projectId, key, ref,
    ai_exposure: false, // agents never see secrets unless explicitly authorized
    rotation_due: opts.rotation_due ?? "90d",
    created_at: clock().toISOString(),
  });
  vaultAudit("stored", `${key} → ${ref} (project ${projectId}; ai_exposure: false)`);
  return rec;
}
export function grantSecretToAgent(secretId, agentId, reason) {
  if (!reason || reason.length < 10) throw new Error("explicit authorization requires a substantive reason (audited)");
  const vault = load("vault");
  const i = vault.findIndex((s) => s.id === secretId);
  if (i === -1) throw new Error("secret not found");
  vault[i] = { ...vault[i], ai_exposure: true, granted_to: agentId, grant_reason: reason };
  save("vault", vault);
  vaultAudit("GRANTED", `${vault[i].key} exposed to ${agentId} — ${reason}`);
  return vault[i];
}
const vaultAudit = (action, detail) => put("vault_audit", { id: newId("va"), at: clock().toISOString(), action, detail });
export const getSecrets = (projectId) => load("vault").filter((s) => !projectId || s.project_id === projectId);
export const getVaultAudit = () => load("vault_audit");

// --- the New Platform Wizard: 12 answers → 24 automatic steps ---------------------------------------------
export const WIZARD_QUESTIONS = [
  { k: "name", q: "Platform name", type: "text" },
  { k: "type", q: "Platform type", type: "text", ph: "e.g. booking platform, donor portal" },
  { k: "surface", q: "Surface", type: "select", options: ["public_website", "app", "admin_portal", "marketplace", "internal_tool"] },
  { k: "auth", q: "Needs auth?", type: "bool" },
  { k: "database", q: "Needs database?", type: "bool" },
  { k: "storage", q: "Needs file storage?", type: "bool" },
  { k: "email", q: "Needs transactional email?", type: "bool" },
  { k: "payments", q: "Needs payments?", type: "bool" },
  { k: "ai", q: "Needs AI?", type: "bool" },
  { k: "environment", q: "Environment", type: "select", options: ["local_only", "staging", "production"] },
  { k: "domain", q: "Preferred domain/subdomain", type: "text", ph: "e.g. app.divinigroup.com" },
  { k: "privacy_level", q: "Privacy/security level", type: "select", options: ["standard", "sensitive", "regulated"] },
];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const table = (name) => `${slugify(name).replace(/-/g, "_")}_items`;

function drizzleSchema(a) {
  const t = table(a.name);
  return `import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";

// ${a.name} — generated by Alfy Forge. RLS deny-by-default applied in the paired migration (house rule).
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ${t.replace(/_items$/, "Items")} = pgTable("${t}", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id").notNull().references(() => tenants.id),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
${a.auth ? `
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id").notNull().references(() => tenants.id),
  email: text("email").notNull().unique(),
  passkey_credential_ref: text("passkey_credential_ref"), // WebAuthn — no passwords stored
  role: text("role").notNull().default("member"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});` : ""}${a.storage ? `
export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id").notNull().references(() => tenants.id),
  bucket: text("bucket").notNull(),
  object_key: text("object_key").notNull(),
  is_public: boolean("is_public").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});` : ""}${a.payments ? `
// Payments: DO NOT create local payment tables — integrate Divini Pay (docs/DIVINI_PAY_SPEC.md).
// Reference pay_invoices/pay_ledger via the Divini Pay API surface; tokenized instruments only.` : ""}
`;
}

function envTemplate(a, slug) {
  const lines = ["# Generated by Alfy Forge — values live in the Secrets Vault as references, never here", `APP_NAME=${slug}`, `APP_ENV=${a.environment}`];
  if (a.database) lines.push("DATABASE_URL= # vault:forge/" + slug + "/database-url");
  if (a.auth) lines.push("AUTH_RP_ID= # WebAuthn relying party (domain)", "SESSION_SIGNING_KEY= # vault:forge/" + slug + "/session-key");
  if (a.storage) lines.push("S3_ENDPOINT= # MinIO endpoint (Phase 5)", "S3_BUCKET=" + slug, "S3_ACCESS_REF= # vault:forge/" + slug + "/s3");
  if (a.email) lines.push("SMTP_RELAY_URL= # Postal/Plunk (Phase 6)", "EMAIL_FROM=hello@" + (a.domain || slug + ".divinigroup.com"));
  if (a.payments) lines.push("DIVINI_PAY_API= # route payments through Divini Pay — no direct processor keys here");
  if (a.ai) lines.push("AI_PROVIDER_KEY_REF= # vault:forge/" + slug + "/ai — runners need an explicit grant");
  return lines.join("\n");
}

function step(key, title, status, content, packet = null) {
  return { key, title, status, content, packet };
}

export function createPlatform(answers) {
  for (const q of WIZARD_QUESTIONS) {
    if (answers[q.k] == null || answers[q.k] === "") throw new Error(`wizard answer missing: ${q.q}`);
  }
  const a = answers;
  const slug = slugify(a.name);
  const now = clock().toISOString();
  const secLevel = a.privacy_level;

  // secrets: store REFERENCES for whatever the platform needs
  const projectId = newId("proj");
  if (a.database) storeSecretRef(projectId, "DATABASE_URL", `vault:forge/${slug}/database-url`);
  if (a.auth) storeSecretRef(projectId, "SESSION_SIGNING_KEY", `vault:forge/${slug}/session-key`);
  if (a.ai) storeSecretRef(projectId, "AI_PROVIDER_KEY", `vault:forge/${slug}/ai`);

  const steps = [
    step("project_record", "1 · Project record", "done", `id ${projectId} · ${a.name} (${a.type}) · ${a.surface} · env ${a.environment} · privacy ${secLevel}`),
    step("folder_structure", "2 · Folder structure", "done", `${slug}/\n  README.md  docs/{PRD,TECH_SPEC,BUILD_PLAN,SECURITY_CHECKLIST,COST_CONTROL_PLAN,CHANGELOG}.md\n  src/{index,routes,lib}/  contracts/${a.database ? "\n  db/{schema.ts,migrations/}" : ""}${a.email ? "\n  emails/" : ""}\n  .env.example  deploy/{service.yaml}`),
    step("private_repo", "3 · Private repo", "packet_ready", "Forgejo is Phase 2 — packet contains local git init + Forgejo/GitHub-fallback commands.", { kind: "repo", commands: [`git init ${slug} && cd ${slug}`, "git add -A", `git commit -m "forge: ${slug} scaffold (generated)"`, "# Phase 2: push to Forgejo; until then a private GitHub remote is acceptable"] }),
    step("prd", "4 · PRD.md", "done", `# ${a.name} — PRD\n\n**What:** ${a.type} (${a.surface.replace(/_/g, " ")}).\n**For:** TO ANSWER: who feels the pain this week?\n**Success:** first real ${a.payments ? "payment collected via Divini Pay" : "user completes the core loop"} in ${a.environment === "local_only" ? "a local demo" : a.environment}.\n**Won't do (v1):** multi-tenant billing, theming, admin analytics.\n**Features:** auth ${a.auth ? "✔" : "—"} · db ${a.database ? "✔" : "—"} · storage ${a.storage ? "✔" : "—"} · email ${a.email ? "✔" : "—"} · payments ${a.payments ? "✔ (Divini Pay)" : "—"} · AI ${a.ai ? "✔" : "—"}`),
    step("tech_spec", "5 · TECH_SPEC.md", "done", `Stack: TypeScript, Postgres+Drizzle${a.auth ? ", WebAuthn-first auth" : ""}${a.storage ? ", MinIO (Phase 5)" : ""}${a.email ? ", SMTP relay abstraction (Phase 6)" : ""}. House rules: contract-first, RLS deny-by-default, mock adapters before live, approval gates on external actions. Privacy level ${secLevel}${secLevel !== "standard" ? " — PII separated, access audited" : ""}.`),
    step("build_plan", "6 · BUILD_PLAN.md", "done", `1) Core loop (3 screens max) 2) ${a.auth ? "Auth (passkeys)" : "No-auth demo"} 3) ${a.database ? "Schema+migrations live" : "Static data"} 4) ${a.payments ? "Divini Pay integration" : "—"} 5) Deploy ${a.environment}. Every step: smoke first.`),
    step("security_checklist", "7 · SECURITY_CHECKLIST.md", "done", `- [ ] No secrets in repo (vault refs only — enforced)\n- [ ] RLS on every table\n- [ ] ${a.auth ? "Passkeys/WebAuthn primary; step-up for sensitive actions" : "n/a auth"}\n- [ ] Private dashboard behind Tailscale/WireGuard\n- [ ] Deploy gate (deploy action class)\n- [ ] Logs scrubbed of PII/secrets${secLevel === "regulated" ? "\n- [ ] Compliance review before production (regulated data)" : ""}`),
    step("cost_control", "8 · COST_CONTROL_PLAN.md", "done", `Recurring fees at birth: $0 (self-hosted path). Every SaaS added later needs a self-host comparison (Cost Control Agent). Watch: server capacity, email volume${a.ai ? ", AI tokens" : ""}.`),
    step("changelog", "9 · CHANGELOG.md", "done", `## ${now.slice(0, 10)}\n- forge: platform scaffolded (${slug}) — docs, schema, env template, deploy config generated.`),
    step("app_scaffold", "10 · App scaffold", "done", `src/index.ts (boot + health endpoint) · src/routes/${a.surface === "public_website" ? "pages" : "app"}.ts · ${a.auth ? "src/routes/auth.ts (passkey ceremonies) · " : ""}lib/config.ts (env-validated). Ivory/navy/gold tokens per docs/DESIGN_SYSTEM.md.`),
    a.database
      ? step("create_database", "11 · Database", "packet_ready", "Live Postgres is Phase 4 — packet provisions local Docker Postgres now.", { kind: "database", commands: [`docker run -d --name ${slug}-pg -e POSTGRES_DB=${slug} -p 5432:5432 postgres:16`, "drizzle-kit push # after schema review"] })
      : step("create_database", "11 · Database", "skipped", "Not needed per wizard answers."),
    a.database ? step("drizzle_schema", "12 · Drizzle schema", "done", drizzleSchema(a)) : step("drizzle_schema", "12 · Drizzle schema", "skipped", "No database."),
    a.database ? step("migrations", "13 · Migrations", "done", `drizzle-kit generate → 0001_init.sql (tables + RLS deny-by-default pair, house pattern). Safety check: additive only, rollback = drop pair.`) : step("migrations", "13 · Migrations", "skipped", "No database."),
    step("env_template", "14 · Env variable template", "done", envTemplate(a, slug)),
    step("secrets", "15 · Secrets stored (references)", "done", getSecrets(projectId).map((s) => `${s.key} → ${s.ref} (ai_exposure: ${s.ai_exposure})`).join("\n") || "No secrets needed."),
    a.storage
      ? step("storage_bucket", "16 · Storage bucket", "done", `bucket: ${slug} (private) · signed URLs only · retention: 365d · backup: daily encrypted · public assets bucket: ${slug}-public (explicit exception list)`)
      : step("storage_bucket", "16 · Storage bucket", "skipped", "Not needed per wizard answers."),
    a.auth
      ? step("auth_config", "17 · Auth configuration", "done", `WebAuthn/passkeys primary (no passwords stored) · device-bound sessions · step-up for ${a.payments ? "payment + " : ""}admin actions · roles: owner/admin/member/viewer`)
      : step("auth_config", "17 · Auth configuration", "skipped", "Not needed per wizard answers."),
    a.email
      ? step("email_templates", "18 · Email templates", "done", `welcome.html · ${a.auth ? "password-reset.html (passkey recovery) · " : ""}${a.payments ? "receipt.html · " : ""}notification.html — all with unsubscribe logic + suppression respect. Domain health checklist: SPF, DKIM, DMARC for ${a.domain || slug}.`)
      : step("email_templates", "18 · Email templates", "skipped", "Not needed per wizard answers."),
    step("deployment_service", "19 · Deployment service", "done", `deploy/service.yaml (Coolify-ready, Phase 3): build=pnpm build · run=node dist/index.js · health=/healthz · env from vault refs · domain ${a.domain || "TBD"} + SSL auto`),
    step("local_preview", "20 · Local preview", "packet_ready", "Run locally now:", { kind: "local_preview", commands: [`cd ${slug} && pnpm i && pnpm dev`, "open http://localhost:3000"] }),
    step("backup_policy", "21 · Backup policy", "done", `${a.database ? "DB: nightly encrypted dump, 30d retention, quarterly restore drill. " : ""}${a.storage ? "Buckets: daily sync to encrypted backup target. " : ""}Docs/repo: every commit. Keys held separate from infra keys (Backup & Recovery Agent).`),
    step("first_commit", "22 · First commit", "packet_ready", "Included in the repo packet (step 3) — commit message prepared.", { kind: "first_commit", message: `forge: ${slug} — scaffold, docs, schema, env template (generated ${now.slice(0, 10)})` }),
    step("deploy_preview", "23 · Deploy preview", a.environment === "local_only" ? "skipped" : "awaiting_approval", a.environment === "local_only" ? "Local-only platform — no remote deploy." : "Remote deploys are deploy-class gated. Submit for approval below."),
    step("dashboard", "24 · Project dashboard", "done", "This page — the project record, artifacts, packets, and gates in one place."),
  ];

  const project = put("projects", {
    id: projectId, name: a.name, slug, answers: a, steps,
    status: "scaffolded", deploy_approval_id: null,
    domain: { name: a.domain || `${slug}.divinigroup.com`, dns: "packet pending", ssl: "auto on deploy", renewal: "tracked (Domain/DNS Manager)" },
    created_at: now,
  });
  svc.createActionLog({ agent_id: "forge-architect", action: `Alfy Forge: platform "${a.name}" scaffolded (${steps.filter((s) => s.status === "done").length}/24 steps done, ${steps.filter((s) => s.status === "packet_ready").length} packets, ${steps.filter((s) => s.status === "skipped").length} skipped by answers)`, status: "succeeded", business_id: null });
  return project;
}

export const getProjects = () => load("projects");
export const getProjectById = (id) => load("projects").find((p) => p.id === id);

export function submitDeployForApproval(projectId) {
  const projects = load("projects");
  const i = projects.findIndex((p) => p.id === projectId);
  if (i === -1) throw new Error("project not found");
  const p = projects[i];
  if (p.answers.environment === "local_only") throw new Error("local-only platform — nothing to deploy remotely");
  if (p.deploy_approval_id) throw new Error("already submitted");
  const req = svc.createApprovalRequest({
    action_class: "deploy",
    title: `Alfy Forge: deploy preview — ${p.name} (${p.answers.environment})`,
    requested_by: "forge-deploy",
    ask: "Approve the first remote deploy of this platform (Coolify packet executes after the token).",
    impact: `Reversible: yes (rollback one step). Privacy level: ${p.answers.privacy_level}.`,
    evidence: `project ${p.id} · domain ${p.domain.name} · security checklist generated`,
  });
  projects[i] = { ...p, deploy_approval_id: req.id };
  save("projects", projects);
  return projects[i];
}
export function deployStatus(project) {
  if (!project.deploy_approval_id) return "not_submitted";
  return svc.getApprovalRequests().find((r) => r.id === project.deploy_approval_id)?.status ?? "not_submitted";
}

// --- exports ------------------------------------------------------------------------------------------------
export function exportProjectBundle(projectId) {
  const p = getProjectById(projectId);
  if (!p) throw new Error("project not found");
  return `# ${p.name} — Alfy Forge bundle (${p.slug})\n\n` + p.steps
    .map((s) => `## ${s.title} — ${s.status}\n\n${s.content}${s.packet ? `\n\n\`\`\`\n${(s.packet.commands ?? [s.packet.message]).join("\n")}\n\`\`\`` : ""}`)
    .join("\n\n");
}
export function exportForRunner(projectId, target = "claude") {
  const p = getProjectById(projectId);
  if (!p) throw new Error("project not found");
  return {
    target, project_id: p.id, objective: `Build "${p.name}" from the Forge scaffold to its BUILD_PLAN.`,
    guardrails: [
      "no secrets — vault references only; a grant is required per secret (Secrets Agent)",
      "no deploys without a consumed deploy-class token",
      "contract-first, RLS deny-by-default, smoke before ship (house rules)",
      "report back via delegation report; no packet, no work",
    ],
    steps: p.steps.map((s) => ({ key: s.key, title: s.title, status: s.status })),
    artifacts: p.steps.filter((s) => s.status === "done").map((s) => ({ key: s.key, content: s.content })),
  };
}
export function resetForgeState() {
  for (const k of ["projects", "vault", "vault_audit"]) store.set(k, undefined);
}
