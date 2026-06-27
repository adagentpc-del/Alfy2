import type { DelegationPacket, AgentReport } from "@alfy2/shared";

/**
 * Persistence PORTS for the AI-Org runtime (the chain of command's operational core). Core defines the
 * interfaces only; the concrete store (Supabase, tables `ai_org_delegation_packets` /
 * `ai_org_agent_reports`) is injected so the {@link DelegationRuntime} stays infrastructure-free. An
 * in-memory reference implementation ships for tests and local runs.
 *
 * Both tables are append-only in spirit; the only mutations are status transitions (packets) and the
 * review fields (reports), exposed as narrow {@link DelegationPacketRepository.setStatus} /
 * {@link AgentReportRepository.setReview} methods rather than free-form updates.
 */

export interface DelegationPacketListFilter {
  /** Restrict to these statuses (empty/omitted = any). Matches {@link DelegationPacket.status} values. */
  statuses?: string[];
  /** Max rows, newest first. Default 100. */
  limit?: number;
}

export interface DelegationPacketRepository {
  /** Insert or replace a packet by id (within its tenant). */
  save(packet: DelegationPacket): Promise<void>;
  get(tenantId: string, id: string): Promise<DelegationPacket | null>;
  /** Tenant-scoped list, newest first, optionally filtered by status. */
  list(tenantId: string, filter?: DelegationPacketListFilter): Promise<DelegationPacket[]>;
  /** Transition a packet's lifecycle status (e.g. issued -> accepted). */
  setStatus(tenantId: string, id: string, status: string): Promise<void>;
}

export interface AgentReportRepository {
  /** Insert or replace a report by id (within its tenant). */
  save(report: AgentReport): Promise<void>;
  get(tenantId: string, id: string): Promise<AgentReport | null>;
  /** Tenant-scoped list of the reports for one packet, newest first. */
  listForPacket(tenantId: string, packetId: string): Promise<AgentReport[]>;
  /** Set a report's review fields (execution + verification status) on report-back review. */
  setReview(
    tenantId: string,
    id: string,
    execution_status: string,
    verification_status: string,
  ): Promise<void>;
}
