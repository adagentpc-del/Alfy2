/**
 * Mock operating data for the Enterprise Command Center (docs/ENTERPRISE_AGENT_CABINET.md,
 * docs/PORTFOLIO_COMPANY_OS.md). Preview layer only — every number is illustrative. The shapes mirror
 * what the API will serve so the service layer can swap to fetch() without touching the views.
 * Authority levels use the scope tiers from docs/AGENT_AUTHORITY_MATRIX.md.
 */

export const DEPARTMENTS = [
  { id: "strategy", name: "Strategy" },
  { id: "ventures", name: "Ventures" },
  { id: "product", name: "Product" },
  { id: "technology", name: "Technology" },
  { id: "revenue", name: "Revenue" },
  { id: "marketing", name: "Marketing" },
  { id: "sales", name: "Sales" },
  { id: "media", name: "Media" },
  { id: "finance", name: "Finance" },
  { id: "operations", name: "Operations" },
  { id: "people", name: "People / HR" },
  { id: "legal_risk", name: "Legal & Risk" },
  { id: "security", name: "Security" },
  { id: "knowledge", name: "Knowledge" },
  { id: "automation", name: "Automation" },
  { id: "data", name: "Data & Analytics" },
  { id: "portfolio", name: "Portfolio Operations" },
];

// --- The Executive Cabinet (16) -----------------------------------------------------------------
// layer: "cabinet". Where a seat corresponds to a seeded ai-org role card, role_card_ref names it
// (code remains the source of truth for the 78-card registry — docs/AGENT_TITLE_REGISTRY.md).

const cabinet = (a) => ({ layer: "cabinet", linked_business: null, reporting_cadence: "weekly", ...a });

