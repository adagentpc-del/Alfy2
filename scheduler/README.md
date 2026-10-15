# Free scheduler (GitHub Actions, $0, no model, no npm deps)

`.github/workflows/scheduled-jobs.yml` runs hourly (and on manual dispatch) and executes `node scheduler/run.mjs`.
It loads `scheduler/jobs/*.json` and runs only jobs that are `enabled` and due.

## Job fields
`id`, `title`, `schedule`, `kind`, `params`, `requiresApproval`, `enabled`.
- `schedule` (UTC): `hourly`, `daily[@HH]`, `weekly@mon[@HH]` (default hour 06).
- `kind` (the only ones that exist): `fetch_digest` (read-only proxy, writes `scheduler/out/<date>-<id>.md`), `stale_check` (flags items older than `days` in a JSON file), `heartbeat`.
- `requiresApproval: true` never publishes anything. It writes `<date>-<id>.draft.md` and opens/updates the issue `Needs approval: <id>`.

## Setup
1. Deploy `edge/proxy` (see its README).
2. Repo secrets: `PROXY_URL`, `PROXY_TOKEN` (needed for `fetch_digest`). `GITHUB_TOKEN` is automatic.
3. Copy an example job, edit it, set `"enabled": true`, commit.
4. Try it: `node scheduler/run.mjs --dry`. Actions tab, "Scheduled jobs", Run workflow (inputs: dry, force, job).

## CLI
`--dry` (no writes, no network), `--force` (ignore schedule), `--job <id>` (one job, ignores schedule).
Results: step summary table plus the `scheduler-out` artifact. A lock file per minute blocks double runs.
Tests: `node --test scheduler/*.test.mjs`
