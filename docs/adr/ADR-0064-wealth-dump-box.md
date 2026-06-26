# ADR-0064: Wealth Architecture Dump Box

**Status:** Accepted
**Date:** 2026-06-25

## Context

The Executive Inbox (ADR-...) gives Alyssa one place to drop anything, but finance is its own world: a screenshot
of a brokerage offer, a note about a trust, an IRA rollover question, an offshore product pitch. These deserve a
finance-specific intake that knows the difference between a deductible expense and a structure that needs an
attorney before anyone touches it. This ADR adds the Wealth Architecture Dump Box: a single finance drop that
runs every item through the same ten-step pipeline and routes the heavyweight items to professional review.

## Decision

Add a `wealth-dump-box/` engine in `@alfy2/core` that accepts any finance-specific drop and processes it through
a fixed ten-step pipeline into the Wealth Knowledge Vault. Deterministic, tenant-scoped. It analyzes every drop;
it never acts on one without approval and, where the item warrants it, professional review.

### The ten-step pipeline

Every dropped item runs the same ten steps: **classify**, **summarize**, **scope (personal vs business)**,
**legality notes**, **upside**, **risk**, **link to goals**, **advisor questions**, **save to the Wealth
Knowledge Vault by reference**, and **next action.** The pipeline is uniform so that a quick expense note and a
complex structure are handled with the same rigor — each comes out classified, scoped, legally noted, weighed
for upside and risk, tied to goals, and saved to the Vault as a reference rather than a copy.

### Heavyweight items go to professionals

The legality notes and advisor questions are not decoration. Any **tax, trust, IRA, offshore, or financial-
product** item is flagged as **requiring professional review**, and its next action is to take it to a CPA or
attorney rather than to execute. The Box analyzes the upside as aggressively as it can while refusing to move on
the dangerous items alone — saving by reference to the Vault, never moving money, never opening accounts, never
signing.

### Contracts & data

`packages/shared/src/contracts/wealth-dump-box.ts`: `WealthDrop`, `DropClassification`, `WealthDropResult`,
`PipelineStep`. Migrations `0111`/`0112` persist drops and their processed results; the source itself lives in
the Wealth Knowledge Vault and is referenced, not duplicated. Smoke `pnpm wealthbox:smoke`.

## Consequences

- Alyssa has one finance drop: anything she drops is classified, summarized, scoped personal/business, legally
  noted, weighed for upside and risk, linked to goals, saved to the Vault by reference, and given a next action.
- Tax, trust, IRA, offshore, and financial-product items are automatically flagged for professional review and
  routed to a CPA or attorney rather than executed.
- Sources are saved to the Wealth Knowledge Vault **by reference**, consistent with the references-only vault
  discipline; the Box never moves money, opens accounts, or signs.
- Migrations `0111`/`0112` persist the drops and their results.
- Phase 2 wires the Box as the finance lane of the Executive Inbox, with next-actions flowing into the approval
  and professional-review queues.
