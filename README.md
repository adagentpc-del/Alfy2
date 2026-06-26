# Alfy²

> An adaptive executive operating system. Not a chatbot. Not an assistant. An OS.

Alfy² manages businesses, personal life, health, finance, ideas, and projects through a
modular, multi-agent architecture. Every module is replaceable, every action is explainable,
and irreversible actions always require human approval.

This repository currently contains **the foundation only** — architecture, structure,
standards, configuration, and startup wiring. No business features are implemented yet.

---

## The Ultimate Design Rule

Every feature must satisfy **at least one** of these six criteria, or it does not belong in Alfy²
(per [ADR-0121](./docs/adr/ADR-0121-ultimate-design-rule.md)):

- **Increase leverage**
- **Reduce friction**
- **Compound knowledge**
- **Protect trust**
- **Generate measurable value**
- **Increase founder freedom**

This is the highest admission gate — above this README and the Constitution. A feature that satisfies none of the
six is rejected.

---

## Design principles (non-negotiable)

1. **Modular** — every capability is a self-contained module.
2. **Replaceable** — any module can be swapped without touching the rest of the system.
3. **Explainable** — every action emits a structured, human-readable rationale.
4. **Human-gated** — irreversible actions require explicit approval.
5. **Historical** — the system learns from a durable record of past decisions.
6. **Personalizing** — behavior adapts to the operator over time.
7. **Productizable** — the architecture is built to become a SaaS platform: **FounderOS**.

---

## Stack at a glance

| Layer | Technology | Why |
|---|---|---|
| Orchestration core / API | **TypeScript (Node 20+)** | One language for kernel, API, and future FounderOS web app |
| Agent workers | **Python 3.12+** | Strongest AI/agent ecosystem; isolated, replaceable workers |
| Datastore / Auth / Storage | **Supabase (Postgres)** | Cheapest managed default; RLS, auth, audit tables, object storage |
| Transport between core & workers | **Message contract over HTTP/queue** | Workers swap without core changes |
| Repo shape | **Monorepo (pnpm workspaces + Python uv)** | Modules evolve independently in one place |

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full picture.

---

## Repository map

```
alfy2/
├── docs/            # Source of truth: PRD, tech spec, standards, ADRs
├── packages/        # Shared TypeScript libraries (core kernel, contracts, config, agent SDK)
├── services/        # Long-running TS services (api gateway, orchestrator)
├── workers/         # Python agent workers (one replaceable unit per agent family)
├── modules/         # Domain modules (business, life, health, finance, ideas, projects) — scaffolds only
├── infra/           # Supabase migrations, environment, deployment descriptors
├── scripts/         # Dev/ops scripts (bootstrap, check, format)
└── .env.example     # Every environment variable, documented
```

Full breakdown: [`docs/FOLDER_HIERARCHY.md`](./docs/FOLDER_HIERARCHY.md).

---

## Quick start (foundation)

> Nothing here does business work yet. These steps verify the skeleton is wired correctly.

```bash
# 1. Prerequisites: Node 20+, pnpm 9+, Python 3.12+, uv
# 2. Install TS workspace deps
pnpm install

# 3. Install Python worker deps
cd workers && uv sync && cd ..

# 4. Copy and fill environment
cp .env.example .env

# 5. Validate config & wiring (no external calls)
pnpm run check
```

Full boot order: [`docs/STARTUP_SEQUENCE.md`](./docs/STARTUP_SEQUENCE.md).

---

## Where to read next

- **Why & what:** [`docs/PRD.md`](./docs/PRD.md)
- **How it's built:** [`docs/TECH_SPEC.md`](./docs/TECH_SPEC.md)
- **Build order:** [`docs/BUILD_PLAN.md`](./docs/BUILD_PLAN.md)
- **Keeping it cheap:** [`docs/COST_CONTROL_PLAN.md`](./docs/COST_CONTROL_PLAN.md)
- **How we write code:** [`docs/CODING_STANDARDS.md`](./docs/CODING_STANDARDS.md) · [`docs/NAMING_CONVENTIONS.md`](./docs/NAMING_CONVENTIONS.md)
- **Decisions:** [`docs/adr/`](./docs/adr/)
- **Change history:** [`docs/CHANGELOG.md`](./docs/CHANGELOG.md)
