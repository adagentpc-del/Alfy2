# ADR-0061: Finance Command Center

**Status:** Accepted
**Date:** 2026-06-25

## Context

Alyssa runs a portfolio of businesses alongside her personal finances, and the truth of "how am I doing with
money?" is scattered across each business's books, a personal net-worth picture, and a tax exposure that nobody
totals until it is too late. The executive needs one place that answers the whole money question — per business
and rolled up — and that names the single best next financial action. But a finance view that can see everything
must not be allowed to *do* everything: the standing danger is a system that quietly moves money. This ADR adds
the Finance Command Center as the complete financial picture that analyzes aggressively and executes nothing
without approval.

## Decision

Add a `finance-command/` engine in `@alfy2/core` that assembles the complete personal and business financial
view as a read model over append-only snapshots. Deterministic, tenant-scoped. Alfy² analyzes the money picture
in full; it never acts on it without Alyssa's approval.

### The complete picture

For **each business** the Center reports monthly revenue and expenses, **profit**, **margin**, **tax exposure**,
**cash runway**, the **best next financial action**, and the standing **risks** and **opportunities**. Above the
businesses it rolls the totals up — combined revenue, expenses, profit, and exposure — and sets them beside
**personal net worth**, so the one screen answers both "how is each business doing?" and "how am I doing
overall?" The best-next-action per business is the point: the Center does not just describe the money, it names
the one move that matters most for each line.

### Analyze aggressively, execute conservatively

This is the hard line that defines the finance suite. The Center reasons about the money as boldly as it
can — exposure, runway, the best move — but it is forbidden from touching it. `money_actions_require_approval`
is **always `true`**, and `forbiddenActions()` exposes the never-without-approval list: **`move_money`,
`spend_money`, `open_account`, `execute_investment`, `file_taxes`, `sign_document`.** None of these may happen
without Alyssa's explicit approval and, where relevant, professional review. The Center is a finance analyst,
never a finance operator.

### Contracts & data

`packages/shared/src/contracts/finance-command.ts`: `BusinessFinance`, `PersonalNetWorth`,
`FinanceCommandInput`, `FinanceCommandView`, `MoneyAction`. Migrations `0105`/`0106` store **append-only**
snapshots of the assembled view, so the financial picture has a history and is never overwritten in place.
Smoke `pnpm finance:smoke`.

## Consequences

- The executive has one financial screen: per business — revenue, expenses, profit, margin, tax exposure,
  runway, best next action, risks, opportunities — plus rolled-up totals and personal net worth.
- The hard guardrail is mechanical: `money_actions_require_approval` is always true and `forbiddenActions()`
  enumerates the six actions — move_money, spend_money, open_account, execute_investment, file_taxes,
  sign_document — that never happen without approval.
- Snapshots are append-only (migrations `0105`/`0106`), so the financial picture is a record over time, not a
  mutable dashboard.
- It anchors the finance & wealth suite: every downstream engine (tax, entity, money game) analyzes against the
  same picture and inherits the same approve-before-acting discipline.
- Phase 2 renders the Center as the executive's default money view and feeds its best-next-actions into the
  Execution Queue behind the approval gate.
