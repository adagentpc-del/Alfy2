# ADR-0104: Board Packet Generator

**Status:** Accepted
**Date:** 2026-06-25

## Context

A founder operates like the CEO of a serious company only if she reports like one — even before she has a board to
report to. The discipline of a monthly board packet forces a clear view of cash, revenue, risks, and priorities and
builds the habit before the company is large. The leverage is to generate that packet automatically from the data
the platform already holds. This ADR adds the Board Packet Generator.

## Decision

Add a `board-packet/` generator in `@alfy2/core`. Deterministic, tenant-scoped. Its core method **`generate()`**
assembles a `BoardPacket` for a period — executive summary, cash, and the standard packet sections.

### Operate like the CEO of a serious company

`generate()` produces board-level monthly reporting (period label, executive summary, cash, and `PacketSection`s)
from the platform's existing engines, so Alyssa runs the cadence of a real company before it is large. The
invariant: the packet is a **read model** — it composes and presents what other engines already hold (revenue
truth, risk register, capital decisions) rather than being a separate source of truth, so it can never disagree
with the systems it summarizes.

### Contracts & data

`packages/shared/src/contracts/board-packet.ts`: `GenerateBoardPacketInput`, `PacketSection`, `BoardPacket`. No
migration — the packet is assembled from existing engine outputs. Smoke `pnpm capstone:smoke`.

## Consequences

- Monthly board-level reporting is generated automatically, building the CEO cadence before a board exists.
- The packet is a read model — it composes existing engine outputs and cannot diverge from them.
- Migration `0181_board_packets.sql` (append-only `board_packets`).
- Phase 2 wires the Revenue Truth report, Risk Register top-ten, and Capital Board decisions into the packet sections.
