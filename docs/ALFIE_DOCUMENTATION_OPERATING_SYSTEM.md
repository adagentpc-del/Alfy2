# Alfie Documentation Operating System (ADOS)

**Version 1.0 · 2026-06-26 · Owner: Alyssa DelTorre (CEO) · Steward: Chief Data Architect**

> The permanent governance framework for all knowledge in Alfie2. It defines how every document is
> created, organized, versioned, reviewed, linked, updated, approved, archived, and discovered. It
> governs documentation; it does not duplicate the Constitution, Master Control, Architecture,
> Engineering Standards, Build Queue, Release Plan, or the spec library. Nothing enters Alfie's
> knowledge base without following ADOS. Where ADOS conflicts with the Constitution, the Constitution
> wins.

---

## 1. Documentation Philosophy

Knowledge is a first-class system. Documentation is infrastructure, not an afterthought, and every
document is an operational asset with an owner, a version, and relationships.

- **Why documentation exists.** To make the system understandable, governable, and improvable by both
  humans and AI. A capability that is not documented cannot be safely operated, reviewed, or scaled.
- **How documentation compounds.** Each document becomes a reusable asset. Captured decisions prevent
  re-litigation; captured procedures become SOPs; captured patterns become templates and skills. The
  knowledge base appreciates over time the way capital does.
- **How documentation enables AI.** Agents act correctly only when their context is correct.
  Well-structured, current, machine-readable documentation is the substrate agents load to do business-
  aware, safe work. Stale or contradictory docs produce stale or contradictory agents.
- **Knowledge as infrastructure.** Documents are wired together, owned, versioned, and monitored for
  health exactly like services. Documentation debt is real debt and is paid down deliberately.

---

## 2. Document Taxonomy

Every document belongs to exactly one primary type. Types and their homes:

| Type | Purpose | Typical home |
|---|---|---|
| Constitution | Supreme governing principles | `ALFIE_CONSTITUTION.md` |
| Architecture | System design | `ALFIE2_OPERATIONS_ARCHITECTURE.md` |
| Engineering Standards | How engineering is done | `ALFIE_ENGINEERING_STANDARDS.md` |
| Specifications | What to build, precisely | AESL (Build Queue + spec template) |
| Algorithms | Decision/scoring logic (private) | engine code + algorithm notes |
| Playbooks | Repeatable strategic plays | knowledge base |
| SOPs | Step-by-step operating procedures | knowledge base |
| Business Profiles | Per-business identity, voice, rules | `business-profile` engine |
| Department Manuals | Department mission and loops | `department-os` |
| Prompt Packs | Reusable, versioned prompts | build-from-brainstorm / KB |
| Templates | Reusable output structures | knowledge vault |
| Research | Investigations and findings | knowledge base (Research) |
| Decision Records | Decisions, tradeoffs, outcomes | decision records (§11) |
| Release Notes | What shipped per release | `CHANGELOG.md` / release docs |
| Changelogs | Chronological change history | `docs/CHANGELOG.md` |
| Policies | Governing rules (freeze, security) | `docs/` |
| Developer Guides | How to work in a subsystem | `docs/` |
| UI / API / Schema / Connector / Testing Specs | Surface-level specifications | AESL |
| Operational Reviews | Cadence outputs | review-cadence |
| Meeting Notes / Founder Notes / Brain Dumps | Raw input | capture inbox (§12) |
| Lessons Learned | Post-incident and retro learnings | knowledge base |
| Archived Documents | Retired but retained | archive |

A document that does not fit a type is triaged into the closest one and flagged for taxonomy review, not
left untyped.

---

## 3. Universal Metadata Standard

Every document carries a metadata header. Missing required metadata is a documentation defect (§13).

| Field | Meaning |
|---|---|
| Document ID | Stable unique identifier (never reused) |
| Document Type | One primary type from §2 |
| Owner | Accountable party (human or AI role) |
| Approver | Who ratifies changes |
| Status | One lifecycle state (§4) |
| Version | Semantic version (§6) |
| Created | Creation date |
| Updated | Last substantive update |
| Dependencies | Documents this relies on |
| Parent | The document directly above it |
| Children | Documents directly beneath it |
| Referenced By | Documents that cite it |
| Business | Owning business, or "platform" |
| Department | Owning department, if any |
| AI Owner | Responsible AI role |
| Human Owner | Responsible person (default: founder or delegate) |
| Priority | P0–P3 |
| Security Classification | Public · Internal · Confidential · Restricted |
| Review Frequency | How often it must be re-verified |
| Confidence | Author's confidence in its currency |
| Source of Truth | Whether it is canonical for its facts |
| Supersedes | Document(s) it replaces |
| Superseded By | Document that replaces it, once retired |

