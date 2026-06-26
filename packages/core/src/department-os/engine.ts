import {
  DepartmentSchema,
  AiEmployeeSchema,
  KpiRecordSchema,
  DeptGovernanceReportSchema,
  type Department,
  type AiEmployee,
  type KpiRecord,
  type KpiOwnerKind,
  type DeptReviewCadence,
  type DeptRiskLevel,
  type DeptGovernanceViolation,
  type DeptGovernanceReport,
} from "@alfy2/shared";

/**
 * Department Operating System + AI Employee KPI / Scorecard engine.
 *
 * Deterministic and infrastructure-free (in-memory reference store; real persistence arrives in a
 * later phase). It enforces the governance rule in code via {@link validateGovernance}:
 *   - every AI employee belongs to a department
 *   - every department has an operating loop AND KPIs
 *   - every recorded KPI connects to a business outcome
 *
 * {@link seedDefaultDepartments} provisions the 12-department operating company with its AI
 * employees and KPIs.
 */

export interface DepartmentOsEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

interface Stores {
  departments: Map<string, Department>;
  aiEmployees: Map<string, AiEmployee>;
  kpiRecords: Map<string, KpiRecord>;
}

export interface CreateDepartmentInput {
  key: string;
  name: string;
  mission?: string;
  operating_loop?: string[];
  responsibilities?: string[];
  inputs?: string[];
  outputs?: string[];
  kpis?: string[];
  review_cadence?: DeptReviewCadence;
  approval_rules?: string[];
  escalation_rules?: string[];
  failure_signals?: string[];
}

export interface CreateAiEmployeeInput {
  department_key: string;
  name: string;
  mission?: string;
  businesses_used_by?: string[];
  allowed_actions?: string[];
  requires_approval_for?: string[];
  inputs?: string[];
  outputs?: string[];
  tools_integrations?: string[];
  risk_level?: DeptRiskLevel;
  kpis?: string[];
  metrics?: Record<string, number>;
  review_cadence?: DeptReviewCadence;
}

export interface RecordKpiInput {
  owner_kind: KpiOwnerKind;
  owner_key: string;
  kpi_name: string;
  value: number;
  period: string;
  business_outcome: string;
}

export class DepartmentOsEngine {
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly s: Stores = {
    departments: new Map(),
    aiEmployees: new Map(),
    kpiRecords: new Map(),
  };

