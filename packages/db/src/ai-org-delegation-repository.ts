import type {
  DelegationPacket,
  AgentReport,
  DelegationPriority,
  DelegationStatus,
  AgentReportExecutionStatus,
  AgentReportVerificationStatus,
} from "@alfy2/shared";
import type {
  DelegationPacketRepository,
  DelegationPacketListFilter,
  AgentReportRepository,
} from "@alfy2/core";
import type { Querier } from "./client.js";

// ---------------------------------------------------------------------------
// shared coercion helpers
// ---------------------------------------------------------------------------

function toIso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : v;
}

function toStrArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

// ===========================================================================
// ai_org_delegation_packets (append-only; only mutation is status)
// ===========================================================================

const PACKET_COLS =
  "id, tenant_id, assigning_employee, assigned_agent, business, project, objective, " +
  "context_stack, source_of_truth_refs, required_output, allowed_tools, prohibited_actions, " +
  "approval_required, deadline, priority, success_criteria, reporting_format, escalation_trigger, " +
  "status, created_at";

interface PacketRow {
  id: string;
  tenant_id: string;
  assigning_employee: string;
  assigned_agent: string;
  business: string;
  project: string;
  objective: string;
  context_stack: unknown;
  source_of_truth_refs: unknown;
  required_output: string;
  allowed_tools: unknown;
  prohibited_actions: unknown;
  approval_required: boolean;
  deadline: string | null;
  priority: string;
  success_criteria: unknown;
  reporting_format: string;
  escalation_trigger: string;
  status: string;
  created_at: Date | string;
}

function toPacket(row: PacketRow): DelegationPacket {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    assigning_employee: row.assigning_employee,
    assigned_agent: row.assigned_agent,
    business: row.business,
    project: row.project,
    objective: row.objective,
    context_stack: toStrArray(row.context_stack),
    source_of_truth_refs: toStrArray(row.source_of_truth_refs),
    required_output: row.required_output,
    allowed_tools: toStrArray(row.allowed_tools),
    prohibited_actions: toStrArray(row.prohibited_actions),
    approval_required: row.approval_required,
    deadline: row.deadline,
    priority: row.priority as DelegationPriority,
    success_criteria: toStrArray(row.success_criteria),
    reporting_format: row.reporting_format,
    escalation_trigger: row.escalation_trigger,
    status: row.status as DelegationStatus,
    created_at: toIso(row.created_at),
  };
}

/**
 * Postgres-backed {@link DelegationPacketRepository} over `ai_org_delegation_packets`. Scalar fields
 * map to columns; the array-ish fields (context_stack, source_of_truth_refs, allowed_tools,
 * prohibited_actions, success_criteria) are stored as `jsonb` (stringified on write, rehydrated on
 * read). Construct per unit of work from a tenant-scoped {@link Querier}; RLS isolates by tenant via
 * the connection's `app.tenant_id` GUC (the explicit predicates are defense-in-depth).
 */
export class PgDelegationPacketRepository implements DelegationPacketRepository {
  constructor(private readonly q: Querier) {}

  async save(packet: DelegationPacket): Promise<void> {
    await this.q.query(
      `insert into ai_org_delegation_packets
         (id, tenant_id, assigning_employee, assigned_agent, business, project, objective,
          context_stack, source_of_truth_refs, required_output, allowed_tools, prohibited_actions,
          approval_required, deadline, priority, success_criteria, reporting_format,
          escalation_trigger, status, created_at)
       values
         ($1, $2, $3, $4, $5, $6, $7,
          $8::jsonb, $9::jsonb, $10, $11::jsonb, $12::jsonb,
          $13, $14, $15, $16::jsonb, $17,
          $18, $19, $20)
       on conflict (id) do update set
         assigning_employee = excluded.assigning_employee, assigned_agent = excluded.assigned_agent,
         business = excluded.business, project = excluded.project, objective = excluded.objective,
         context_stack = excluded.context_stack, source_of_truth_refs = excluded.source_of_truth_refs,
         required_output = excluded.required_output, allowed_tools = excluded.allowed_tools,
         prohibited_actions = excluded.prohibited_actions, approval_required = excluded.approval_required,
         deadline = excluded.deadline, priority = excluded.priority,
         success_criteria = excluded.success_criteria, reporting_format = excluded.reporting_format,
         escalation_trigger = excluded.escalation_trigger, status = excluded.status`,
      [
        packet.id,
        packet.tenant_id,
        packet.assigning_employee,
        packet.assigned_agent,
        packet.business,
        packet.project,
        packet.objective,
        JSON.stringify(packet.context_stack),
        JSON.stringify(packet.source_of_truth_refs),
        packet.required_output,
        JSON.stringify(packet.allowed_tools),
        JSON.stringify(packet.prohibited_actions),
        packet.approval_required,
        packet.deadline,
        packet.priority,
        JSON.stringify(packet.success_criteria),
        packet.reporting_format,
        packet.escalation_trigger,
        packet.status,
        packet.created_at,
      ],
    );
  }

  async get(tenantId: string, id: string): Promise<DelegationPacket | null> {
    const res = await this.q.query(
      `select ${PACKET_COLS} from ai_org_delegation_packets where id = $1 and tenant_id = $2`,
      [id, tenantId],
    );
    const row = (res.rows as PacketRow[])[0];
    return row ? toPacket(row) : null;
  }