---

## 4. Lifecycle

Every document is in exactly one state.

- **Draft.** Being written. Not authoritative. Not loaded by agents as truth.
- **Review.** Submitted for the relevant reviews (§7). Changes still expected.
- **Approved.** Ratified by its approver. Authoritative for its scope. Changes now require versioning
  and re-review.
- **Building.** An approved spec whose implementation is in progress.
- **Testing.** Implementation complete, under verification against acceptance criteria.
- **Production.** Live and in force; reflects the running system; loaded by agents as current truth.
- **Deprecated.** Superseded or no longer recommended; retained with a pointer to its replacement; not
  loaded as current truth.
- **Archived.** Retired from active use, preserved for history and audit; read-only.
- **Deleted.** Removed only under governance (§17) when retention is neither required nor useful;
  recorded in the change log.

Agents never treat Draft or Deprecated documents as current truth, and never overwrite Approved or
Production documents (§16).

---

## 5. Knowledge Graph Rules

- **Every document links upward, downward, and laterally.** Upward to its parent and governing
  documents; downward to its children; laterally to related specs and dependencies.
- **No orphans.** A document with no relationships is a defect. Every document is reachable from Master
  Control.
- **Discoverability is mandatory.** If it cannot be found from the graph, it does not exist
  operationally.
- **Relationships are generated and maintained,** not left to memory: references, dependencies, parents,
  and children are recorded in metadata and kept current.
- **Dependency mapping and impact analysis.** Before a document changes, its dependents are known so the
  blast radius is understood; after it changes, dependents are reconciled.

---

## 6. Version Control Rules

- **Semantic versioning.** Major for breaking changes to meaning or structure; minor for additive
  changes; patch for corrections and clarifications.
- **Review log.** Each version records who reviewed and approved it.
- **Decision log.** Substantive changes link to the decision record that justifies them.
- **Breaking changes** require migration notes for dependents and a rollback path.
- **Rollback documentation.** Every versioned governing document can be restored to its prior approved
  state through version control.

---

## 7. Review Process

| Review | Reviewer | When |
|---|---|---|
| Quality | Document steward | Every change |
| Architecture | Chief Systems Architect | Structural or system-affecting docs |
| Engineering | Owning department lead | Specs and standards |
| Security | Chief Security & Compliance Officer | Anything touching access, data, secrets, gates |
| Business | Relevant business owner | Business profiles, offers, pricing, revenue docs |
| Founder | Alyssa DelTorre | Constitution, policies, money/public/legal, and any go/no-go |

**Approval workflow.** Draft → required reviews pass → approver ratifies → status moves to Approved (or
Building for specs). High-impact and irreversible documentation decisions escalate to the founder. The
quality checklist (completeness, accuracy, consistency, traceability, links, metadata, no placeholders)
must pass before ratification.

---

## 8. Documentation Quality Standards

- **Completeness.** All required sections and metadata present; no placeholders or open TODOs in
  governing documents.
- **Accuracy.** Reflects the live system. Counts, statuses, and claims are true at the version date.
- **Consistency.** Agrees with the Constitution and the documents above it; no contradictions.
- **Traceability.** Every claim of record links to its source of truth; decisions link to their
  reasoning.
- **Maintainability.** Structured so it can be updated in place rather than appended around.
- **Readability (human).** Plain language, clear structure, premium and direct.
- **Actionability.** Tells the reader what changed, why it matters, and what to do.
- **Machine readability.** Consistent headings, metadata, and link conventions so agents can parse,
  load, and relate documents reliably.

---

## 9. Naming Standards

Aligned with `ALFIE_ENGINEERING_STANDARDS.md` §3.

- **Files:** descriptive kebab-case or the established UPPER_SNAKE for top-level governing documents.
- **Folders:** by function, matching the repository structure; no new top-level homes without authority.
- **Specifications:** stable `AESL-NNN` identifiers.
- **Algorithms:** named by what they decide, kept private in public-facing copy.
- **Schemas:** unique, prefixed, identical names across contract, mirror, and table.
- **Agents, departments, businesses, releases:** the canonical names registered in Master Control; one
  name per thing, the same everywhere, confusable pairs kept explicitly distinct.

---

## 10. Cross-Referencing Rules

