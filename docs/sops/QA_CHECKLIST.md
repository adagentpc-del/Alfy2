# QA Checklist

Use during Phase 8 of `BUILD_SHIP_SOP.md`. This is also the Implementation Review Agent's checklist after a coding agent finishes work. Copy per build.

**Project:** ______________________  **Reviewer:** ______________  **Date:** __________

## 1. Requirements
- [ ] Every must-have feature works end to end.
- [ ] The core flow completes without dead ends.
- [ ] Acceptance criteria from the Build Packet are all met.
- [ ] Non-goals were respected (no unrequested scope crept in).

## 2. Correctness & architecture
- [ ] Correct files were created in the right places.
- [ ] Architecture and layer order were followed (contracts → db → backend → agents → frontend → automation).
- [ ] Nothing existing was broken (regression pass on adjacent features).
- [ ] Naming is consistent with conventions (no ad-hoc names).

## 3. Security
- [ ] No secrets in code, logs, or committed files.
- [ ] RLS enforced; cannot read or write another tenant's rows.
- [ ] Permissions preserved; least privilege intact; no privilege escalation path.
- [ ] All external input validated at the boundary.
- [ ] Irreversible actions are approval-gated.
- [ ] Risks found are listed with severity.

## 4. Database
- [ ] Migrations apply cleanly on a fresh database and are reversible (or append-only by design).
- [ ] Audit and tenant fields present.
- [ ] Indexes cover the hot query paths.
- [ ] No destructive change without a backup/rollback path.

## 5. Tests
- [ ] Unit tests for core logic exist and pass.
- [ ] One integration test covers the core flow.
- [ ] Edge cases and failure modes tested (empty, invalid, unauthorized, external-service-down).
- [ ] Test run is green in CI.

## 6. Documentation
- [ ] README / module doc updated.
- [ ] CHANGELOG entry added.
- [ ] `.env.example` and setup steps current.
- [ ] Any new SOP or reusable asset documented.

## 7. UX quality
- [ ] Loading, empty, and error states present and clear.
- [ ] Mobile layout works.
- [ ] Accessibility basics (contrast, labels, keyboard) pass.
- [ ] Copy is clear and on-brand.

## 8. Divini Standard
- [ ] Creates trust, reduces friction, increases leverage, compounds knowledge, protects people.
- [ ] Produces reusable infrastructure (not trapped in one project).
- [ ] We would still build this as a billion-dollar company and be proud of it in ten years.

## Verdict
- [ ] **APPROVE** — ready for Launch (Phase 9).
- [ ] **NEEDS REVISION** — list required fixes below.
- [ ] **REJECT** — reason below.

**Risks found:** ______________________________________________

**Recommended fixes:** _________________________________________
