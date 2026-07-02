/**
 * The four creation factories (docs/VENTURE_FACTORY_SPEC.md, BUILD_FACTORY_SPEC.md,
 * GTM_FACTORY_SPEC.md, MEDIA_STUDIO_SPEC.md). Deterministic template generation — no AI calls:
 * every section is an editable starting point, and missing facts become explicit "TO ANSWER" prompts,
 * never invented. Sensitive go-aheads route through the Approval Center (services.createApprovalRequest).
 * Storage mirrors services.mjs: injectable store, localStorage in the browser, memory in tests.
 */
import * as svc from "./services.mjs";

// --- store ----------------------------------------------------------------------------------------
const memoryStore = () => { const m = new Map(); return { get: (k) => m.get(k), set: (k, v) => m.set(k, v) }; };
const localStore = (prefix = "alfy2_factory_") => ({
  get: (k) => { try { const r = globalThis.localStorage.getItem(prefix + k); return r ? JSON.parse(r) : undefined; } catch { return undefined; } },
  set: (k, v) => { try { globalThis.localStorage.setItem(prefix + k, JSON.stringify(v)); } catch { /* ignore */ } },
});
let store = typeof globalThis.localStorage !== "undefined" ? localStore() : memoryStore();
let clock = () => new Date();
let seq = 0;
const newId = (p) => `${p}-${clock().getTime().toString(36)}-${(++seq).toString(36)}`;
export function configure(options = {}) { if (options.store) store = options.store; if (options.clock) clock = options.clock; }
export const stores = { memoryStore, localStore };
const load = (k) => store.get(k) ?? [];
const save = (k, v) => store.set(k, v);

// --- template helpers -------------------------------------------------------------------------------
const ask = (q) => `> TO ANSWER: ${q}`;
const val = (v, q) => (v && String(v).trim() ? String(v).trim() : ask(q));
const li = (items) => items.map((x) => `- ${x}`).join("\n");

export const FACTORY_KINDS = {
  company: { label: "Create a Company", factory: "Venture Factory", approval_class: "other", approval_note: "venture go-ahead (stage-4 verdict)" },
  software: { label: "Create a Software Platform", factory: "Build Factory", approval_class: "other", approval_note: "build go-ahead (ship gate + deploy stay separately gated)" },
  gtm: { label: "Create a GTM Campaign", factory: "GTM Factory", approval_class: "send_message", approval_note: "launch go-ahead (each send/publish batch still gets its own token)" },
  media: { label: "Create a Media / Podcast Asset", factory: "Media Studio", approval_class: "publish_public", approval_note: "publish go-ahead (each piece still gated at publish time)" },
};

