import type {
  DomainKind,
  DomainWorkflow,
  DomainKpi,
  DomainEscalationRule,
} from "@alfy2/shared";

/**
 * Canonical operating-model templates for the eleven domains. Each domain redesigns a full function —
 * not a single task — with goals, workflows, agents, KPIs, assets, approvals, dashboards, and
 * escalation rules. The factory deep-clones these so a built model can be edited without mutating the
 * template. Deterministic.
 */

export const DOMAIN_TEMPLATE_VERSION = "1.0.0";

export interface DomainTemplate {
  name: string;
  goals: string[];
  workflows: DomainWorkflow[];
  agents: string[];
  kpis: DomainKpi[];
  assets: string[];
  approvals: string[];
  dashboards: string[];
  escalation_rules: DomainEscalationRule[];
}

const wf = (name: string, purpose: string, trigger: string, steps: string[]): DomainWorkflow => ({ name, purpose, trigger, steps });
const kpi = (name: string, target: number, unit: string, direction: DomainKpi["direction"] = "higher_better"): DomainKpi => ({ name, target, unit, direction });
const esc = (condition: string, action: string, escalate_to = "owner"): DomainEscalationRule => ({ condition, action, escalate_to });

export const DOMAIN_TEMPLATES: Record<DomainKind, DomainTemplate> = {
  sales: {
    name: "Sales",
    goals: ["Hit revenue target", "Keep pipeline coverage above 3x", "Shorten sales cycle"],
    workflows: [
      wf("Outbound prospecting", "Generate qualified meetings", "daily", ["Build list", "Personalize", "Send", "Follow up"]),
      wf("Deal management", "Move deals to close", "on_stage_change", ["Qualify", "Propose", "Negotiate", "Close"]),
    ],
    agents: ["sales.outreach", "sales.followup"],
    kpis: [kpi("pipeline_coverage", 3, "x"), kpi("win_rate", 0.25, "ratio"), kpi("sales_cycle_days", 30, "days", "lower_better")],
    assets: ["sales_deck", "email_template", "pricing"],
    approvals: ["Discount above 15% requires owner approval", "Contracts require legal review"],
    dashboards: ["Pipeline by stage", "Rep activity", "Forecast"],
    escalation_rules: [esc("Deal stalls > 14 days", "Flag for owner review"), esc("Discount > 25% requested", "Escalate to owner")],
  },
  marketing: {
    name: "Marketing",
    goals: ["Grow qualified pipeline", "Lower CAC", "Build authority"],
    workflows: [
      wf("Content engine", "Produce and distribute content", "weekly", ["Plan", "Create", "Publish", "Repurpose"]),
      wf("Campaign management", "Run and optimize campaigns", "per_campaign", ["Brief", "Launch", "Measure", "Optimize"]),
    ],
    agents: ["marketing.content", "marketing.campaigns"],
    kpis: [kpi("mql_count", 100, "count"), kpi("cac_usd", 200, "usd", "lower_better"), kpi("conversion_rate", 0.05, "ratio")],
    assets: ["brand_guide", "content_calendar", "landing_page"],
    approvals: ["Paid spend above budget requires approval", "Brand claims require review"],
    dashboards: ["Funnel", "Channel performance", "Content performance"],
    escalation_rules: [esc("CAC exceeds target by 25%", "Pause paid spend; review"), esc("Brand/legal claim risk", "Route to legal")],
  },
  finance: {
    name: "Finance",
    goals: ["Maintain healthy runway", "Close books on time", "Improve margin"],
    workflows: [
      wf("Monthly close", "Reconcile and report", "monthly", ["Reconcile", "Accrue", "Report", "Review"]),
      wf("Cash management", "Protect runway", "weekly", ["Forecast", "Chase receivables", "Plan spend"]),
    ],
    agents: ["finance.payments", "finance.reporting"],
    kpis: [kpi("runway_months", 12, "months"), kpi("gross_margin", 0.6, "ratio"), kpi("dso_days", 30, "days", "lower_better")],
    assets: ["budget", "financial_model", "vendor_list"],
    approvals: ["Any payment requires approval", "Spend above budget requires owner approval"],
    dashboards: ["Cash flow", "P&L", "Runway"],
    escalation_rules: [esc("Runway below 6 months", "Escalate to owner immediately"), esc("Payment over $5k", "Require owner approval")],
  },
  operations: {
    name: "Operations",
    goals: ["Increase throughput", "Reduce errors", "Document processes"],
    workflows: [
      wf("Process automation", "Automate recurring work", "as_needed", ["Map process", "Automate", "Monitor", "Improve"]),
      wf("Vendor management", "Manage suppliers", "monthly", ["Review", "Negotiate", "Approve"]),
    ],
    agents: ["operations.automation", "operations.coordination"],
    kpis: [kpi("on_time_rate", 0.95, "ratio"), kpi("error_rate", 0.02, "ratio", "lower_better"), kpi("cycle_time_hours", 24, "hours", "lower_better")],
    assets: ["sop", "automation", "vendor_list"],
    approvals: ["New vendor requires approval", "Production changes require approval"],
    dashboards: ["Throughput", "Error rate", "SLA"],
    escalation_rules: [esc("Error rate doubles", "Halt and investigate"), esc("Production incident", "Escalate to owner")],
  },
  legal_risk: {
    name: "Legal/Risk",
    goals: ["Reduce legal exposure", "Stay compliant", "Speed contract turnaround"],
    workflows: [
      wf("Contract review", "Review and redline", "per_contract", ["Intake", "Review", "Redline", "Approve"]),
      wf("Compliance monitoring", "Track obligations", "ongoing", ["Map obligations", "Monitor", "Remediate"]),
    ],
    agents: ["legal.review"],
    kpis: [kpi("contract_turnaround_days", 3, "days", "lower_better"), kpi("open_risks", 0, "count", "lower_better")],
    assets: ["contract", "nda", "policy"],
    approvals: ["All contracts require attorney review", "Anything irreversible requires approval"],
    dashboards: ["Contract pipeline", "Risk register"],
    escalation_rules: [esc("High-severity legal risk", "Escalate to attorney + owner"), esc("Regulatory deadline near", "Flag for owner")],
  },
  customer_success: {
    name: "Customer Success",
    goals: ["Increase retention", "Grow expansion revenue", "Raise satisfaction"],
    workflows: [
      wf("Onboarding", "Get customers to value fast", "on_signup", ["Kickoff", "Configure", "Train", "Verify value"]),
      wf("Health monitoring", "Catch churn risk early", "ongoing", ["Score health", "Intervene", "Review"]),
    ],
    agents: ["cs.onboarding", "cs.health"],
    kpis: [kpi("nrr", 1.1, "ratio"), kpi("churn_rate", 0.05, "ratio", "lower_better"), kpi("csat", 0.9, "ratio")],
    assets: ["training", "playbook", "email_template"],
    approvals: ["Credits/refunds require approval"],
    dashboards: ["Health scores", "Renewals", "CSAT"],
    escalation_rules: [esc("Health score drops to red", "Trigger save play; notify owner"), esc("Churn threat on key account", "Escalate to owner")],
  },
  product: {
    name: "Product",
    goals: ["Ship value fast", "Raise activation", "Reduce churn via product"],
    workflows: [
      wf("Discovery", "Find what to build", "continuous", ["Gather feedback", "Synthesize", "Prioritize"]),
      wf("Delivery", "Ship and measure", "per_release", ["Spec", "Build", "Release", "Measure"]),
    ],
    agents: ["product.research"],
    kpis: [kpi("activation_rate", 0.4, "ratio"), kpi("feature_adoption", 0.3, "ratio"), kpi("time_to_ship_days", 14, "days", "lower_better")],
    assets: ["product_spec", "roadmap"],
    approvals: ["Public launches require approval", "Pricing changes require owner approval"],
    dashboards: ["Adoption", "Roadmap", "Feedback themes"],
    escalation_rules: [esc("Critical bug in production", "Escalate immediately"), esc("Launch slips", "Notify owner")],
  },
  recruiting: {
    name: "Recruiting",
    goals: ["Hire on time", "Raise quality of hire", "Lower time-to-fill"],
    workflows: [
      wf("Sourcing", "Build a candidate pipeline", "per_role", ["Define role", "Source", "Screen"]),
      wf("Interview loop", "Evaluate fairly and fast", "per_candidate", ["Schedule", "Interview", "Debrief", "Decide"]),
    ],
    agents: ["recruiting.sourcing"],
    kpis: [kpi("time_to_fill_days", 30, "days", "lower_better"), kpi("offer_accept_rate", 0.8, "ratio")],
    assets: ["job_post", "scorecard", "offer_template"],
    approvals: ["Offers require owner approval", "Comp above band requires approval"],
    dashboards: ["Pipeline by stage", "Time to fill"],
    escalation_rules: [esc("Role open > 60 days", "Escalate to owner"), esc("Comp above band", "Require owner approval")],
  },
  personal_admin: {
    name: "Personal Admin",
    goals: ["Protect deep-work time", "Never miss a commitment", "Reduce admin load"],
    workflows: [
      wf("Inbox & calendar triage", "Keep commitments on track", "daily", ["Triage inbox", "Prioritize", "Schedule"]),
      wf("Errands & logistics", "Handle recurring personal tasks", "as_needed", ["Capture", "Prepare", "Execute"]),
    ],
    agents: ["personal.assistant"],
    kpis: [kpi("missed_commitments", 0, "count", "lower_better"), kpi("deep_work_hours_weekly", 15, "hours")],
    assets: ["preferences", "contact_list"],
    approvals: ["Spending above a set limit requires confirmation"],
    dashboards: ["Today", "Week ahead", "Open loops"],
    escalation_rules: [esc("Conflicting commitments", "Flag for decision"), esc("Deadline at risk", "Surface immediately")],
  },
  health: {
    name: "Health",
    goals: ["Sustain energy", "Protect recovery", "Build consistent habits"],
    workflows: [
      wf("Daily routine", "Keep keystone habits", "daily", ["Plan", "Track", "Review"]),
      wf("Recovery management", "Protect sleep and stress", "ongoing", ["Monitor", "Adjust", "Rest"]),
    ],
    agents: ["health.tracker"],
    kpis: [kpi("sleep_hours", 7.5, "hours"), kpi("habit_consistency", 0.8, "ratio"), kpi("stress_level", 0.4, "ratio", "lower_better")],
    assets: ["routine", "habit_tracker"],
    approvals: ["Health decisions are advisory; consult a clinician where appropriate"],
    dashboards: ["Energy trend", "Recovery", "Habits"],
    escalation_rules: [esc("Sustained low recovery", "Recommend rest; suggest clinician if persistent"), esc("Concerning health signal", "Advise professional consultation")],
  },
  asset_management: {
    name: "Asset Management",
    goals: ["Maximize asset utilization", "Protect and version assets", "Surface reuse"],
    workflows: [
      wf("Asset intake", "Catalog and approve assets", "on_create", ["Catalog", "Tag", "Approve"]),
      wf("Reuse surfacing", "Find where assets can be reused", "weekly", ["Scan", "Match", "Recommend"]),
    ],
    agents: ["assets.curator"],
    kpis: [kpi("asset_reuse_rate", 0.5, "ratio"), kpi("stale_assets", 0, "count", "lower_better")],
    assets: ["brand_guide", "templates", "media_library"],
    approvals: ["Sensitive assets require approval to share", "Publishing externally requires approval"],
    dashboards: ["Asset catalog", "Usage", "Reuse opportunities"],
    escalation_rules: [esc("Sensitive asset shared externally", "Require approval"), esc("License/rights risk", "Route to legal")],
  },
};
