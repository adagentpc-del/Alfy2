# Agent Authority Matrix

What every agent may do alone, what needs approval, and who approves. This is a **synthesis of authority
primitives that already exist in code** — it introduces no new mechanism:

- **Permission scopes** — per-role-card, `packages/core/src/ai-org/engine.ts`.
- **Approval gate** — `api-approval` + `services/api/src/middleware/approval-gate.ts` (deny-by-default,
  DB-backed, one-time-consume tokens; migration `0239_api_approval_requests.sql`).
- **Zero-trust identity** — `docs/AGENT_IDENTITY_ZERO_TRUST.md` (ADR-0025): deny-by-default, read-only
  start, capabilities opened only via `grant()`.
- **Standing approvals** — `docs/PERSISTENT_APPROVAL.md` (ADR-0017): approve a workflow once, bounded.
- **Control/Execution planes** — `docs/GOVERNANCE_AND_PRINCIPLE.md` (ADR-0046): no agent bypasses the
  control plane.

## Permission scope tiers (from `ai-org` role cards, least → most authority)

| Scope | May do without asking | Typical holders |
|---|---|---|
| `research_only` | read, research, summarize | research-type employees |
| `recommend_only` | research + written recommendations | strategists, analysts |
| `draft_only` | + produce internal drafts | writers, spec/proposal authors |
| `create_internal_task` | + create/route internal tasks and records | coordinators, desk agents |
| `prepare_external_asset` | + fully prepare an external send/publish **queued for approval** | outreach, follow-up, social |
| `execute_low_risk` | + execute reversible, internal, low-risk actions | ops automation |
| `execute_with_approval` | + execute gated actions **when a valid approval token exists** | Executive Governor, leaders |

No scope permits an ungated external action. Scopes say what an agent may *attempt*; the gate decides what
*happens*.

## Action classes (from migration `0239`; only `internal_action` is exempt)

| Action class | Always requires | Approver |
|---|---|---|
| `send_message` (email/SMS/DM) | approved token | Alyssa (or standing grant in scope) |
| `publish_public` (posts, pages, video — incl. avatar video) | approved token | Alyssa |
| `move_money` / `charge` | approved token — **never auto** | Alyssa |
| `send_contract` | approved token — **never auto** | Alyssa |
| `deploy` | approved token | Alyssa (Chief Systems Architect verifies first) |
| `delete_data` | approved token | Alyssa |
| `change_pricing` | approved token | Alyssa (CRO recommends) |
| `change_access` | approved token | Alyssa (CSCO reviews) |
| `change_standing_rule` | approved token | Alyssa |
| `medical_legal_financial_claim` | approved token + review | Alyssa (CSCO pre-reviews) |
| `other` | approved token | Alyssa |
| `internal_action` | — (logged) | none |

Mechanics: an ungated request to a gated route is **parked** (HTTP 202 `approval_required`) into
`api_approval_requests`; an approval token is bound to the exact route+method+action class and **consumed
on first use** (no replay). Standing grants (`persistent-approval`) can pre-approve recurring in-scope
actions with limits, expiry, and review schedules — production environments are opt-in, excluded by default.

## Layer × authority summary

| Layer | Delegates to | Approves | Escalates to |
|---|---|---|---|
| Alyssa (CEO) | executives | everything gated | — |
| Executive (4) | department leaders | triage + recommend; execute only with token | Alyssa |
| Department leader (11) | own employees | internal work within department | Executive Governor |
| AI employee (63) | specialists | nothing | own leader |
| Specialist | — | nothing | own employee |

Invariants: no self-approval; no cross-department delegation without the Chief of Staff; every grant,
denial, use, and escalation lands in the accountability ledger (`ai_org_accountability`) and agent
observability log. Money, contracts, and legal claims can **never** be covered by auto-execute flags.
