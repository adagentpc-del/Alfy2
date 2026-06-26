import {
  GenerateHandoffInputSchema,
  CodeHandoffSchema,
  type GenerateHandoffInput,
  type CodeHandoff,
} from "@alfy2/shared";

/** Thrown when a handoff is attempted for a packet that is not approved. */
export class HandoffApprovalError extends Error {
  constructor(packetId: string) {
    super(`Code handoff refused: build packet ${packetId} is not approved. Alyssa approves before handoff.`);
    this.name = "HandoffApprovalError";
  }
}

/**
 * Code Execution Handoff (docs/adr/ADR-0136-code-handoff.md). For an APPROVED Build Packet, produces the plan
 * a coding agent needs (branch, file plan, prompt, acceptance, tests, rollback, security, migration, Supabase
 * config, deployment checklist). Refuses if the packet is not approved. production_requires_approval is fixed
 * true — Claude Code may build, Alfy² reviews, Alyssa approves; no merge/deploy to production without it.
 * Deterministic. Tenant-scoped. Append-only in-memory store.
 */
export class CodeExecutionHandoff {
  private readonly handoffs = new Map<string, CodeHandoff>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Generate the handoff plan for an approved packet. Throws HandoffApprovalError if not approved. */
  generate(tenantId: string, input: GenerateHandoffInput): CodeHandoff {
    const i = GenerateHandoffInputSchema.parse(input);
    if (!i.packet_approved) throw new HandoffApprovalError(i.build_packet_id);

    const handoff = CodeHandoffSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      build_packet_id: i.build_packet_id,
      branch_plan: `feature/${i.build_packet_id.slice(0, 8)}`,
      implementation_prompt:
        `Implement build packet ${i.build_packet_id} exactly as specified. Build only; do not merge, deploy, ` +
        `or connect to production. Open a PR for Alfy² review.`,
      rollback_plan: "Revert the PR commit and roll back the migration to the prior numbered migration.",
      security_checks: [
        "no secrets committed",
        "RLS enforced on every new table",
        "inputs validated at the boundary",
        "irreversible actions approval-gated",
      ],
      production_requires_approval: true,
      created_at: this.clock().toISOString(),
    });
    this.handoffs.set(handoff.id, handoff);
    return handoff;
  }

  get(tenantId: string, id: string): CodeHandoff | undefined {
    const h = this.handoffs.get(id);
    return h && h.tenant_id === tenantId ? h : undefined;
  }

  list(tenantId: string): CodeHandoff[] {
    return [...this.handoffs.values()].filter((h) => h.tenant_id === tenantId);
  }
}
