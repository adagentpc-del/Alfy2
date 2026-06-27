import type { DelegationPacket, AgentReport } from "@alfy2/shared";
import type {
  DelegationPacketRepository,
  DelegationPacketListFilter,
  AgentReportRepository,
} from "./repository.js";

/**
 * Reference {@link DelegationPacketRepository} backed by an in-process Map. For tests and local runs
 * only — the production store is the Supabase-backed `ai_org_delegation_packets` table. Tenant
 * isolation here is by filtering on tenant_id (the database does it via RLS).
 */
export class InMemoryDelegationPacketRepository implements DelegationPacketRepository {
  private readonly packets = new Map<string, DelegationPacket>();

  async save(packet: DelegationPacket): Promise<void> {
    this.packets.set(packet.id, structuredClone(packet));
  }

  async get(tenantId: string, id: string): Promise<DelegationPacket | null> {
    const p = this.packets.get(id);
    return p && p.tenant_id === tenantId ? structuredClone(p) : null;
  }

  async list(
    tenantId: string,
    filter: DelegationPacketListFilter = {},
  ): Promise<DelegationPacket[]> {
    const statuses =
      filter.statuses && filter.statuses.length > 0 ? new Set(filter.statuses) : null;
    let out = [...this.packets.values()].filter((p) => p.tenant_id === tenantId);
    if (statuses) out = out.filter((p) => statuses.has(p.status));
    out.sort((a, b) => b.created_at.localeCompare(a.created_at)); // newest first
    if (filter.limit !== undefined) out = out.slice(0, filter.limit);
    return out.map((p) => structuredClone(p));
  }

  async setStatus(tenantId: string, id: string, status: string): Promise<void> {
    const p = this.packets.get(id);
    if (p && p.tenant_id === tenantId) p.status = status as DelegationPacket["status"];
  }
}

/**
 * Reference {@link AgentReportRepository} backed by an in-process Map. For tests and local runs only —
 * the production store is the Supabase-backed `ai_org_agent_reports` table. Tenant isolation here is by
 * filtering on tenant_id (the database does it via RLS).
 */
export class InMemoryAgentReportRepository implements AgentReportRepository {
  private readonly reports = new Map<string, AgentReport>();

  async save(report: AgentReport): Promise<void> {
    this.reports.set(report.id, structuredClone(report));
  }

  async get(tenantId: string, id: string): Promise<AgentReport | null> {
    const r = this.reports.get(id);
    return r && r.tenant_id === tenantId ? structuredClone(r) : null;
  }

  async listForPacket(tenantId: string, packetId: string): Promise<AgentReport[]> {
    return [...this.reports.values()]
      .filter((r) => r.tenant_id === tenantId && r.packet_id === packetId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)) // newest first
      .map((r) => structuredClone(r));
  }

  async setReview(
    tenantId: string,
    id: string,
    execution_status: string,
    verification_status: string,
  ): Promise<void> {
    const r = this.reports.get(id);
    if (r && r.tenant_id === tenantId) {
      r.execution_status = execution_status as AgentReport["execution_status"];
      r.verification_status = verification_status as AgentReport["verification_status"];
    }
  }
}
