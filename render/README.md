# Video rendering (HyperFrames, free)

Renders HTML compositions to MP4 on GitHub Actions using HeyGen's open-source
[HyperFrames](https://github.com/heygen-com/hyperframes) CLI (Apache-2.0, run via
`npx`, nothing vendored here). No HeyGen account, paid product, or API key. The
workflow never posts or publishes anything; it only uploads an artifact.

## Add a composition
1. Copy `render/compositions/example/` to `render/compositions/<name>/`.
   `<name>` must match `^[a-z0-9-]+$` (max 64 chars).
2. Edit `index.html`. Format (per the HyperFrames docs): root element with
   `data-composition-id`, `data-width`, `data-height`, `data-duration`; timed
   children with `data-start` and `data-duration`; one paused GSAP timeline
   registered at `window.__timelines["<composition-id>"]`.
3. Keep animation deterministic (no clocks, unseeded random, or network at render).

## Trigger
GitHub, Actions tab, "Render video", Run workflow, enter the folder name.
Download the `video-<name>` artifact (kept 7 days) from the run page.
Local: `node render/render.mjs <name>` (needs Node 22+, ffmpeg) writes `render/out/<name>.mp4`.
Tests: `node --test render/render.test.mjs`.

## Cost
- Public repos: $0, standard hosted runners are free.
- Private repos: uses your plan's free minutes and artifact storage quota; beyond that it is billed.
  Linux minutes count 1x. The job has a 30 minute timeout.

## Not verified (written without running the real CLI)
- The sandbox had no network, so `hyperframes@0.8.159` was never executed. That version
  was read from a local clone's `packages/cli/package.json`; confirm it is published on npm.
- CLI flags (`render <dir> --output`, `browser ensure`) come from the clone's docs only.
- Whether `ubuntu-latest` needs extra apt packages for Chrome is unknown; `browser ensure`
  should download one, but if render fails on missing libraries, run `hyperframes doctor`.
- The example loads GSAP from jsdelivr at render time (needs network on the runner).
- Render time and the exact 6s output were not measured.
- Only `render.mjs` validation is tested (`node:test`), not the video output.
