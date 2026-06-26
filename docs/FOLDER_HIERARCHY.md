# Alfy² — Folder Hierarchy

The canonical layout. Keep this in sync with the tree; reviewers check new files land in the right place.

```
alfy2/
├── README.md                     # Entry point
├── ARCHITECTURE.md               # System architecture
├── .env.example                  # Every env var, documented
├── .gitignore
├── .editorconfig
├── .nvmrc                        # Pinned Node version
├── package.json                  # Root workspace manifest + scripts
├── pnpm-workspace.yaml           # TS workspace globs
├── tsconfig.base.json            # Shared TS compiler options
│
├── docs/                         # Source of truth for how the system is built
│   ├── PRD.md
│   ├── TECH_SPEC.md
│   ├── BUILD_PLAN.md
│   ├── COST_CONTROL_PLAN.md
│   ├── CODING_STANDARDS.md
│   ├── NAMING_CONVENTIONS.md
│   ├── CONFIG_SYSTEM.md
│   ├── FOLDER_HIERARCHY.md
│   ├── STARTUP_SEQUENCE.md
│   ├── DOCUMENTATION.md           # How docs themselves are organized
│   ├── SECURITY.md
│   ├── GLOSSARY.md
│   ├── CHANGELOG.md
│   └── adr/                       # Architecture Decision Records
│       └── ADR-0001-stack-and-repo-shape.md
│
├── packages/                     # Shared TypeScript libraries (no long-running process)
│   ├── shared/                   # Contracts: Task, SignalToAction, manifests (Zod). Imports nothing internal.
│   │   ├── src/
│   │   └── package.json
│   ├── config/                   # Layered config loader + schema validation
│   │   ├── src/
│   │   └── package.json
│   ├── core/                     # Kernel: registries, planner iface, dispatcher, approval gate, logs, ai gateway
│   │   ├── src/
│   │   │   ├── registry/
│   │   │   ├── orchestration/
│   │   │   ├── logging/
│   │   │   └── ai/               # The ONLY place model calls happen
│   │   └── package.json
│   └── agents-sdk/               # TS helpers to define/register agents + build Task envelopes
│       ├── src/
│       └── package.json
│
├── services/                     # Deployable TypeScript processes
│   ├── api/                      # HTTP gateway: authn/z, tenant resolution, rate limit, validation
│   │   ├── src/
│   │   └── package.json
│   └── orchestrator/             # Planner + dispatcher + assembler + log writer
│       ├── src/
│       └── package.json
│
├── workers/                      # Python agent workers (uv project) — one subpackage per agent family
│   ├── pyproject.toml
│   ├── README.md
│   └── alfy_workers/
│       ├── __init__.py
│       ├── contracts/            # Pydantic mirrors of packages/shared contracts
│       └── reference_agent/      # Phase-2 reference agent (scaffold placeholder)
│
├── modules/                      # Domain modules (manifests + handlers). Scaffolds only this phase.
│   ├── README.md
│   ├── business/
│   ├── life/
│   ├── health/
│   ├── finance/
│   ├── ideas/
│   └── projects/
│       └── (each: manifest.json + handlers/ placeholder)
│
├── infra/                        # Deployment & data infrastructure
│   ├── README.md
│   └── supabase/
│       ├── migrations/           # Platform tables (Phase 1)
│       └── seed/
│
└── scripts/                      # Dev/ops scripts
    ├── bootstrap.md              # What `pnpm install && uv sync` set up
    └── check.md                  # What `pnpm run check` validates
```

## Placement rules
- Cross-boundary types → `packages/shared` only.
- Anything that calls a model → `packages/core/ai` only.
- A new domain capability → a folder under `modules/<name>/` with a `manifest.json`.
- A new executor → a subpackage under `workers/alfy_workers/<family>/`.
- A new long-running process → `services/<name>/`.
- A decision worth recording → a new `docs/adr/ADR-NNNN-*.md`.
