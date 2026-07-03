# Divini Avatar Engine — the Self-Hosted Render Stack (HeyGen replacement)

Companion to `docs/AI_AVATAR_ENGINE_SPEC.md` (governance) and `docs/SOVEREIGN_PRODUCT_SUITE.md`
(directive). This is the build plan for rendering Alyssa's avatar **without any vendor ever
receiving her likeness, voice, or scripts**. Owner: Chief Media Officer; build: CTO/Forge desk;
model evaluation: R&D bench (sandbox rules — same as ASI-Arch).

## The pipeline (4 stages, all open-source or ours)

| # | Stage | Tool (evaluate → pin) | Replaces | Notes |
|---|---|---|---|---|
| 1 | Voice (TTS) | **XTTS-v2 (Coqui)**, fallback **Piper** | ElevenLabs / HeyGen voice | cloned from Alyssa's consent-recorded samples; weights live on our box only |
| 2 | Talking head | **LivePortrait** vs **SadTalker** (R&D eval, one approved script each) | HeyGen render | driven by stage-1 audio + the consented likeness reference image/video |
| 3 | Assembly | **ffmpeg** | vendor post-processing | captions burn-in, `ai_generated` watermark + metadata flag (non-optional), 9:16 / 1:1 / 16:9 presets |
| 4 | Worker | our GPU job worker | vendor cloud | pulls `divini_avatar_render_job` packets, renders, returns output to the review gate |

## Infrastructure

- **GPU:** one 24GB-class card. Rented (RunPod/Lambda-class box, hourly) to start; owned later.
  Renting a bare GPU ≠ a SaaS dependency: the machine is generic compute, the models, weights,
  likeness assets, and scripts are all ours, and any GPU box is substitutable in an afternoon.
- **Deploy:** via Alfy Forge (Coolify packet, Phase 3). Worker env carries **no provider keys** —
  assets are mounted, jobs come from the queue, outputs return for review.
- **Storage:** renders + likeness assets in MinIO (Forge Phase 5); until then, the custody layer.

## Governance (unchanged — the engine plugs into gates that already exist)

Hash-bound script approvals (edits kill the token) → `generateRenderWorkerPacket()` refuses without
an approved, hash-matching script → output returns to the review gate (`publish_public`) → append-only
usage log on every step → consent revocation purges weights, samples, and outputs. Verified by
`pnpm studio:smoke` scenario 8.

## Build order

1. **R&D eval (sandbox):** render ONE approved script through LivePortrait and SadTalker on a rented
   GPU; compare quality/speed/cost; pin the winner. Budget-gated like all R&D spend.
2. **Voice clone:** record the consent-scoped sample set; train XTTS-v2; store weights on our box.
3. **Worker v1:** queue-pull → render → watermark → return. Deploy via Forge packet.
4. **Wire the loop:** Avatar Studio "job → packet" becomes "job → queue" (one function swap — the
   packet format is already the worker's input contract).
5. Retire the HeyGen line item.
