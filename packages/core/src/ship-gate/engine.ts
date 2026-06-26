import {
  EvaluateShipInputSchema,
  ShipGateEvaluationSchema,
  type EvaluateShipInput,
  type ShipGateEvaluation,
  type ShipCheck,
  type ShipCheckKind,
  type ShipVerdict,
} from "@alfy2/shared";

const ALL_CHECKS: ShipCheckKind[] = [
  "requirement", "security", "permission", "database", "test", "documentation", "rollback", "approval",
];

/**
 * Ship Gate (docs/adr/ADR-0138-ship-gate.md). Nothing ships until all eight checks pass: requirement,
 * security, permission, database, test, documentation, rollback, approval. The approval check cannot pass
 * unless Alyssa explicitly approved (alyssa_approved), regardless of what was supplied. Verdict is
 * ready_to_ship only when every check passes; do_not_ship when a hard check (security/permission/approval)
 * is blocking; needs_review otherwise. Deterministic. Tenant-scoped. Append-only in-memory store.
 */
export class ShipGate {
  private readonly evaluations = new Map<string, ShipGateEvaluation>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  evaluate(tenantId: string, input: EvaluateShipInput): ShipGateEvaluation {
    const i = EvaluateShipInputSchema.parse(input);

    // Normalize checks by kind; the approval check is forced false unless Alyssa approved.
    const byKind = new Map<ShipCheckKind, ShipCheck>();
    for (const c of i.checks) byKind.set(c.kind, c);
    const checks: ShipCheck[] = ALL_CHECKS.map((kind) => {
      if (kind === "approval") {
        return { kind, passed: i.alyssa_approved, detail: i.alyssa_approved ? "Alyssa approved." : "Awaiting Alyssa's approval." };
      }
      return byKind.get(kind) ?? { kind, passed: false, detail: "Not checked." };
    });

    const blocking = checks.filter((c) => !c.passed).map((c) => c.kind);
    const hardBlocked = blocking.some((k) => k === "security" || k === "permission" || k === "approval");

    const verdict: ShipVerdict =
      blocking.length === 0 ? "ready_to_ship" : hardBlocked ? "do_not_ship" : "needs_review";

    const evaluation = ShipGateEvaluationSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      build_packet_id: i.build_packet_id,
      checks,
      verdict,
      blocking,
      created_at: this.clock().toISOString(),
    });
    this.evaluations.set(evaluation.id, evaluation);
    return evaluation;
  }

  get(tenantId: string, id: string): ShipGateEvaluation | undefined {
    const e = this.evaluations.get(id);
    return e && e.tenant_id === tenantId ? e : undefined;
  }

  list(tenantId: string): ShipGateEvaluation[] {
    return [...this.evaluations.values()].filter((e) => e.tenant_id === tenantId);
  }
}