export const CABINET_AGENTS = [
  cabinet({
    id: "chief-strategy",
    title: "Chief Strategy Agent",
    department: "strategy",
    role_card_ref: "Portfolio Strategist",
    mission: "Keep the whole portfolio pointed at the highest-leverage moves and kill low-value work early.",
    responsibilities: ["portfolio strategy & focus ranking", "quarterly bets and kill decisions", "cross-company synergy map", "founder-attention allocation"],
    authority_level: "recommend_only",
    approval_requirements: ["any focus/pause/kill decision is a recommendation to Alyssa"],
    owned_workflows: ["portfolio re-rank (monthly)", "strategy brief (weekly)", "opportunity-cost review"],
    kpis: [
      { name: "Portfolio ROI", target: "+15% QoQ", current: "+9%", trend: "up" },
      { name: "Focus accuracy", target: "80%", current: "74%", trend: "up" },
      { name: "Low-value work paused", target: "5/qtr", current: "3", trend: "flat" },
    ],
    status: "active",
    next_action: "Deliver the July focus memo: Move Mi cash push vs FounderOS beta trade-off.",
    risks: ["strategy drift if weekly brief is skipped two weeks running"],
  }),
  cabinet({
    id: "chief-venture-architect",
    title: "Chief Venture Architect Agent",
    department: "ventures",
    role_card_ref: null,
    mission: "Run the Venture Factory: idea → workup → simulate → verdict → registered company, cheaply.",
    responsibilities: ["fifteen-section idea workups", "venture simulations & kill gates", "Builder-Mode venture OS runs", "enterprise setup runs for approved ventures"],
    authority_level: "draft_only",
    approval_requirements: ["stage-4 go/park/kill verdicts are Alyssa's", "Builder Mode approve() is Alyssa's"],
    owned_workflows: ["venture pipeline (docs/VENTURE_FACTORY_SPEC.md)", "setup engine runs"],
    kpis: [
      { name: "Ideas worked up", target: "4/mo", current: "3", trend: "up" },
      { name: "Ventures killed early vs late", target: "100% early", current: "100%", trend: "flat" },
    ],
    status: "active",
    next_action: "Complete the DatingModern.ai relaunch workup for the July verdict session.",
    risks: ["pipeline starves if inbox capture isn't triaged weekly"],
  }),
  cabinet({
    id: "chief-product",
    title: "Chief Product Officer Agent",
    department: "product",
    role_card_ref: "Product Manager",
    mission: "Make every product ship the smallest thing users will pay for, then compound it.",
    responsibilities: ["product specs & acceptance criteria", "activation and feedback loops", "release notes & roadmap hygiene"],
    authority_level: "create_internal_task",
    approval_requirements: ["public roadmap or pricing-page changes are publish_public"],
    owned_workflows: ["spec pipeline", "feedback triage (weekly)"],
    kpis: [
      { name: "Activation rate", target: "40%", current: "31%", trend: "up" },
      { name: "Spec-to-ship cycle", target: "<14d", current: "18d", trend: "down" },
    ],
    status: "active",
    next_action: "Cut the FounderOS beta scope to the 5 screens the demo actually needs.",
    risks: ["scope creep on FounderOS beta"],
  }),
  cabinet({
    id: "chief-technology",
    title: "Chief Technology Officer Agent",
    department: "technology",
    role_card_ref: "Chief Systems Architect",
    mission: "Keep the build factory fast, boring, and reliable — ship gates green, no drama deploys.",
    responsibilities: ["build packets & architecture calls", "ship-gate verdicts", "integration adapters (mock-first)", "typecheck/smoke discipline"],
    authority_level: "execute_with_approval",
    approval_requirements: ["deploy is a gated action class — token per deploy"],
    owned_workflows: ["build factory (docs/BUILD_FACTORY_SPEC.md)", "Render/Vercel deploys"],
    kpis: [
      { name: "Ship-gate first-pass", target: "90%", current: "88%", trend: "up" },
      { name: "Defect escape rate", target: "<2%", current: "1.4%", trend: "flat" },
    ],
    status: "active",
    next_action: "Re-sync Render alfie-api and verify /healthz (Day-1 blocker for live mode).",
    risks: ["Render env vars need Alyssa's dashboard access — external dependency"],
  }),
  cabinet({
    id: "chief-revenue",
    title: "Chief Revenue Officer Agent",
    department: "revenue",
    role_card_ref: "Chief Revenue Officer",
    mission: "Convert attention into collected revenue across every business, fastest path first.",
    responsibilities: ["pipeline & deal desk oversight", "fastest-path-to-cash per company", "pricing recommendations", "revenue blockers removal"],
    authority_level: "execute_with_approval",
    approval_requirements: ["pricing/discounts, quotes, and contracts always need tokens"],
    owned_workflows: ["revops brief (daily)", "deal desk review (weekly)"],
    kpis: [
      { name: "Revenue collected", target: "$45k/mo", current: "$28.4k", trend: "up" },
      { name: "Close rate", target: "30%", current: "24%", trend: "up" },
      { name: "Pipeline velocity", target: "21d", current: "29d", trend: "flat" },
    ],
    status: "active",
    next_action: "Get the Henderson $2.4k quote approved and sent today — oldest revenue item in queue.",
    risks: ["3 Move Mi leads aging past 24h first-reply SLA"],
  }),
  cabinet({
    id: "chief-marketing",
    title: "Chief Marketing Officer Agent",
    department: "marketing",
    role_card_ref: "Growth Strategist",
    mission: "Bring the right audience to every brand and turn attention into qualified pipeline.",
    responsibilities: ["GTM launch plans", "channel strategy & budget", "brand consistency across 9 brands", "campaign optimization (70/30)"],
    authority_level: "prepare_external_asset",
    approval_requirements: ["every publish/post/ad is publish_public — token per batch"],
    owned_workflows: ["GTM factory plans", "campaign reviews (weekly)"],
    kpis: [
      { name: "Qualified leads", target: "120/mo", current: "86", trend: "up" },
      { name: "Cost per lead", target: "<$18", current: "$23", trend: "down" },
    ],
    status: "active",
    next_action: "Finalize the FounderOS beta GTM plan (gtm-factory output) for CRO review.",
    risks: ["channel ROI unproven on paid until tracking connects"],
  }),
  cabinet({
    id: "chief-sales",
    title: "Chief Sales Officer Agent",
    department: "sales",
    role_card_ref: "Sales Strategist",
    mission: "Own the sales motion: qualify hard, propose fast, follow up forever.",
    responsibilities: ["sales playbooks per company", "proposal quality & turnaround", "follow-up cadence enforcement"],
    authority_level: "prepare_external_asset",
    approval_requirements: ["every outbound send is send_message — drafts queue for approval"],
    owned_workflows: ["proposal pipeline", "follow-up autopilot oversight"],
    kpis: [
      { name: "Proposals out", target: "12/mo", current: "9", trend: "up" },
      { name: "Follow-up completion", target: "100%", current: "92%", trend: "up" },
    ],
    status: "active",
    next_action: "Draft the StrataLogic discovery-call proposal; queue for approval by Thursday.",
    risks: ["proposal turnaround slips when pricing needs CFO input"],
  }),
  cabinet({
    id: "chief-media",
    title: "Chief Media Officer Agent",
    department: "media",
    role_card_ref: "PR Manager",
    mission: "Run the media studio: one recording becomes forty-two assets and compounding authority.",
    responsibilities: ["Decoded episode pipeline", "content multiplication (42-piece packages)", "PR placements & guest booking", "avatar render queue (spec stage)"],
    authority_level: "prepare_external_asset",
    approval_requirements: ["every publish is publish_public; guest outreach is send_message"],
    owned_workflows: ["media studio pipeline (docs/MEDIA_STUDIO_SPEC.md)", "weekly content calendar"],
    kpis: [
      { name: "Pieces shipped per source", target: "42", current: "38", trend: "up" },
      { name: "Placements booked", target: "2/mo", current: "1", trend: "flat" },
    ],
    status: "active",
    next_action: "Package Decoded ep. 12 through the content factory; queue the 5 clips for approval.",
    risks: ["publish queue stalls without a batch-approval session weekly"],
  }),
  cabinet({
    id: "chief-finance",
    title: "Chief Finance Officer Agent",
    department: "finance",
    role_card_ref: "CFO Agent",
    mission: "Protect margin and runway; make every dollar's job visible. Analyze aggressively, execute never.",
    responsibilities: ["cash & runway tracking", "cost control & subscription audits", "Profit-First allocation recommendations", "invoice hygiene"],
    authority_level: "recommend_only",
    approval_requirements: ["move_money/charge are forbidden actions — recommendations only, always"],
    owned_workflows: ["finance command review (weekly)", "capital allocation memo (monthly)"],
    kpis: [
      { name: "Runway", target: ">120d", current: "94d", trend: "flat" },
      { name: "Subscription waste cut", target: "$500/mo", current: "$310", trend: "up" },
    ],
    status: "active",
    next_action: "Deliver the July Profit-First allocation memo with the Move Mi cash-push scenario.",
    risks: ["runway math is stale until live bank feeds connect (mock until then)"],
  }),
  cabinet({
    id: "chief-operations",
    title: "Chief Operations Officer Agent",
    department: "operations",
    role_card_ref: "COO Agent",
    mission: "Turn everything done twice into an SOP and everything done weekly into an automation candidate.",
    responsibilities: ["SOP coverage", "task routing & throughput", "process audits", "automation candidate pipeline"],
    authority_level: "execute_low_risk",
    approval_requirements: ["standing-rule changes are change_standing_rule — gated"],
    owned_workflows: ["ops review (weekly)", "SOP factory"],
    kpis: [
      { name: "SOP coverage", target: "80%", current: "61%", trend: "up" },
      { name: "Automation candidates shipped", target: "2/mo", current: "2", trend: "flat" },
    ],
    status: "active",
    next_action: "Document the Move Mi quote→booking flow as an SOP before the connector lands.",
    risks: ["ops knowledge lives in heads until SOP coverage passes ~75%"],
  }),
  cabinet({
    id: "chief-people",
    title: "Chief People / HR Agent",
    department: "people",
    role_card_ref: "Hiring Strategist",
    mission: "Design roles (human and AI), keep scorecards honest, and grow capability before headcount.",
    responsibilities: ["role design & scorecards", "AI-agent performance reviews", "training loops", "hire-vs-automate calls"],
    authority_level: "create_internal_task",
    approval_requirements: ["any human hire/contract is send_contract — gated"],
    owned_workflows: ["scorecard grading (monthly)", "role-card audits (quarterly)"],
    kpis: [
      { name: "Scorecard coverage", target: "100%", current: "100%", trend: "flat" },
      { name: "Agents improved after review", target: "3/qtr", current: "2", trend: "up" },
    ],
    status: "active",
    next_action: "Grade June scorecards; flag the two lowest-ROI agent workflows for narrowing.",
    risks: ["review fatigue — keep reviews to variance, not ceremony"],
  }),
  cabinet({
    id: "chief-legal-risk",
    title: "Chief Legal & Risk Agent",
    department: "legal_risk",
    role_card_ref: "Chief Security & Compliance Officer",
    mission: "Catch the claim, the clause, and the exposure before it ships. Analysis for review, never advice.",
    responsibilities: ["contract checklists", "claims review (medical/legal/financial)", "risk register upkeep", "privacy posture"],
    authority_level: "recommend_only",
    approval_requirements: ["all findings route to Alyssa; professional review always required on entity/tax"],
    owned_workflows: ["contract review queue", "risk register review (monthly)"],
    kpis: [
      { name: "Review turnaround", target: "<48h", current: "36h", trend: "up" },
      { name: "Incidents prevented", target: "—", current: "2 flagged", trend: "flat" },
    ],
    status: "active",
    next_action: "Review the StrataLogic SOW draft for liability language before it queues for send.",
    risks: ["Black Flag casework needs a stricter privacy boundary — folder-level scoping"],
  }),
  cabinet({
    id: "chief-security",
    title: "Chief Security Agent",
    department: "security",
    role_card_ref: "Chief Security & Compliance Officer",
    mission: "Deny by default: zero-trust identities, gated actions, no secrets in the repo, audit everything.",
    responsibilities: ["agent identity scopes", "gate coverage of new routes", "secrets hygiene", "incident response"],
    authority_level: "execute_with_approval",
    approval_requirements: ["change_access is gated; emergency revocations logged + reviewed after"],
    owned_workflows: ["gate-coverage audit (per release)", "secrets scan (weekly)"],
    kpis: [
      { name: "Tables with RLS", target: "100%", current: "100% (245/245)", trend: "flat" },
      { name: "Gated classes with HTTP surface", target: "12/12", current: "1/12", trend: "up" },
    ],
    status: "active",
    next_action: "Define gate entries for the next three action routes before they're built.",
    risks: ["approval surface too narrow — agents route around gates if routes don't exist"],
  }),
  cabinet({
    id: "chief-knowledge",
    title: "Chief Knowledge Officer Agent",
    department: "knowledge",
    role_card_ref: "Chief Data Architect",
    mission: "One brain: everything captured once, scored, linked, and never re-learned.",
    responsibilities: ["knowledge ingestion pipeline", "source-of-truth freshness", "Obsidian vault sync (spec stage)", "knowledge→action conversion"],
    authority_level: "create_internal_task",
    approval_requirements: ["external write-back (vault export) starts read-only, one folder"],
    owned_workflows: ["ingest triage (daily)", "freshness sweep (weekly)"],
    kpis: [
      { name: "Items ingested→actioned", target: "30%", current: "22%", trend: "up" },
      { name: "Stale verified-facts", target: "0", current: "4", trend: "down" },
    ],
    status: "active",
    next_action: "Run the knowledge-sync mock round-trip on the Obsidian fixture (spec §Planned modules).",
    risks: ["brain staleness is silent — needs the Mission Control freshness alert wired"],
  }),
  cabinet({
    id: "chief-automation",
    title: "Chief Automation Officer Agent",
    department: "automation",
    role_card_ref: "Automation Manager",
    mission: "Make the machine run on its own clock — every cadence a job, every job idempotent, gate in the loop.",
    responsibilities: ["orchestrator jobs (daily brief first)", "execution-queue draining", "connector adapters (mock-first)", "workflow ROI pricing"],
    authority_level: "execute_low_risk",
    approval_requirements: ["any gated step parks the packet — automation never pre-approves"],
    owned_workflows: ["orchestrator runtime (docs/AUTOMATION_ORCHESTRATION_SPEC.md)", "ROI review (monthly)"],
    kpis: [
      { name: "Cadence jobs live", target: "4", current: "0", trend: "flat" },
      { name: "Automation ROI", target: ">3x", current: "n/a", trend: "flat" },
    ],
    status: "blocked",
    next_action: "Stand up the orchestrator skeleton + daily-brief job (five-day plan, Day 4).",
    risks: ["services/orchestrator is a stub — nothing runs unattended yet (top-3 audit risk)"],
  }),
  cabinet({
    id: "chief-data",
    title: "Chief Data & Analytics Agent",
    department: "data",
    role_card_ref: "Analytics Analyst",
    mission: "Numbers Alyssa can trust: one metric definition each, freshness visible, zero vanity.",
    responsibilities: ["metric definitions & dashboards", "identity resolution", "CRM hygiene", "report freshness"],
    authority_level: "create_internal_task",
    approval_requirements: ["delete_data is gated — cleanup runs propose, never purge"],
    owned_workflows: ["weekly operating report data pull", "metric audit (monthly)"],
    kpis: [
      { name: "Metrics with owners", target: "100%", current: "78%", trend: "up" },
      { name: "Report freshness", target: "<24h", current: "mock", trend: "flat" },
    ],
    status: "active",
    next_action: "Define the 8 command-center card metrics against live API fields (post Day-1).",
    risks: ["live DB is empty — all analytics are illustrative until a connector lands"],
  }),
];