  constructor(options: DepartmentOsEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  // --- Departments ---------------------------------------------------------

  createDepartment(tenantId: string, input: CreateDepartmentInput): Department {
    const now = this.clock().toISOString();
    const dept = DepartmentSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      key: input.key,
      name: input.name,
      mission: input.mission ?? "",
      operating_loop: input.operating_loop ?? [],
      responsibilities: input.responsibilities ?? [],
      inputs: input.inputs ?? [],
      outputs: input.outputs ?? [],
      kpis: input.kpis ?? [],
      review_cadence: input.review_cadence ?? "weekly",
      approval_rules: input.approval_rules ?? [],
      escalation_rules: input.escalation_rules ?? [],
      failure_signals: input.failure_signals ?? [],
      created_at: now,
      updated_at: null,
    });
    this.s.departments.set(dept.id, dept);
    return dept;
  }

  listDepartments(tenantId: string): Department[] {
    return [...this.s.departments.values()].filter((d) => d.tenant_id === tenantId);
  }

  getDepartment(tenantId: string, key: string): Department | undefined {
    return [...this.s.departments.values()].find(
      (d) => d.tenant_id === tenantId && d.key === key,
    );
  }

  // --- AI employees --------------------------------------------------------

  createAiEmployee(tenantId: string, input: CreateAiEmployeeInput): AiEmployee {
    const now = this.clock().toISOString();
    const emp = AiEmployeeSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      department_key: input.department_key,
      name: input.name,
      mission: input.mission ?? "",
      businesses_used_by: input.businesses_used_by ?? [],
      allowed_actions: input.allowed_actions ?? [],
      requires_approval_for: input.requires_approval_for ?? [],
      inputs: input.inputs ?? [],
      outputs: input.outputs ?? [],
      tools_integrations: input.tools_integrations ?? [],
      risk_level: input.risk_level ?? "low",
      kpis: input.kpis ?? [],
      metrics: input.metrics ?? {},
      review_cadence: input.review_cadence ?? "weekly",
      status: "active",
      created_at: now,
      updated_at: null,
    });
    this.s.aiEmployees.set(emp.id, emp);
    return emp;
  }

  listAiEmployees(tenantId: string): AiEmployee[] {
    return [...this.s.aiEmployees.values()].filter((e) => e.tenant_id === tenantId);
  }

  listAiEmployeesForDepartment(tenantId: string, departmentKey: string): AiEmployee[] {
    return this.listAiEmployees(tenantId).filter((e) => e.department_key === departmentKey);
  }

  // --- KPI records (append-only) -------------------------------------------

  recordKpi(tenantId: string, input: RecordKpiInput): KpiRecord {
    const record = KpiRecordSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      owner_kind: input.owner_kind,
      owner_key: input.owner_key,
      kpi_name: input.kpi_name,
      value: input.value,
      period: input.period,
      business_outcome: input.business_outcome,
      created_at: this.clock().toISOString(),
    });
    this.s.kpiRecords.set(record.id, record);
    return record;
  }

  listKpiRecords(tenantId: string): KpiRecord[] {
    return [...this.s.kpiRecords.values()].filter((r) => r.tenant_id === tenantId);
  }

  // --- Governance ----------------------------------------------------------

  /**
   * Enforce the governance rule and return all violations:
   *   - any AI employee without a department (missing or unknown department_key)
   *   - any department without an operating loop OR without KPIs
   *   - any KPI record without a business outcome
   */
  validateGovernance(tenantId: string): DeptGovernanceReport {
    const departments = this.listDepartments(tenantId);
    const aiEmployees = this.listAiEmployees(tenantId);
    const kpis = this.listKpiRecords(tenantId);
    const deptKeys = new Set(departments.map((d) => d.key));
    const violations: DeptGovernanceViolation[] = [];

    for (const emp of aiEmployees) {
      if (!emp.department_key || !deptKeys.has(emp.department_key)) {
        violations.push({
          kind: "ai_employee_without_department",
          subject: emp.name,
          detail: emp.department_key
            ? `department "${emp.department_key}" does not exist`
            : "no department assigned",
        });
      }
    }

    for (const dept of departments) {
      if (dept.operating_loop.length === 0) {
        violations.push({
          kind: "department_without_operating_loop",
          subject: dept.key,
          detail: `department "${dept.name}" has no operating loop`,
        });
      }
      if (dept.kpis.length === 0) {
        violations.push({
          kind: "department_without_kpis",
          subject: dept.key,
          detail: `department "${dept.name}" has no KPIs`,
        });
      }
    }

    for (const kpi of kpis) {
      if (!kpi.business_outcome || kpi.business_outcome.trim().length === 0) {
        violations.push({
          kind: "kpi_without_business_outcome",
          subject: kpi.kpi_name,
          detail: `KPI "${kpi.kpi_name}" for ${kpi.owner_kind} "${kpi.owner_key}" has no business outcome`,
        });
      }
    }

    return DeptGovernanceReportSchema.parse({
      tenant_id: tenantId,
      ok: violations.length === 0,
      violations,
      departments_checked: departments.length,
      ai_employees_checked: aiEmployees.length,
      kpis_checked: kpis.length,
    });
  }

  // --- Seed catalog --------------------------------------------------------

  /**
   * Seed the 12-department operating company with its AI employees and KPIs. Returns the created
   * departments and AI employees. Idempotent per (tenant, department key): a department that already
   * exists is skipped (its AI employees are not duplicated).
   */
  seedDefaultDepartments(tenantId: string): {
    departments: Department[];
    aiEmployees: AiEmployee[];
  } {
    const createdDepartments: Department[] = [];
    const createdEmployees: AiEmployee[] = [];

    for (const spec of DEFAULT_DEPARTMENTS) {
      const existing = this.getDepartment(tenantId, spec.key);
      if (existing) {
        createdDepartments.push(existing);
        continue;
      }
      const dept = this.createDepartment(tenantId, {
        key: spec.key,
        name: spec.name,
        mission: spec.mission,
        operating_loop: spec.operating_loop,
        kpis: spec.kpis,
        review_cadence: spec.review_cadence,
      });
      createdDepartments.push(dept);
      for (const employeeName of spec.ai_employees) {
        const emp = this.createAiEmployee(tenantId, {
          department_key: dept.key,
          name: employeeName,
          kpis: [...AI_EMPLOYEE_KPI_NAMES],
          review_cadence: spec.review_cadence,
        });
        createdEmployees.push(emp);
      }
    }

    return { departments: createdDepartments, aiEmployees: createdEmployees };
  }
}

