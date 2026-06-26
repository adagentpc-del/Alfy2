import {
  BusinessTemplateSchema,
  type BusinessTemplate,
  type DepartmentSpec,
  type DepartmentKind,
  type SuccessMetric,
  type MemoryKind,
} from "@alfy2/shared";

/**
 * The canonical Business framework. Every business is instantiated from THIS template, so all
 * businesses inherit the same twelve departments and structure. Per-business data isolation is added
 * at instantiation (business_id + data_namespace) — see factory.ts. Versioned so the framework can
 * evolve without rewriting existing businesses. See docs/BUSINESS_TEMPLATE.md.
 */

export const BUSINESS_TEMPLATE_VERSION = "1.0.0";

function dept(
  kind: DepartmentKind,
  name: string,
  mission: string,
  responsibilities: string[],
  capabilities: string[],
  default_agents: string[],
  memoryKinds: MemoryKind[],
  kpis: SuccessMetric[],
): DepartmentSpec {
  return {
    kind,
    name,
    mission,
    responsibilities,
    capabilities,
    default_agents,
    memory_scope: { kinds: memoryKinds, can_read: true, can_write: false, max_items: 100 },
    kpis,
    dashboard_card: {
      title: name,
      subtitle: mission,
      metric_keys: kpis.map((k) => k.name),
      status: "active",
    },
  };
}