// --- Portfolio agents (10) — one operating agent per company ------------------------------------

const pagent = (a) => ({ layer: "portfolio", department: "portfolio", reporting_cadence: "weekly", role_card_ref: null, ...a });

export const PORTFOLIO_AGENTS = [
  pagent({
    id: "agent-move-mi",
    title: "Move Mi Agent",
    linked_business: "move_mi",
    mission: "Fill the moving calendar: every lead answered in hours, every quote followed to booked.",
    responsibilities: ["lead first-response", "quote drafting", "booking follow-through", "realtor referral loop"],
    authority_level: "prepare_external_asset",
    approval_requirements: ["every quote/reply is send_message — queued with drafts"],
    owned_workflows: ["lead→quote→booking pipeline", "referral partner touches"],
    kpis: [
      { name: "First reply", target: "<4h", current: "26h", trend: "down" },
      { name: "Quote→booking", target: "35%", current: "29%", trend: "up" },
      { name: "Weekly booked revenue", target: "$6k", current: "$3.2k", trend: "up" },
    ],
    status: "blocked",
    next_action: "Send the Henderson quote the moment its approval clears (oldest item in the queue).",
    risks: ["email connector not live — leads arrive by hand; 3 leads past SLA"],
  }),
  pagent({
    id: "agent-divini-procure",
    title: "Divini Procure Agent",
    linked_business: "divini_procure",
    mission: "Win procurement mandates and keep vendor pipelines warm without dropped threads.",
    responsibilities: ["vendor outreach lists", "RFP responses", "mandate pipeline hygiene"],
    authority_level: "prepare_external_asset",
    approval_requirements: ["outreach batches are send_message; pricing changes gated"],
    owned_workflows: ["vendor outreach cycle", "RFP response pipeline"],
    kpis: [
      { name: "Active mandates", target: "4", current: "2", trend: "flat" },
      { name: "Outreach reply rate", target: "12%", current: "9%", trend: "up" },
    ],
    status: "active",
    next_action: "Queue the 40-vendor outreach list for approval with drafts attached.",
    risks: ["list quality unverified — needs Apollo/ZoomInfo pass when connectors land"],
  }),
  pagent({
    id: "agent-stratalogic",
    title: "StrataLogic Agent",
    linked_business: "stratalogic",
    mission: "Convert advisory conversations into signed SOWs and delivered engagements.",
    responsibilities: ["discovery-call prep", "SOW drafting", "engagement delivery tracking"],
    authority_level: "draft_only",
    approval_requirements: ["SOWs are send_contract — always gated, legal pre-review"],
    owned_workflows: ["SOW pipeline", "engagement status board"],
    kpis: [
      { name: "SOWs out", target: "2/mo", current: "1", trend: "flat" },
      { name: "Engagement margin", target: "60%", current: "58%", trend: "flat" },
    ],
    status: "active",
    next_action: "Finish the Meridian SOW draft; route through Legal & Risk before the send queue.",
    risks: ["single-client concentration until the second mandate closes"],
  }),
  pagent({
    id: "agent-founderos",
    title: "FounderOS Agent",
    linked_business: "founderos",
    mission: "Productize Alfy2 into the founder SaaS: beta list, activation, first paid cohort.",
    responsibilities: ["beta waitlist nurture", "activation loops", "feature feedback triage"],
    authority_level: "prepare_external_asset",
    approval_requirements: ["waitlist emails are send_message; pricing page is publish_public"],
    owned_workflows: ["beta funnel", "activation checklist"],
    kpis: [
      { name: "Waitlist", target: "500", current: "212", trend: "up" },
      { name: "Beta activation", target: "40%", current: "n/a", trend: "flat" },
    ],
    status: "active",
    next_action: "Ship the beta-invite email sequence draft for the first 50 when GTM plan clears.",
    risks: ["beta before Day-1 live API risks demo-only impressions"],
  }),
  pagent({
    id: "agent-oralia",
    title: "Oralia Agent",
    linked_business: "oralia",
    mission: "Take Oralia from formulation to first hundred customers with clean claims.",
    responsibilities: ["launch checklist", "claims-safe copy", "retail/DTC channel prep"],
    authority_level: "draft_only",
    approval_requirements: ["all product claims pass Claims Checker; publishes gated"],
    owned_workflows: ["launch readiness board", "content pipeline"],
    kpis: [
      { name: "Launch checklist", target: "100%", current: "64%", trend: "up" },
      { name: "Pre-launch list", target: "1k", current: "380", trend: "up" },
    ],
    status: "standby",
    next_action: "Close the 3 open claims-review items; then the landing page queues for publish.",
    risks: ["health-adjacent claims — strict medical_legal_financial_claim review path"],
  }),
  pagent({
    id: "agent-datingmodern",
    title: "DatingModern.ai Agent",
    linked_business: "datingmodern_ai",
    mission: "Validate the relaunch: one ICP, one offer, one funnel — before any build spend.",
    responsibilities: ["relaunch workup support", "audience research", "landing test prep"],
    authority_level: "research_only",
    approval_requirements: ["everything external gated; venture stage-4 verdict pending"],
    owned_workflows: ["validation sprint board"],
    kpis: [
      { name: "Workup completeness", target: "15/15 sections", current: "9/15", trend: "up" },
    ],
    status: "standby",
    next_action: "Finish audience research for the Chief Venture Architect's July workup.",
    risks: ["pre-verdict: no external spend or sends until Alyssa's go"],
  }),
  pagent({
    id: "agent-divini-partner",
    title: "Divini Partner Agent",
    linked_business: "divini_partners",
    mission: "Build the partner bench: aligned operators co-selling Divini offers on shared upside.",
    responsibilities: ["partner sourcing", "co-marketing briefs", "partner-attributed pipeline tracking"],
    authority_level: "prepare_external_asset",
    approval_requirements: ["partner outreach is send_message; agreements are send_contract"],
    owned_workflows: ["partner pipeline", "co-launch calendar"],
    kpis: [
      { name: "Active partners", target: "6", current: "3", trend: "up" },
      { name: "Partner-attributed revenue", target: "$5k/mo", current: "$1.8k", trend: "up" },
    ],
    status: "active",
    next_action: "Draft co-marketing briefs for the two warm partner conversations.",
    risks: ["partner quality bar — bad-fit partners cost more than none"],
  }),
  pagent({
    id: "agent-black-flag",
    title: "Black Flag Innocence Agent",
    linked_business: "black_flag_foundation",
    mission: "Advance innocence casework capacity: grants in, cases moving, impact documented.",
    responsibilities: ["grant pipeline", "donor stewardship", "case operations support", "impact reporting"],
    authority_level: "draft_only",
    approval_requirements: ["grant submissions and donor sends gated; casework data strictly scoped"],
    owned_workflows: ["grant calendar", "impact report (quarterly)"],
    kpis: [
      { name: "Grant applications", target: "2/qtr", current: "1", trend: "up" },
      { name: "Funds raised", target: "$25k/qtr", current: "$8k", trend: "up" },
    ],
    status: "active",
    next_action: "Complete the state innocence-fund grant draft for legal review by Friday.",
    risks: ["case data privacy — highest scoping bar in the portfolio"],
  }),
  pagent({
    id: "agent-decoded",
    title: "Decoded Podcast Agent",
    linked_business: "decoded_podcast",
    mission: "Ship episodes on cadence and multiply each into a 42-piece authority engine.",
    responsibilities: ["episode pipeline (6-stage)", "guest booking prep", "clip/content packaging"],
    authority_level: "prepare_external_asset",
    approval_requirements: ["publishes are publish_public; guest outreach send_message"],
    owned_workflows: ["episode lifecycle", "content multiplication"],
    kpis: [
      { name: "Episodes on cadence", target: "4/mo", current: "3", trend: "flat" },
      { name: "Clips per episode shipped", target: "5", current: "4", trend: "up" },
    ],
    status: "active",
    next_action: "Queue ep. 12's five clips + newsletter for the weekly batch-approval session.",
    risks: ["publish backlog builds without the weekly approval session"],
  }),
  pagent({
    id: "agent-ai-builder-pro",
    title: "AI Builder Pro Agent",
    linked_business: "ai_builder_pro",
    mission: "Turn the build methodology into a paid education product with a wedge cohort.",
    responsibilities: ["curriculum outline", "cohort funnel prep", "community design"],
    authority_level: "research_only",
    approval_requirements: ["pre-verdict venture: no external actions until stage-4 go"],
    owned_workflows: ["curriculum board"],
    kpis: [
      { name: "Curriculum outline", target: "complete", current: "40%", trend: "up" },
    ],
    status: "standby",
    next_action: "Outline modules 4–6 from the build-factory SOPs for the workup.",
    risks: ["needs venture verdict before any funnel spend"],
  }),
];

