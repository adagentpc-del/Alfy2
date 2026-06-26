# ADR-0081: Audience Intelligence

**Status:** Accepted
**Date:** 2026-06-25

## Context

Every piece of content, every offer, every pitch lands or misses on one thing: whether it speaks to what the
audience actually fears, wants, and believes. That knowledge is scattered across comments, messages, reviews, and
conversations, and it is rarely distilled into something the content and offer engines can use. The leverage is in
turning that scatter into a sharp, structured portrait of the audience that improves every message produced
downstream. This ADR adds Audience Intelligence: an engine that distills an audience from many signal kinds and
keeps the portrait current as new signal arrives.

## Decision

Add an `audience-intel/` engine in `@alfy2/core`. Deterministic, tenant-scoped. It distills an audience's
**fears, goals, language, objections, desires, misconceptions, favorite content, and best offers** from **nine
signal kinds**, and re-analysis **upserts** — merging new signal into the existing portrait rather than starting
over.

### Nine signals into a sharp portrait

From nine signal kinds — the comments, messages, reviews, survey answers, conversations, and the rest of what an
audience says — the engine distills a structured portrait: the audience's **fears**, **goals**, **language** (the
words they actually use), **objections**, **desires**, **misconceptions**, **favorite content**, and the
**offers most likely to land**. This is the material every downstream engine needs to write copy that resonates,
handle objections before they are raised, and pick offers the audience already wants.

### Re-analysis merges, never resets

The portrait is a living thing: as new signal arrives, **re-analysis upserts** — it merges the new signal into
the existing portrait rather than discarding what was already learned. An audience understood over months is more
valuable than one re-derived from scratch each time, so the engine accumulates understanding and sharpens it,
treating each new batch of signal as evidence to fold in, not a reason to forget.

### Contracts & data

`packages/shared/src/contracts/audience-intel.ts`: `AudienceSignal`, `AudienceSignalKind`, `AudiencePortrait`,
`AudienceIntelInput`, `AudienceIntelResult`. Migrations `0148`/`0149` store audience portraits; re-analysis
**upserts** the portrait so it is merged and current rather than duplicated. Smoke `pnpm audience:smoke`.

## Consequences

- An audience is distilled from nine signal kinds into a structured portrait — fears, goals, language,
  objections, desires, misconceptions, favorite content, best offers — that sharpens every downstream message.
- Re-analysis upserts: new signal is merged into the existing portrait, so understanding accumulates rather than
  resets.
- Portraits persist in `0148`/`0149` as upserted, current records.
- The portrait feeds the Content Factory, Media OS, and offer/conversion engines so messaging improves at the
  source.
- Phase 2 wires live signal sources into the engine so the portrait refreshes as the audience speaks.
