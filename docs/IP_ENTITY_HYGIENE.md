# IP & Entity Hygiene — Who Owns the Machine

Closes blind spot #9. Status: **analysis-for-review** (house rule: legal/tax documents are prepared
for counsel, never self-executed). Owner: Alyssa + Chief Legal Officer Agent. One counsel session
resolves the open items — the same session as the Continuity Protocol caps.

## Why this is massive

Alfy2 is becoming the operating asset of the whole group. If FounderOS is ever sold, if Divini
Procure raises, or if the foundation is audited, the first diligence question is "who owns the
software that runs this, and under what license does each entity use it?" Today the honest answer is
"unassigned" — cheap to fix now, a crisis to fix during a deal.

## Current honest state

- Code sits in a personal GitHub account (`adagentpc-del/Alfy2`); no assignment document exists.
- Alfy2 embeds work product for multiple entities (Divini Group, portfolio companies, the
  foundation) with no inter-entity license.
- Third-party components are permissive (ASI-Arch vetted Apache-2.0 — see docs/RND_ASSET_ASI_ARCH.md;
  sandbox-only, not shipped). No copyleft in the runtime path.
- The Divini brand assets are used across entities without a written license.

## The clean target (for counsel to confirm or amend)

1. **One owner:** a single entity (Divini Group LLC or a new DelTorre IP holdco) owns Alfy2's code,
   docs, and brand-adjacent assets, via a signed assignment from Alyssa personally (covering all
   work to date).
2. **Licenses down, not copies out:** each operating company and the foundation gets a written
   inter-company license (internal-use, non-transferable). The foundation's must be reviewable for
   nonprofit compliance — shared infrastructure with for-profits needs documented cost/benefit terms.
3. **Contributor coverage:** any future contractor signs IP assignment before commit #1 (template in
   the counsel session).
4. **Trademark check:** "Alfy2", "Divini Pay", "Alfy Forge" — knockout search, then file what's worth
   protecting.
5. **Data separation stays technical AND legal:** tenancy/RLS separates data in the schema; the
   licenses should say who owns which tenant's data (each entity owns its own; the holdco owns the
   engine).

## Checklist (all counsel-gated — prepared, not executed)

- [ ] Choose the owning entity.
- [ ] Personal → entity assignment executed.
- [ ] Inter-company license template + one per entity (foundation's reviewed for nonprofit rules).
- [ ] Contractor IP assignment template on file.
- [ ] Trademark knockout search on the three names.
- [ ] Repo moved to an organization account owned by the owning entity (mechanical, after the papers).
