# R&D Asset — ASI-Arch (GAIR-NLP)

R&D-department intake record for https://github.com/GAIR-NLP/ASI-Arch, vetted **2026-07-02** per the
GitHub Intelligence pattern (`docs/GITHUB_INTELLIGENCE.md`: static vetting, never executes in-place).
Registry entry: `RND_ASSETS` in `apps/web/assets/data.mjs` (surfaced on `/readiness`). Owner:
**Chief Technology Officer Agent** · knowledge steward: **Chief Knowledge Officer Agent**.

## What it is (verified from the live repo)

An autonomous research framework: a multi-agent LLM system that hypothesizes, implements, and validates
novel **linear-attention architectures** end-to-end.

| Component | What it does |
|---|---|
| `pipeline/` | the autonomous loop: planner + code-checker (generate architectures) → trainer + debugger (evaluate) → analyzer (interpret) |
| `database/` | MongoDB experiment memory + FastAPI server + FAISS similarity search + candidate manager + a "model judger" agent that scores architectures |
| `cognition_base/` | RAG service (Flask) over a research-paper corpus — the system's prior knowledge |

Facts: Apache-2.0 · Python · ~1.2k stars / 216 forks · requires Python 3.8+, MongoDB, Docker, CUDA GPU,
16GB+ RAM · claims 106 discovered SOTA architectures.

## Verdict: **NEEDS REVIEW → evaluate in sandbox** (not SAFE for in-place use)

The system **executes generated code and trains models** and launches three network services. That is
its purpose, and exactly why it must never touch Alfy2's runtime, data, or credentials.

### Guardrails (binding)

1. Sandbox machine only: isolated network, no Alfy2 secrets/tokens, dedicated GPU box.
2. Static review of the pipeline entry points before the first run.
3. GPU/experiment spend requires a budget approval **before** compute is provisioned.
4. Findings return to Alfy2 as **knowledge items** (source-of-truth provenance: `external_research`),
   never as code merged without the ship gate.
5. Revisit this record if the upstream repo changes materially (license, execution model).

## Why the R&D department wants it (the real value)

Beyond its architectures, ASI-Arch is a working reference for the **research-loop shape Alfy2 already
specifies** — it validates our design with a system that ran 1,700+ autonomous experiments:

| ASI-Arch pattern | Alfy2 counterpart |
|---|---|
| planner → checker → trainer → analyzer pipeline | delegation packets through the chain of command |
| candidate manager + model judger | Agent Evaluation Lab (ADR-0045) promotion ladder |
| MongoDB experiment memory + FAISS | knowledge brain / memory engine + graph |
| cognition base (RAG over papers) | knowledge ingestion pipeline (ADR-0030) |
| fully autonomous loop, no human gate | **the anti-pattern**: Alfy2 keeps approval gates in the loop |

## Next steps (R&D queue)

1. CTO Agent: sandbox environment checklist (isolated box spec) — packet via the Build Factory.
2. CKO Agent: ingest the ASI-Arch paper + README into the knowledge brain with provenance.
3. Decision memo after first sandbox run: adopt patterns / monitor / archive — to Alyssa with the
   Expert Council lens.