// --- Factory 1: Create a Company (14 sections) ------------------------------------------------------
const companySections = (i) => [
  { key: "company_profile", title: "Company profile", content:
`**Name:** ${val(i.name, "company name?")}
**One-liner:** ${val(i.one_liner, "what does it do, for whom, in one sentence?")}
**Industry:** ${val(i.industry, "industry / category?")}
**Stage:** validation → registered on Alyssa's go (docs/VENTURE_FACTORY_SPEC.md stage 6)
**Parent:** Divini Group · roster key to be assigned in docs/PORTFOLIO_COMPANY_OS.md` },
  { key: "business_model", title: "Business model", content:
`**How it makes money:** ${val(i.offer_hint, "core offer and pricing motion (one-time, retainer, subscription)?")}
**Cost drivers:** delivery time, tooling, acquisition.
**Leverage check (Five Immutable Laws):** what compounds here — assets, audience, or automation?
${ask("which of the three compounds fastest for this business?")}` },
  { key: "mission", title: "Mission", content:
`${val(i.mission, `one sentence: the change ${i.name || "this company"} makes for its customers`)}
Test: would the ICP repeat it back unprompted? If not, sharpen.` },
  { key: "positioning", title: "Positioning", content:
`**Promise:** ${val(i.one_liner, "the promise?")}
**Against:** the do-nothing default, not just competitors.
**Only-ness:** ${ask("name the one thing only this company does (or does 10x)")}
**Proof:** ${ask("strongest existing evidence — result, credential, or demo?")}` },
  { key: "icp", title: "ICP", content:
`**Who:** ${val(i.icp_hint, "who feels the pain this week?")}
**Trigger:** ${ask("what event makes them look for a solution?")}
**Watering holes:** ${ask("where do they already gather; whom do they trust?")}
**Disqualifiers:** who we say no to (protects margin and sanity).` },
  { key: "offer_suite", title: "Offer suite", content:
`| Tier | Offer | Price | Purpose |
|---|---|---|---|
| Entry | ${val(i.offer_hint, "wedge offer?")} | ${val(i.price_hint, "entry price?")} | trust + speed to cash |
| Core | expanded engagement | 3–5× entry | margin |
| Compounding | retainer / subscription | recurring | LTV |` },
  { key: "revenue_model", title: "Revenue model", content:
`**Fastest path to cash:** entry offer to the warmest 10 prospects.
**90-day target:** ${ask("revenue target for the first 90 days?")}
**Unit economics to verify:** price − delivery cost − acquisition cost > 0 by offer #3.` },
  { key: "department_setup", title: "Department setup", content:
`Instantiate the 13-department Business Template (docs/BUSINESS_TEMPLATE.md); activate now:
${li(["Revenue (CRO Agent oversight)", "Growth/Marketing", "Operations", "Finance (CFO Agent, recommend-only)", "Legal & Risk (claims + contracts)"])}
Others stay dormant until the OS Viewer shows load.` },
  { key: "role_map", title: "Role map", content:
`${li([
  `Portfolio agent: "${val(i.name, "Company")} Agent" — owns the pipeline (prepare_external_asset)`,
  "Cabinet oversight: Chief Revenue / Marketing / Finance / Legal per docs/ENTERPRISE_AGENT_CABINET.md",
  "Human: Alyssa approves everything external (docs/AGENT_AUTHORITY_MATRIX.md)",
])}` },
  { key: "sop_starter_library", title: "SOP starter library", content:
`${li(["Lead intake → first reply (SLA: 4h)", "Offer → proposal → close", "Delivery checklist per offer", "Weekly review (metrics + blockers)", "Invoice + collections cadence"])}
Each becomes a playbook via the Enterprise Playbook Generator on registration.` },
  { key: "risk_register", title: "Risk register", content:
`| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| No validated demand | ${i.icp_hint ? "medium" : "high — ICP unvalidated"} | fatal | entry-offer test before any build spend |
| Founder-time dependency | high | slow growth | agent + SOP coverage from day one |
| ${ask("name the market-specific risk")} | — | — | — |` },
  { key: "legal_admin_checklist", title: "Legal / admin checklist", content:
`${li(["Entity analysis via entity-structure engine (professional review REQUIRED — analysis only)", "EIN + bank account (human-only steps)", "Terms + privacy policy reviewed by Chief Legal & Risk Agent", "Claims review if any health/finance/legal claims", "Insurance check per industry"])}
Nothing here is executed by Alfy2 — it is a checklist for humans and advisors.` },
  { key: "launch_checklist", title: "Launch checklist", content:
`${li(["Stage-4 verdict: Alyssa's go (THIS packet's approval)", "Register in the portfolio roster + OS Viewer", "Entry offer live + payment path (Stripe blueprint → live later)", "GTM packet generated (Factory 3)", "First 10 warm conversations queued for approval"])}` },
  { key: "kpi_dashboard", title: "KPI dashboard", content:
`| KPI | Target | Cadence |
|---|---|---|
| Revenue (MTD) | ${ask("90-day monthly target?")} | weekly |
| Warm conversations | 10/wk | weekly |
| Offer conversion | 20%+ | monthly |
| Founder hours/wk | trending ↓ | monthly |
Wire into the Company OS Viewer on registration.` },
];

