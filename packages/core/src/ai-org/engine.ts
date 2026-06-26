import {
  RoleCardSchema,
  DelegationPacketSchema,
  AgentReportSchema,
  EscalationEventSchema,
  AccountabilityRecordSchema,
  DepartmentReportSchema,
  AiOrgChainReportSchema,
  type RoleCard,
  type DelegationPacket,
  type AgentReport,
  type EscalationEvent,
  type AccountabilityRecord,
  type DepartmentReport,
  type AiOrgChainReport,
  type AiOrgViolation,
  type OrgLayer,
  type PermissionScope,
  type RoleCardReviewCadence,
  type RoleCardStatus,
  type DelegationPriority,
  type DelegationStatus,
  type AgentReportExecutionStatus,
  type AgentReportVerificationStatus,
  type EscalationReason,
  type DepartmentReportCadence,
} from "@alfy2/shared";

/**
 * AI Organization / Chain of Command engine.
 *
 * Deterministic and infrastructure-free (in-memory reference store; real persistence arrives in a
 * later phase). It sits ON TOP of the Department OS — it references departments by string key and
 * never rebuilds them. It enforces the accountability rules in code:
 *   - {@link startWork} REFUSES to begin without an accepted DelegationPacket
 *   - every output/action produces an {@link recordAccountability} record
 *   - {@link raiseEscalation} follows the chain Specialist→AiEmployee→DepartmentLeader→Executive→Alyssa
 *   - {@link validateChainOfCommand} flags any structural violation
 *
 * {@link seedRoleCards} provisions all 78 role cards (see {@link DEFAULT_ROLE_CARDS}).
 */

const TOP_OF_CHAIN = "Alyssa";

export interface AiOrgEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

interface Stores {
  roleCards: Map<string, RoleCard>;
  packets: Map<string, DelegationPacket>;
  reports: Map<string, AgentReport>;
  escalations: Map<string, EscalationEvent>;
  accountability: Map<string, AccountabilityRecord>;
  departmentReports: Map<string, DepartmentReport>;
}

export interface AddRoleCardInput {
  name: string;
  department_key: string;
  org_layer: OrgLayer;
  is_leader?: boolean;
  mission?: string;
  businesses_used_by?: string[];
  primary_responsibilities?: string[];
  operating_loop?: string[];
  allowed_actions?: string[];
  requires_approval_for?: string[];
  inputs?: string[];
  outputs?: string[];
  tools_integrations?: string[];
  kpis?: string[];
  failure_signals?: string[];
  escalation_rules?: string[];
  review_cadence?: RoleCardReviewCadence;
  permission_scope?: PermissionScope;
  reports_to?: string | null;
  status?: RoleCardStatus;
}

export interface ListRoleCardsFilter {
  department_key?: string;
  org_layer?: OrgLayer;
  is_leader?: boolean;
  status?: RoleCardStatus;
}

export interface IssueDelegationPacketInput {
  assigning_employee: string;
  assigned_agent: string;
  objective: string;
  business?: string;
  project?: string;
  context_stack?: string[];
  source_of_truth_refs?: string[];
  required_output?: string;
  allowed_tools?: string[];
  prohibited_actions?: string[];
  approval_required?: boolean;
  deadline?: string | null;
  priority?: DelegationPriority;
  success_criteria?: string[];
  reporting_format?: string;
  escalation_trigger?: string;
}

export interface SubmitReportInput {
  packet_id: string;
  agent: string;
  task_completed?: boolean;
  output_produced?: string;
  sources_used?: string[];
  assumptions?: string[];
  issues?: string[];
  confidence?: number;
  risks?: string[];
  approval_needed?: boolean;
  recommended_next_step?: string;
  execution_status?: AgentReportExecutionStatus;
  verification_status?: AgentReportVerificationStatus;
}

export interface RaiseEscalationInput {
  from_layer: OrgLayer;
  reason: EscalationReason;
  detail?: string;
  /** Optional explicit target layer; when omitted the engine routes one step up the chain. */
  to_layer?: OrgLayer;
  packet_id?: string | null;
}

export interface RecordAccountabilityInput {
  executing_agent: string;
  requesting_leader?: string;
  responsible_employee?: string;
  approving_authority?: string | null;
  business?: string;
  task?: string;
  status?: string;
  result?: string;
  kpi_impact?: string;
  audit_log?: string[];
}

export type ReviewDecision = "approve" | "revise" | "reject";

/** The chain of command, top-down. raiseEscalation routes one step up from {@link from_layer}. */
const ESCALATION_LADDER: readonly OrgLayer[] = [
  "specialist_agent",
  "ai_employee",
  "department_leader",
  "executive",
];

export class AiOrgEngine {
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly s: Stores = {
    roleCards: new Map(),
    packets: new Map(),
    reports: new Map(),
    escalations: new Map(),
    accountability: new Map(),
    departmentReports: new Map(),
  };

