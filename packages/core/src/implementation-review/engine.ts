import {
  ReviewImplementationInputSchema,
  ImplementationReviewSchema,
  type ReviewImplementationInput,
  type ImplementationReview,
  type ReviewCheck,
  type ImplementationVerdict,
} from "@alfy2/shared";

/** Dimensions whose failure is a hard blocker (cannot approve). */
const BLOCKING_DIMENSIONS = new Set<ReviewCheck["dimension"]>([
  "no_security_issues",
  "preserved_permissions",
  "no_regressions",
  "satisfied_requirements",
]);

/**
 * Implementation Review Agent (docs/adr/ADR-0137-implementation-review.md). After a coding agent finishes,
 * grades the work across eight dimensions and returns a verdict: approve only when nothing failed;
 * needs_revision when only soft dimensions failed (docs/tests/files/architecture); reject when a blocking
 * dimension failed (security, permissions, regressions, requirements). Risks and fixes are derived from the
 * failed checks. Deterministic. Tenant-scoped. Append-only in-memory store.
 */
export class ImplementationReviewAgent {
  private readonly reviews = new Map<string, ImplementationReview>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  review(tenantId: string, input: ReviewImplementationInput): ImplementationReview {
    const i = ReviewImplementationInputSchema.parse(input);
    const failed = i.checks.filter((c) => !c.passed);
    const blockingFailed = failed.some((c) => BLOCKING_DIMENSIONS.has(c.dimension));

    const verdict: ImplementationVerdict =
      failed.length === 0 ? "approve" : blockingFailed ? "reject" : "needs_revision";

    const review = ImplementationReviewSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      build_packet_id: i.build_packet_id,
      handoff_id: i.handoff_id,
      checks: i.checks,
      verdict,
      risks_found: failed
        .filter((c) => BLOCKING_DIMENSIONS.has(c.dimension))
        .map((c) => `${c.dimension}: ${c.note || "failed"}`),
      recommended_fixes: failed.map((c) => `Fix ${c.dimension}${c.note ? ` — ${c.note}` : ""}.`),
      created_at: this.clock().toISOString(),
    });
    this.reviews.set(review.id, review);
    return review;
  }

  get(tenantId: string, id: string): ImplementationReview | undefined {
    const r = this.reviews.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  list(tenantId: string): ImplementationReview[] {
    return [...this.reviews.values()].filter((r) => r.tenant_id === tenantId);
  }
}