// --- Factory 2: Create a Software Platform (12 sections) --------------------------------------------
const softwareSections = (i) => [
  { key: "product_brief", title: "Product brief", content:
`**Platform:** ${val(i.name, "product name?")}
**Purpose:** ${val(i.purpose, "the job the software does, in one sentence?")}
**Users:** ${val(i.users_hint, "who uses it day one?")}
**Form:** ${val(i.platform, "web app / mobile / API?")}
**Smallest shippable:** the 3 screens that prove the loop — everything else is v2.` },
  { key: "feature_spec", title: "Feature spec", content:
`**Must (v1):**
${li(["Core loop: " + val(i.purpose, "capture → process → output of what?"), "Auth (single-operator first)", "One dashboard view"])}
**Later:** ${val(i.integrations_hint, "integrations wishlist?")}
**Never (v1):** admin panels, theming, multi-tenant billing — cut ruthlessly.` },
  { key: "user_roles", title: "User roles", content:
`| Role | Can | Cannot |
|---|---|---|
| Operator (Alyssa) | everything, approvals | — |
| Agent (API token) | read + draft within scope | anything external without a token |
| Viewer | read dashboards | mutate anything |
Zero-trust defaults per docs/AGENT_IDENTITY_ZERO_TRUST.md.` },
  { key: "data_schema", title: "Data schema", content:
`Follow the house pattern (tenant-scoped, RLS deny-by-default, odd/even migration pairs):
${li(["tenants (exists)", `${(i.name || "app").toLowerCase().replace(/[^a-z0-9]+/g, "_")}_items — the core records`, "action_logs — every mutation logged", "approval_requests — reuse migration 0239, do NOT re-invent"])}
${ask("what is the core record and its 5 essential fields?")}` },
  { key: "ui_map", title: "UI map", content:
`${li(["/ — dashboard (status + next action)", "/items — the core list", "/items/:id — detail + actions", "/approvals — reuse the Approval Center pattern"])}
Design tokens: ivory/navy/gold per docs/EXECUTIVE_DASHBOARD_SPEC.md §Design language.` },
  { key: "tech_stack_recommendation", title: "Tech stack recommendation", content:
`**Default (house stack):** TypeScript + Zod contracts (packages/shared pattern), Hono API, Supabase/Postgres + RLS, static or minimal frontend, Render + Vercel deploys.
**Rule:** boring, typed, already-proven in this repo. New tech needs a tech-stack-evaluator run and an ADR.
**Deviation trigger:** ${val(i.platform, "") === "mobile" ? "mobile → evaluate Expo/React Native via ADR" : "none identified from input"}.` },
  { key: "repo_setup_checklist", title: "Repo setup checklist", content:
`${li(["Repo created (private) + README with the product brief", "Contract-first: shared/contracts/<name>.ts before any engine", "tsc -b + smoke script wired into package.json", "No secrets in repo — .env.example only", ".github: PR template + typecheck gate"])}` },
  { key: "fable_prompt_packet", title: "Fable prompt packet", content:
`\`\`\`
You are building ${val(i.name, "<product>")} inside the Alfy2 monorepo conventions.
Objective: ${val(i.purpose, "<one-sentence job>")}
Constraints: contract-first (Zod), deterministic engines, injectable clock/idFactory,
tenant-scoped, RLS deny-by-default, mock adapters before live APIs, approval gates on
send/publish/money/deploy. Build the smallest testable slice; write the smoke first.
Deliverable: contract + engine + smoke, then stop and report.
\`\`\`` },
  { key: "claude_prompt_packet", title: "Claude prompt packet", content:
`\`\`\`
Context: Alfy2 house rules (docs/BUILD_FACTORY_SPEC.md §House build standard).
Task: implement the next unchecked item in the feature spec of ${val(i.name, "<product>")}.
Verify with the smoke; do not touch routes or migrations without listing them first.
Report: files changed, how to test, risks, next task.
\`\`\`` },
  { key: "openclaw_execution_packet", title: "OpenClaw execution packet", content:
`\`\`\`json
{
  "target": "openclaw",
  "objective": ${JSON.stringify(val(i.purpose, "<job>"))},
  "repo": "<repo-url-after-setup>",
  "guardrails": ["no external sends", "no deploys without approval token", "no secrets"],
  "handoff": "report to /org/reports with files changed + test output"
}
\`\`\`
Execution follows the delegation-packet rule: no work without an accepted packet.` },
  { key: "qa_test_plan", title: "QA test plan", content:
`${li(["Smoke per engine (deterministic, node:assert)", "Gateway scenario test if routes added", "Tenant-isolation check (two tenants, zero leakage)", "Approval-gate check: gated route parks a 202 without a token", "Manual click-through of the 3 core screens"])}` },
  { key: "deployment_checklist", title: "Deployment checklist", content:
`${li(["Ship gate green (acceptance met, rollback known)", "Deploy approval token consumed (action class: deploy)", "Env vars set by human (never repo)", "/healthz verified post-deploy", "Action log entry + changelog updated"])}` },
];

