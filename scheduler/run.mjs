#!/usr/bin/env node
// Free scheduler runner. Node 20 built-ins only. Usage: node scheduler/run.mjs [--dry] [--force] [--job <id>]
// Safe by design: only kinds in SAFE_KINDS exist; nothing is ever sent or published.
// requiresApproval jobs write a draft file and open/update a GitHub issue; a human acts on it.
import { readFile, readdir, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateJob, isDue, dateStamp, minuteStamp, renderDigest, findStale, renderStale, renderSummary } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JOBS_DIR = path.join(ROOT, 'scheduler', 'jobs');
const OUT_DIR = path.join(ROOT, 'scheduler', 'out');
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const FORCE = args.includes('--force');
const ONLY = args.includes('--job') ? args[args.indexOf('--job') + 1] : null;
const env = process.env;

async function proxyGet(pathAndQuery) {
  if (!env.PROXY_URL || !env.PROXY_TOKEN) throw new Error('PROXY_URL and PROXY_TOKEN are required');
  const r = await fetch(env.PROXY_URL.replace(/\/+$/, '') + pathAndQuery, { headers: { authorization: 'Bearer ' + env.PROXY_TOKEN }, signal: AbortSignal.timeout(20000) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`proxy ${r.status} ${body.error || ''}`.trim());
  return body;
}

const kinds = {
  async heartbeat(job, date) {
    return { markdown: `# Heartbeat: ${job.id} (${date})\n\n${job.params.message || 'Scheduler is alive.'}\n`, detail: 'ok' };
  },
  async stale_check(job, date) {
    const file = path.resolve(ROOT, job.params.file);
    if (!file.startsWith(ROOT + path.sep)) throw new Error('file escapes repo');
    const data = JSON.parse(await readFile(file, 'utf8'));
    const items = Array.isArray(data) ? data : data[job.params.itemsKey || 'items'];
    const r = findStale(items, job.params);
    const total = Array.isArray(items) ? items.length : 0;
    return { markdown: renderStale({ id: job.id, date, days: job.params.days, total, ...r }), detail: `${r.stale.length}/${total} stale` };
  },
  async fetch_digest(job, date) {
    const sections = []; let fails = 0;
    for (const q of job.params.queries || []) {
      try {
        const d = await proxyGet('/search?q=' + encodeURIComponent(q));
        sections.push({ heading: 'Search: ' + q, items: (d.results || []).slice(0, 8) });
      } catch (e) { fails++; sections.push({ heading: 'Search: ' + q, error: e.message }); }
    }
    for (const u of job.params.urls || []) {
      try {
        const d = await proxyGet('/fetch?format=text&url=' + encodeURIComponent(u));
        sections.push({ heading: u, note: String(d.body || '').slice(0, 1500), items: [{ title: u, url: u }] });
      } catch (e) { fails++; sections.push({ heading: u, error: e.message }); }
    }
    const total = sections.length;
    if (fails === total) throw new Error('all fetches failed: ' + sections[0].error);
    return { markdown: renderDigest({ id: job.id, title: job.title, date, sections }), detail: `${total - fails}/${total} ok` };
  },
};

async function gh(method, p, body) {
  const r = await fetch('https://api.github.com' + p, {
    method, signal: AbortSignal.timeout(20000),
    headers: { authorization: 'Bearer ' + env.GITHUB_TOKEN, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'alfy-scheduler', ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`github ${method} ${p} -> ${r.status}`);
  return r.json();
}

async function upsertApprovalIssue(job, draftRel, markdown, date) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY) return 'draft only (no GITHUB_TOKEN/REPOSITORY)';
  const title = 'Needs approval: ' + job.id;
  const body = `Draft for \`${job.id}\` (${date}). Nothing has been sent or published. Review, then act manually.\n\nFile: \`${draftRel}\` (also in the run artifact)\n\n---\n\n${markdown.slice(0, 50000)}`;
  const repo = env.GITHUB_REPOSITORY;
  const open = await gh('GET', `/repos/${repo}/issues?state=open&per_page=100`);
  const hit = open.find((i) => !i.pull_request && i.title === title);
  if (hit) { await gh('PATCH', `/repos/${repo}/issues/${hit.number}`, { body }); return `issue #${hit.number} updated`; }
  const made = await gh('POST', `/repos/${repo}/issues`, { title, body });
  return `issue #${made.number} opened`;
}

async function loadJobs() {
  const rows = [], jobs = [];
  for (const f of (await readdir(JOBS_DIR)).filter((x) => x.endsWith('.json')).sort()) {
    try {
      const j = JSON.parse(await readFile(path.join(JOBS_DIR, f), 'utf8'));
      const v = validateJob(j);
      if (v.ok) jobs.push(j); else rows.push({ id: j?.id || f, kind: j?.kind, status: 'invalid', detail: v.errors.join('; ') });
    } catch (e) { rows.push({ id: f, status: 'invalid', detail: e.message }); }
  }
  return { jobs, rows };
}

async function main() {
  const now = new Date(), date = dateStamp(now);
  const { jobs, rows } = await loadJobs();
  if (!DRY) {
    await mkdir(OUT_DIR, { recursive: true });
    const lock = path.join(OUT_DIR, `.lock-${minuteStamp(now)}`);
    if (existsSync(lock)) { console.log('Another run already started this minute; exiting.'); return 0; }
    await writeFile(lock, String(process.pid));
  }
  for (const job of jobs) {
    if (ONLY && job.id !== ONLY) continue;
    if (!job.enabled) { rows.push({ id: job.id, kind: job.kind, status: 'disabled' }); continue; }
    if (!FORCE && !ONLY && !isDue(job.schedule, now)) { rows.push({ id: job.id, kind: job.kind, status: 'not due', detail: job.schedule }); continue; }
    try {
      if (DRY) { rows.push({ id: job.id, kind: job.kind, status: 'would run', detail: job.requiresApproval ? 'draft + approval issue' : 'write digest' }); continue; }
      const r = await kinds[job.kind](job, date);
      const rel = `scheduler/out/${date}-${job.id}${job.requiresApproval ? '.draft' : ''}.md`;
      await writeFile(path.join(ROOT, rel), r.markdown);
      let detail = r.detail;
      if (job.requiresApproval) detail += '; ' + await upsertApprovalIssue(job, rel, r.markdown, date).catch((e) => 'issue failed: ' + e.message);
      rows.push({ id: job.id, kind: job.kind, status: 'ok', detail });
    } catch (e) { rows.push({ id: job.id, kind: job.kind, status: 'FAILED', detail: e.message }); }
  }
  const summary = renderSummary(rows, { dry: DRY, date });
  console.log(summary);
  if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, summary).catch(() => {});
  return rows.some((r) => r.status === 'FAILED' || r.status === 'invalid') ? 1 : 0;
}

main().then((c) => { process.exitCode = c; }, (e) => { console.error(e); process.exitCode = 1; });
