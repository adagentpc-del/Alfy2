import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { validateJob, isDue, parseSchedule, renderDigest, findStale, renderStale, renderSummary, isSafeRelPath } from './lib.mjs';

const base = { id: 'a-1', schedule: 'daily', kind: 'heartbeat', params: {}, requiresApproval: false, enabled: true };

test('validateJob accepts valid and rejects bad jobs', () => {
  assert.ok(validateJob(base).ok);
  assert.ok(!validateJob({ ...base, kind: 'send_email' }).ok);
  assert.ok(!validateJob({ ...base, id: '../x' }).ok);
  assert.ok(!validateJob({ ...base, enabled: 'yes' }).ok);
  assert.ok(!validateJob({ ...base, schedule: 'whenever' }).ok);
  assert.ok(!validateJob(null).ok);
  assert.ok(!validateJob({ ...base, kind: 'fetch_digest', params: { urls: ['http://x.com'] } }).ok);
  assert.ok(!validateJob({ ...base, kind: 'fetch_digest', params: {} }).ok);
  assert.ok(validateJob({ ...base, kind: 'fetch_digest', params: { queries: ['q'] } }).ok);
  assert.ok(!validateJob({ ...base, kind: 'stale_check', params: { file: '../../etc/passwd', days: 3 } }).ok);
  assert.ok(validateJob({ ...base, kind: 'stale_check', params: { file: 'a/b.json', days: 3 } }).ok);
});

test('isSafeRelPath', () => {
  assert.ok(isSafeRelPath('scheduler/data/x.json'));
  for (const p of ['/etc/x', '..', 'a/../b', 'C:\\x', '', 5]) assert.ok(!isSafeRelPath(p));
});

test('parseSchedule / isDue', () => {
  assert.deepEqual(parseSchedule('weekly@mon@09'), { every: 'weekly', day: 1, hour: 9 });
  assert.equal(parseSchedule('weekly'), null);
  assert.equal(parseSchedule('daily@25'), null);
  const mon9 = new Date('2026-10-12T09:15:00Z'); // Monday
  assert.ok(isDue('hourly', mon9));
  assert.ok(isDue('daily@09', mon9));
  assert.ok(!isDue('daily@10', mon9));
  assert.ok(isDue('weekly@mon@09', mon9));
  assert.ok(!isDue('weekly@tue@09', mon9));
  assert.ok(isDue('daily', new Date('2026-10-12T06:00:00Z')));
  assert.ok(!isDue('bogus', mon9));
});

test('renderDigest', () => {
  const md = renderDigest({ id: 'j', title: 'T', date: '2026-10-15', sections: [
    { heading: 'Search: x', items: [{ title: 'A', url: 'https://a.com', snippet: 'snip' }] },
    { heading: 'u', error: 'proxy 403' }] });
  assert.match(md, /^# T \(2026-10-15\)/);
  assert.match(md, /- \[A\]\(https:\/\/a\.com\) - snip/);
  assert.match(md, /_Failed: proxy 403_/);
  assert.match(md, /nothing was sent/);
});

test('findStale / renderStale', () => {
  const now = new Date('2026-10-15T00:00:00Z');
  const r = findStale([{ name: 'old', updated: '2026-09-01' }, { name: 'new', updated: '2026-10-14' }, { name: 'nodate' }], { days: 14, labelField: 'name' }, now);
  assert.equal(r.stale.length, 1);
  assert.equal(r.stale[0].label, 'old');
  assert.deepEqual(r.undated, ['nodate']);
  assert.match(renderStale({ id: 'j', date: 'd', days: 14, total: 3, ...r }), /old - last updated 2026-09-01/);
  assert.deepEqual(findStale(null, { days: 1 }, now), { stale: [], undated: [] });
});

test('renderSummary escapes pipes', () => {
  const s = renderSummary([{ id: 'a', kind: 'k', status: 'ok', detail: 'x|y' }], { dry: true, date: 'd' });
  assert.match(s, /\(dry run\)/);
  assert.match(s, /x y/);
});

test('example jobs are valid and disabled', () => {
  const dir = new URL('./jobs/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  assert.equal(files.length, 3);
  for (const f of files) {
    const j = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
    assert.ok(validateJob(j).ok, f);
    assert.equal(j.enabled, false);
  }
});
