# Alfy² — Personal OS

Alfy²'s life layer. Twelve modules, one rule: **if information already exists, reuse it; if not, ask
once and remember it forever (unless updated); next time, auto-prepare everything.** Built entirely on
the Memory Engine. Decision record: [`adr/ADR-0007`](./adr/ADR-0007-personal-os.md).

## The twelve modules
`vehicles · travel · appointments · shopping · pets · home · insurance · bills · maintenance · health ·
goals · relationships`

Each module has one or more entity types in the catalog, each mapped to a memory kind with its
required/optional fields. For example, **Vehicles → `dealership`** requires
`store, phone, advisor, hours, preferred_contact` (optional: `address, service_history, email`).

## The Mercedes example, exactly
```ts
const pos = new PersonalOS(memoryEngine);
const ref = { module: "vehicles", entity_type: "dealership", identity: "Mercedes dealership" };

await pos.resolve(tenant, ref);
// → { status: "missing", request: ask once for store, phone, advisor, hours, preferred_contact }

await pos.remember(tenant, { ...ref, fields: { store, phone, advisor, hours, preferred_contact, service_history } });
// → remembered forever

await pos.resolve(tenant, ref);
// → { status: "reused" }  — never asks again

await pos.prepare(tenant, ref);
// → ready: true, prepared: [ "Advisor: Diego Ramos", "Hours: …", "Service history: …", … ]
```

## The three operations
| Operation | Behavior |
|---|---|
| `resolve(ref)` | `reused` (complete) · `partial` (found, some required missing) · `missing` (ask once). Read-only. |
| `remember(input)` | Writes to memory and **upserts** — updates in place, never duplicates. Forever unless updated. |
| `prepare(ref)` | Assembles everything known into a ready-to-use bundle (`prepared` lines). Read-only. |

`resolve` and `prepare` use the Memory Engine's non-reinforcing `peek`, so looking something up never
changes its state. Only `remember` writes.

## The pieces
| Piece | Location |
|---|---|
| Contracts (Zod) | `packages/shared/src/contracts/personal-os.ts` (+ Pydantic mirror in `workers/`) |
| Catalog (12 modules, entity specs) | `packages/core/src/personal-os/catalog.ts` |
| Engine | `packages/core/src/personal-os/personal-os.ts` |
| New memory kinds | `pet`, `trip`, `goal` (`memory.ts` + migration `0007_memory_kinds_personal.sql`) |
| Smoke test | `scripts/personal-os-smoke.mts` (`pnpm run personal:smoke`) |

## Boundaries
- **No new datastore.** Everything is stored as memories; "remember forever" *is* the Memory Engine.
- **No duplicates.** `remember` upserts keyed on module + entity_type + identity.
- **Side-effect-free reads.** `resolve`/`prepare` peek; they never reinforce or mutate memory (the
  smoke asserts `use_count` stays 0).
- Identity matching is exact today; fuzzy/aliased matching can be added behind the same API later.
