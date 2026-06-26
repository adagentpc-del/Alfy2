# Alfy² — Executive Inbox

The single entry point into Alfy², and its primary interaction surface. **Alyssa never has to decide
where something belongs** — anything dropped in is identified, classified, routed, linked, enriched,
and saved. Decision record: [`adr/ADR-0011`](./adr/ADR-0011-executive-inbox.md).

## Drop anything
voice notes · screenshots · PDFs · videos · photos · emails · calendar invites · GitHub links · URLs ·
text · to-do lists · meeting notes · ideas · receipts · contracts · invoices · business cards. The
`kind` is optional — the inbox detects it from the content and attachments if you don't say.

## What it does (the ten requirements)
1. **Identify** the item type. 2. **Classify** it (business · personal · finance · health · learning ·
relationship · legal · asset · technology · opportunity · risk · task · project · idea). 3. Determine
the **existing business** it belongs to. 4. **Link** it to existing memories. 5. **Create tasks** when
appropriate. 6. **Identify missing information**. 7. **Recommend agents**. 8. **Save reusable memory**.
9. **Ask for approval only when necessary**. 10. **Update dashboards** automatically.

## What every item receives (`ProcessedInboxItem`)
unique `id` · `created_at` · `source` · `item_type` · `category` · `confidence` · `suggested_business`
· `suggested_owner` · `urgency` (+ `urgency_level`) · `next_action` · `linked_entities` ·
`suggested_tasks` · `missing_info` · `recommended_agents` · `saved_memory_id` · `requires_approval`
(+ reason) · `dashboard_updated` · `explanation` · `summary`.

## How it works (composes the engines)
The inbox adds **item-type detection** and **inbox category classification**, then orchestrates the
existing engines:
- **Decision Engine** → urgency, recommended agents, required approvals, automation/next-action.
- **Memory Engine** → `peek` to link related memories; `remember` to save the item for reuse.
- **Business matching** → routes to a known business by name/keyword overlap.
- **Approval gate** → flags money-moving / legal / irreversible items only.

Deterministic — every routing decision is explainable; no AI in the default path.

## Example
Drop an invoice email:
```
Invoice #4471 from A3 Visual — $12,400 due 2026-07-05 …
```
→ `item_type: invoice`, `category: finance`, `suggested_business: a3-visual`,
`suggested_owner: "A3 Visual / Finance"`, linked to the A3 Visual memory, a payment task created,
`requires_approval: true`, saved as memory — all with no instruction from the operator.

## The pieces
| Piece | Location |
|---|---|
| Contracts (Zod) | `packages/shared/src/contracts/executive-inbox.ts` (+ Pydantic mirror in `workers/`) |
| Detection + classification | `packages/core/src/executive-inbox/classify.ts` |
| The router | `packages/core/src/executive-inbox/inbox.ts` |
| Persistent schema | `infra/supabase/migrations/0010_executive_inbox.sql`, `0011_..._rls.sql` |
| Smoke test | `scripts/executive-inbox-smoke.mts` (`pnpm run inbox:smoke`) |

## Boundaries
- Deterministic and explainable; classifier cues are data and easy to tune.
- Real media parsing (OCR / transcription / PDF + email extraction) is supplied as `content` for now;
  an extraction step (behind the AI Gateway or external connectors in Phase 2) slots in without
  changing the inbox.
- Tenant-scoped like everything else (`inbox_items` carries `tenant_id` + RLS).