// --- Factory 3: Create a GTM Campaign (13 sections) --------------------------------------------------
const gtmSections = (i) => [
  { key: "market_thesis", title: "Market thesis", content:
`**Offer:** ${val(i.offer_name, "offer name?")} — ${val(i.promise, "the promise?")}
**Why now:** ${ask("what changed in the market that makes this land today?")}
**Belief to prove:** the ICP pays ${val(i.price_point, "the price")} for ${val(i.promise, "the outcome")} within 30 days of first touch.` },
  { key: "target_segment", title: "Target segment", content:
`**Segment:** ${val(i.icp_hint, "who exactly — role, situation, trigger?")}
**Reachable via:** ${val((i.channels || []).join(", "), "which channels?")}
**List source:** warm network first; cold lists require provenance (see the denied apr-102 precedent).` },
  { key: "positioning", title: "Positioning", content:
`**For** ${val(i.icp_hint, "<ICP>")} **who** ${ask("struggle with what?")},
**${val(i.offer_name, "<offer>")}** delivers **${val(i.promise, "<promise>")}**
**unlike** the do-nothing default **because** ${ask("the only-ness proof?")}.` },
  { key: "funnel_map", title: "Funnel map", content:
`attention (${val((i.channels || []).join(" + "), "channels")}) → lead magnet → nurture → conversation → offer → close → onboard → referral
**Bottleneck to watch first:** lead → conversation rate.` },
  { key: "landing_page_copy", title: "Landing page copy", content:
`**H1:** ${val(i.promise, "the promise, verbatim")}
**Sub:** for ${val(i.icp_hint, "<ICP>")} — without ${ask("the pain they escape?")}
**CTA:** ${ask("the one action: book / download / buy?")}
**Proof block:** ${ask("strongest proof asset?")}
**FAQ seeds:** price justification · time to value · "why not DIY".` },
  { key: "lead_magnet", title: "Lead magnet", content:
`**Format:** checklist / teardown / template — pick what the ICP uses same-day.
**Working title:** "The ${val(i.icp_hint, "<ICP>")} guide to ${val(i.promise, "<outcome>")}"
**Rule:** it must demonstrate the method, not describe it.` },
  { key: "email_nurture_sequence", title: "Email nurture sequence", content:
`5 sends over 10 days (each is send_message — batch-approved with drafts):
${li(["#1 deliver magnet + one insight", "#2 the mistake everyone makes", "#3 proof story", "#4 objection: " + (i.price_point ? `is it worth ${i.price_point}?` : "why act now?"), "#5 direct offer + deadline"])}` },
  { key: "cold_outreach_sequence", title: "Cold outreach sequence", content:
`Only with verified list provenance. 3 touches: personal observation → value drop → direct ask.
Every send queues for approval with the draft attached (docs/AGENT_AUTHORITY_MATRIX.md).
${ask("what personal observation can we truthfully make about each prospect?")}` },
  { key: "social_content_calendar", title: "Social content calendar", content:
`3 posts/wk × 4 weeks (publish_public, weekly batch approval):
week 1 problem · week 2 method · week 3 proof · week 4 offer.
Feed from the media factory's repurposing assets — never create twice.` },
  { key: "podcast_content_angles", title: "Podcast / content angles", content:
`${li([`Decoded episode: "${val(i.promise, "<the promise>")} — what actually works"`, "Guest pitch angle for 2 shows the ICP hears", "One contrarian take (Contrarian lens) for reach"])}` },
  { key: "crm_pipeline_stages", title: "CRM pipeline stages", content:
`lead → magnet-engaged → conversation booked → offer made → verbal yes → paid → onboarded
Stage rot alarm: anything >7 days stale surfaces in Don't-Drop-the-Ball.` },
  { key: "kpi_targets", title: "KPI targets", content:
`| KPI | 30d | 60d | 90d |
|---|---|---|---|
| Qualified leads | 20 | 50 | 90 |
| Conversations | 8 | 20 | 35 |
| Revenue | ${val(i.revenue_target, "target?")} ÷ 4 | ÷ 2 | ${val(i.revenue_target, "target?")} |
Revenue per send beats opens/clicks — war-room rules.` },
  { key: "plan_306090", title: "30/60/90-day plan", content:
`**0–30:** assets live, warm-list wave, first conversations. Gate: 8 conversations or revisit positioning.
**31–60:** double the winning channel, kill the losing one, first case study.
**61–90:** scale winner, raise price test, referral loop on.
Every external step carries its action class — the calendar is safe to hand to agents.` },
];

