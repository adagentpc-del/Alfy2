import {
  RelaxPlanInputSchema,
  RelaxationPlanSchema,
  type RelaxPlanInput,
  type RelaxItemInput,
  type RelaxationPlan,
  type RelaxBucket,
} from "@alfy2/shared";

/**
 * The Relaxation Outcome Engine (docs/adr/ADR-0107-outcome-engines.md). Alfy² optimizes for peace of mind,
 * not busyness: it sorts everything on Alyssa's plate into must_do / can_delegate / can_automate /
 * can_ignore / can_wait / approval_only so she can hand the rest off and relax. `plan()` buckets each item,
 * surfaces only what genuinely needs her, and reports the offload ratio. Deterministic. Tenant-scoped.
 */

export class RelaxationOutcomeEngine {
  private readonly plans = new Map<string, RelaxationPlan>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /**
   * Bucket every item so Alyssa can offload and relax. Resolution order: approval_only (just needs a
   * yes/no) → must_do (only she can do it AND it matters) → can_delegate → can_automate → can_ignore
   * (low value) → can_wait (everything else). Persists the plan.
   */
  plan(tenantId: string, input: RelaxPlanInput): RelaxationPlan {
    const i = RelaxPlanInputSchema.parse(input);
    const items = i.items.map((item) => ({ title: item.title, bucket: bucketFor(item) }));
    const mustDo = items.filter((it) => it.bucket === "must_do").map((it) => it.title);
    const offloadable = items.filter((it) => it.bucket !== "must_do" && it.bucket !== "approval_only").length;
    const offloadRatio = items.length > 0 ? clamp01(round(offloadable / items.length)) : 0;

    const p = RelaxationPlanSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      items,
      must_do: mustDo,
      offload_ratio: offloadRatio,
      created_at: this.clock().toISOString(),
    });
    this.plans.set(p.id, p);
    return p;
  }

  get(tenantId: string, id: string): RelaxationPlan | undefined {
    const p = this.plans.get(id);
    return p && p.tenant_id === tenantId ? p : undefined;
  }

  list(tenantId: string): RelaxationPlan[] {
    return [...this.plans.values()].filter((p) => p.tenant_id === tenantId);
  }
}

const bucketFor = (item: RelaxItemInput): RelaxBucket => {
  if (item.approval_only) return "approval_only";
  if (item.requires_alyssa >= 0.7 && item.value >= 0.5) return "must_do";
  if (item.delegatable) return "can_delegate";
  if (item.automatable) return "can_automate";
  if (item.value < 0.2) return "can_ignore";
  return "can_wait";
};

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const round = (n: number): number => Math.round(n * 1000) / 1000;