  constructor(options: AiOrgEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  // --- Role cards ----------------------------------------------------------

  /**
   * Seed all 78 role cards from {@link DEFAULT_ROLE_CARDS}. Idempotent per (tenant, role name):
   * a card that already exists is skipped (not duplicated). Returns the full set for the tenant.
   */
  seedRoleCards(tenantId: string): RoleCard[] {
    for (const spec of DEFAULT_ROLE_CARDS) {
      if (this.getRoleCard(tenantId, spec.name)) continue;
      const now = this.clock().toISOString();
      const card = RoleCardSchema.parse({
        id: this.newId(),
        tenant_id: tenantId,
        name: spec.name,
        department_key: spec.department_key,
        org_layer: spec.org_layer,
        is_leader: spec.is_leader,
        mission: spec.mission,
        businesses_used_by: spec.businesses_used_by,
        primary_responsibilities: spec.primary_responsibilities,
        operating_loop: spec.operating_loop,
        allowed_actions: spec.allowed_actions,
        requires_approval_for: spec.requires_approval_for,
        inputs: spec.inputs,
        outputs: spec.outputs,
        tools_integrations: spec.tools_integrations,
        kpis: spec.kpis,
        failure_signals: spec.failure_signals,
        escalation_rules: spec.escalation_rules,
        review_cadence: spec.review_cadence,
        permission_scope: spec.permission_scope,
        reports_to: spec.reports_to,
        status: "active",
        created_at: now,
        updated_at: null,
      });
      this.s.roleCards.set(card.id, card);
    }
    return this.listRoleCards(tenantId);
  }

  /**
   * Register a single role card directly (outside the seed catalog). Useful for adding bespoke
   * roles — including specialist agents, which the default roster does not seed. Defaults mirror the
   * contract; pass {@link AddRoleCardInput.reports_to}=null only for executive roles.
   */
  addRoleCard(tenantId: string, input: AddRoleCardInput): RoleCard {
    const now = this.clock().toISOString();
    const card = RoleCardSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      name: input.name,
      department_key: input.department_key,
      org_layer: input.org_layer,
      is_leader: input.is_leader ?? (input.org_layer === "department_leader" || input.org_layer === "executive"),
      mission: input.mission ?? "",
      businesses_used_by: input.businesses_used_by ?? [],
      primary_responsibilities: input.primary_responsibilities ?? [],
      operating_loop: input.operating_loop ?? [],
      allowed_actions: input.allowed_actions ?? [],
      requires_approval_for: input.requires_approval_for ?? [],
      inputs: input.inputs ?? [],
      outputs: input.outputs ?? [],
      tools_integrations: input.tools_integrations ?? [],
      kpis: input.kpis ?? [],
      failure_signals: input.failure_signals ?? [],
      escalation_rules: input.escalation_rules ?? [],
      review_cadence: input.review_cadence ?? "weekly",
      permission_scope: input.permission_scope ?? "recommend_only",
      reports_to: input.reports_to ?? null,
      status: input.status ?? "active",
      created_at: now,
      updated_at: null,
    });
    this.s.roleCards.set(card.id, card);
    return card;
  }

  listRoleCards(tenantId: string, filter: ListRoleCardsFilter = {}): RoleCard[] {
    return [...this.s.roleCards.values()].filter((c) => {
      if (c.tenant_id !== tenantId) return false;
      if (filter.department_key !== undefined && c.department_key !== filter.department_key) {
        return false;
      }
      if (filter.org_layer !== undefined && c.org_layer !== filter.org_layer) return false;
      if (filter.is_leader !== undefined && c.is_leader !== filter.is_leader) return false;
      if (filter.status !== undefined && c.status !== filter.status) return false;
      return true;
    });
  }

  getRoleCard(tenantId: string, name: string): RoleCard | undefined {
    return [...this.s.roleCards.values()].find(
      (c) => c.tenant_id === tenantId && c.name === name,
    );
  }

  /** Update a role card's permission scope. Throws if the role does not exist. */
  setPermissionScope(tenantId: string, roleName: string, scope: PermissionScope): RoleCard {
    const card = this.getRoleCard(tenantId, roleName);
    if (!card) {
      throw new Error(`AiOrg: role card "${roleName}" not found`);
    }
    const updated = RoleCardSchema.parse({
      ...card,
      permission_scope: scope,
      updated_at: this.clock().toISOString(),
    });
    this.s.roleCards.set(updated.id, updated);
    return updated;
  }

  // --- Delegation packets (append-only) ------------------------------------

  /** Issue a delegation packet (status 'issued'). An agent cannot begin work without one. */
  issueDelegationPacket(tenantId: string, input: IssueDelegationPacketInput): DelegationPacket {
    const packet = DelegationPacketSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      assigning_employee: input.assigning_employee,
      assigned_agent: input.assigned_agent,
      business: input.business ?? "",
      project: input.project ?? "",
      objective: input.objective,
      context_stack: input.context_stack ?? [],
      source_of_truth_refs: input.source_of_truth_refs ?? [],
      required_output: input.required_output ?? "",
      allowed_tools: input.allowed_tools ?? [],
      prohibited_actions: input.prohibited_actions ?? [],
      approval_required: input.approval_required ?? false,
      deadline: input.deadline ?? null,
      priority: input.priority ?? "medium",
      success_criteria: input.success_criteria ?? [],
      reporting_format: input.reporting_format ?? "",
      escalation_trigger: input.escalation_trigger ?? "",
      status: "issued",
      created_at: this.clock().toISOString(),
    });
    this.s.packets.set(packet.id, packet);
    return packet;
  }

  getPacket(tenantId: string, packetId: string): DelegationPacket | undefined {
    const packet = this.s.packets.get(packetId);
    return packet && packet.tenant_id === tenantId ? packet : undefined;
  }

  listPackets(tenantId: string): DelegationPacket[] {
    return [...this.s.packets.values()].filter((p) => p.tenant_id === tenantId);
  }

  /** The assigned agent accepts the packet (status 'issued' → 'accepted'). */
  acceptPacket(tenantId: string, packetId: string): DelegationPacket {
    const packet = this.getPacket(tenantId, packetId);
    if (!packet) {
      throw new Error(`AiOrg: delegation packet "${packetId}" not found`);
    }
    if (packet.status !== "issued") {
      throw new Error(
        `AiOrg: packet "${packetId}" must be 'issued' to accept (is '${packet.status}')`,
      );
    }
    return this.setPacketStatus(packet, "accepted");
  }

  /**
   * Begin work on a packet. ENFORCES "an agent cannot begin without a packet": throws if the packet
   * does not exist or has not been accepted. On success sets status 'in_progress'.
   */
  startWork(tenantId: string, packetId: string): DelegationPacket {
    const packet = this.getPacket(tenantId, packetId);
    if (!packet) {
      throw new Error(
        `AiOrg: cannot start work — no delegation packet "${packetId}". An agent cannot begin without a packet.`,
      );
    }
    if (packet.status !== "accepted") {
      throw new Error(
        `AiOrg: cannot start work — packet "${packetId}" is '${packet.status}', not 'accepted'. An agent cannot begin without an accepted packet.`,
      );
    }
    return this.setPacketStatus(packet, "in_progress");
  }

  // --- Agent reports (append-only) -----------------------------------------

  /** Submit the report-back for a packet. Sets the packet status to 'reported'. */
  submitReport(tenantId: string, input: SubmitReportInput): AgentReport {
    const packet = this.getPacket(tenantId, input.packet_id);
    if (!packet) {
      throw new Error(`AiOrg: cannot submit report — packet "${input.packet_id}" not found`);
    }
    const report = AgentReportSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      packet_id: input.packet_id,
      agent: input.agent,
      task_completed: input.task_completed ?? false,
      output_produced: input.output_produced ?? "",
      sources_used: input.sources_used ?? [],
      assumptions: input.assumptions ?? [],
      issues: input.issues ?? [],
      confidence: input.confidence ?? 0.5,
      risks: input.risks ?? [],
      approval_needed: input.approval_needed ?? false,
      recommended_next_step: input.recommended_next_step ?? "",
      execution_status: input.execution_status ?? "done",
      verification_status: input.verification_status ?? "unverified",
      created_at: this.clock().toISOString(),
    });
    this.s.reports.set(report.id, report);
    this.setPacketStatus(packet, "reported");
    return report;
  }

  getReport(tenantId: string, reportId: string): AgentReport | undefined {
    const report = this.s.reports.get(reportId);
    return report && report.tenant_id === tenantId ? report : undefined;
  }

  listReports(tenantId: string): AgentReport[] {
    return [...this.s.reports.values()].filter((r) => r.tenant_id === tenantId);
  }

  /**
   * The receiving employee reviews a report. 'approve' marks the packet 'approved', 'reject' marks it
   * 'rejected', 'revise' returns it to 'accepted' for another pass. Returns the updated packet.
   */
  reviewReport(tenantId: string, reportId: string, decision: ReviewDecision): DelegationPacket {
    const report = this.getReport(tenantId, reportId);
    if (!report) {
      throw new Error(`AiOrg: report "${reportId}" not found`);
    }
    const packet = this.getPacket(tenantId, report.packet_id);
    if (!packet) {
      throw new Error(`AiOrg: packet "${report.packet_id}" for report "${reportId}" not found`);
    }
    const next: DelegationStatus =
      decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "accepted";
    return this.setPacketStatus(packet, next);
  }

  // --- Escalations (append-only) -------------------------------------------

  /**
   * Raise an escalation. When {@link RaiseEscalationInput.to_layer} is omitted, routes ONE step up
   * the chain Specialist→AiEmployee→DepartmentLeader→Executive (the top, executive, escalates to
   * "Alyssa" out-of-band; there is no layer above executive). Marks any referenced packet 'escalated'.
   */
  raiseEscalation(tenantId: string, input: RaiseEscalationInput): EscalationEvent {
    const toLayer = input.to_layer ?? this.nextLayerUp(input.from_layer);
    const event = EscalationEventSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      from_layer: input.from_layer,
      to_layer: toLayer,
      reason: input.reason,
      detail: input.detail ?? "",
      packet_id: input.packet_id ?? null,
      resolved: false,
      created_at: this.clock().toISOString(),
    });
    this.s.escalations.set(event.id, event);
    if (input.packet_id) {
      const packet = this.getPacket(tenantId, input.packet_id);
      if (packet) this.setPacketStatus(packet, "escalated");
    }
    return event;
  }

  listEscalations(tenantId: string): EscalationEvent[] {
    return [...this.s.escalations.values()].filter((e) => e.tenant_id === tenantId);
  }

  // --- Accountability (append-only) ----------------------------------------

  /** Record an output/action in the accountability ledger. */
  recordAccountability(
    tenantId: string,
    input: RecordAccountabilityInput,
  ): AccountabilityRecord {
    const record = AccountabilityRecordSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      requesting_leader: input.requesting_leader ?? "",
      responsible_employee: input.responsible_employee ?? "",
      executing_agent: input.executing_agent,
      approving_authority: input.approving_authority ?? null,
      business: input.business ?? "",
      task: input.task ?? "",
      status: input.status ?? "",
      result: input.result ?? "",
      kpi_impact: input.kpi_impact ?? "",
      audit_log: input.audit_log ?? [],
      created_at: this.clock().toISOString(),
    });
    this.s.accountability.set(record.id, record);
    return record;
  }

  listAccountability(tenantId: string): AccountabilityRecord[] {
    return [...this.s.accountability.values()].filter((r) => r.tenant_id === tenantId);
  }

  // --- Department reports (append-only) ------------------------------------

  /**
   * Generate a department report from current state for {@link departmentKey}. Aggregates the
   * tenant's accountability + escalation activity into the standard report shape.
   */
  generateDepartmentReport(
    tenantId: string,
    departmentKey: string,
    cadence: DepartmentReportCadence,
  ): DepartmentReport {
    const accountability = this.listAccountability(tenantId);
    const escalations = this.listEscalations(tenantId);
    const packets = this.listPackets(tenantId);

    const completedWork = accountability
      .filter((a) => a.status === "done" || a.result.length > 0)
      .map((a) => a.task || a.result)
      .filter((t) => t.length > 0);
    const pendingApprovals = packets
      .filter((p) => p.approval_required && p.status !== "approved")
      .map((p) => p.objective);
    const blockers = escalations
      .filter((e) => !e.resolved && e.reason === "execution_failed")
      .map((e) => e.detail || e.reason);
    const risks = escalations
      .filter((e) => !e.resolved && e.reason !== "execution_failed")
      .map((e) => `${e.reason}: ${e.detail}`.trim());

    const report = DepartmentReportSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      department_key: departmentKey,
      cadence,
      completed_work: completedWork,
      pending_approvals: pendingApprovals,
      blockers,
      revenue_opportunities: [],
      risks,
      next_actions: [],
      kpis: {},
      wins: [],
      failures: [],
      lessons_learned: [],
      created_at: this.clock().toISOString(),
    });
    this.s.departmentReports.set(report.id, report);
    return report;
  }

  listDepartmentReports(tenantId: string): DepartmentReport[] {
    return [...this.s.departmentReports.values()].filter((r) => r.tenant_id === tenantId);
  }

  // --- Chain-of-command validation -----------------------------------------

  /**
   * Validate the chain of command. Flags:
   *   - any role card with no department_key
   *   - any non-executive role with no reports_to
   *   - any specialist_agent that has acted (has an AccountabilityRecord) without a DelegationPacket
   */
  validateChainOfCommand(tenantId: string): AiOrgChainReport {
    const roles = this.listRoleCards(tenantId);
    const packets = this.listPackets(tenantId);
    const accountability = this.listAccountability(tenantId);
    const violations: AiOrgViolation[] = [];

    for (const role of roles) {
      if (!role.department_key || role.department_key.trim().length === 0) {
        violations.push({
          kind: "role_without_department",
          subject: role.name,
          detail: `role "${role.name}" has no department_key`,
        });
      }
      if (role.org_layer !== "executive" && !role.reports_to) {
        violations.push({
          kind: "non_executive_without_reports_to",
          subject: role.name,
          detail: `non-executive role "${role.name}" reports to no one`,
        });
      }
    }

    const specialistNames = new Set(
      roles.filter((r) => r.org_layer === "specialist_agent").map((r) => r.name),
    );
    const packetedAgents = new Set(packets.map((p) => p.assigned_agent));
    for (const record of accountability) {
      if (specialistNames.has(record.executing_agent) && !packetedAgents.has(record.executing_agent)) {
        violations.push({
          kind: "specialist_acted_without_packet",
          subject: record.executing_agent,
          detail: `specialist "${record.executing_agent}" produced an accountability record without any delegation packet`,
        });
      }
    }

    return AiOrgChainReportSchema.parse({
      tenant_id: tenantId,
      ok: violations.length === 0,
      violations,
      roles_checked: roles.length,
    });
  }

  // --- internals -----------------------------------------------------------

  private setPacketStatus(packet: DelegationPacket, status: DelegationStatus): DelegationPacket {
    const updated = DelegationPacketSchema.parse({ ...packet, status });
    this.s.packets.set(updated.id, updated);
    return updated;
  }

  private nextLayerUp(from: OrgLayer): OrgLayer {
    const idx = ESCALATION_LADDER.indexOf(from);
    if (idx < 0 || idx >= ESCALATION_LADDER.length - 1) {
      // Already at (or above) executive — the top of the in-system ladder.
      return "executive";
    }
    return ESCALATION_LADDER[idx + 1] as OrgLayer;
  }
}