// --- Factory 4: Create a Media / Podcast Asset (17 sections) -----------------------------------------
const mediaSections = (i) => [
  { key: "topic_research", title: "Topic research", content:
`**Topic:** ${val(i.topic, "what is this piece about?")}
**Audience:** ${val(i.audience_hint, "who must feel it was made for them?")}
**Existing coverage gap:** ${ask("what does every other take on this topic miss?")}` },
  { key: "virality_thesis", title: "Virality thesis", content:
`**Shareable because:** ${ask("identity (says something about the sharer), utility, or heresy?")}
**The 7-second test:** the hook must land before the swipe.
**Emotional core:** ${ask("surprise, vindication, or hope?")}` },
  { key: "episode_idea", title: "Episode idea", content:
`**Working concept:** ${val(i.topic, "<topic>")} through the ${val(i.series_name, "Decoded")} lens.
**Payoff promise:** the listener leaves able to ${ask("do what, specifically?")}` },
  { key: "series_angle", title: "Series angle", content:
`**Series:** ${val(i.series_name, "standalone or which series?")}
**This episode's slot:** ${ask("does it open, deepen, or close an arc?")}
**Callback links:** reference 1–2 prior episodes for binge flow.` },
  { key: "hook_bank", title: "Hook bank", content:
`${li([
  `"Everyone tells you ${val(i.topic, "<topic>")} works like X. It doesn't."`,
  `"I ${ask("insert the personal stake — what did this cost or earn you?")}"`,
  `"The uncomfortable math of ${val(i.topic, "<topic>")}."`,
  `"Stop ${ask("the common behavior to interrupt?")} — here's what to do instead."`,
])}` },
  { key: "episode_outline", title: "Episode outline", content:
`${li(["Cold open: strongest hook (0:00–0:40)", "Stakes: why this matters now (0:40–3:00)", "The method/story spine: 3 beats", "The turn: what everyone gets wrong", "Payoff: the do-this-today", "CTA: " + val(i.sponsor_hint, "subscribe/lead magnet")])}` },
  { key: "recording_checklist", title: "Recording checklist", content:
`${li(["Outline printed / second screen", "Mic gain check + room quiet", "Hook recorded 3 ways", "B-roll / screen capture list (if video)", "Backup local recording on"])}` },
  { key: "transcript_placeholder", title: "Transcript", content:
`_Transcript lands here after recording (Descript/Whisper import — connector blueprint)._
On import: pull quotes marked → hook bank v2; claims flagged → Claims Checker.` },
  { key: "clip_plan", title: "Clip plan", content:
`5 clips per episode (content-factory multiplier):
${li(["the hook itself", "the contrarian turn", "the practical payoff", "the story beat", "the one-liner for X"])}
Each clip = publish_public → weekly batch approval.` },
  { key: "title_options", title: "Title options", content:
`${li([
  `${val(i.topic, "<Topic>")}: what actually works`,
  `The truth about ${val(i.topic, "<topic>")} nobody says out loud`,
  `How I ${ask("the specific result/story verb?")}`,
])}
Pick by search intent + curiosity gap; test on the hook bank.` },
  { key: "thumbnail_brief", title: "Thumbnail brief", content:
`**Face:** Alyssa, direct gaze, one strong emotion.
**Text:** ≤4 words from the winning title.
**Palette:** navy/ivory/gold house tokens for brand recall.
**Rule:** readable at 120px wide.` },
  { key: "description_copy", title: "Description copy", content:
`Para 1: the payoff promise (2 lines, front-loaded keywords).
Para 2: 3 timestamped beats.
Para 3: CTA — ${val(i.sponsor_hint, "lead magnet / subscribe")} + links.
_Claims pass Claims Checker before publish._` },
  { key: "seo_keywords", title: "SEO keywords", content:
`Primary: ${val(i.topic, "<topic>")}
Secondary: ${val(i.audience_hint, "<audience>")} + ${val(i.topic, "<topic>")}
${ask("3 long-tail questions the ICP actually types?")}` },
  { key: "sponsor_cta", title: "Sponsor CTA", content:
`**Slot:** ${val(i.sponsor_hint, "sponsor/offer to feature — or house offer (FounderOS waitlist)?")}
**Read:** 20s, personal-use framing only — nothing we don't use.
**Gate:** sponsor claims = medical_legal_financial_claim review if applicable.` },
  { key: "repurposing_assets", title: "Repurposing assets", content:
`The 42-piece map (docs/MEDIA_STUDIO_SPEC.md): 1 long + 5 shorts + 5 reels + 10 X posts + 5 LinkedIn +
3 carousels + newsletter + blog + 5 clips + article + email + sales asset + PR angle + speaker story + case study.
All linked to this packet as source — nothing created twice.` },
  { key: "publishing_checklist", title: "Publishing checklist", content:
`${li(["Claims check passed", "Brand-DNA voice lint", "Batch queued in Approval Center (publish_public)", "Scheduled via scheduler connector (blueprint — manual until live)", "Metrics row added to the media dashboard"])}` },
  { key: "ai_avatar_job", title: "AI avatar job placeholder", content:
`_Placeholder — docs/AI_AVATAR_ENGINE_SPEC.md (engine not yet built)._
**Job:** render intro/clips with Alyssa's digital double once the mock adapter lands.
**Gate:** approval token bound to the exact script hash; no standing grants for avatar content (v1 rule).
**Script source:** the episode outline + hook bank above.` },
];

