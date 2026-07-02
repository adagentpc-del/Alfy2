# ADR-0127 — Enterprise Command Center as a build-free static SPA

**Status:** accepted · 2026-07-02

## Context

The dashboard outgrew one static preview file: the enterprise layer needs 8 screens (command center,
agent cabinet + dossiers, portfolio + company OS viewer, approval center, weekly report, brain center)
with shared state and real URL routes (`/agents/:id`, `/portfolio/:id`). `EXECUTIVE_DASHBOARD_SPEC.md`
said graduating beyond ~8 views requires an explicit decision, not drift. Options: adopt a framework
build (Next/Vite) or structure a multi-file vanilla SPA and keep zero-build serving.

## Decision

Stay build-free. `apps/web` becomes a vanilla ES-module SPA: `index.html` shell + `assets/theme.css`
(design tokens) + `assets/data.mjs` (mock operating dataset) + `assets/services.mjs` (service layer whose
function surface mirrors the future API) + `assets/app.mjs` (router + views + brain-graph canvas).
Vercel keeps `buildCommand: echo skip`; a rewrite (`/((?!assets/).*)` → `/index.html`) provides real
paths. The service layer is environment-agnostic (injectable store/clock) so `scripts/enterprise-ui-smoke.mts`
tests it under node, and swapping mock reads for `fetch()` later touches only `services.mjs`.

## Consequences

- Deploys stay instant, dependency-free, and unbreakable by toolchain drift; the repo keeps zero frontend deps.
- Views are template strings — acceptable at this scale; if the app grows past ~12 views or needs
  component reuse across teams, a framework migration gets its own ADR and this one is superseded.
- Approve/deny in preview mode mutate browser localStorage only (clearly bannered), never the seed;
  live mode continues to use the existing `/mission-control` connect hook until Day-2 wiring lands.