// ===========================================================================
// Seed catalog — the 78 role cards of the AI organization / chain of command.
// ===========================================================================

interface RoleCardSeedSpec {
  name: string;
  department_key: string;
  org_layer: OrgLayer;
  is_leader: boolean;
  mission: string;
  businesses_used_by: string[];
  primary_responsibilities: string[];
  operating_loop: string[];
  allowed_actions: string[];
  requires_approval_for: string[];
  inputs: string[];
  outputs: string[];
  tools_integrations: string[];
  kpis: string[];
  failure_signals: string[];
  escalation_rules: string[];
  review_cadence: RoleCardReviewCadence;
  permission_scope: PermissionScope;
  reports_to: string | null;
}

/** Shorthand spec for the seed table — only the distinguishing fields; the rest get sensible defaults. */
interface RoleSpec {
  mission: string;
  responsibilities: string[];
  loop: string[];
  kpis: string[];
  scope?: PermissionScope;
  cadence?: RoleCardReviewCadence;
  approvals?: string[];
}

const GENERIC_INPUTS = ["delegation packet", "source-of-truth references", "business context"];
const GENERIC_OUTPUTS = ["structured deliverable", "agent report", "accountability record"];
const GENERIC_TOOLS = ["Supabase", "Asset Library", "internal task queue"];
const GENERIC_FAILURE_SIGNALS = [
  "missing or stale source of truth",
  "low confidence output",
  "deadline missed",
  "unapproved action attempted",
];
const GENERIC_ESCALATION_RULES = [
  "escalate high-risk or low-confidence work to the reporting leader",
  "escalate legal/medical/financial or revenue/pricing/contract decisions",
  "escalate live-system changes and cost-threshold breaches",
];

function leaderSpec(
  name: string,
  departmentKey: string,
  orgLayer: OrgLayer,
  reportsTo: string | null,
  spec: RoleSpec,
): RoleCardSeedSpec {
  return {
    name,
    department_key: departmentKey,
    org_layer: orgLayer,
    is_leader: orgLayer === "department_leader" || orgLayer === "executive",
    mission: spec.mission,
    businesses_used_by: ["all"],
    primary_responsibilities: spec.responsibilities,
    operating_loop: spec.loop,
    allowed_actions: [
      "delegate work via packets",
      "review reports",
      "approve low-risk department actions",
      "compile department reporting",
    ],
    requires_approval_for: spec.approvals ?? [
      "revenue, pricing, or contract decisions",
      "live system changes",
      "external public communications",
    ],
    inputs: ["department goals", "delegation packets", "agent reports", ...GENERIC_INPUTS],
    outputs: ["delegation packets", "department report", ...GENERIC_OUTPUTS],
    tools_integrations: GENERIC_TOOLS,
    kpis: spec.kpis,
    failure_signals: GENERIC_FAILURE_SIGNALS,
    escalation_rules: GENERIC_ESCALATION_RULES,
    review_cadence: spec.cadence ?? "weekly",
    permission_scope: spec.scope ?? "execute_with_approval",
    reports_to: reportsTo,
  };
}

function employeeSpec(
  name: string,
  departmentKey: string,
  reportsTo: string,
  spec: RoleSpec,
): RoleCardSeedSpec {
  return {
    name,
    department_key: departmentKey,
    org_layer: "ai_employee",
    is_leader: false,
    mission: spec.mission,
    businesses_used_by: ["all"],
    primary_responsibilities: spec.responsibilities,
    operating_loop: spec.loop,
    allowed_actions: [
      "accept delegation packets",
      "research and draft",
      "prepare internal assets",
      "submit reports",
    ],
    requires_approval_for: spec.approvals ?? [
      "external sends or publishes",
      "revenue, pricing, or contract changes",
      "live system changes",
    ],
    inputs: GENERIC_INPUTS,
    outputs: GENERIC_OUTPUTS,
    tools_integrations: GENERIC_TOOLS,
    kpis: spec.kpis,
    failure_signals: GENERIC_FAILURE_SIGNALS,
    escalation_rules: GENERIC_ESCALATION_RULES,
    review_cadence: spec.cadence ?? "weekly",
    permission_scope: spec.scope ?? "draft_only",
    reports_to: reportsTo,
  };
}

// --- Leaders of the chain ----------------------------------------------------
const EXEC_GOVERNOR = "Executive Governor";
const CRO = "Chief Revenue Officer";
const GROWTH_LEAD = "Growth Strategist";
const PRODUCT_LEAD = "Product Manager";
const ENG_LEAD = "Chief Systems Architect";
const COO = "COO Agent";
const CS_LEAD = "Onboarding Agent";
const CFO = "CFO Agent";
const LEGAL_LEAD = "Chief Security & Compliance Officer";
const DATA_LEAD = "Chief Data Architect";
const PEOPLE_LEAD = "Hiring Strategist";
const FUND_LEAD = "Fundraising Strategist";