// --- The hierarchy above the cabinet -------------------------------------------------------------
export const FOUNDER = {
  id: "alyssa", name: "Alyssa DelTorre", title: "Founder / CEO / Chairwoman",
  role: "Final authority. Every gated action — sends, publishes, money, contracts, likeness — ends at her desk.",
};
export const ALFY2_SYSTEM = {
  id: "alfy2", name: "Alfy2", title: "Chief Operating Intelligence System", reports_to: "alyssa",
  mission: "Run the holding company's operating system: route work through delegation packets, enforce the approval gates, keep the knowledge brain, measure everything, report up.",
};

// Reporting: every cabinet seat and portfolio agent reports into Alfy2, which reports to Alyssa.
for (const a of CABINET_AGENTS) a.reports_to = "alfy2";
const SPONSORS = {
  "agent-move-mi": "chief-revenue", "agent-divini-procure": "chief-revenue",
  "agent-stratalogic": "chief-strategy", "agent-founderos": "chief-product",
  "agent-oralia": "chief-product", "agent-datingmodern": "chief-venture-architect",
  "agent-divini-partner": "chief-sales", "agent-black-flag": "chief-finance",
  "agent-decoded": "chief-media", "agent-ai-builder-pro": "chief-venture-architect",
};
for (const a of PORTFOLIO_AGENTS) { a.reports_to = "alfy2"; a.cabinet_sponsor = SPONSORS[a.id] ?? null; }