const GENERATORS = { company: companySections, software: softwareSections, gtm: gtmSections, media: mediaSections };

// --- core API ----------------------------------------------------------------------------------------

export function createFactoryRequest(kind, input = {}) {
  if (!FACTORY_KINDS[kind]) throw new Error(`unknown factory kind: ${kind}`);
  const req = { id: newId("freq"), kind, input, created_at: clock().toISOString(), packet_id: null };
  save("requests", [...load("requests"), req]);
  return req;
}
export function getFactoryRequests() { return load("requests"); }

function generatePacket(kind, input) {
  const req = createFactoryRequest(kind, input);
  const sections = GENERATORS[kind](input);
  const name = input.name || input.offer_name || input.topic || FACTORY_KINDS[kind].label;
  const packet = {
    id: newId("pkt"), kind, name, input, sections, version: 1,
    status: "draft", approval_id: null,
    business_key: input.business_key ?? null,
    created_at: clock().toISOString(), updated_at: clock().toISOString(),
  };
  save("packets", [...load("packets"), packet]);
  req.packet_id = packet.id;
  save("requests", load("requests").map((r) => (r.id === req.id ? req : r)));
  save("versions", [...load("versions"), { id: newId("ver"), packet_id: packet.id, version: 1, sections, note: "generated", created_at: packet.created_at }]);
  save("assets", [...load("assets"), ...sections.map((s) => ({ id: newId("ast"), packet_id: packet.id, section_key: s.key, title: `${name} — ${s.title}`, kind }))]);
  svc.createActionLog({ agent_id: kindAgent(kind), action: `${FACTORY_KINDS[kind].factory}: generated "${name}" packet (${sections.length} sections)`, status: "succeeded", business_id: input.business_key ?? null });
  return packet;
}
const kindAgent = (kind) => ({ company: "chief-venture-architect", software: "chief-technology", gtm: "chief-marketing", media: "chief-media" }[kind]);

export const generateCompanyPacket = (input) => generatePacket("company", input);
export const generateSoftwareBuildPacket = (input) => generatePacket("software", input);
export const generateGTMPacket = (input) => generatePacket("gtm", input);
export const generateMediaPacket = (input) => generatePacket("media", input);

export function getPackets(kind) {
  const list = load("packets");
  return kind ? list.filter((p) => p.kind === kind) : list;
}
export function getPacketById(id) { return load("packets").find((p) => p.id === id); }
export function getPacketVersions(packetId) { return load("versions").filter((v) => v.packet_id === packetId); }
export function getGeneratedAssets(packetId) {
  const list = load("assets");
  return packetId ? list.filter((a) => a.packet_id === packetId) : list;
}
export function getPacketApprovals() { return load("packet_approvals"); }

