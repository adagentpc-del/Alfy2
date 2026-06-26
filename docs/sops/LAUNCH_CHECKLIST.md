# Launch Checklist

Use during Phase 9 of `BUILD_SHIP_SOP.md`. This drives the Ship Gate and Press Live Mode. Copy per build. Nothing ships until all eight Ship Gate checks pass and Alyssa approves.

**Project:** ______________________  **Launch owner:** ______________  **Target date:** __________

## Pre-launch verification (Press Live runs these automatically)
- [ ] **GitHub branch is clean** (no uncommitted secrets, PR approved).
- [ ] **Required environment variables exist** in the deploy target.
- [ ] **No secrets committed** to the repository.
- [ ] **Supabase migrations are ready** and apply cleanly.
- [ ] **RLS policies enabled** on every table.
- [ ] **Hosting service config ready** (build command, start command, health-check path).
- [ ] **Email sender / domain verified** (if the build sends email).
- [ ] **Webhooks configured** and reachable (if used).
- [ ] **Tests pass** (CI green).
- [ ] **Health checks pass.**
- [ ] **Rollback plan exists** and was tested.
- [ ] **Audit logging enabled.**

## If anything is missing
Do not fail silently. For each missing item:
- [ ] Show the exact missing item.
- [ ] Show where Alyssa gets it.
- [ ] Show exactly where to paste it.
- [ ] Continue checking everything else.

Press Live output is one of: `READY TO LAUNCH` / `BLOCKED BY SECRETS` / `BLOCKED BY CONFIG` / `BLOCKED BY TEST FAILURE` / `LIVE`.

## The Ship Gate (all eight must pass)
- [ ] Requirement check
- [ ] Security check
- [ ] Permission check
- [ ] Database check
- [ ] Test check
- [ ] Documentation check
- [ ] Rollback check
- [ ] Approval check

**Ship Gate output:** `READY TO SHIP` / `NEEDS REVIEW` / `DO NOT SHIP`

## Final approval
- [ ] **Alyssa approves final shipping.** (Required. No production merge or deploy without it.)

## Launch sequence (after READY TO SHIP + approval)
- [ ] Deploy.
- [ ] Run smoke tests on production.
- [ ] Verify database connection.
- [ ] Verify email sending (if applicable).
- [ ] Verify auth / login.
- [ ] Verify the dashboard / main screen loads.
- [ ] Log the launch event (audit).
- [ ] Update documentation and CHANGELOG.
- [ ] Mark module **LIVE**.
- [ ] Open the post-launch review (Phase 10).

**The human-only steps:** credentials, payments, legal approval, final launch approval. Alfy² prepares the other 95%.