const DEPARTMENTS: DepartmentSpec[] = [
  dept(
    "ceo",
    "CEO",
    "Set direction, prioritize, and approve.",
    ["Set strategy and the north star", "Prioritize across departments", "Approve irreversible actions"],
    ["set_strategy", "prioritize", "approve"],
    [],
    ["business", "decision", "lesson", "project"],
    [{ name: "north_star", description: "Primary outcome metric", target: "trending up" }],
  ),
  dept(
    "operations",
    "Operations",
    "Run the day-to-day smoothly.",
    ["Own SOPs and process", "Coordinate vendors and logistics", "Track operational health"],
    ["manage_sops", "coordinate", "track_ops"],
    ["research.web"],
    ["business", "task", "contract", "pattern"],
    [{ name: "on_time_rate", description: "Share of operations completed on time", target: ">= 95%" }],
  ),
  dept(
    "sales",
    "Sales",
    "Fill and close the pipeline.",
    ["Manage the pipeline", "Run outreach and follow-up", "Track and close deals"],
    ["manage_pipeline", "draft_outreach", "track_deals"],
    ["draft.text", "research.web"],
    ["person", "company", "business", "conversation"],
    [{ name: "pipeline_coverage", description: "Pipeline vs target", target: ">= 3x" }],
  ),
  dept(
    "marketing",
    "Marketing",
    "Build demand and brand.",
    ["Plan content and campaigns", "Draft on-brand copy", "Track campaign performance"],
    ["plan_content", "draft_copy", "track_campaigns"],
    ["draft.text"],
    ["idea", "business", "pattern"],
    [{ name: "qualified_leads", description: "New qualified leads per month", target: "trending up" }],
  ),
  dept(
    "finance",
    "Finance",
    "Keep the business solvent and the numbers clear.",
    ["Track cash flow", "Manage invoices and expenses", "Own budgets and forecasts"],
    ["track_cashflow", "manage_invoices", "budget"],
    ["finance.analyze"],
    ["account", "subscription", "contract", "decision"],
    [{ name: "runway_months", description: "Months of cash runway", target: ">= 12" }],
  ),
  dept(
    "legal",
    "Legal",
    "Protect the business and stay compliant.",
    ["Review contracts", "Track compliance obligations", "Flag and mitigate legal risk"],
    ["review_contracts", "track_compliance", "flag_risk"],
    ["research.web"],
    ["contract", "decision"],
    [{ name: "open_legal_risks", description: "Unmitigated legal risks", target: "0 critical" }],
  ),
  dept(
    "customer_success",
    "Customer Success",
    "Onboard, retain, and delight customers.",
    ["Onboard new customers", "Monitor account health", "Resolve issues and tickets"],
    ["onboard", "track_health", "handle_tickets"],
    ["draft.text"],
    ["person", "company", "conversation", "business"],
    [{ name: "retention_rate", description: "Logo/revenue retention", target: ">= 90%" }],
  ),
  dept(
    "projects",
    "Projects",
    "Plan, track, and unblock work.",
    ["Plan projects and milestones", "Track status across the portfolio", "Surface and clear blockers"],
    ["plan_projects", "track_status", "unblock"],
    [],
    ["project", "task", "decision"],
    [{ name: "blocked_ratio", description: "Share of projects blocked", target: "< 10%" }],
  ),
  dept(
    "product",
    "Product",
    "Build the right things.",
    ["Own the roadmap", "Write specs", "Synthesize customer feedback"],
    ["manage_roadmap", "write_specs", "synthesize_feedback"],
    ["research.web", "draft.text"],
    ["idea", "project", "pattern"],
    [{ name: "roadmap_confidence", description: "Confidence in the next-quarter roadmap", target: "high" }],
  ),
  dept(
    "analytics",
    "Analytics",
    "Turn data into decisions.",
    ["Track the metrics that matter", "Build dashboards", "Surface insights and anomalies"],
    ["track_metrics", "build_dashboards", "surface_insights"],
    ["research.web"],
    ["pattern", "decision", "business"],
    [{ name: "decision_coverage", description: "Decisions backed by data", target: ">= 80%" }],
  ),
  dept(
    "deployment",
    "Deployment",
    "Ship safely and reliably.",
    ["Manage releases", "Track deploys", "Keep rollback plans ready"],
    ["manage_releases", "track_deploys", "rollback_plan"],
    [],
    ["project", "task", "decision"],
    [{ name: "deploy_success_rate", description: "Successful deploys without rollback", target: ">= 98%" }],
  ),
  dept(
    "automation",
    "Automation",
    "Find and build leverage (ties into the Agent Factory).",
    ["Detect recurring, automatable work", "Recommend new agents", "Wire and maintain workflows"],
    ["detect_automations", "recommend_agents", "wire_workflows"],
    [],
    ["pattern", "task", "decision"],
    [{ name: "automation_coverage", description: "Recurring work that is automated", target: "trending up" }],
  ),
  dept(
    "pr",
    "PR",
    "Own media angles, press releases, the founder story, visibility, podcast pitching, awards, speaking, journalist outreach, crisis comms, reputation monitoring, case studies, credibility assets, media kit, bylines, and launch announcements.",
    ["Pitch media and place stories", "Build the founder story and visibility", "Monitor and protect reputation"],
    ["pitch_media", "build_founder_story", "monitor_reputation"],
    ["pr.outreach", "pr.monitor", "draft.text", "research.web"],
    ["business", "pattern", "person", "company"],
    [{ name: "earned_media_mentions", description: "Earned media placements per month", target: "trending up" }],
  ),
];

/** The single canonical template. Frozen so no business can mutate the shared framework. */
export const BUSINESS_TEMPLATE: BusinessTemplate = BusinessTemplateSchema.parse({
  version: BUSINESS_TEMPLATE_VERSION,
  departments: DEPARTMENTS,
});

/** All twelve department kinds, in canonical order. */
export const DEPARTMENT_KINDS: DepartmentKind[] = DEPARTMENTS.map((d) => d.kind);

/** Fetch the template for a version. Only 1.0.0 exists today; unknown versions throw. */
export function getBusinessTemplate(version: string = BUSINESS_TEMPLATE_VERSION): BusinessTemplate {
  if (version !== BUSINESS_TEMPLATE_VERSION) {
    throw new Error(`Unknown business template version: ${version}`);
  }
  return BUSINESS_TEMPLATE;
}