export function createPacketVersion(packetId, sections, note = "edited") {
  const packets = load("packets");
  const idx = packets.findIndex((p) => p.id === packetId);
  if (idx === -1) throw new Error(`packet ${packetId} not found`);
  const p = { ...packets[idx], sections, version: packets[idx].version + 1, updated_at: clock().toISOString() };
  packets[idx] = p; save("packets", packets);
  save("versions", [...load("versions"), { id: newId("ver"), packet_id: packetId, version: p.version, sections, note, created_at: p.updated_at }]);
  return p;
}
export function updatePacketSection(packetId, sectionKey, content, note) {
  const p = getPacketById(packetId);
  if (!p) throw new Error(`packet ${packetId} not found`);
  const sections = p.sections.map((s) => (s.key === sectionKey ? { ...s, content } : s));
  return createPacketVersion(packetId, sections, note ?? `edited ${sectionKey}`);
}

export function submitPacketForApproval(packetId) {
  const p = getPacketById(packetId);
  if (!p) throw new Error(`packet ${packetId} not found`);
  if (p.approval_id) throw new Error("packet already submitted");
  const meta = FACTORY_KINDS[p.kind];
  const req = svc.createApprovalRequest({
    action_class: meta.approval_class,
    title: `${meta.factory}: go-ahead for "${p.name}" (v${p.version})`,
    requested_by: kindAgent(p.kind),
    business_id: p.business_key ?? null,
    ask: `Approve the ${meta.label.toLowerCase()} packet — ${meta.approval_note}.`,
    impact: `Reversible: yes (packet only — execution steps carry their own gates). ${p.sections.length} sections at v${p.version}.`,
    evidence: `Packet ${p.id}: ${p.sections.map((s) => s.title).join(" · ")}`,
  });
  const packets = load("packets");
  const idx = packets.findIndex((x) => x.id === packetId);
  packets[idx] = { ...p, status: "submitted", approval_id: req.id, updated_at: clock().toISOString() };
  save("packets", packets);
  save("packet_approvals", [...load("packet_approvals"), { id: newId("pap"), packet_id: packetId, approval_id: req.id, action_class: meta.approval_class, created_at: clock().toISOString() }]);
  return packets[idx];
}

// --- exports -------------------------------------------------------------------------------------------

export function exportPacketToMarkdown(packetId) {
  const p = getPacketById(packetId);
  if (!p) throw new Error(`packet ${packetId} not found`);
  return `# ${p.name}\n\n> ${FACTORY_KINDS[p.kind].factory} packet · v${p.version} · ${p.status} · generated ${p.created_at}\n\n` +
    p.sections.map((s) => `## ${s.title}\n\n${s.content}`).join("\n\n");
}

export function exportPacketToObsidian(packetId) {
  const p = getPacketById(packetId);
  if (!p) throw new Error(`packet ${packetId} not found`);
  const fm = [
    "---",
    `title: "${p.name.replace(/"/g, "'")}"`,
    `type: alfy2/${p.kind}-packet`,
    `factory: ${FACTORY_KINDS[p.kind].factory}`,
    `version: ${p.version}`,
    `status: ${p.status}`,
    p.business_key ? `business: "[[${p.business_key}]]"` : null,
    `created: ${p.created_at}`,
    `tags: [alfy2, factory, ${p.kind}]`,
    "---",
  ].filter(Boolean).join("\n");
  return `${fm}\n\n${exportPacketToMarkdown(packetId).split("\n").slice(2).join("\n")}`;
}

/** Execution packet for an agent runner (fable | claude | openclaw) — JSON, guardrails included. */
export function exportPacketForAgent(packetId, target = "claude") {
  const p = getPacketById(packetId);
  if (!p) throw new Error(`packet ${packetId} not found`);
  return {
    target,
    packet_id: p.id,
    kind: p.kind,
    objective: `Execute the "${p.name}" ${FACTORY_KINDS[p.kind].label.toLowerCase()} packet (v${p.version}).`,
    approval_status: p.status,
    guardrails: [
      "no external sends/publishes/money/contracts without an approved token per step",
      "mock adapters before live APIs",
      "no secrets in any artifact",
      "report back via delegation report (no work without an accepted packet)",
    ],
    sections: p.sections.map((s) => ({ key: s.key, title: s.title, content: s.content })),
    unresolved: p.sections.flatMap((s) => (s.content.match(/> TO ANSWER: .+/g) ?? []).map((q) => ({ section: s.key, question: q.replace("> TO ANSWER: ", "") }))),
  };
}

/** Reset factory state (Preview affordance). */
export function resetFactoryState() {
  save("requests", []); save("packets", []); save("versions", []); save("assets", []); save("packet_approvals", []);
}
