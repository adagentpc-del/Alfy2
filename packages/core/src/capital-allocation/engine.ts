import {
  CapitalAllocationSchema,
  CapitalRunwaySchema,
  CapitalAccountSchema,
  DEFAULT_CAPITAL_POLICY,
  type CapitalAccount,
  type CapitalAllocation,
  type CapitalRunway,
  type CapitalBucket,
  type CapitalMode,
} from "@alfy2/shared";
import type {
  CapitalAccountRepository,
  CapitalAllocationRepository,
  CapitalRunwayRepository,
} from "./repository.js";

// Re-export the policy so core consumers have a single source (canonical: the shared contract).
export { DEFAULT_CAPITAL_POLICY } from "@alfy2/shared";

/** The nine Profit-First buckets, in canonical order. */
const BUCKETS: readonly CapitalBucket[] = [
  "operating",
  "taxes",
  "owner_pay",
  "reserve",
  "growth",
  "tools",
  "contractors",
  "legal",
  "investment",
];

export interface AllocateInput {
  business_id: string;
  inflow_usd: number;
  /** Optional policy override (bucket → fraction). Defaults to DEFAULT_CAPITAL_POLICY. */
  policy?: Record<CapitalBucket, number>;
  /** Optional mode override. Defaults to "profit_first". */
  mode?: CapitalMode;
}

export interface ComputeRunwayInput {
  business_id: string;
  cash_usd: number;
  monthly_burn_usd: number;
  min_reserve_usd: number;
  /** Optional as_of override (ISO). Defaults to the clock. */
  as_of?: string;
}

export interface CapitalAllocationEngineOptions {
  /** Injectable clock (defaults to wall-clock). Used for created_at / as_of. */
  clock?: () => Date;
  /** Injectable id factory (defaults to crypto.randomUUID). */
  idFactory?: () => string;
}

interface CapitalRepos {
  accounts: CapitalAccountRepository;
  allocations: CapitalAllocationRepository;
  runway: CapitalRunwayRepository;
}

/** Round to 2 decimals, avoiding binary-float drift. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Capital Allocation Engine (§34). Splits an inflow across the nine Profit-First buckets by policy and
 * derives a business's operating mode from its runway. No I/O beyond the injected repositories; the
 * clock and id factory are injectable so runs are reproducible.
 *
 * HARD RULE (Constitution / Part I §13): Alfie NEVER moves money. {@link allocate} only ever produces a
 * RECOMMENDATION — every allocation is persisted with `recommended=true` and `approved=false`. The
 * engine never executes a transfer; the founder approves and moves the money.
 */
export class CapitalAllocationEngine {
  private readonly clock: () => Date;
  private readonly idFactory: () => string;

  constructor(
    private readonly repos: CapitalRepos,
    options: CapitalAllocationEngineOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
  }

  /**
   * Recommend a split of `inflow_usd` across the nine buckets by policy. Each bucket amount is
   * round(inflow * pct, 2); any rounding remainder is added to `operating` so the split sums EXACTLY to
   * inflow_usd. Persisted append-only with recommended=true, approved=false ALWAYS. Never executes a
   * transfer.
   */
  async allocate(tenantId: string, input: AllocateInput): Promise<CapitalAllocation> {
    const policy = input.policy ?? DEFAULT_CAPITAL_POLICY;

    const split: Record<string, number> = {};
    let allocated = 0;
    for (const bucket of BUCKETS) {
      const amount = round2(input.inflow_usd * (policy[bucket] ?? 0));
      split[bucket] = amount;
      allocated += amount;
    }
    // Absorb the rounding remainder into operating so the split sums EXACTLY to inflow_usd.
    const remainder = round2(input.inflow_usd - allocated);
    split["operating"] = round2((split["operating"] ?? 0) + remainder);

    const allocation = CapitalAllocationSchema.parse({
      id: this.idFactory(),
      tenant_id: tenantId,
      business_id: input.business_id,
      inflow_usd: input.inflow_usd,
      split,
      mode: input.mode ?? "profit_first",
      recommended: true, // ALWAYS — this is only ever a recommendation.
      approved: false, // ALWAYS — Alfie never executes the transfer.
      created_at: this.clock().toISOString(),
    });

    await this.repos.allocations.insert(allocation);
    return allocation;
  }

  /**
   * Compute and persist a runway reading. runway_days = monthly_burn <= 0 ? 9999 : round(cash / (burn /
   * 30)). mode = (cash < min_reserve || runway < 30) ? "emergency" : (runway > 180 ? "growth" :
   * "profit_first"). Append-only.
   */
  async computeRunway(tenantId: string, input: ComputeRunwayInput): Promise<CapitalRunway> {
    const runwayDays =
      input.monthly_burn_usd <= 0
        ? 9999
        : Math.round(input.cash_usd / (input.monthly_burn_usd / 30));

    const mode: CapitalMode =
      input.cash_usd < input.min_reserve_usd || runwayDays < 30
        ? "emergency"
        : runwayDays > 180
          ? "growth"
          : "profit_first";

    const nowIso = this.clock().toISOString();
    const runway = CapitalRunwaySchema.parse({
      id: this.idFactory(),
      tenant_id: tenantId,
      business_id: input.business_id,
      as_of: input.as_of ?? nowIso,
      cash_usd: input.cash_usd,
      monthly_burn_usd: input.monthly_burn_usd,
      runway_days: runwayDays,
      min_reserve_usd: input.min_reserve_usd,
      mode,
      created_at: nowIso,
    });

    await this.repos.runway.insert(runway);
    return runway;
  }

  /** Seed (upsert) the nine bucket accounts with DEFAULT_CAPITAL_POLICY target_pct and balance 0. */
  async seedDefaultAccounts(tenantId: string, businessId: string): Promise<CapitalAccount[]> {
    const nowIso = this.clock().toISOString();
    const out: CapitalAccount[] = [];
    for (const bucket of BUCKETS) {
      const acc = CapitalAccountSchema.parse({
        id: this.idFactory(),
        tenant_id: tenantId,
        business_id: businessId,
        bucket,
        target_pct: DEFAULT_CAPITAL_POLICY[bucket],
        balance: 0,
        created_at: nowIso,
        updated_at: null,
      });
      await this.repos.accounts.upsert(acc);
      out.push(acc);
    }
    return out;
  }

  listAccounts(tenantId: string, businessId: string): Promise<CapitalAccount[]> {
    return this.repos.accounts.list(tenantId, businessId);
  }

  listAllocations(
    tenantId: string,
    businessId: string,
    limit?: number,
  ): Promise<CapitalAllocation[]> {
    return this.repos.allocations.list(tenantId, businessId, limit);
  }

  latestRunway(tenantId: string, businessId: string): Promise<CapitalRunway | null> {
    return this.repos.runway.getLatest(tenantId, businessId);
  }
}