  async list(
    tenantId: string,
    filter: DelegationPacketListFilter = {},
  ): Promise<DelegationPacket[]> {
    const statuses = filter.statuses ?? [];
    const limit = filter.limit ?? 100;
    const res = await this.q.query(
      `select ${PACKET_COLS} from ai_org_delegation_packets
        where tenant_id = $1
          and (cardinality($2::text[]) = 0 or status = any($2::text[]))
        order by created_at desc
        limit $3`,
      [tenantId, statuses, limit],
    );
    return (res.rows as PacketRow[]).map(toPacket);
  }

  async setStatus(tenantId: string, id: string, status: string): Promise<void> {
    await this.q.query(
      `update ai_org_delegation_packets set status = $3 where id = $1 and tenant_id = $2`,
      [id, tenantId, status],
    );
  }
}

// ===========================================================================
// ai_org_agent_reports (append-only; only mutation is the review fields)
// ===========================================================================

const REPORT_COLS =
  "id, tenant_id, packet_id, agent, task_completed, output_produced, sources_used, assumptions, " +
  "issues, confidence, risks, approval_needed, recommended_next_step, execution_status, " +
  "verification_status, created_at";

interface ReportRow {
  id: string;
  tenant_id: string;
  packet_id: string;
  agent: string;
  task_completed: boolean;
  output_produced: string;
  sources_used: unknown;
  assumptions: unknown;
  issues: unknown;
  confidence: number | string;
  risks: unknown;
  approval_needed: boolean;
  recommended_next_step: string;
  execution_status: string;
  verification_status: string;
  created_at: Date | string;
}

function toReport(row: ReportRow): AgentReport {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    packet_id: row.packet_id,
    agent: row.agent,
    task_completed: row.task_completed,
    output_produced: row.output_produced,
    sources_used: toStrArray(row.sources_used),
    assumptions: toStrArray(row.assumptions),
    issues: toStrArray(row.issues),
    confidence: typeof row.confidence === "string" ? Number(row.confidence) : row.confidence,
    risks: toStrArray(row.risks),
    approval_needed: row.approval_needed,
    recommended_next_step: row.recommended_next_step,
    execution_status: row.execution_status as AgentReportExecutionStatus,
    verification_status: row.verification_status as AgentReportVerificationStatus,
    created_at: toIso(row.created_at),
  };
}

/**
 * Postgres-backed {@link AgentReportRepository} over `ai_org_agent_reports`. Scalar fields map to
 * columns; the array-ish fields (sources_used, assumptions, issues, risks) are stored as `jsonb`
 * (stringified on write, rehydrated on read). Construct per unit of work from a tenant-scoped
 * {@link Querier}; RLS isolates by tenant via the connection's `app.tenant_id` GUC.
 */
export class PgAgentReportRepository implements AgentReportRepository {
  constructor(private readonly q: Querier) {}

  async save(report: AgentReport): Promise<void> {
    await this.q.query(
      `insert into ai_org_agent_reports
         (id, tenant_id, packet_id, agent, task_completed, output_produced, sources_used,
          assumptions, issues, confidence, risks, approval_needed, recommended_next_step,
          execution_status, verification_status, created_at)
       values
         ($1, $2, $3, $4, $5, $6, $7::jsonb,
          $8::jsonb, $9::jsonb, $10, $11::jsonb, $12, $13,
          $14, $15, $16)
       on conflict (id) do update set
         packet_id = excluded.packet_id, agent = excluded.agent,
         task_completed = excluded.task_completed, output_produced = excluded.output_produced,
         sources_used = excluded.sources_used, assumptions = excluded.assumptions,
         issues = excluded.issues, confidence = excluded.confidence, risks = excluded.risks,
         approval_needed = excluded.approval_needed,
         recommended_next_step = excluded.recommended_next_step,
         execution_status = excluded.execution_status,
         verification_status = excluded.verification_status`,
      [
        report.id,
        report.tenant_id,
        report.packet_id,
        report.agent,
        report.task_completed,
        report.output_produced,
        JSON.stringify(report.sources_used),
        JSON.stringify(report.assumptions),
        JSON.stringify(report.issues),
        report.confidence,
        JSON.stringify(report.risks),
        report.approval_needed,
        report.recommended_next_step,
        report.execution_status,
        report.verification_status,
        report.created_at,
      ],
    );
  }

  async get(tenantId: string, id: string): Promise<AgentReport | null> {
    const res = await this.q.query(
      `select ${REPORT_COLS} from ai_org_agent_reports where id = $1 and tenant_id = $2`,
      [id, tenantId],
    );
    const row = (res.rows as ReportRow[])[0];
    return row ? toReport(row) : null;
  }

  async listForPacket(tenantId: string, packetId: string): Promise<AgentReport[]> {
    const res = await this.q.query(
      `select ${REPORT_COLS} from ai_org_agent_reports
        where tenant_id = $1 and packet_id = $2
        order by created_at desc`,
      [tenantId, packetId],
    );
    return (res.rows as ReportRow[]).map(toReport);
  }

  async setReview(
    tenantId: string,
    id: string,
    execution_status: string,
    verification_status: string,
  ): Promise<void> {
    await this.q.query(
      `update ai_org_agent_reports
         set execution_status = $3, verification_status = $4
       where id = $1 and tenant_id = $2`,
      [id, tenantId, execution_status, verification_status],
    );
  }
}