// ===========================================================================
// Seed catalog — the 13 departments of a billion-dollar AI operating company (incl. R&D).
// ===========================================================================

/** Standard AI-employee scorecard KPI names (every seeded AI employee is measured on these). */
export const AI_EMPLOYEE_KPI_NAMES: readonly string[] = [
  "output_quality",
  "approval_rate",
  "edit_rate",
  "execution_success_rate",
  "conversion_revenue_impact",
  "time_saved",
  "cost_per_run",
  "failure_rate",
  "hallucination_conflict_rate",
];

interface DepartmentSeedSpec {
  key: string;
  name: string;
  mission: string;
  operating_loop: string[];
  ai_employees: string[];
  kpis: string[];
  review_cadence: DeptReviewCadence;
}

export const DEFAULT_DEPARTMENTS: readonly DepartmentSeedSpec[] = [
  {
    key: "executive_office",
    name: "Executive Office",
    mission: "Set priorities, protect focus, allocate resources, make portfolio decisions.",
    operating_loop: [
      "capture inputs",
      "review business health",
      "identify opportunities/risks",
      "prioritize",
      "assign",
      "monitor",
      "review outcomes",
      "update strategy",
    ],
    ai_employees: ["Executive Governor", "Chief of Staff", "Portfolio Strategist", "Decision Log Manager"],
    kpis: [
      "revenue priorities identified",
      "decisions resolved",
      "stalled decisions reduced",
      "founder time saved",
      "low-value tasks blocked",
      "weekly priorities completed",
    ],
    review_cadence: "weekly",
  },
  {
    key: "growth_marketing",
    name: "Growth / Marketing",
    mission: "Bring the right people into each platform.",
    operating_loop: [
      "research algorithms",
      "define audience",
      "campaign strategy",
      "generate assets",
      "approve",
      "schedule/post",
      "track",
      "optimize",
    ],
    ai_employees: [
      "Growth Strategist",
      "Social Media Manager",
      "Content Strategist",
      "Email Campaign Manager",
      "SEO Manager",
      "PR Manager",
      "Conversion Copywriter",
    ],
    kpis: [
      "leads generated",
      "signup rate",
      "content engagement",
      "email open/reply/click rate",
      "landing page conversion",
      "follower-to-lead conversion",
      "campaign ROI",
    ],
    review_cadence: "weekly",
  },
  {
    key: "sales_revenue",
    name: "Sales / Revenue",
    mission: "Convert attention into revenue.",
    operating_loop: [
      "identify opportunities",
      "qualify",
      "outreach",
      "follow up",
      "proposal",
      "close",
      "collect payment",
      "handoff",
      "track",
    ],
    ai_employees: [
      "Sales Strategist",
      "Outreach Agent",
      "Proposal Agent",
      "Follow-Up Agent",
      "Deal Desk Agent",
      "Pricing Agent",
    ],
    kpis: [
      "qualified leads",
      "calls booked",
      "proposals sent",
      "close rate",
      "average deal size",
      "revenue generated",
      "follow-up completion",
      "unpaid labor prevented",
    ],
    review_cadence: "weekly",
  },
  {
    key: "product_platform",
    name: "Product / Platform",
    mission: "Improve platforms so users activate/convert/stay.",
    operating_loop: [
      "review behavior",
      "identify friction",
      "define improvement",
      "spec",
      "build/update",
      "QA",
      "deploy",
      "announce",
      "measure",
    ],
    ai_employees: [
      "Product Manager",
      "UX Auditor",
      "Feature Spec Writer",
      "QA Tester",
      "Release Notes Agent",
      "User Feedback Analyst",
    ],
    kpis: [
      "activation rate",
      "feature adoption",
      "bug reduction",
      "conversion blockers fixed",
      "deployment success rate",
      "feedback resolved",
      "time issue-to-fix",
    ],
    review_cadence: "weekly",
  },
  {
    key: "engineering_build",
    name: "Engineering / Build",
    mission: "Safely maintain/improve code+infra.",
    operating_loop: [
      "receive spec",
      "inspect repo",
      "plan",
      "code",
      "test",
      "commit",
      "deploy",
      "verify",
      "log",
    ],
    ai_employees: [
      "Build Agent",
      "GitHub Agent",
      "Supabase Agent",
      "Render Agent",
      "Integration Agent",
      "Debug Agent",
      "Security Reviewer",
    ],
    kpis: [
      "successful deployments",
      "bugs fixed",
      "failed deploys",
      "rollback events",
      "uptime",
      "integration health",
      "time to resolution",
      "tech debt reduced",
    ],
    review_cadence: "weekly",
  },
  {
    key: "operations",
    name: "Operations",
    mission: "Turn chaos into repeatable systems.",
    operating_loop: [
      "identify recurring work",
      "create SOP",
      "assign owner",
      "execute checklist",
      "monitor failures",
      "improve",
      "automate",
    ],
    ai_employees: [
      "COO Agent",
      "SOP Builder",
      "Task Manager",
      "Automation Manager",
      "Process Auditor",
      "Documentation Agent",
    ],
    kpis: [
      "SOPs created",
      "recurring tasks automated",
      "overdue tasks reduced",
      "process failures reduced",
      "manual steps removed",
      "bottlenecks resolved",
    ],
    review_cadence: "weekly",
  },
  {
    key: "customer_success",
    name: "Customer / User Success",
    mission: "Help users get value + stay.",
    operating_loop: [
      "signup",
      "onboard",
      "guide first action",
      "monitor activation",
      "send help",
      "collect feedback",
      "upsell/referral",
      "retain",
    ],
    ai_employees: [
      "Onboarding Agent",
      "Support Agent",
      "Activation Agent",
      "Retention Agent",
      "Feedback Agent",
      "Referral Agent",
    ],
    kpis: [
      "onboarding completion",
      "activation rate",
      "support response time",
      "churn risk reduced",
      "referrals generated",
      "satisfaction",
      "inactive reactivated",
    ],
    review_cadence: "weekly",
  },
  {
    key: "finance",
    name: "Finance",
    mission: "Protect cash, track revenue, control costs, improve margins.",
    operating_loop: [
      "track income/costs",
      "identify cash actions",
      "review pricing/margins",
      "detect unpaid work",
      "monitor subscriptions",
      "forecast",
      "recommend allocation",
    ],
    ai_employees: [
      "CFO Agent",
      "Revenue Tracker",
      "Cost Controller",
      "Pricing Analyst",
      "Subscription Auditor",
      "Invoice/Payment Agent",
    ],
    kpis: [
      "revenue tracked",
      "cash opportunities identified",
      "unpaid work blocked",
      "tool costs reduced",
      "invoices followed up",
      "gross margin protected",
      "ROI by business",
    ],
    review_cadence: "weekly",
  },
  {
    key: "legal_compliance_risk",
    name: "Legal / Compliance / Risk",
    mission: "Prevent preventable damage.",
    operating_loop: [
      "review action",
      "identify risk",
      "require disclaimers/approval",
      "check permissions/contracts",
      "approve/modify/block",
      "log",
    ],
    ai_employees: [
      "Legal Risk Reviewer",
      "Compliance Agent",
      "Privacy Agent",
      "Claims Checker",
      "Contract Checklist Agent",
      "Incident Response Agent",
    ],
    kpis: [
      "high-risk actions reviewed",
      "claims corrected",
      "missing agreements flagged",
      "incidents prevented",
      "compliance gaps closed",
      "risky sends blocked",
    ],
    review_cadence: "weekly",
  },
  {
    key: "data_intelligence",
    name: "Data / Intelligence",
    mission: "Keep data clean/connected/current/useful.",
    operating_loop: [
      "ingest",
      "classify",
      "resolve identities",
      "attach relationships",
      "detect duplicates/conflicts",
      "update source of truth",
      "make searchable",
    ],
    ai_employees: [
      "Data Architect",
      "Identity Resolution Agent",
      "Memory Curator",
      "Knowledge Manager",
      "CRM Cleaner",
      "Analytics Analyst",
    ],
    kpis: [
      "duplicate records reduced",
      "source-of-truth conflicts resolved",
      "entity match accuracy",
      "stale data archived",
      "searchable records created",
      "data completeness score",
    ],
    review_cadence: "weekly",
  },
  {
    key: "people_operations",
    name: "People Operations",
    mission: "Hire/onboard/train/manage/offboard humans or AI.",
    operating_loop: [
      "detect role need",
      "design role",
      "source",
      "interview",
      "offer",
      "onboard",
      "train",
      "manage performance",
      "offboard",
    ],
    ai_employees: [
      "Hiring Strategist",
      "Role Designer",
      "Interview Agent",
      "Onboarding Agent",
      "Training Agent",
      "Performance Manager",
      "Offboarding Agent",
    ],
    kpis: [
      "founder workload reduced",
      "roles clearly scoped",
      "onboarding completion",
      "training completion",
      "performance score",
      "access setup/revocation accuracy",
      "retention/reliability",
    ],
    review_cadence: "weekly",
  },
  {
    key: "fundraising_development",
    name: "Fundraising / Development (for Black Flag)",
    mission: "Generate funding + steward donors.",
    operating_loop: [
      "research funders",
      "qualify",
      "prepare asset/application",
      "approve",
      "submit/outreach",
      "follow up",
      "receive funding",
      "thank/steward",
      "report impact",
    ],
    ai_employees: [
      "Fundraising Strategist",
      "Grant Researcher",
      "Grant Writer",
      "Major Donor Agent",
      "Sponsor Agent",
      "Donor Stewardship Agent",
      "Impact Reporting Agent",
    ],
    kpis: [
      "grants identified",
      "applications submitted",
      "donor asks made",
      "sponsor conversations",
      "dollars raised",
      "follow-ups completed",
      "reports delivered",
    ],
    review_cadence: "weekly",
  },
  {
    key: "research_development",
    name: "R&D / Innovation",
    mission:
      "Explore, experiment, and de-risk new ideas — including bounded swarm exploration — before they enter the accountable build pipeline.",
    operating_loop: [
      "frame a question / objective",
      "diverge (bounded swarm explores in parallel)",
      "converge + rank candidates",
      "validate / prototype cheaply",
      "kill dead-ends fast",
      "promote validated ideas to the approval-gated pipeline",
      "log learnings",
    ],
    ai_employees: [
      "R&D Lead",
      "Swarm Orchestrator",
      "Experiment Designer",
      "Research Scout",
      "Prototype Agent",
      "Red-Team Agent",
    ],
    kpis: [
      "experiments run",
      "ideas validated",
      "ideas promoted to build",
      "dead-ends killed fast",
      "time to validate",
      "swarm runs converged",
    ],
    review_cadence: "weekly",
  },
];