export const AGENTS = [...CABINET_AGENTS, ...PORTFOLIO_AGENTS];

// --- R&D intake bench (owner: Chief Technology; knowledge steward: Chief Knowledge) ----------------
// External research systems are VETTED and referenced — never executed inside Alfy2's runtime.
export const RND_ASSETS = [
  {
    id: "rnd-asi-arch",
    name: "ASI-Arch (GAIR-NLP)",
    source: "https://github.com/GAIR-NLP/ASI-Arch",
    kind: "autonomous research framework",
    license: "Apache-2.0",
    what_it_is: "Multi-agent LLM system that autonomously discovers novel linear-attention architectures: planner/code-checker → trainer/debugger → analyzer pipeline, MongoDB+FAISS experiment memory, RAG 'cognition base' over a paper corpus. Reports 106 discovered SOTA architectures (~1.2k stars).",
    why_it_matters: "Reference blueprint for Alfy2's own research loops: hypothesis → experiment → judge → memory. The candidate-manager + judger pattern maps to our agent-eval lab; the cognition base maps to the knowledge brain.",
    safety_facts: "Executes generated code and trains models; runs MongoDB + FastAPI + Flask services; needs CUDA GPU.",
    guardrails: [
      "NEVER runs inside Alfy2's runtime — sandbox machine only, isolated network, no Alfy2 credentials",
      "static review before any run (GitHub Intelligence pattern: vet, never execute in-place)",
      "any experiment spend needs a budget approval (action class: other) before GPU time",
      "findings enter Alfy2 as knowledge-brain items with source-of-truth provenance, not as code",
    ],
    disposition: "evaluate_in_sandbox",
    owner: "chief-technology",
    steward: "chief-knowledge",
    status: "vetted_pending_sandbox",
    vetted_at: "2026-07-02",
    doc: "docs/RND_ASSET_ASI_ARCH.md",
  },
];

// Derived registries (kept as their own collections so the API can serve them directly later).
export const AGENT_ROLES = AGENTS.map((a) => ({
  agent_id: a.id, title: a.title, department: a.department, layer: a.layer, role_card_ref: a.role_card_ref,
}));
export const AGENT_AUTHORITIES = AGENTS.map((a) => ({
  agent_id: a.id, authority_level: a.authority_level, approval_requirements: a.approval_requirements,
}));
export const AGENT_KPIS = AGENTS.flatMap((a) => a.kpis.map((k) => ({ agent_id: a.id, ...k })));

// --- Portfolio companies (canonical roster — docs/PORTFOLIO_COMPANY_OS.md) ----------------------

