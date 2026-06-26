# Modules

Domain capabilities. Each module is a self-contained, replaceable unit: a `manifest.json` plus a
`handlers/` folder. **This phase contains scaffolds only** — manifests declare intent; no handler
logic is implemented yet.

## Anatomy
```
modules/<name>/
├── manifest.json     # id, version, capabilities, requires_agents, owner, irreversible_capabilities
└── handlers/         # (Phase 4+) functions that turn operator intent into a Plan of Tasks
```

## Rules
- A module owns no infrastructure; it requests work through the Task contract.
- Capabilities listed in `irreversible_capabilities` always route through the Approval Gate.
- Removing a module = delete its folder + its `module_registry` row. Nothing else breaks.
- No module imports another module. Cross-module needs go through contracts.

Capabilities below are **declared, not implemented** — placeholders that name the intended surface.