export const DEFAULT_ROLE_CARDS: readonly RoleCardSeedSpec[] = [
  // ----- Executive (4) -------------------------------------------------------
  leaderSpec(EXEC_GOVERNOR, "executive", "executive", TOP_OF_CHAIN, {
    mission: "Set priorities, allocate resources, and hold every department accountable to outcomes.",
    responsibilities: [
      "set enterprise priorities",
      "allocate capital and attention",
      "resolve cross-department conflicts",
      "approve high-risk actions",
      "monitor department health",
      "protect founder focus",
    ],
    loop: ["capture inputs", "review health", "prioritize", "delegate", "monitor", "review outcomes"],
    kpis: ["priorities resolved", "stalled decisions reduced", "founder time saved", "department health"],
    scope: "execute_with_approval",
  }),
  leaderSpec("Chief of Staff", "executive", "executive", TOP_OF_CHAIN, {
    mission: "Coordinate the executive layer and turn priorities into delegated, tracked work.",
    responsibilities: [
      "translate priorities into delegation packets",
      "track commitments across departments",
      "prepare executive briefings",
      "follow up on open loops",
      "surface bottlenecks",
    ],
    loop: ["intake priorities", "decompose", "delegate", "track", "report"],
    kpis: ["open loops closed", "on-time delegation", "briefings delivered", "follow-up completion"],
    scope: "create_internal_task",
  }),
  leaderSpec("Portfolio Strategist", "executive", "executive", TOP_OF_CHAIN, {
    mission: "Rank businesses by leverage and recommend where to focus, automate, or pause.",
    responsibilities: [
      "score businesses on upside and effort",
      "recommend focus and pause decisions",
      "model resource allocation",
      "track portfolio-level KPIs",
    ],
    loop: ["gather metrics", "score", "compare", "recommend", "monitor"],
    kpis: ["portfolio ROI", "focus accuracy", "low-value work paused", "allocation quality"],
    scope: "recommend_only",
  }),
  leaderSpec("Decision Log Manager", "executive", "executive", TOP_OF_CHAIN, {
    mission: "Record every executive decision with rationale so the company never re-litigates settled calls.",
    responsibilities: [
      "capture decisions and rationale",
      "link decisions to outcomes",
      "schedule decision reviews",
      "surface reversed or stalled decisions",
    ],
    loop: ["capture decision", "log rationale", "link outcome", "schedule review", "report"],
    kpis: ["decisions logged", "review completion", "reversed decisions surfaced", "rationale completeness"],
    scope: "create_internal_task",
  }),

  // ----- Revenue (7) ---------------------------------------------------------
  leaderSpec(CRO, "revenue", "department_leader", EXEC_GOVERNOR, {
    mission: "Convert attention into collected revenue across every business.",
    responsibilities: [
      "set revenue strategy",
      "delegate outreach and proposals",
      "review the deal pipeline",
      "remove revenue blockers",
      "approve pricing and discounts",
      "report revenue health",
    ],
    loop: ["review pipeline", "set targets", "delegate", "review deals", "remove blockers", "report"],
    kpis: ["revenue collected", "close rate", "pipeline velocity", "average deal size"],
  }),
  employeeSpec("Sales Strategist", "revenue", CRO, {
    mission: "Design the sales motion and qualify the highest-leverage opportunities.",
    responsibilities: [
      "define the sales motion",
      "qualify opportunities",
      "segment prospects",
      "draft playbooks",
      "recommend next deals",
    ],
    loop: ["analyze pipeline", "qualify", "segment", "recommend", "report"],
    kpis: ["qualified opportunities", "win-rate by segment", "playbook adoption", "forecast accuracy"],
    scope: "recommend_only",
  }),
  employeeSpec("Outreach Agent", "revenue", CRO, {
    mission: "Draft and prepare personalized outreach to qualified prospects.",
    responsibilities: [
      "research prospects",
      "draft outreach sequences",
      "personalize messaging",
      "prepare sends for approval",
      "log outreach activity",
    ],
    loop: ["research", "draft", "personalize", "queue for approval", "report"],
    kpis: ["outreach drafted", "reply rate", "meetings booked", "personalization quality"],
    scope: "prepare_external_asset",
    approvals: ["sending any external message"],
  }),
  employeeSpec("Proposal Agent", "revenue", CRO, {
    mission: "Turn qualified deals into clear, accurate proposals ready for approval.",
    responsibilities: [
      "assemble proposal content",
      "pull accurate pricing",
      "tailor scope to the prospect",
      "verify claims",
      "prepare proposal for approval",
    ],
    loop: ["gather deal context", "draft proposal", "verify pricing", "queue for approval", "report"],
    kpis: ["proposals prepared", "proposal accuracy", "proposal-to-close rate", "turnaround time"],
    scope: "draft_only",
    approvals: ["sending a proposal", "any pricing commitment"],
  }),
  employeeSpec("Deal Desk Agent", "revenue", CRO, {
    mission: "Keep every opportunity clean, current, and moving to the next money step.",
    responsibilities: [
      "maintain opportunity records",
      "flag stalled deals",
      "recommend the next move per deal",
      "track approvals needed",
      "report deal health",
    ],
    loop: ["sync deals", "score health", "flag stalled", "recommend next", "report"],
    kpis: ["pipeline hygiene", "stalled deals revived", "next-step coverage", "cycle time"],
    scope: "create_internal_task",
  }),
  employeeSpec("Pricing Analyst", "revenue", CRO, {
    mission: "Recommend pricing that protects margin and wins deals.",
    responsibilities: [
      "analyze pricing performance",
      "model discount impact",
      "recommend price changes",
      "flag margin risk",
      "document pricing rationale",
    ],
    loop: ["gather pricing data", "model", "recommend", "flag risk", "report"],
    kpis: ["margin protected", "discount discipline", "pricing recommendations adopted", "win-rate impact"],
    scope: "recommend_only",
    approvals: ["any price or discount change"],
  }),
  employeeSpec("Follow-Up Agent", "revenue", CRO, {
    mission: "Make sure no opportunity is dropped between touches.",
    responsibilities: [
      "track follow-up cadence",
      "draft follow-up messages",
      "remind on overdue touches",
      "prepare sends for approval",
      "log follow-up completion",
    ],
    loop: ["scan open threads", "identify due touches", "draft", "queue for approval", "report"],
    kpis: ["follow-up completion", "dropped deals prevented", "response rate", "cadence adherence"],
    scope: "prepare_external_asset",
    approvals: ["sending any external follow-up"],
  }),

  // ----- Growth / Marketing (9) ----------------------------------------------
  leaderSpec(GROWTH_LEAD, "growth", "department_leader", EXEC_GOVERNOR, {
    mission: "Bring the right audience to each platform and convert attention into leads.",
    responsibilities: [
      "set growth strategy",
      "delegate content and campaigns",
      "review channel performance",
      "approve external publishing",
      "optimize the funnel",
      "report growth health",
    ],
    loop: ["review channels", "set strategy", "delegate", "approve", "optimize", "report"],
    kpis: ["leads generated", "cost per lead", "channel ROI", "funnel conversion"],
  }),
  employeeSpec("Social Media Manager", "growth", GROWTH_LEAD, {
    mission: "Prepare on-brand social content that grows the right audience.",
    responsibilities: [
      "plan the social calendar",
      "draft posts per platform",
      "prepare assets for approval",
      "track engagement",
      "recommend optimizations",
    ],
    loop: ["plan calendar", "draft", "queue for approval", "track", "optimize"],
    kpis: ["engagement rate", "follower-to-lead conversion", "posting consistency", "reach"],
    scope: "prepare_external_asset",
    approvals: ["publishing any social post"],
  }),
  employeeSpec("Content Strategist", "growth", GROWTH_LEAD, {
    mission: "Decide what content to create and why, mapped to audience and funnel stage.",
    responsibilities: [
      "define content themes",
      "map content to the funnel",
      "brief content creation",
      "track content performance",
      "recommend the next pieces",
    ],
    loop: ["analyze audience", "define themes", "brief", "track", "recommend"],
    kpis: ["content engagement", "funnel coverage", "brief quality", "content ROI"],
    scope: "recommend_only",
  }),
  employeeSpec("Email Campaign Manager", "growth", GROWTH_LEAD, {
    mission: "Prepare email campaigns that nurture and convert without harming deliverability.",
    responsibilities: [
      "plan email sequences",
      "draft email copy",
      "segment audiences",
      "prepare sends for approval",
      "track open/click/reply",
    ],
    loop: ["plan sequence", "draft", "segment", "queue for approval", "track"],
    kpis: ["open rate", "click rate", "reply rate", "list health"],
    scope: "prepare_external_asset",
    approvals: ["sending any email campaign"],
  }),
  employeeSpec("SEO Manager", "growth", GROWTH_LEAD, {
    mission: "Improve organic discoverability through researched, durable SEO.",
    responsibilities: [
      "research keywords",
      "audit on-page SEO",
      "recommend content and fixes",
      "track rankings",
      "report organic growth",
    ],
    loop: ["research", "audit", "recommend", "track", "report"],
    kpis: ["organic traffic", "keyword rankings", "indexed pages", "SEO fixes shipped"],
    scope: "recommend_only",
  }),
  employeeSpec("PR Manager", "growth", GROWTH_LEAD, {
    mission: "Find and prepare authority and press opportunities.",
    responsibilities: [
      "monitor PR opportunities",
      "draft pitches",
      "prepare press assets",
      "queue outreach for approval",
      "track placements",
    ],
    loop: ["monitor", "draft pitch", "prepare assets", "queue for approval", "track"],
    kpis: ["placements secured", "pitch reply rate", "authority assets prepared", "share of voice"],
    scope: "prepare_external_asset",
    approvals: ["sending any press pitch"],
  }),
  employeeSpec("Conversion Copywriter", "growth", GROWTH_LEAD, {
    mission: "Write copy that converts, measured by revenue not vanity.",
    responsibilities: [
      "draft conversion copy",
      "write A/B variants",
      "align copy to audience pain",
      "prepare copy for approval",
      "track conversion lift",
    ],
    loop: ["analyze audience", "draft", "create variants", "queue for approval", "track"],
    kpis: ["conversion lift", "copy approval rate", "variants tested", "revenue per visitor"],
    scope: "draft_only",
  }),
  employeeSpec("Brand Strategist", "growth", GROWTH_LEAD, {
    mission: "Keep messaging consistent with each brand's identity and positioning.",
    responsibilities: [
      "maintain brand guidelines",
      "review assets for brand fit",
      "recommend positioning",
      "flag off-brand work",
      "report brand consistency",
    ],
    loop: ["review assets", "check brand fit", "recommend", "flag", "report"],
    kpis: ["brand consistency", "off-brand work caught", "positioning clarity", "guideline adoption"],
    scope: "recommend_only",
  }),
  employeeSpec("Competitor Research Agent", "growth", GROWTH_LEAD, {
    mission: "Track competitors and surface positioning and offer gaps.",
    responsibilities: [
      "monitor competitors",
      "analyze competitor offers",
      "identify gaps and threats",
      "summarize findings",
      "recommend responses",
    ],
    loop: ["monitor", "analyze", "identify gaps", "summarize", "recommend"],
    kpis: ["competitors tracked", "gaps surfaced", "intel freshness", "recommendations adopted"],
    scope: "research_only",
  }),

  // ----- Product (6) ---------------------------------------------------------
  leaderSpec(PRODUCT_LEAD, "product", "department_leader", EXEC_GOVERNOR, {
    mission: "Improve platforms so users activate, convert, and stay.",
    responsibilities: [
      "set product priorities",
      "delegate specs and audits",
      "review activation and retention",
      "approve product changes",
      "remove product blockers",
      "report product health",
    ],
    loop: ["review behavior", "prioritize", "delegate", "approve", "measure", "report"],
    kpis: ["activation rate", "feature adoption", "conversion lift", "time issue-to-fix"],
  }),
  employeeSpec("UX Auditor", "product", PRODUCT_LEAD, {
    mission: "Find friction in the product experience and quantify its impact.",
    responsibilities: [
      "audit key user flows",
      "identify friction points",
      "quantify drop-off",
      "recommend fixes",
      "report UX findings",
    ],
    loop: ["map flows", "audit", "quantify", "recommend", "report"],
    kpis: ["friction points found", "drop-off reduced", "fixes recommended", "audit coverage"],
    scope: "research_only",
  }),
  employeeSpec("Feature Spec Writer", "product", PRODUCT_LEAD, {
    mission: "Turn product decisions into clear, buildable specs.",
    responsibilities: [
      "gather requirements",
      "write feature specs",
      "define acceptance criteria",
      "flag dependencies",
      "hand off to engineering",
    ],
    loop: ["gather requirements", "draft spec", "define acceptance", "flag dependencies", "hand off"],
    kpis: ["specs delivered", "spec clarity", "rework rate", "acceptance coverage"],
    scope: "draft_only",
  }),
  employeeSpec("Release Notes Agent", "product", PRODUCT_LEAD, {
    mission: "Announce shipped changes clearly to users and the team.",
    responsibilities: [
      "track shipped changes",
      "draft release notes",
      "tailor notes by audience",
      "prepare announcements for approval",
      "archive release history",
    ],
    loop: ["collect changes", "draft notes", "tailor", "queue for approval", "archive"],
    kpis: ["releases documented", "notes clarity", "announcement timeliness", "coverage"],
    scope: "draft_only",
    approvals: ["publishing any release announcement"],
  }),
  employeeSpec("User Feedback Analyst", "product", PRODUCT_LEAD, {
    mission: "Turn raw user feedback into prioritized product signals.",
    responsibilities: [
      "collect feedback",
      "cluster themes",
      "quantify frequency and impact",
      "recommend priorities",
      "report feedback trends",
    ],
    loop: ["collect", "cluster", "quantify", "recommend", "report"],
    kpis: ["feedback processed", "themes surfaced", "priority accuracy", "feedback-to-fix rate"],
    scope: "research_only",
  }),
  employeeSpec("Activation Agent", "product", PRODUCT_LEAD, {
    mission: "Drive new users to their first valuable action.",
    responsibilities: [
      "map the activation path",
      "identify activation drop-off",
      "prepare nudges and guides",
      "queue interventions for approval",
      "track activation rate",
    ],
    loop: ["map path", "find drop-off", "prepare nudge", "queue for approval", "track"],
    kpis: ["activation rate", "time-to-first-value", "nudge effectiveness", "drop-off reduced"],
    scope: "prepare_external_asset",
    approvals: ["sending any user-facing activation message"],
  }),

  // ----- Engineering (8) -----------------------------------------------------
  leaderSpec(ENG_LEAD, "engineering", "department_leader", EXEC_GOVERNOR, {
    mission: "Safely maintain and improve code and infrastructure.",
    responsibilities: [
      "set engineering standards",
      "delegate build and debug work",
      "review changes for safety",
      "approve deployments",
      "protect uptime",
      "report engineering health",
    ],
    loop: ["receive specs", "plan", "delegate", "review", "approve deploy", "report"],
    kpis: ["successful deployments", "rollback rate", "uptime", "time to resolution"],
    approvals: ["any production deployment", "schema changes", "live system changes"],
  }),
  employeeSpec("Build Agent", "engineering", ENG_LEAD, {
    mission: "Implement specs into working, tested code.",
    responsibilities: [
      "read the spec",
      "inspect the repo",
      "implement changes",
      "write tests",
      "prepare changes for review",
    ],
    loop: ["read spec", "inspect repo", "implement", "test", "submit for review"],
    kpis: ["changes shipped", "test coverage", "rework rate", "review pass rate"],
    scope: "execute_with_approval",
    approvals: ["merging to main", "any deployment"],
  }),
  employeeSpec("GitHub Agent", "engineering", ENG_LEAD, {
    mission: "Manage branches, PRs, and repo hygiene safely.",
    responsibilities: [
      "manage branches and PRs",
      "enforce repo hygiene",
      "summarize diffs",
      "flag risky changes",
      "prepare merges for approval",
    ],
    loop: ["sync repo", "review PRs", "summarize", "flag risk", "queue for approval"],
    kpis: ["PR turnaround", "repo hygiene", "risky changes caught", "merge accuracy"],
    scope: "execute_with_approval",
    approvals: ["merging any pull request"],
  }),
  employeeSpec("Supabase Agent", "engineering", ENG_LEAD, {
    mission: "Manage the database schema and migrations safely.",
    responsibilities: [
      "draft migrations",
      "review schema changes",
      "validate RLS policies",
      "flag destructive changes",
      "prepare migrations for approval",
    ],
    loop: ["draft migration", "review", "validate RLS", "flag risk", "queue for approval"],
    kpis: ["migrations shipped", "RLS coverage", "destructive changes caught", "migration accuracy"],
    scope: "execute_with_approval",
    approvals: ["applying any migration", "any destructive schema change"],
  }),
  employeeSpec("Render Agent", "engineering", ENG_LEAD, {
    mission: "Manage hosting, services, and deploy configuration safely.",
    responsibilities: [
      "manage service config",
      "prepare deployments",
      "monitor service health",
      "flag config risk",
      "queue deploys for approval",
    ],
    loop: ["review config", "prepare deploy", "monitor", "flag risk", "queue for approval"],
    kpis: ["deploy success rate", "service uptime", "config errors caught", "rollback readiness"],
    scope: "execute_with_approval",
    approvals: ["any production deploy", "any service config change"],
  }),
  employeeSpec("Integration Agent", "engineering", ENG_LEAD, {
    mission: "Keep third-party integrations connected and healthy.",
    responsibilities: [
      "monitor integration health",
      "draft integration changes",
      "validate webhooks and auth",
      "flag breaking changes",
      "prepare changes for approval",
    ],
    loop: ["monitor", "draft change", "validate", "flag risk", "queue for approval"],
    kpis: ["integration uptime", "breakages prevented", "auth health", "change accuracy"],
    scope: "execute_with_approval",
    approvals: ["changing any live integration"],
  }),
  employeeSpec("Debug Agent", "engineering", ENG_LEAD, {
    mission: "Diagnose failures and propose safe fixes fast.",
    responsibilities: [
      "reproduce the failure",
      "isolate root cause",
      "propose a fix",
      "verify the fix",
      "report resolution",
    ],
    loop: ["reproduce", "isolate", "propose fix", "verify", "report"],
    kpis: ["time to diagnosis", "root-cause accuracy", "fixes verified", "regressions caused"],
    scope: "recommend_only",
    cadence: "per_task",
  }),
  employeeSpec("QA Tester", "engineering", ENG_LEAD, {
    mission: "Catch defects before users do.",
    responsibilities: [
      "write and run test cases",
      "verify acceptance criteria",
      "report defects",
      "block unsafe releases",
      "track quality trends",
    ],
    loop: ["plan tests", "execute", "verify criteria", "report defects", "track"],
    kpis: ["defects caught pre-release", "test coverage", "escaped defects", "QA turnaround"],
    scope: "recommend_only",
  }),

  // ----- Operations (6) ------------------------------------------------------
  leaderSpec(COO, "operations", "department_leader", EXEC_GOVERNOR, {
    mission: "Turn chaos into repeatable, automated systems.",
    responsibilities: [
      "identify recurring work",
      "delegate SOPs and automation",
      "review process health",
      "approve automation changes",
      "remove operational bottlenecks",
      "report operations health",
    ],
    loop: ["spot recurring work", "delegate", "review", "approve", "automate", "report"],
    kpis: ["SOPs created", "tasks automated", "overdue tasks reduced", "bottlenecks resolved"],
  }),
  employeeSpec("SOP Builder", "operations", COO, {
    mission: "Document repeatable work into clear standard operating procedures.",
    responsibilities: [
      "identify repeatable work",
      "draft SOPs",
      "define checklists",
      "version and store SOPs",
      "recommend automation candidates",
    ],
    loop: ["identify", "draft SOP", "checklist", "store", "recommend"],
    kpis: ["SOPs created", "SOP adoption", "process variance reduced", "automation candidates flagged"],
    scope: "draft_only",
  }),
  employeeSpec("Task Manager", "operations", COO, {
    mission: "Keep work assigned, sequenced, and on time.",
    responsibilities: [
      "intake and triage tasks",
      "assign owners",
      "sequence work",
      "flag overdue items",
      "report task throughput",
    ],
    loop: ["intake", "triage", "assign", "flag overdue", "report"],
    kpis: ["on-time completion", "overdue tasks reduced", "throughput", "assignment accuracy"],
    scope: "create_internal_task",
  }),
  employeeSpec("Automation Manager", "operations", COO, {
    mission: "Replace manual steps with reliable automations.",
    responsibilities: [
      "identify automation candidates",
      "design automations",
      "prepare automations for approval",
      "monitor automation health",
      "report time saved",
    ],
    loop: ["identify", "design", "queue for approval", "monitor", "report"],
    kpis: ["manual steps removed", "automation reliability", "time saved", "automation failures"],
    scope: "execute_with_approval",
    approvals: ["activating any automation"],
  }),
  employeeSpec("Process Auditor", "operations", COO, {
    mission: "Find where processes leak time, money, or quality.",
    responsibilities: [
      "audit processes",
      "measure process failures",
      "identify bottlenecks",
      "recommend improvements",
      "report process health",
    ],
    loop: ["audit", "measure", "identify", "recommend", "report"],
    kpis: ["process failures reduced", "bottlenecks found", "improvements adopted", "audit coverage"],
    scope: "research_only",
  }),
  employeeSpec("Documentation Agent", "operations", COO, {
    mission: "Keep operational knowledge documented, current, and findable.",
    responsibilities: [
      "document processes and decisions",
      "keep docs current",
      "organize the knowledge base",
      "flag stale docs",
      "report documentation coverage",
    ],
    loop: ["capture", "document", "organize", "flag stale", "report"],
    kpis: ["docs created", "doc freshness", "findability", "stale docs reduced"],
    scope: "draft_only",
  }),

  // ----- Customer Success (5) ------------------------------------------------
  leaderSpec(CS_LEAD, "customer_success", "department_leader", EXEC_GOVERNOR, {
    mission: "Help users get value fast and stay.",
    responsibilities: [
      "own the onboarding experience",
      "delegate support and retention",
      "review activation and churn",
      "approve customer-facing changes",
      "remove success blockers",
      "report customer health",
    ],
    loop: ["welcome", "onboard", "delegate", "monitor health", "intervene", "report"],
    kpis: ["onboarding completion", "activation rate", "churn reduced", "satisfaction"],
  }),
  employeeSpec("Support Agent", "customer_success", CS_LEAD, {
    mission: "Resolve user issues quickly and kindly.",
    responsibilities: [
      "triage support requests",
      "draft responses",
      "resolve or route issues",
      "prepare replies for approval when sensitive",
      "log resolutions",
    ],
    loop: ["triage", "draft response", "resolve or route", "queue sensitive replies", "log"],
    kpis: ["response time", "resolution rate", "satisfaction", "escalation rate"],
    scope: "prepare_external_asset",
    approvals: ["sending any commitment or refund to a customer"],
  }),
  employeeSpec("Retention Agent", "customer_success", CS_LEAD, {
    mission: "Spot churn risk early and prepare interventions.",
    responsibilities: [
      "monitor churn signals",
      "score at-risk accounts",
      "prepare retention outreach",
      "queue interventions for approval",
      "track retention impact",
    ],
    loop: ["monitor signals", "score risk", "prepare outreach", "queue for approval", "track"],
    kpis: ["churn risk reduced", "at-risk accounts saved", "intervention success", "retention rate"],
    scope: "prepare_external_asset",
    approvals: ["sending any retention offer"],
  }),
  employeeSpec("Referral Agent", "customer_success", CS_LEAD, {
    mission: "Turn happy users into referrals.",
    responsibilities: [
      "identify referral candidates",
      "prepare referral asks",
      "track referral activity",
      "queue asks for approval",
      "report referral impact",
    ],
    loop: ["identify candidates", "prepare ask", "queue for approval", "track", "report"],
    kpis: ["referrals generated", "referral conversion", "ask acceptance", "advocacy rate"],
    scope: "prepare_external_asset",
    approvals: ["sending any referral ask"],
  }),
  employeeSpec("Customer Feedback Agent", "customer_success", CS_LEAD, {
    mission: "Collect and route customer feedback to the right team.",
    responsibilities: [
      "collect customer feedback",
      "categorize and route",
      "quantify sentiment",
      "surface recurring issues",
      "report feedback trends",
    ],
    loop: ["collect", "categorize", "route", "quantify", "report"],
    kpis: ["feedback collected", "routing accuracy", "issues surfaced", "sentiment tracked"],
    scope: "research_only",
  }),

  // ----- Finance (5) ---------------------------------------------------------
  leaderSpec(CFO, "finance", "department_leader", EXEC_GOVERNOR, {
    mission: "Protect cash, track revenue, control costs, and improve margins.",
    responsibilities: [
      "track income and costs",
      "delegate tracking and audits",
      "review margins and forecasts",
      "approve spending changes",
      "flag financial risk",
      "report financial health",
    ],
    loop: ["track", "delegate", "review margins", "forecast", "flag risk", "report"],
    kpis: ["gross margin protected", "cash opportunities found", "tool costs reduced", "forecast accuracy"],
  }),
  employeeSpec("Revenue Tracker", "finance", CFO, {
    mission: "Track revenue accurately, with cash collected over activity.",
    responsibilities: [
      "track collected revenue",
      "reconcile against pipeline",
      "flag revenue gaps",
      "report by business",
      "surface cash opportunities",
    ],
    loop: ["collect data", "reconcile", "flag gaps", "report", "surface opportunities"],
    kpis: ["revenue tracked", "reconciliation accuracy", "cash opportunities found", "reporting timeliness"],
    scope: "research_only",
  }),
  employeeSpec("Cost Controller", "finance", CFO, {
    mission: "Keep costs disciplined and surface waste.",
    responsibilities: [
      "track costs by category",
      "identify waste",
      "recommend cost cuts",
      "flag budget overruns",
      "report cost trends",
    ],
    loop: ["track costs", "identify waste", "recommend", "flag overruns", "report"],
    kpis: ["costs reduced", "waste identified", "budget adherence", "recommendations adopted"],
    scope: "recommend_only",
  }),
  employeeSpec("Subscription Auditor", "finance", CFO, {
    mission: "Catch wasted subscriptions and unused tools.",
    responsibilities: [
      "inventory subscriptions",
      "detect unused tools",
      "flag duplicate spend",
      "recommend cancellations",
      "report savings",
    ],
    loop: ["inventory", "detect unused", "flag duplicates", "recommend", "report"],
    kpis: ["subscriptions audited", "savings identified", "duplicate spend caught", "recommendations adopted"],
    scope: "recommend_only",
  }),
  employeeSpec("Invoice/Payment Agent", "finance", CFO, {
    mission: "Make sure invoices go out and payments come in.",
    responsibilities: [
      "prepare invoices",
      "track unpaid invoices",
      "draft payment follow-ups",
      "queue sends for approval",
      "report receivables",
    ],
    loop: ["prepare invoice", "track unpaid", "draft follow-up", "queue for approval", "report"],
    kpis: ["invoices sent", "days sales outstanding", "collection rate", "follow-up completion"],
    scope: "prepare_external_asset",
    approvals: ["sending any invoice or payment request"],
  }),

  // ----- Legal / Compliance / Risk (6) ---------------------------------------
  leaderSpec(LEGAL_LEAD, "legal", "department_leader", EXEC_GOVERNOR, {
    mission: "Prevent preventable legal, compliance, and security damage.",
    responsibilities: [
      "set risk and compliance policy",
      "delegate reviews and checks",
      "review high-risk actions",
      "approve or block risky work",
      "lead incident response",
      "report risk posture",
    ],
    loop: ["review action", "assess risk", "delegate", "approve/block", "log", "report"],
    kpis: ["high-risk actions reviewed", "incidents prevented", "compliance gaps closed", "risky sends blocked"],
    approvals: ["any legal, medical, or financial claim", "any contract"],
  }),
  employeeSpec("Legal Risk Reviewer", "legal", LEGAL_LEAD, {
    mission: "Review actions for legal risk and require fixes or approval.",
    responsibilities: [
      "review actions for legal risk",
      "require disclaimers",
      "flag risky claims",
      "recommend mitigations",
      "log reviews",
    ],
    loop: ["review", "assess risk", "require fixes", "recommend", "log"],
    kpis: ["risky actions caught", "claims corrected", "review turnaround", "issues prevented"],
    scope: "recommend_only",
    approvals: ["clearing any high-risk action"],
  }),
  employeeSpec("Privacy Agent", "legal", LEGAL_LEAD, {
    mission: "Protect personal data and enforce privacy rules.",
    responsibilities: [
      "review data handling",
      "flag privacy risks",
      "enforce data minimization",
      "recommend privacy fixes",
      "log privacy reviews",
    ],
    loop: ["review handling", "flag risk", "enforce minimization", "recommend", "log"],
    kpis: ["privacy risks caught", "data minimized", "consent coverage", "violations prevented"],
    scope: "recommend_only",
  }),
  employeeSpec("Claims Checker", "legal", LEGAL_LEAD, {
    mission: "Verify that public claims are accurate and defensible.",
    responsibilities: [
      "review claims in content",
      "verify against evidence",
      "flag unsupported claims",
      "recommend corrections",
      "log claim checks",
    ],
    loop: ["review claim", "verify evidence", "flag", "recommend correction", "log"],
    kpis: ["claims verified", "unsupported claims caught", "correction rate", "review coverage"],
    scope: "recommend_only",
  }),
  employeeSpec("Contract Checklist Agent", "legal", LEGAL_LEAD, {
    mission: "Make sure the right agreements exist before work proceeds.",
    responsibilities: [
      "track required agreements",
      "flag missing contracts",
      "maintain contract checklists",
      "recommend next legal steps",
      "log contract status",
    ],
    loop: ["check requirements", "flag missing", "maintain checklist", "recommend", "log"],
    kpis: ["missing agreements flagged", "checklist coverage", "contract gaps closed", "review timeliness"],
    scope: "research_only",
  }),
  employeeSpec("Incident Response Agent", "legal", LEGAL_LEAD, {
    mission: "Contain and document incidents quickly.",
    responsibilities: [
      "detect and triage incidents",
      "contain impact",
      "coordinate response",
      "document the timeline",
      "recommend prevention",
    ],
    loop: ["detect", "triage", "contain", "document", "recommend"],
    kpis: ["time to contain", "incidents documented", "recurrence reduced", "response completeness"],
    scope: "recommend_only",
    cadence: "per_task",
  }),

  // ----- Data / Intelligence (7) ---------------------------------------------
  leaderSpec(DATA_LEAD, "data", "department_leader", EXEC_GOVERNOR, {
    mission: "Keep data clean, connected, current, and useful.",
    responsibilities: [
      "set data standards",
      "delegate cleaning and analysis",
      "review data quality",
      "approve source-of-truth changes",
      "protect data integrity",
      "report data health",
    ],
    loop: ["ingest", "delegate", "review quality", "approve", "make searchable", "report"],
    kpis: ["data completeness", "duplicate records reduced", "conflicts resolved", "match accuracy"],
  }),
  employeeSpec("Identity Resolution Agent", "data", DATA_LEAD, {
    mission: "Resolve records to the right real-world entities.",
    responsibilities: [
      "match records to entities",
      "merge duplicates",
      "flag ambiguous matches",
      "maintain identity links",
      "report match accuracy",
    ],
    loop: ["ingest records", "match", "merge", "flag ambiguous", "report"],
    kpis: ["match accuracy", "duplicates merged", "false merges", "ambiguities flagged"],
    scope: "execute_low_risk",
  }),
  employeeSpec("Memory Curator", "data", DATA_LEAD, {
    mission: "Curate institutional memory so it stays accurate and useful.",
    responsibilities: [
      "curate stored memory",
      "archive stale memory",
      "resolve memory conflicts",
      "tag and link memory",
      "report memory health",
    ],
    loop: ["review memory", "resolve conflicts", "archive stale", "tag", "report"],
    kpis: ["memory accuracy", "stale memory archived", "conflicts resolved", "recall quality"],
    scope: "execute_low_risk",
  }),
  employeeSpec("Knowledge Manager", "data", DATA_LEAD, {
    mission: "Make knowledge findable and well-organized.",
    responsibilities: [
      "organize the knowledge base",
      "tag and categorize knowledge",
      "improve searchability",
      "flag gaps",
      "report knowledge coverage",
    ],
    loop: ["organize", "tag", "index", "flag gaps", "report"],
    kpis: ["searchable records created", "findability", "knowledge gaps closed", "coverage"],
    scope: "execute_low_risk",
  }),
  employeeSpec("CRM Cleaner", "data", DATA_LEAD, {
    mission: "Keep the CRM clean, deduplicated, and current.",
    responsibilities: [
      "detect duplicate contacts",
      "standardize records",
      "flag stale data",
      "recommend merges",
      "report CRM health",
    ],
    loop: ["scan CRM", "detect duplicates", "standardize", "recommend merge", "report"],
    kpis: ["duplicates reduced", "records standardized", "stale data archived", "CRM completeness"],
    scope: "execute_low_risk",
  }),
  employeeSpec("Analytics Analyst", "data", DATA_LEAD, {
    mission: "Turn data into decisions through clear analysis.",
    responsibilities: [
      "analyze key metrics",
      "build reports",
      "surface insights",
      "flag anomalies",
      "recommend actions",
    ],
    loop: ["gather data", "analyze", "surface insights", "flag anomalies", "recommend"],
    kpis: ["insights delivered", "anomaly detection", "report accuracy", "decisions informed"],
    scope: "research_only",
  }),
  employeeSpec("External Intelligence Agent", "data", DATA_LEAD, {
    mission: "Bring in relevant external signals and intelligence.",
    responsibilities: [
      "monitor external sources",
      "filter relevant signals",
      "verify sources",
      "summarize intelligence",
      "report external trends",
    ],
    loop: ["monitor", "filter", "verify", "summarize", "report"],
    kpis: ["signals surfaced", "source reliability", "intel freshness", "relevance"],
    scope: "research_only",
  }),

  // ----- People Operations (6) -----------------------------------------------
  leaderSpec(PEOPLE_LEAD, "people_ops", "department_leader", EXEC_GOVERNOR, {
    mission: "Design, hire, onboard, train, manage, and offboard humans and AI roles.",
    responsibilities: [
      "detect role needs",
      "delegate role design and hiring",
      "review role performance",
      "approve hiring and offboarding",
      "protect role accountability",
      "report people health",
    ],
    loop: ["detect need", "delegate", "review", "approve", "manage", "report"],
    kpis: ["roles scoped clearly", "onboarding completion", "performance score", "founder workload reduced"],
  }),
  employeeSpec("Role Designer", "people_ops", PEOPLE_LEAD, {
    mission: "Design clear, accountable roles with scoped permissions.",
    responsibilities: [
      "define role missions",
      "scope responsibilities and permissions",
      "draft role cards",
      "flag overlapping roles",
      "recommend role changes",
    ],
    loop: ["analyze need", "scope role", "draft card", "flag overlap", "recommend"],
    kpis: ["roles scoped", "permission accuracy", "overlap reduced", "role clarity"],
    scope: "draft_only",
  }),
  employeeSpec("Interview Agent", "people_ops", PEOPLE_LEAD, {
    mission: "Evaluate candidates (human or AI) against role requirements.",
    responsibilities: [
      "prepare interview plans",
      "evaluate candidates",
      "score against criteria",
      "summarize findings",
      "recommend decisions",
    ],
    loop: ["plan interview", "evaluate", "score", "summarize", "recommend"],
    kpis: ["candidates evaluated", "scoring consistency", "hire quality", "evaluation turnaround"],
    scope: "recommend_only",
  }),
  employeeSpec("Training Agent", "people_ops", PEOPLE_LEAD, {
    mission: "Get new roles productive quickly through training.",
    responsibilities: [
      "build training plans",
      "deliver training material",
      "track training completion",
      "assess readiness",
      "report training outcomes",
    ],
    loop: ["build plan", "deliver", "track", "assess", "report"],
    kpis: ["training completion", "time to productivity", "readiness score", "training quality"],
    scope: "create_internal_task",
  }),
  employeeSpec("Performance Manager", "people_ops", PEOPLE_LEAD, {
    mission: "Measure and improve role performance against KPIs.",
    responsibilities: [
      "track role KPIs",
      "identify underperformance",
      "recommend improvements",
      "flag roles needing review",
      "report performance trends",
    ],
    loop: ["track KPIs", "identify gaps", "recommend", "flag review", "report"],
    kpis: ["performance tracked", "underperformance caught", "improvement adoption", "review coverage"],
    scope: "recommend_only",
  }),
  employeeSpec("Offboarding Agent", "people_ops", PEOPLE_LEAD, {
    mission: "Retire roles cleanly with access revoked and knowledge preserved.",
    responsibilities: [
      "run offboarding checklists",
      "revoke access",
      "preserve role knowledge",
      "flag open handoffs",
      "report offboarding completion",
    ],
    loop: ["start offboarding", "revoke access", "preserve knowledge", "flag handoffs", "report"],
    kpis: ["access revocation accuracy", "knowledge preserved", "clean offboards", "handoff completion"],
    scope: "execute_with_approval",
    approvals: ["revoking any production access"],
  }),

  // ----- Fundraising / Nonprofit (9) -----------------------------------------
  leaderSpec(FUND_LEAD, "fundraising", "department_leader", EXEC_GOVERNOR, {
    mission: "Generate funding and steward donors for the nonprofit.",
    responsibilities: [
      "set fundraising strategy",
      "delegate research and writing",
      "review the funding pipeline",
      "approve external asks",
      "steward major relationships",
      "report fundraising health",
    ],
    loop: ["research funders", "delegate", "review pipeline", "approve", "steward", "report"],
    kpis: ["dollars raised", "applications submitted", "donor asks made", "follow-up completion"],
  }),
  employeeSpec("Grant Researcher", "fundraising", FUND_LEAD, {
    mission: "Find and qualify grant opportunities that fit the mission.",
    responsibilities: [
      "research grant opportunities",
      "qualify fit and eligibility",
      "track deadlines",
      "summarize requirements",
      "recommend pursuits",
    ],
    loop: ["research", "qualify", "track deadlines", "summarize", "recommend"],
    kpis: ["grants identified", "fit accuracy", "deadlines tracked", "pursuits recommended"],
    scope: "research_only",
  }),
  employeeSpec("Grant Writer", "fundraising", FUND_LEAD, {
    mission: "Write compelling, accurate grant applications.",
    responsibilities: [
      "draft grant applications",
      "tailor to funder priorities",
      "verify claims and data",
      "prepare submissions for approval",
      "track application status",
    ],
    loop: ["gather requirements", "draft", "verify", "queue for approval", "track"],
    kpis: ["applications drafted", "win rate", "draft quality", "submission timeliness"],
    scope: "draft_only",
    approvals: ["submitting any grant application"],
  }),
  employeeSpec("Major Donor Agent", "fundraising", FUND_LEAD, {
    mission: "Identify and prepare cultivation for major donors.",
    responsibilities: [
      "identify major donor prospects",
      "research giving capacity",
      "prepare cultivation plans",
      "draft asks for approval",
      "track donor engagement",
    ],
    loop: ["identify", "research capacity", "prepare plan", "queue ask for approval", "track"],
    kpis: ["major gifts secured", "prospects qualified", "ask acceptance", "cultivation progress"],
    scope: "prepare_external_asset",
    approvals: ["sending any major-donor ask"],
  }),
  employeeSpec("Sponsor Agent", "fundraising", FUND_LEAD, {
    mission: "Find and prepare corporate sponsorship opportunities.",
    responsibilities: [
      "identify sponsor prospects",
      "prepare sponsorship proposals",
      "tailor offers to sponsors",
      "queue outreach for approval",
      "track sponsorship pipeline",
    ],
    loop: ["identify", "prepare proposal", "tailor", "queue for approval", "track"],
    kpis: ["sponsorships secured", "proposals prepared", "conversion rate", "pipeline value"],
    scope: "prepare_external_asset",
    approvals: ["sending any sponsorship proposal"],
  }),
  employeeSpec("Donor Stewardship Agent", "fundraising", FUND_LEAD, {
    mission: "Keep donors thanked, informed, and retained.",
    responsibilities: [
      "prepare thank-you messages",
      "schedule stewardship touches",
      "track donor satisfaction",
      "queue communications for approval",
      "report retention",
    ],
    loop: ["identify touches", "prepare message", "queue for approval", "track", "report"],
    kpis: ["donor retention", "stewardship touches completed", "satisfaction", "thank-you timeliness"],
    scope: "prepare_external_asset",
    approvals: ["sending any donor communication"],
  }),
  employeeSpec("Impact Reporting Agent", "fundraising", FUND_LEAD, {
    mission: "Show funders the impact their money created.",
    responsibilities: [
      "gather impact data",
      "draft impact reports",
      "verify outcomes",
      "prepare reports for approval",
      "track report delivery",
    ],
    loop: ["gather data", "draft report", "verify", "queue for approval", "track"],
    kpis: ["reports delivered", "report accuracy", "funder satisfaction", "delivery timeliness"],
    scope: "draft_only",
    approvals: ["sending any impact report to a funder"],
  }),
  employeeSpec("Volunteer Manager", "fundraising", FUND_LEAD, {
    mission: "Recruit, coordinate, and retain volunteers.",
    responsibilities: [
      "identify volunteer needs",
      "coordinate volunteer assignments",
      "track volunteer hours",
      "prepare volunteer communications",
      "report volunteer engagement",
    ],
    loop: ["identify needs", "coordinate", "track hours", "communicate", "report"],
    kpis: ["volunteers active", "hours contributed", "retention", "assignment coverage"],
    scope: "create_internal_task",
  }),
  employeeSpec("Case Operations Agent", "fundraising", FUND_LEAD, {
    mission: "Keep program/case operations organized and documented.",
    responsibilities: [
      "track active cases",
      "maintain case records",
      "flag at-risk cases",
      "coordinate case follow-ups",
      "report case outcomes",
    ],
    loop: ["intake case", "maintain record", "flag risk", "coordinate follow-up", "report"],
    kpis: ["cases managed", "record completeness", "at-risk cases flagged", "outcome tracking"],
    scope: "create_internal_task",
  }),
];
