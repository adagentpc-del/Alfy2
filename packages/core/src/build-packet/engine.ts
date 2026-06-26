import {
  GenerateBuildPacketInputSchema,
  BuildPacketSchema,
  BuildTriageSchema,
  type GenerateBuildPacketInput,
  type BuildPacket,
} from "@alfy2/shared";

/**
 * Build Packet Generator (docs/adr/ADR-0135-build-packet.md). Turns an approved idea or spoken transcript
 * into a structured Build Packet a coding agent can implement. generate() produces a DRAFT packet seeded
 * from the source (status draft, awaiting_approval true) — it never fabricates architecture it was not given;
 * unfilled artifacts stay empty for the architect to complete. approve() gates the packet for handoff;
 * markSent() records that it went to a coding agent. Deterministic. Tenant-scoped. Mutable in-memory store.
 */
export class BuildPacketGenerator {
  private readonly packets = new Map<string, BuildPacket>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Seed a draft Build Packet from a raw idea / transcript. Awaiting approval; nothing is built yet. */
  generate(tenantId: string, input: GenerateBuildPacketInput): BuildPacket {
    const i = GenerateBuildPacketInputSchema.parse(input);
    const now = this.clock().toISOString();
    const packet = BuildPacketSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      working_name: i.working_name,
      status: "draft",
      executive_summary: i.source.trim(),
      // The whole source begins as something to clarify until the architect distills it.
      triage: BuildTriageSchema.parse({ needs_clarification: [i.source.trim()] }),
      awaiting_approval: true,
      created_at: now,
      updated_at: now,
    });
    this.packets.set(packet.id, packet);
    return packet;
  }

  /** Approve a packet for handoff. Only an approved packet may be handed to a coding agent. */
  approve(tenantId: string, id: string): BuildPacket {
    const p = this.require(tenantId, id);
    const updated = BuildPacketSchema.parse({
      ...p,
      status: "approved",
      awaiting_approval: false,
      updated_at: this.clock().toISOString(),
    });
    this.packets.set(id, updated);
    return updated;
  }

  /** Record that an approved packet was sent to a coding agent. */
  markSent(tenantId: string, id: string): BuildPacket {
    const p = this.require(tenantId, id);
    if (p.status !== "approved") {
      throw new Error(`Build packet ${id} must be approved before it is sent (status: ${p.status}).`);
    }
    const updated = BuildPacketSchema.parse({ ...p, status: "sent", updated_at: this.clock().toISOString() });
    this.packets.set(id, updated);
    return updated;
  }

  get(tenantId: string, id: string): BuildPacket | undefined {
    const p = this.packets.get(id);
    return p && p.tenant_id === tenantId ? p : undefined;
  }

  list(tenantId: string): BuildPacket[] {
    return [...this.packets.values()].filter((p) => p.tenant_id === tenantId);
  }

  private require(tenantId: string, id: string): BuildPacket {
    const p = this.get(tenantId, id);
    if (!p) throw new Error(`Build packet ${id} not found for tenant ${tenantId}.`);
    return p;
  }
}
