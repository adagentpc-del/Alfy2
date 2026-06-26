# ADR-0013 — GitHub Intelligence System

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Founder

## Context
Repositories are a major source of leverage and a major source of risk. Before Alfy2 implements
anything from a repo, it must vet it: understand what it is and how good it is, run a real security
review, and decide whether it's usable — **without ever executing a single line of it.** Only safe
repos should turn into a business case, and approved repos should be catalogued as reusable assets.

## Decision
1. **Static only — nothing is executed, ever.** `scan()` reads provided metadata and file *content*
   and analyzes it with pattern rules. The engine has **no shell, no eval, no network, no install**
   path. The contract encodes this: `RepoAssessment.executed` is a literal `false` (the Pydantic mirror
   and a DB CHECK both reject any other value), so "did not execute" is a guarantee, not a promise.
2. **Ten-dimension evaluation + an eight-class security review.** Deterministic evaluators score
   project purpose, maturity, architecture, documentation, dependencies, security, maintenance,
   license, community, and implementation difficulty. Detectors look for malicious scripts, credential
   harvesting, suspicious dependencies, obfuscated code, network abuse, crypto mining, package
   vulnerabilities, and unsafe permissions, each as a finding with a severity and the matched evidence.
3. **A three-way verdict.** `critical`/`high` findings → **DO NOT USE**; `medium` → **NEEDS REVIEW**;
   clean-but-missing-license-or-docs → **NEEDS REVIEW**; otherwise **SAFE**.
4. **Business case only when SAFE.** A safe verdict generates business applications, which businesses
   benefit (matched against the tenant's businesses), an implementation roadmap, required agents (Agent
   Registry keys), estimated effort, and estimated ROI. Unsafe repos get `business_case: null`.
5. **An approval-gated Asset Library.** `approve()` stores a repo in the tenant-scoped Asset Library
   and **refuses anything not SAFE** (`RepoApprovalError`). The library and `repo_assessments` are
   persisted with `tenant_id` + RLS; the assessment table carries the same `executed = false` CHECK.

## Consequences
- **Positive:** repos are never trusted by default; the no-execution guarantee is encoded in the
  contract and the database, not just the code; the verdict is explainable with evidence; safe repos
  flow straight into a business case and a reusable asset catalogue.
- **Cost:** detection is pattern-based static analysis — it can miss cleverly obfuscated threats and
  can false-positive on benign code; the known-vulnerable set and miner signatures are a small demo
  list, not a live advisory feed; file *content* must be supplied (the engine fetches nothing).
- **Mitigation:** rules are data and easy to extend; a real advisory feed (OSV/GitHub Advisories) and
  an AI-assisted reviewer can be added behind the same `scan()` API and the deterministic floor, all
  without ever gaining an execution path. Human review remains the gate for NEEDS REVIEW.

## Alternatives considered
- **Clone and run tests / dynamic analysis:** higher signal but requires executing untrusted code —
  exactly what the brief forbids. Rejected.
- **Trust popular repos by stars:** popularity is not safety (supply-chain attacks target popular
  packages). Rejected — every repo is scanned.
- **Store all scanned repos:** the Asset Library is for *approved* assets only; unsafe repos are
  assessed and rejected, not catalogued. Rejected in favor of the SAFE-only gate.
