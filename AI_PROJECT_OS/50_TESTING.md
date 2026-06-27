# 50 · Testing

## Strategy (Engineering Standards §11)
- **Contract tests (Python):** every Pydantic model constructs valid, rejects bad enums, forbids unknown
  fields. `cd workers && python3 -m pytest -q` → **~650 passing**.
- **Engine smokes (TypeScript):** one deterministic `scripts/<engine>-smoke.mts` per engine (injected
  clock + id factory). Plus `scripts/api-gateway-smoke.mts` — a **10-scenario** in-process run of the
  whole gateway (auth, inbox, approval gate park/clear, mission-control, founder capacity, revops,
  decision, capital, AI-org delegation+report-back, health).
- **Type gate:** full workspace `tsc -b` (the only thing that catches cross-engine name collisions —
  note: it does NOT type-check `scripts/`, so run the smokes via `tsx` too).
- **Live SQL validation:** new Pg adapter queries are validated against the live schema before shipping.

## Coverage / gaps
- Strong at the contract + engine + gateway level. **Missing:** HTTP integration tests against a live
  DB, and runtime tests for the not-yet-wired engines.

## Manual QA / regression checklist
- [ ] `tsc -b` green · [ ] all touched smokes pass · [ ] `pytest` green · [ ] RLS audit = 0 open tables ·
  [ ] approval gate blocks risky routes · [ ] tenant isolation holds · [ ] `/healthz` 200 on the deploy.
