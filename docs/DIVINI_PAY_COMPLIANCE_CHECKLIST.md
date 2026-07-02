# Divini Pay — Compliance, Security & Privacy Checklist (binding)

Owner: Chief Compliance Officer (payments desk). Rule zero: **no feature ships without its row here.**
Positioning restated: privacy from commercial exploitation and unnecessary data selling — never
invisibility from lawful compliance. Where an obligation attaches (directly or via processor/bank
partner contracts), we build to pass it.

## Compliance checklist

| Area | Obligation posture | Phase 1 status |
|---|---|---|
| KYC/KYB | Readiness fields modeled; collect minimum per phase; full program before wallet | fields live, collection minimal |
| AML/BSA | Velocity + anomaly → risk queue now; monitoring program + SAR/CTR readiness before wallet | queue live (mock) |
| Sanctions (OFAC) | Screening hooks specified at party onboarding + payout; live screening with first real rail | spec'd |
| Tax (W-9/1099) | W-9 required before vendor payout (enforced); TINs vault-only; 1099-NEC/K threshold tracking | enforced |
| Nacha / ACH | Debit authorizations stored by reference (`authorization_ref` required); return-rate monitoring planned | enforced (refs) |
| Money transmission | Phase 1–2 non-custodial by design; wallet HARD-LOCKED until MTL map or sponsor-bank agency model cleared | lock enforced in code |
| Consumer protection | Refund + dispute workflows with holds and timelines; card-network rules honored via processor | live (mock) |
| Lawful process | Subpoenas/orders honored via counsel; audit trail + ledger exist to make this fast and complete | posture documented |

## Security checklist (15 requirements → disposition)

| # | Requirement | Disposition |
|---|---|---|
| 1–2 | Passkeys/WebAuthn + device biometrics | real-backend spec: passkey primary, platform biometrics for step-up |
| 3–4 | No raw card numbers / bank credentials | **enforced now** — engine rejects raw-number-shaped tokens |
| 5 | Tokenized instruments | **enforced now** — processor tokens only |
| 6 | Encryption at rest + transit | backend spec: KMS-held keys; PII columns encrypted; TLS everywhere |
| 7 | PII separated from transactions | **enforced now** — ledger accounts are tokens/system accounts only; privacy dashboard verifies |
| 8 | Device-bound session tokens | backend spec (paired with passkeys) |
| 9 | Step-up auth for high-risk actions | modeled: velocity breach → step-up + review required |
| 10 | Immutable audit logs | **enforced now** — append-only, denials + overrides recorded |
| 11–12 | Anomaly detection + velocity limits | **live (mock)** — $25k/day/party default, breaches queue |
| 13 | Admin action logging | **enforced now** — incl. owner overrides with mandatory reasons |
| 14 | Least-privilege permissions | **enforced now** — 5 roles, viewer=none, denials audited |
| 15 | Incident response workflow | routes to the Incident Response Agent (legal dept) + payments desk escalation triggers |

## Privacy checklist (10 requirements → disposition)

1–2. **No selling transaction data / no ad targeting** — no data-out integrations exist; adding one is
a build-breaking violation. 3. Clear privacy policy — drafted from this doc at launch. 4. **Consent
before linking** — enforced in `onboardParty()`. 5. **Data minimization** — KYC fields collected only
when the phase requires. 6. Retention schedule — ledger/audit per legal minimums; marketing-adjacent
data none; PII reviewed annually. 7. Export/delete requests — honored where legally allowed (ledger
and audit are retained per law; PII deletable when obligations lapse). 8. **Staff access** — RBAC
least-privilege, audited. 9–10. **Vendor segregation + platform boundaries** — every party, invoice,
and split rule carries its platform; cross-platform queries are owner/auditor-only.

## Retention schedule (initial)

Ledger + audit: 7 years. Authorization records: per Nacha (2 years post-revocation minimum). W-9/tax:
4 years post-filing. KYC files: 5 years post-relationship. PII with no live obligation: delete on
request. All windows reviewed by counsel before launch.

## The wallet lock (Phase 3)

Stored value activates only after, in order: CCO + BSA/AML sign-off · sponsor-bank agreement ·
MTL decision (license portfolio vs agency model) · KYC/KYB gating live · AML monitoring + suspicious
queue live · sanctions screening live. Until every box is checked, `walletOperation()` throws — the
lock is code, not a promise.
