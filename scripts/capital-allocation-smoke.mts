/**
 * Runtime smoke for the Capital Allocation Engine (Profit-First) (§34). Proves the deterministic
 * recommendation behaviour: an inflow is split across the nine buckets summing EXACTLY to the inflow,
 * every allocation is a recommendation (recommended=true, approved=false) — Alfie NEVER moves money;
 * runway + mode are derived correctly (emergency when cash < min_reserve; growth when runway is long);
 * and seedDefaultAccounts upserts the nine bucket accounts.
 * Deterministic (injected clock + idFactory). Run: `tsx scripts/capital-allocation-smoke.mts`.
 */
import assert from "node:assert/strict";
import {
  CapitalAllocationEngine,
  InMemoryCapitalAccountRepository,
  InMemoryCapitalAllocationRepository,
  InMemoryCapitalRunwayRepository,
} from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const BUSINESS = "00000000-0000-0000-0000-0000000000aa";
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
let tick = 0;
const clock = () => new Date(Date.UTC(2026, 5, 26, 9, tick++, 0));

const engine = new CapitalAllocationEngine(
  {
    accounts: new InMemoryCapitalAccountRepository(),
    allocations: new InMemoryCapitalAllocationRepository(),
    runway: new InMemoryCapitalRunwayRepository(),
  },
  { clock, idFactory: id },
);

// 1. allocate $1000 → 9 buckets, sums EXACTLY to 1000, recommendation only.
const alloc = await engine.allocate(TENANT, { business_id: BUSINESS, inflow_usd: 1000 });
const buckets = Object.keys(alloc.split);
assert.equal(buckets.length, 9, `split has 9 buckets (got ${buckets.length})`);
const sum = Object.values(alloc.split).reduce((a, b) => a + b, 0);
assert.equal(sum, 1000, `split sums EXACTLY to 1000 (got ${sum})`);
assert.equal(alloc.recommended, true, "recommended=true ALWAYS");
assert.equal(alloc.approved, false, "approved=false ALWAYS — Alfie never moves money");
assert.equal(alloc.mode, "profit_first", "default mode is profit_first");

// 2. computeRunway: cash below min_reserve → emergency.
const emergency = await engine.computeRunway(TENANT, {
  business_id: BUSINESS,
  cash_usd: 5000,
  monthly_burn_usd: 6000,
  min_reserve_usd: 10000,
});
assert.equal(emergency.mode, "emergency", "cash < min_reserve → emergency");

// 3. computeRunway: long runway, reserve healthy → growth.
const growth = await engine.computeRunway(TENANT, {
  business_id: BUSINESS,
  cash_usd: 100000,
  monthly_burn_usd: 5000,
  min_reserve_usd: 10000,
});
assert.ok(growth.runway_days > 180, `runway_days large (got ${growth.runway_days})`);
assert.equal(growth.mode, "growth", "long runway + healthy reserve → growth");

// 4. latestRunway returns the most recent reading (the growth one).
const latest = await engine.latestRunway(TENANT, BUSINESS);
assert.ok(latest, "latest runway exists");
assert.equal(latest.id, growth.id, "latestRunway returns the most recent reading");

// 5. seedDefaultAccounts → 9 accounts.
await engine.seedDefaultAccounts(TENANT, BUSINESS);
const accounts = await engine.listAccounts(TENANT, BUSINESS);
assert.equal(accounts.length, 9, `seedDefaultAccounts upserts 9 accounts (got ${accounts.length})`);
const pctSum = accounts.reduce((a, acc) => a + acc.target_pct, 0);
assert.ok(Math.abs(pctSum - 1.0) < 1e-9, `account target_pct sums to 1.0 (got ${pctSum})`);

console.log(
  `CAPITAL ALLOCATION SMOKE OK — $1000 split across 9 buckets sums EXACTLY to ${sum} ` +
    "(recommended=true, approved=false — Alfie never moves money), " +
    `runway emergency (cash<reserve) + growth (runway ${growth.runway_days}d), 9 seeded accounts`,
);
