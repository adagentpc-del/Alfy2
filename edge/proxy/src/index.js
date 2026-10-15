// Cloudflare Worker: read-only fetch + search proxy for Alfy2 agents and GitHub Actions.
// Secrets: PROXY_TOKEN (required), BRAVE_API_KEY (optional, free tier). Var: ALLOWED_HOSTS (comma list, required to fetch).
// The dashboard artifact cannot call this directly (its CSP blocks outside fetches); agents and Actions can.
import { parseAllowlist, checkTarget, safeEqual, bearer, htmlToText, makeLimiter } from './guard.js';

const MAX_BYTES = 1_500_000;
const limiter = makeLimiter(30, 60_000);
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

async function readCapped(res, max) {
  const reader = res.body.getReader(); const chunks = []; let n = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    n += value.length; if (n > max) { try { await reader.cancel(); } catch {} return { text: new TextDecoder().decode(concat(chunks)), truncated: true }; }
    chunks.push(value);
  }
  return { text: new TextDecoder().decode(concat(chunks)), truncated: false };
}
function concat(parts) { const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; }

async function doFetch(url, env, format) {
  const allow = parseAllowlist(env.ALLOWED_HOSTS);
  let cur = url, res;
  for (let hop = 0; hop < 3; hop++) {
    const chk = checkTarget(cur, allow);
    if (!chk.ok) return json({ error: chk.error }, 403);
    res = await fetch(chk.url, { redirect: 'manual', headers: { 'user-agent': 'AlfyProxy/1.0 (+read-only)', accept: 'text/html,application/json,text/plain,*/*;q=0.5' }, signal: AbortSignal.timeout(10000) });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) { cur = new URL(res.headers.get('location'), chk.url).toString(); continue; }
    break;
  }
  if (res.status >= 300 && res.status < 400) return json({ error: 'too_many_redirects' }, 502);
  const type = res.headers.get('content-type') || '';
  if (!/^(text\/|application\/(json|xml|xhtml|rss|atom))/i.test(type)) return json({ error: 'unsupported_content_type', type }, 415);
  const { text, truncated } = await readCapped(res, MAX_BYTES);
  const body = format === 'text' && /html/i.test(type) ? htmlToText(text) : text;
  return json({ url: cur, status: res.status, type, truncated, body });
}

async function doSearch(q, env) {
  if (!env.BRAVE_API_KEY) return json({ error: 'search_not_configured', hint: 'Set BRAVE_API_KEY (free tier) as a secret.' }, 501);
  const r = await fetch('https://api.search.brave.com/res/v1/web/search?count=10&q=' + encodeURIComponent(q), { headers: { accept: 'application/json', 'x-subscription-token': env.BRAVE_API_KEY }, signal: AbortSignal.timeout(10000) });
  if (!r.ok) return json({ error: 'search_failed', status: r.status }, 502);
  const d = await r.json();
  return json({ q, results: ((d.web && d.web.results) || []).map((x) => ({ title: x.title, url: x.url, snippet: x.description })) });
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === '/health') return json({ ok: true });
    if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);
    if (!env.PROXY_TOKEN || !safeEqual(bearer(req.headers.get('authorization')), env.PROXY_TOKEN)) return json({ error: 'unauthorized' }, 401);
    if (!limiter(req.headers.get('cf-connecting-ip') || 'x')) return json({ error: 'rate_limited' }, 429);
    try {
      if (u.pathname === '/fetch') return await doFetch(u.searchParams.get('url'), env, u.searchParams.get('format'));
      if (u.pathname === '/search') { const q = (u.searchParams.get('q') || '').trim().slice(0, 300); return q ? await doSearch(q, env) : json({ error: 'missing_q' }, 400); }
    } catch (e) { return json({ error: 'upstream_error' }, 502); }
    return json({ error: 'not_found' }, 404);
  },
};
