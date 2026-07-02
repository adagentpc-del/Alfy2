# Divini Pay — The Payments Desk (12 agents)

The payment OS's operating unit: 12 specialist agents reporting to the **Chief Finance Officer Agent**
(cabinet), governed by the same authority matrix and approval gates as everything else. Source of
truth: `PAY_AGENTS` in `apps/web/assets/divini-pay.mjs` (each carries mission, responsibilities,
required inputs, required outputs, decision rules, escalation triggers, compliance warnings, and
success metrics — presence machine-verified on `/readiness`). This doc is the readable roster.

| Agent | Mission (one line) | Signature decision rule | Watch metric |
|---|---|---|---|
| Chief Fintech Architect | Non-custodial first, tokenized always, rails behind one surface | custody triggers MTL analysis — CCO sign-off first | blended fee <1.4% |
| Chief Compliance Officer | Make privacy-first and fully-lawful the same system | no feature without its checklist row; law beats growth | checklist coverage 100% |
| BSA/AML Officer | Detect and report what must be reported, fast | flags triaged <24h; never tip off subjects | triage time |
| Payments Rail Strategist | Cheapest compliant rail, every time | ACH default >$200; instant only as payee-paid premium | savings vs card baseline |
| Privacy Architect | Least data, PII never near the ledger | a PII field in a ledger row is build-breaking | PII-free ledger 100% |
| Ledger Engineer | One append-only double-entry truth | unbalanced transactions rejected, never fixed silently | recon breaks = 0 |
| Treasury Operations Agent | Run the money-movement calendar | nothing moves without a consumed move_money token | on-time payouts |
| Fraud/Risk Agent | Catch the weird transaction before it settles | >3x historical average → queue; new vendors held 30 days | fraud loss <5bps |
| Disputes Agent | Hold first, investigate second, resolve fast | milestone evidence beats assertions | median resolution <7d |
| Partner Bank Agent | Land and keep the sponsor bank | over-disclose to the partner — surprises kill banks | bank-readiness score |
| Revenue Split Agent | Every split exact, transparent, per platform rule | never retroactive without override+audit | split accuracy 100% |
| Tax Reporting Agent | W-9s in before payouts out | no vendor payout without W-9 on file (enforced in code) | W-9 coverage 100% |

## Shared guardrails

Every desk agent: operates behind RBAC (least privilege); can *request* but never *release* money
(release is Alyssa's `move_money` token, always); escalates per its triggers to the CFO Agent →
Executive Governor path; and carries compliance warnings that are read as constraints, not advice.
The desk's collective KPI: **effective blended fee down, zero compliance findings, zero data sold.**
