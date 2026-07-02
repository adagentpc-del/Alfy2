# Divini Pay — Spec (PRD · Architecture · Ledger · Roadmaps)

A privacy-first, lower-fee payment operating system for the Divini ecosystem (Procure, Partners,
Move Mi, Black Flag Innocence, StrataLogic, FounderOS, DatingModern.ai, Oralia, future platforms).
Mock engine: `apps/web/assets/divini-pay.mjs` · screen `/pay` · smoke `pnpm pay:smoke` (8 scenarios).
Companions: `DIVINI_PAY_COMPLIANCE_CHECKLIST.md` (binding) · `DIVINI_PAY_AGENTS.md` (the desk).

## The legal constraint, first

Divini Pay is **not** designed to evade lawful financial oversight. AML/KYC, tax reporting, sanctions
screening, consumer protection, Nacha rules, money-transmitter law, and banking requirements are
**design inputs**. "Privacy-first" means privacy from commercial exploitation — no selling transaction
data, no ad targeting, data minimization — with full lawful auditability preserved (the immutable
ledger and audit trail exist precisely to make oversight easy).

## PRD (Phase 1 — Divini Pay Lite)

**Problem:** the portfolio pays ~2.9%+30¢ card rates for money that could move ACH-first at ~0.8%
capped $5, and processors monetize the data exhaust. **Success:** blended effective fee < 1.4%,
zero data sold, every money movement human-approved, reconciliation exportable in one click.
**Non-custodial:** Divini Pay never holds balances in Phase 1–2; funds move processor→payee. The 21
Phase-1 features map 1:1 to engine functions (links, invoices, fee calculator, onboarding with
KYC/KYB *readiness* fields, W-9 workflow, payout + referral tracking, split rules, ledger, refunds,
disputes, admin + privacy dashboards, authorization records by reference, RBAC, audit trail, recon).

## System architecture

```
apps (Procure, Move Mi, …) → Divini Pay API surface
  ├─ Rail router (ACH-first; card backup; instant opt-in) → processor/acquirer ADAPTERS (tokenized only)
  ├─ Party service (PII + consent + KYC-readiness + W-9 refs)   ← encrypted at rest, separate store
  ├─ Ledger service (append-only double-entry, token-only)      ← the audit substrate
  ├─ Control plane: RBAC → velocity/anomaly → Approval Center (move_money) → audit trail
  └─ Reporting: privacy dashboard · reconciliation export · 1099 threshold tracking
```
**API abstraction layer:** every processor sits behind `{ tokenize, charge, payout, refund }` with
processor tokens only — swapping Stripe→direct acquirer never touches business logic. Security spec
(passkeys/WebAuthn, device-bound sessions, step-up auth, encryption) binds the real backend build —
see the checklist doc §Security.

## Database schema (target Pg; mock mirrors shapes)

`pay_parties` (id, token, kind, platform, name_enc, email_enc, kyc jsonb, w9 jsonb — doc refs only,
risk jsonb, consent flags, timestamps) · `pay_instruments` (party_id, rail, processor_token) ·
`pay_links` · `pay_invoices` (payer/payee tokens, platform, project_id, milestones jsonb,
referral_partner, status, authorization_ref) · `pay_ledger` (txn_id, account token/system, dir,
amount_cents, kind, refs — **no PII columns, enforced**) · `pay_payouts` (status machine, approval_id)
· `pay_refunds` · `pay_disputes` (timeline jsonb) · `pay_split_rules` (platform, pcts) ·
`pay_risk_queue` · `pay_audit` (append-only). All tenant-scoped + RLS per house rules; PII tables
separated from transaction tables at the schema level.

## Roles & permissions (implemented)

| Role | Can |
|---|---|
| owner (Alyssa) | everything + reasoned overrides (audited) |
| finance_admin | links, invoices, onboarding, payout/refund *requests*, disputes, splits, W-9, exports |
| ops | links, invoices, onboarding, W-9 |
| auditor | reconciliation export only |
| viewer | nothing (read-only UI) |

Money movement is a two-key action always: a permitted role *requests*, Alyssa's `move_money` token
*releases*. Overrides are owner-only, require a substantive reason, and land in the audit trail.

## Ledger + revenue split model (implemented, smoke-verified)

Double-entry, append-only, token-only accounts. Payment of a $2,500 invoice (ACH, 5% platform fee,
30%-of-fee referral):
```
debit  tok_buyer            $2,500.00      credit acct:rail_fees          $5.00
                                           credit acct:platform_revenue   $87.50
                                           credit acct:referral_payable   $37.50
                                           credit acct:vendor_payable   $2,370.00
```
Unbalanced transactions are rejected. Payouts debit the payable account and credit the payee token —
only after W-9 (vendors), velocity check, and a consumed `move_money` approval.

## Payment flows

**Lite:** link/invoice → buyer authorizes (consent + authorization ref) → rail router → ledger split →
payouts pending → approval → execute → recon export.
**Marketplace (Phase 2, implemented in mock):** buyer pays project invoice → platform fee + referral
commission computed automatically → vendor payout `awaiting_milestones` → milestone releases (n/n) →
`move_money` approval → paid. Disputes put related payouts on `dispute_hold` (release restores prior
state); refunds are their own gated flow; admin override exists but is owner-only + reasoned + audited.
Vendor risk scoring + velocity limits feed the risk queue.

## Roadmaps

- **Phase 1 — Lite (mock now → live):** processor adapter #1 (ACH via Plaid-auth + processor, or
  Stripe-ACH as bridge), real authorization storage, passkey step-up, Pg migration of the schema above,
  live recon. Exit: first real invoice collected at ACH cost.
- **Phase 2 — Marketplace:** contracts linked to payment schedules, milestone UI for Procure/Partners,
  vendor risk scoring v2, partner statements. Exit: one Procure project paid end-to-end with splits.
- **Phase 3 — Wallet (designed, HARD-LOCKED):** stored value activates only after CCO + BSA/AML
  sign-off, sponsor-bank agreement, and the MTL map decision (license portfolio vs bank-agency model).
  Engine enforces the lock: `walletOperation()` throws until then. Features staged: wallets, credits,
  rewards, referral balances, ACH/RTP/FedNow withdrawals, KYC/KYB gating, AML monitoring + suspicious
  queue, sanctions hooks, MTL tracker, sponsor-bank readiness.

## Success state

Route every portfolio transaction down the cheapest **compliant** rail (modeled ~62% savings vs card
baseline), keep the data private from commercial exploitation, and keep every cent auditable — with
Alyssa's token on every dollar that moves.
