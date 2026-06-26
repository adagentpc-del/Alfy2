# ADR-0103: Enterprise Risk Register

**Status:** Accepted
**Date:** 2026-06-25

## Context

A serious company tracks its risks deliberately; a solo founder usually tracks them in her stomach. Risks that are
not named, owned, and revisited are the ones that compound into crises. The leverage is a standing register that
holds every risk across the dimensions of the business, computes its exposure, and surfaces the few that most
deserve attention this week. This ADR adds the Enterprise Risk Register.

## Decision

Add a `risk-register/` engine in `@alfy2/core`. Deterministic, tenant-scoped. **`add()`** records a risk, **`update()`**
mutates it as it is mitigated, and **`top()`** surfaces the top ten by exposure.

### Thirteen categories, exposure, mutable, top-ten weekly

Risks span **thirteen categories** — legal, tax, security, financial, operational, reputational, compliance,
health_energy, relationship, technology, vendor, customer, data_privacy — each carrying severity, likelihood,
owner, mitigation, deadline, status (open / mitigating / monitored / closed), escalation trigger, and affected
businesses. **`exposure` is computed** from severity × likelihood. Unlike the platform's append-only ledgers, the
register is **deliberately mutable**: a risk's status and mitigation change as it is worked, and `exposure` is
derived rather than stored stale. **`top(10)`** returns the ten highest-exposure risks for the weekly review — the
invariant that the founder always sees the risks that matter most, not the whole list.

### Contracts & data

`packages/shared/src/contracts/risk-register.ts`: `RiskCategory`, `RiskStatus`, `AddRiskInput`, `EnterpriseRisk`.
Migration `0180_risk_register.sql` (append-only `risk_register (mutable; updated_at trigger)`). Smoke `pnpm capstone:smoke`.

## Consequences

- Risks are tracked across **13 categories** with computed exposure, owner, mitigation, deadline, status, and
  escalation trigger.
- The register is mutable (status/mitigation evolve; exposure is derived), and `top(10)` drives the weekly review.
- Migration `0180_risk_register.sql` (append-only `risk_register (mutable; updated_at trigger)`).
- Phase 2 surfaces the weekly top-ten into the Board Packet and the Founder Nervous System report.
