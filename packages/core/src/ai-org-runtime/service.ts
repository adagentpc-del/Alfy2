import {
  DelegationPacketSchema,
  AgentReportSchema,
  type DelegationPacket,
  type AgentReport,
  type DelegationPriority,
  type AgentReportExecutionStatus,
  type AgentReportVerificationStatus,
} from "@alfy2/shared";
import type {
  DelegationPacketRepository,
  DelegationPacketListFilter,
  AgentReportRepository,
} from "./repository.js";

/**
 * AI-Org runtime persistence service — the chain of command's operational core, made durable.
 *
 * This mirrors (but does NOT modify or re-export) the rules of the in-memory `AiOrgEngine`, persisting
 * delegation packets + agent reports through injected repository PORTS. The two NON-NEGOTIABLE rules:
 *
 *   1. No work without an accepted delegation packet — {@link submitReport} THROWS if the referenced
 *      packet does not exist or has not been accepted.
 *   2. A report-back is a reviewable artifact — {@link reviewReport} sets its execution + verification
 *      status.
 *
 * Deterministic when constructed with a fixed clock + idFactory. Stays infrastructure-free: it only
 * knows the repository ports (Supabase / in-memory adapters are injected).
 */

/** The lifecycle status a freshly issued packet starts in (matches the contract default). */
const STATUS_ISSUED = "issued";
/** The status an accepted packet transitions to (the gate {@link submitReport} requires). */
const STATUS_ACCEPTED = "accepted";

export interface DelegationRuntimeRepos {
  packets: DelegationPacketRepository;
  reports: AgentReportRepository;
}

export interface DelegationRuntimeOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

/** Input for {@link DelegationRuntime.issuePacket}; mirrors the engine's IssueDelegationPacketInput. */
export interface IssuePacketInput {
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

/** Input for {@link DelegationRuntime.submitReport}. */
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

/** Review decision for {@link DelegationRuntime.reviewReport}. */
export interface ReviewReportInput {
  execution_status: AgentReportExecutionStatus;
  verification_status: AgentReportVerificationStatus;
}

export class DelegationRuntime {
  private readonly packets: DelegationPacketRepository;
  private readonly reports: AgentReportRepository;
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(repos: DelegationRuntimeRepos, options: DelegationRuntimeOptions = {}) {
    this.packets = repos.packets;
    this.reports = repos.reports;
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  // --- Delegation packets --------------------------------------------------

  /** Issue a delegation packet (status 'issued'). An agent cannot begin work without one. */
  async issuePacket(tenantId: string, input: IssuePacketInput): Promise<DelegationPacket> {
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
      status: STATUS_ISSUED,
      created_at: this.clock().toISOString(),
    });
    await this.packets.save(packet);
    return packet;
  }

  /** The assigned agent accepts the packet (status 'issued' → 'accepted'). Throws if not found. */
  async acceptPacket(tenantId: string, id: string): Promise<DelegationPacket> {
    const packet = await this.packets.get(tenantId, id);
    if (!packet) {
      throw new Error(`AiOrgRuntime: delegation packet "${id}" not found`);
    }
    await this.packets.setStatus(tenantId, id, STATUS_ACCEPTED);
    return DelegationPacketSchema.parse({ ...packet, status: STATUS_ACCEPTED });
  }

  async getPacket(tenantId: string, id: string): Promise<DelegationPacket | null> {
    return this.packets.get(tenantId, id);
  }

  async listPackets(
    tenantId: string,
    filter?: DelegationPacketListFilter,
  ): Promise<DelegationPacket[]> {
    return this.packets.list(tenantId, filter);
  }

  // --- Agent reports -------------------------------------------------------

  /**
   * Submit the report-back for a packet. ENFORCES "no work without an accepted delegation packet":
   * THROWS if the referenced packet does not exist, or exists but has not been accepted. Otherwise
   * persists the report.
   */
  async submitReport(tenantId: string, input: SubmitReportInput): Promise<AgentReport> {
    const packet = await this.packets.get(tenantId, input.packet_id);
    if (!packet) {
      throw new Error(
        `AiOrgRuntime: cannot submit report — no delegation packet "${input.packet_id}". ` +
          "No work without a delegation packet.",
      );
    }
    if (packet.status !== STATUS_ACCEPTED) {
      throw new Error(
        `AiOrgRuntime: cannot submit report — packet "${input.packet_id}" is '${packet.status}', ` +
          "not 'accepted'. No work without an accepted delegation packet.",
      );
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
    await this.reports.save(report);
    return report;
  }

  /** Review a report-back: set its execution + verification status. Throws if the report is missing. */
  async reviewReport(
    tenantId: string,
    id: string,
    decision: ReviewReportInput,
  ): Promise<AgentReport> {
    const report = await this.reports.get(tenantId, id);
    if (!report) {
      throw new Error(`AiOrgRuntime: report "${id}" not found`);
    }
    await this.reports.setReview(
      tenantId,
      id,
      decision.execution_status,
      decision.verification_status,
    );
    return AgentReportSchema.parse({
      ...report,
      execution_status: decision.execution_status,
      verification_status: decision.verification_status,
    });
  }

  async getReport(tenantId: string, id: string): Promise<AgentReport | null> {
    return this.reports.get(tenantId, id);
  }

  async listReports(tenantId: string, packetId: string): Promise<AgentReport[]> {
    return this.reports.listForPacket(tenantId, packetId);
  }
}