export const PORTFOLIO_COMPANIES = [
  {
    id: "divini_group", name: "Divini Group", kind: "holding company", stage: "operating",
    status: "green", revenue_priority: "portfolio allocation", agent_id: null,
    revenue_mtd: 28400, revenue_target: 45000,
    active_campaigns: [], fastest_path: "Move Mi cash push + StrataLogic mandate #2",
    summary: "Parent entity. Rolls up all operating companies; owns capital allocation.",
  },
  {
    id: "move_mi", name: "Move Mi", kind: "services", stage: "operating",
    status: "amber", revenue_priority: "P1 — fastest cash", agent_id: "agent-move-mi",
    revenue_mtd: 12800, revenue_target: 24000,
    active_campaigns: ["Realtor referral loop", "Summer moving-season push"],
    fastest_path: "Answer the 3 aging leads + send the Henderson quote ($2.4k) today.",
    summary: "Moving services. Strongest near-term cash; blocked on lead response speed.",
  },
  {
    id: "divini_procure", name: "Divini Procure", kind: "services", stage: "operating",
    status: "green", revenue_priority: "P2", agent_id: "agent-divini-procure",
    revenue_mtd: 6200, revenue_target: 10000,
    active_campaigns: ["Vendor outreach wave 3"],
    fastest_path: "Close mandate #3 from the warm RFP; outreach wave pending approval.",
    summary: "Procurement services. Steady; pipeline needs enrichment data.",
  },
  {
    id: "stratalogic", name: "StrataLogic", kind: "advisory", stage: "operating",
    status: "green", revenue_priority: "P2", agent_id: "agent-stratalogic",
    revenue_mtd: 7500, revenue_target: 9000,
    active_campaigns: [],
    fastest_path: "Meridian SOW signed → 60% margin engagement starts within 2 weeks.",
    summary: "Strategy advisory. Highest margin; concentration risk until client #2.",
  },
  {
    id: "founderos", name: "FounderOS", kind: "SaaS (productized Alfy2)", stage: "pre-launch",
    status: "amber", revenue_priority: "P3 — strategic", agent_id: "agent-founderos",
    revenue_mtd: 0, revenue_target: 2000,
    active_campaigns: ["Beta waitlist nurture"],
    fastest_path: "First 50 beta invites once the GTM plan and live demo clear.",
    summary: "Alfy2 commercialized (ADR-0049). Beta gated on Day-1 live API.",
  },
  {
    id: "oralia", name: "Oralia", kind: "consumer product", stage: "pre-launch",
    status: "amber", revenue_priority: "P4", agent_id: "agent-oralia",
    revenue_mtd: 0, revenue_target: 0,
    active_campaigns: ["Pre-launch list building"],
    fastest_path: "Clear 3 claims reviews → landing publish → list to 1k before launch.",
    summary: "Consumer wellness product. Claims-review path is the critical dependency.",
  },
  {
    id: "datingmodern_ai", name: "DatingModern.ai", kind: "product", stage: "validation",
    status: "gray", revenue_priority: "P5 — pre-verdict", agent_id: "agent-datingmodern",
    revenue_mtd: 0, revenue_target: 0,
    active_campaigns: [],
    fastest_path: "Finish the 15-section workup → July stage-4 verdict.",
    summary: "In the Venture Factory. No external spend until Alyssa's go.",
  },
  {
    id: "divini_partners", name: "Divini Partners", kind: "partnerships", stage: "operating",
    status: "green", revenue_priority: "P3", agent_id: "agent-divini-partner",
    revenue_mtd: 1800, revenue_target: 5000,
    active_campaigns: ["Partner bench build-out"],
    fastest_path: "Convert the 2 warm partner conversations into co-launches.",
    summary: "Partner channel. Leverage play — revenue per founder-hour is the metric.",
  },
  {
    id: "black_flag_foundation", name: "Black Flag Innocence Foundation", kind: "nonprofit", stage: "operating",
    status: "green", revenue_priority: "mission (funds raised)", agent_id: "agent-black-flag",
    revenue_mtd: 8000, revenue_target: 25000,
    active_campaigns: ["State innocence-fund grant", "Donor stewardship Q3"],
    fastest_path: "Submit the state grant (deadline Jul 18) — largest single funding item.",
    summary: "Innocence casework. Strictest data scoping in the portfolio.",
  },
  {
    id: "decoded_podcast", name: "Decoded with Alyssa DelTorre", kind: "media", stage: "operating",
    status: "green", revenue_priority: "authority engine", agent_id: "agent-decoded",
    revenue_mtd: 400, revenue_target: 1500,
    active_campaigns: ["Ep. 12 multiplication", "Guest pipeline Q3"],
    fastest_path: "Weekly batch-approval session unblocks 9 queued publishes.",
    summary: "Media/authority. Feeds every other company's pipeline.",
  },
  {
    id: "ai_builder_pro", name: "AI Builder Pro", kind: "education", stage: "validation",
    status: "gray", revenue_priority: "P5 — pre-verdict", agent_id: "agent-ai-builder-pro",
    revenue_mtd: 0, revenue_target: 0,
    active_campaigns: [],
    fastest_path: "Curriculum outline → workup → verdict alongside DatingModern.ai.",
    summary: "Education productization of the build factory. Pre-verdict.",
  },
];

// --- Company operating systems (the OS Viewer payload) -------------------------------------------

const os = (companyId, o) => ({
  company_id: companyId,
  departments_active: o.depts,           // of the 13-department template
  sop_coverage: o.sop,                    // %
  asset_checklist_complete: o.assets,     // % of the 25 key assets
  playbooks: o.playbooks,
  connected_tools: o.tools,               // descriptors — all mock until connectors land
  open_workflows: o.workflows,
  blocked_workflows: o.blocked ?? [],
  weekly_focus: o.focus,
});