Every document references, at minimum: the Constitution (governing authority), Master Control (its
registration), the relevant Architecture section, its related specifications and dependencies, the
Build Queue item or Release it serves, and its owner. References are explicit and navigable, never
implied. A document that cannot state what it depends on and what depends on it is incomplete.

---

## 11. Decision Records

Decisions are stored as first-class documents so the future understands the past.

- **What is stored:** the decision, its context, the options considered, the tradeoffs, the reasoning,
  the expected outcome, and later the actual outcome.
- **Rejected ideas are kept,** with why they were rejected, so they are not relitigated and so the
  reasoning survives staff and context changes.
- **Reversibility is recorded** (one-way versus two-way door), tying decisions to the approval posture
  required.
- Decision records are append-only and linked from the documents and systems they affect.

---

## 12. Knowledge Capture

Raw input is captured, then refined into operational assets. Sources: conversations, brain dumps,
meetings, research, execution output, QA, production events, failures, and successes.

The capture loop: **capture → triage → refine → classify → approve (if it changes a rule or automation)
→ publish → link.** Refined output becomes knowledge, templates, SOPs, playbooks, agent skills, or
algorithms, governed by the continuous-improvement loop in the Architecture. Nothing becomes operational
doctrine untested; raw capture is never loaded by agents as truth until it is refined and approved.

---

## 13. Automation

Documentation health is maintained by automation, not vigilance alone. The system supports:

- **Auto-tagging** by type and subject.
- **Auto-linking** of references, parents, children, and dependencies.
- **Relationship detection** to keep the graph current.
- **Duplicate detection** to prevent two sources of truth for the same fact.
- **Contradiction detection** across documents and against the live system.
- **Outdated-documentation alerts** when review frequency lapses or the system diverges from the doc.
- **Missing-dependency, missing-owner, and missing-review alerts** so no document drifts into an
  ungoverned state.

These checks treat findings as defects to be resolved, consistent with Engineering Standards §17–§18.

---

## 14. Search

Knowledge must be findable many ways:

- **Global search** across all documents.
- **Semantic search** by meaning, not just keywords.
- **Relationship search** (what links to or from this).
- **Dependency search** (what this needs, what needs this).
- **Business, department, and AI-owner search.**
- **Version search** (what changed, and when).

Search respects security classification: restricted content is not surfaced outside its authorized
scope.

---

## 15. Knowledge Health Dashboard

Documentation is measured like any system. Tracked metrics:

- Documentation coverage of the live system.
- Percentage current versus outdated.
- Missing documents and missing metadata.
- Broken links and orphan documents.
- Duplicate documents and detected contradictions.
- Pending reviews and overdue reviews.
- Knowledge growth over time.
- Documentation debt outstanding.

This dashboard surfaces into Master Control's metrics and the review cadence; declining health is acted
on, not observed.

---

## 16. AI Behavior

How agents interact with documentation, bounded by the Constitution and Engineering Standards:

- **Creating.** Agents draft documents in Draft status with full metadata and correct links. New
  documents register in Master Control.
- **Updating.** Agents propose changes as new versions in Review; they do not silently alter Approved or
  Production documents.
- **Requesting approval.** Changes that affect rules, automations, security, money, or public content
  are routed through the approval gate to the human approver.
- **Archiving.** Agents archive only superseded documents, leaving a pointer from old to new; archival
  is recorded.
- **Never overwriting approved knowledge.** An agent cannot replace, delete, or contradict Approved or
  Production documentation without explicit human approval. Conflicts are surfaced, not resolved
  unilaterally.

---

## 17. Governance

| Responsibility | Holder |
|---|---|
| Owns documentation as a system | Chief Data Architect (steward), under the CEO |
| Owns a given document | Its named Owner (human or AI role) |
| Approves changes | The document's Approver; founder for governing, money, public, or legal docs |
| Archives | Document steward, on supersession |
| Deletes | Only the founder or delegate, under retention policy, recorded in the change log |
| Audits | Chief Security & Compliance Officer (classification, access, integrity) + steward (health) |

Governing documents (Constitution, policies, and anything money/public/legal) change only with founder
approval and follow the amendment process in the Constitution §25. The non-negotiable rule: documentation
governance may be strengthened but never weakened to permit ungoverned, unowned, or untraceable
knowledge.

---

*ADOS governs all knowledge in Alfie2 beneath the Constitution and in concert with Master Control, the
Architecture, the Engineering Standards, the Build Queue, the Release Plan, and the spec library. It
exists so that knowledge stays a navigable, owned, current, and trustworthy asset for many years.*
