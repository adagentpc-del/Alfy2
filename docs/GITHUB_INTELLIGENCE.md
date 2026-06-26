# Alfy² — GitHub Intelligence System

Repositories are **never trusted automatically**, and **nothing is ever executed**. Before Alfy2 uses
anything from a repo, it statically scans it, evaluates it, runs a security review, and returns
**SAFE / NEEDS REVIEW / DO NOT USE**. Safe repos get a business case; approved repos go in the Asset
Library. Decision record: [`adr/ADR-0013`](./adr/ADR-0013-github-intelligence.md).

## Never executes — by contract
`scan()` reads provided metadata and file *content* and analyzes it with pattern rules. The engine has
**no shell, no eval, no network, no install** path. `RepoAssessment.executed` is the literal `false` —
the Pydantic mirror and a database CHECK both reject any other value. The smoke asserts `executed:
false` even when scanning a malicious repo.

## Ten-dimension evaluation
project purpose · maturity · architecture · documentation · dependencies · security · maintenance ·
license · community · implementation difficulty — each scored 0..1 with a one-line summary.

## Eight-class security review
malicious scripts · credential harvesting · suspicious dependencies · obfuscated code · network abuse
· crypto mining · package vulnerabilities · unsafe permissions. Each hit is a `SecurityFinding` with a
severity (low/medium/high/critical) and the matched evidence (path + snippet).

## The verdict
- `critical`/`high` finding → **DO NOT USE**
- `medium` finding → **NEEDS REVIEW**
- clean but missing license or docs → **NEEDS REVIEW**
- otherwise → **SAFE**

## If SAFE → a business case
business applications · which businesses benefit (matched to the tenant's businesses) · implementation
roadmap · required agents (Agent Registry keys) · estimated effort (+hours) · estimated ROI (+level).
Unsafe repos get `business_case: null`.

## Asset Library (approval-gated)
`approve()` stores the repo in the tenant-scoped Asset Library and **refuses anything not SAFE**
(`RepoApprovalError`). Persisted in `asset_library` + `repo_assessments` with `tenant_id` + RLS.

## API
```ts
const gh = new GitHubIntelligence({ businesses: [{ id: "a3-visual", name: "A3 Visual", keywords: ["invoice"] }] });
const a = gh.scan(tenantId, repoScanInput);     // never executes; returns a RepoAssessment
if (a.verdict === "safe") gh.approve(tenantId, a, { approvedBy: "you@x.com", library });
```

## The pieces
| Piece | Location |
|---|---|
| Contracts (Zod) | `packages/shared/src/contracts/github-intelligence.ts` (+ Pydantic mirror) |
| Security detectors | `packages/core/src/github-intelligence/detectors.ts` |
| Dimension evaluators | `packages/core/src/github-intelligence/evaluate.ts` |
| Business case | `packages/core/src/github-intelligence/businesscase.ts` |
| Engine + Asset Library | `packages/core/src/github-intelligence/engine.ts`, `asset-library.ts` |
| Persistent schema | `infra/supabase/migrations/0014_github_intelligence.sql`, `0015_..._rls.sql` |
| Smoke test | `scripts/github-intelligence-smoke.mts` (`pnpm run gh:smoke`) |

## Boundaries
- Static pattern analysis — supplies no execution path; file content is provided (the engine fetches
  nothing). A live advisory feed and an AI-assisted reviewer can be added behind `scan()` without ever
  gaining execution capability.
- Human review is the gate for NEEDS REVIEW; the Asset Library stores SAFE-only.