export const COMPANY_OPERATING_SYSTEMS = [
  os("divini_group", { depts: 13, sop: 55, assets: 60, playbooks: ["Capital allocation memo", "Portfolio review"], tools: ["Supabase (live)", "Render", "Vercel"], workflows: ["Portfolio re-rank (monthly)", "Weekly operating report"], focus: "Allocate attention: cash now (Move Mi) vs strategic (FounderOS)." }),
  os("move_mi", { depts: 9, sop: 48, assets: 72, playbooks: ["Lead→quote→booking SOP (draft)", "Referral partner playbook"], tools: ["Gmail (blueprint)", "GoHighLevel (planned)"], workflows: ["Lead response", "Quote follow-up", "Referral touches"], blocked: ["Lead auto-ingest — email connector not live"], focus: "Kill the 26h first-reply time. Everything else is second." }),
  os("divini_procure", { depts: 8, sop: 52, assets: 64, playbooks: ["RFP response playbook", "Vendor outreach scripts"], tools: ["Apollo (planned)", "Gmail (blueprint)"], workflows: ["Outreach wave 3", "RFP pipeline"], focus: "Mandate #3: warm RFP response out this week." }),
  os("stratalogic", { depts: 7, sop: 58, assets: 68, playbooks: ["Discovery-call script", "SOW template"], tools: ["Calendly (blueprint)", "Google Drive (blueprint)"], workflows: ["Meridian SOW", "Engagement board"], focus: "Meridian SOW through legal review and into the send queue." }),
  os("founderos", { depts: 10, sop: 40, assets: 56, playbooks: ["Beta activation checklist", "GTM launch plan (gtm-factory)"], tools: ["Supabase (live)", "Stripe (blueprint)"], workflows: ["Waitlist nurture", "Beta scope cut"], blocked: ["Beta invites — gated on live API demo"], focus: "Cut beta scope to 5 screens; prep invite sequence." }),
  os("oralia", { depts: 6, sop: 35, assets: 40, playbooks: ["Claims-safe copy guide", "Launch checklist"], tools: ["Shopify (planned)"], workflows: ["Claims reviews (3 open)", "List building"], blocked: ["Landing publish — pending claims clearance"], focus: "Close the 3 claims reviews. Nothing publishes before that." }),
  os("datingmodern_ai", { depts: 3, sop: 10, assets: 12, playbooks: ["Validation sprint plan"], tools: [], workflows: ["Audience research"], focus: "Workup sections 10–15 for the July verdict." }),
  os("divini_partners", { depts: 6, sop: 44, assets: 52, playbooks: ["Partner one-pager", "Co-marketing brief template"], tools: ["Gmail (blueprint)"], workflows: ["Partner pipeline", "Co-launch calendar"], focus: "Two warm conversations → signed co-launch briefs." }),
  os("black_flag_foundation", { depts: 7, sop: 50, assets: 48, playbooks: ["Grant application SOP", "Donor stewardship cadence"], tools: ["Google Drive (blueprint)"], workflows: ["State grant draft", "Q3 stewardship"], focus: "State grant (Jul 18 deadline) through legal review." }),
  os("decoded_podcast", { depts: 5, sop: 62, assets: 76, playbooks: ["Episode lifecycle SOP", "42-piece multiplication map"], tools: ["Descript (planned)", "Podcast host (planned)"], workflows: ["Ep. 12 packaging", "Guest pipeline"], blocked: ["9 publishes queued — weekly approval session needed"], focus: "Batch-approval session; ship the ep. 12 package." }),
  os("ai_builder_pro", { depts: 3, sop: 15, assets: 16, playbooks: ["Curriculum outline (40%)"], tools: [], workflows: ["Curriculum board"], focus: "Modules 4–6 outlined from build-factory SOPs." }),
];

// --- Approval requests (the Approval Center queue) -----------------------------------------------
// Shapes mirror api_approval_requests (migration 0239). Pending items are decidable in the UI.

export const APPROVAL_REQUESTS = [
  {
    id: "apr-001", action_class: "send_message", status: "pending",
    title: "Send Henderson full-house move quote — $2,400",
    requested_by: "agent-move-mi", business_id: "move_mi",
    ask: "Approve sending the attached quote reply to the Henderson lead (email draft ready).",
    impact: "Reversible: no. Cost: none. Revenue: $2,400 booking if accepted. Oldest revenue item (3 days).",
    evidence: "Draft: personalized reply, itemized quote, 2 date options. Pricing per rate card.",
    requested_at: "2026-06-29T15:20:00Z",
  },
  {
    id: "apr-002", action_class: "send_message", status: "pending",
    title: "First-reply drafts for 3 aging Move Mi leads",
    requested_by: "agent-move-mi", business_id: "move_mi",
    ask: "Approve the batch of 3 personalized first replies (all past the 24h SLA).",
    impact: "Reversible: no. Leads go cold fast — every day cuts close odds roughly in half.",
    evidence: "3 drafts attached; each references the lead's stated move date and origin.",
    requested_at: "2026-07-01T09:05:00Z",
  },
  {
    id: "apr-003", action_class: "publish_public", status: "pending",
    title: "Publish Decoded ep. 12 clip pack (5 clips + newsletter)",
    requested_by: "agent-decoded", business_id: "decoded_podcast",
    ask: "Approve the weekly content batch: 5 clips, 1 newsletter, 3 X posts.",
    impact: "Reversible: partially (posts deletable, sends are not). Brand-DNA check passed.",
    evidence: "All 9 pieces linked to source episode; voice-rule lint clean.",
    requested_at: "2026-07-01T18:40:00Z",
  },
  {
    id: "apr-004", action_class: "send_message", status: "pending",
    title: "Divini Procure vendor outreach — wave 3 (40 contacts)",
    requested_by: "agent-divini-procure", business_id: "divini_procure",
    ask: "Approve the 40-contact outreach batch with per-contact personalized drafts.",
    impact: "Reversible: no. List source is manual research (unenriched) — reply rate may be low.",
    evidence: "Sample of 5 drafts attached; unsubscribe + identity footer included.",
    requested_at: "2026-07-02T08:15:00Z",
  },
  {
    id: "apr-005", action_class: "send_contract", status: "pending",
    title: "StrataLogic — Meridian SOW ($7,500, 6 weeks)",
    requested_by: "agent-stratalogic", business_id: "stratalogic",
    ask: "Approve sending the Meridian SOW after Legal & Risk sign-off (liability clause updated).",
    impact: "Reversible: no. Commits delivery capacity for 6 weeks. Margin 58%.",
    evidence: "SOW v3 + legal review notes attached.",
    requested_at: "2026-07-02T11:30:00Z",
  },
  {
    id: "apr-006", action_class: "change_pricing", status: "pending",
    title: "Move Mi peak-season rate adjustment (+8% Jul–Aug)",
    requested_by: "chief-revenue", business_id: "move_mi",
    ask: "Approve the seasonal rate-card change recommended by the Pricing Analyst.",
    impact: "Reversible: yes (rate card reverts Sep 1). Est. +$900/mo at current volume.",
    evidence: "Competitor scan + demand curve memo attached.",
    requested_at: "2026-07-02T12:00:00Z",
  },
  {
    id: "apr-101", action_class: "publish_public", status: "approved",
    title: "Publish internal moving-day SOP to the ops handbook",
    requested_by: "chief-operations", business_id: "move_mi",
    ask: "Publish the SOP internally.", impact: "Reversible: yes.", evidence: "SOP v2.",
    requested_at: "2026-06-27T10:00:00Z", decided_at: "2026-06-27T16:12:00Z", decided_by: "Alyssa",
  },
  {
    id: "apr-102", action_class: "send_message", status: "denied",
    title: "Cold outreach to realtor list (unverified source)",
    requested_by: "agent-move-mi", business_id: "move_mi",
    ask: "Send 25 cold intros.", impact: "List provenance unclear.", evidence: "—",
    requested_at: "2026-06-26T09:00:00Z", decided_at: "2026-06-26T12:40:00Z", decided_by: "Alyssa",
    denial_reason: "List source unverified — rebuild from referral network only.",
  },
];

