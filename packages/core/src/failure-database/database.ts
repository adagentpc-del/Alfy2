import {
  CaptureFailureInputSchema,
  FailureCaseSchema,
  type CaptureFailureInput,
  type FailureCase,
  type FailureKind,
} from "@alfy2/shared";

/**
 * The Failure Database (docs/adr/ADR-0068-failure-trends.md). Permanent institutional knowledge of major
 * failures — fraud, lawsuits, AI failures, security breaches, failed startups, scams, regulatory actions,
 * bankruptcies, ethical failures. For each it records what happened, the timeline, why it failed, the
 * root cause, the warning signs, the lessons learned, and — generated deterministically — how Alfy²
 * avoids repeating it. Append-only. Deterministic. Tenant-scoped.
 */

export class FailureDatabase {
  private readonly cases: FailureCase[] = [];
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Capture a failure as permanent institutional knowledge (append-only). */
  capture(tenantId: string, input: CaptureFailureInput): FailureCase {
    const i = CaptureFailureInputSchema.parse(input);
    const how_alfy2_avoids_it = [
      ...i.warning_signs.map((sign) => `Watch for: ${sign}`),
      ...i.lessons_learned.map((lesson) => `Apply lesson: ${lesson}`),
    ];
    const failureCase = FailureCaseSchema.parse({
      ...i,
      id: this.newId(),
      tenant_id: tenantId,
      how_alfy2_avoids_it,
      created_at: this.clock().toISOString(),
    });
    this.cases.push(failureCase);
    return failureCase;
  }

  list(tenantId: string): FailureCase[] {
    return this.cases.filter((c) => c.tenant_id === tenantId);
  }

  /** All failures of a given kind. */
  byKind(tenantId: string, kind: FailureKind): FailureCase[] {
    return this.list(tenantId).filter((c) => c.kind === kind);
  }

  /** Search title / what_happened / root_cause for a term (case-insensitive). */
  search(tenantId: string, term: string): FailureCase[] {
    const q = term.toLowerCase().trim();
    if (q.length === 0) return [];
    return this.list(tenantId).filter((c) =>
      c.title.toLowerCase().includes(q) ||
      c.what_happened.toLowerCase().includes(q) ||
      c.root_cause.toLowerCase().includes(q),
    );
  }
}
