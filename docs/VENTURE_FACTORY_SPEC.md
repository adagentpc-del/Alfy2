# Venture Factory — Spec

The pipeline that turns "I have an idea" into a registered portfolio company. The factory already exists in
three pieces; this spec defines the single pipeline through them.

**Existing machinery:** Idea Builder (`docs/IDEA_BUILDER.md`, ADR-0008 — fifteen-section workup, never
builds until approved) → Builder Mode (ADR-0060 in `docs/CONSTITUTION_AND_ENTERPRISE.md` — trigger phrase
"I want to build", 18-stage venture operating system, human-in-command, `awaiting_approval` until
`approve()`) → `venture-studio` + `business` factory + Business Template. Supporting: Vision Builder
(ADR-0125), Business Simulation Engine (ADR-0048), Opportunity Intelligence (ADR-0019).

## The pipeline (stage → gate)

| Stage | What happens | Engine | Gate |
|---|---|---|---|
| 1. Capture | idea lands in Executive Inbox from any source | `executive-inbox` | none (logged) |
| 2. Workup | fifteen-section idea workup: problem, market, offer, moat, economics, risks | `idea-builder` | none |
| 3. Simulate | EV vs risk/stress/time vs the best alternative | `business-simulation` | none |
| 4. Verdict | portfolio fit: does it beat existing ventures for the same attention? | Portfolio Strategist + Expert Council lens | **Alyssa: go / park / kill** |
| 5. Venture OS | Builder Mode produces the 18-stage venture operating system | Builder Mode | **Alyssa: approve()** |
| 6. Register | company enters the registry with profile + 13 departments + domain models + playbooks | Enterprise Setup Engine (`docs/ENTERPRISE_SETUP_ENGINE_SPEC.md`) | none (mechanical) |
| 7. Build | software/product work becomes build packets | Build Factory (`docs/BUILD_FACTORY_SPEC.md`) | ship gate |
| 8. Launch | GTM plan generated and executed | GTM Factory (`docs/GTM_FACTORY_SPEC.md`) | approval per external action |

Parked ideas keep their workups in the knowledge vault — the factory never loses an idea, it only
sequences them.

## Rules

1. **No venture without a workup; no build without a venture OS; no launch without a GTM plan.** Skipping
   stages is a chain-of-command violation.
2. Every stage produces an artifact saved by reference to the Asset Library — the factory's output is
   reusable IP even when the venture is killed.
3. Stage 4 is a real kill gate: the default answer is *no* (Ultimate Design Rule / opportunity-cost lens).
   The factory exists to say no cheaply.
4. A new venture starts with the standard cabinet scoped in (`businesses_used_by`) — it never hires its own
   ungoverned agents.
5. Factory throughput is a portfolio KPI, but the metric that matters is **ventures killed early vs late**.