// --- Operating reports & action logs -------------------------------------------------------------

export const OPERATING_REPORTS = [
  {
    id: "wor-2026-w26", week: "2026-W26", generated_at: "2026-06-26T17:00:00Z", kind: "weekly_operating_report",
    headline: "Cash steady, runtime shipped, lead response is the fire.",
    sections: {
      revenue: "MTD $26.1k vs $45k target. Move Mi carries near-term cash; StrataLogic margin strongest.",
      shipped: "AI-Org runtime live (/org), R6 Revenue OS, mission-control alerts, deploy fixes.",
      approvals: "6 decided (5 approved / 1 denied), avg decision time 5.1h.",
      blocked: "Move Mi lead auto-ingest (connector); orchestrator (stub).",
      next: "Render re-sync → live dashboard; Henderson quote; weekly publish session.",
    },
  },
];

export const ACTION_LOGS = [
  { id: "log-001", ts: "2026-07-02T08:15:00Z", agent_id: "agent-divini-procure", action: "Prepared 40-contact outreach wave; queued for approval (apr-004)", status: "parked_for_approval", business_id: "divini_procure" },
  { id: "log-002", ts: "2026-07-02T07:40:00Z", agent_id: "chief-revenue", action: "Daily revops brief assembled; fastest path: Move Mi Henderson quote", status: "succeeded", business_id: null },
  { id: "log-003", ts: "2026-07-01T18:40:00Z", agent_id: "agent-decoded", action: "Packaged ep. 12 into 9 pieces; queued publish batch (apr-003)", status: "parked_for_approval", business_id: "decoded_podcast" },
  { id: "log-004", ts: "2026-07-01T14:20:00Z", agent_id: "chief-legal-risk", action: "Meridian SOW liability clause reviewed; returned with one change", status: "succeeded", business_id: "stratalogic" },
  { id: "log-005", ts: "2026-07-01T09:05:00Z", agent_id: "agent-move-mi", action: "Drafted 3 first replies for aging leads; queued (apr-002)", status: "parked_for_approval", business_id: "move_mi" },
  { id: "log-006", ts: "2026-06-30T16:00:00Z", agent_id: "chief-knowledge", action: "Weekly freshness sweep: 4 stale verified-facts flagged to owners", status: "succeeded", business_id: null },
  { id: "log-007", ts: "2026-06-30T11:00:00Z", agent_id: "chief-people", action: "June scorecards graded for 26 agents; 2 workflows flagged for narrowing", status: "succeeded", business_id: null },
  { id: "log-008", ts: "2026-06-29T15:20:00Z", agent_id: "agent-move-mi", action: "Henderson quote drafted ($2,400); queued for approval (apr-001)", status: "parked_for_approval", business_id: "move_mi" },
];

// --- The knowledge brain (obsidian-style graph seed) ---------------------------------------------
// Nodes: companies, cabinet seats, and knowledge domains; edges: operating + knowledge links.

export const BRAIN_GRAPH = {
  nodes: [
    { id: "alyssa", label: "Alyssa", kind: "founder" },
    ...PORTFOLIO_COMPANIES.map((c) => ({ id: c.id, label: c.name, kind: "company" })),
    ...CABINET_AGENTS.map((a) => ({ id: a.id, label: a.title.replace(/ Agent$/, ""), kind: "agent" })),
    { id: "k-revenue", label: "Revenue playbooks", kind: "knowledge" },
    { id: "k-media", label: "Story bank", kind: "knowledge" },
    { id: "k-legal", label: "Risk register", kind: "knowledge" },
    { id: "k-build", label: "Build SOPs", kind: "knowledge" },
    { id: "k-brand", label: "Brand DNA", kind: "knowledge" },
    { id: "k-decisions", label: "Decision journal", kind: "knowledge" },
  ],
  edges: [
    ...CABINET_AGENTS.map((a) => ({ from: "alyssa", to: a.id })),
    ...PORTFOLIO_COMPANIES.filter((c) => c.id !== "divini_group").map((c) => ({ from: "divini_group", to: c.id })),
    { from: "alyssa", to: "divini_group" },
    ...PORTFOLIO_AGENTS.filter((a) => a.linked_business).map((a) => ({ from: a.linked_business, to: a.id })),
    { from: "chief-revenue", to: "k-revenue" }, { from: "chief-sales", to: "k-revenue" },
    { from: "chief-media", to: "k-media" }, { from: "chief-media", to: "k-brand" },
    { from: "chief-marketing", to: "k-brand" },
    { from: "chief-legal-risk", to: "k-legal" }, { from: "chief-security", to: "k-legal" },
    { from: "chief-technology", to: "k-build" }, { from: "chief-automation", to: "k-build" },
    { from: "chief-strategy", to: "k-decisions" }, { from: "chief-knowledge", to: "k-decisions" },
    { from: "chief-knowledge", to: "k-revenue" }, { from: "chief-knowledge", to: "k-media" },
    { from: "chief-knowledge", to: "k-build" }, { from: "chief-knowledge", to: "k-brand" },
    { from: "chief-knowledge", to: "k-legal" },
    { from: "move_mi", to: "k-revenue" }, { from: "decoded_podcast", to: "k-media" },
    { from: "stratalogic", to: "k-legal" }, { from: "founderos", to: "k-build" },
  ],
};

// Portfolio agents also appear in the brain as satellites of their business.
BRAIN_GRAPH.nodes.push(...PORTFOLIO_AGENTS.map((a) => ({ id: a.id, label: a.title.replace(/ Agent$/, ""), kind: "agent" })));
