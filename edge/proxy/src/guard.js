// Pure request guards for the proxy. No I/O so they can be unit tested in Node.

export function parseAllowlist(raw) {
  return String(raw || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

/** true if host equals an allowlist entry or is a subdomain of one. Empty allowlist denies everything. */
export function hostAllowed(host, allow) {
  const h = String(host || '').toLowerCase().replace(/\.$/, '');
  if (!h || !allow.length) return false;
  return allow.some((a) => h === a || h.endsWith('.' + a));
}

function isPrivateV4(h) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

/** Validate a target URL. Returns { ok, url?, error? }. https only, port 443 only, no IP literals, no credentials, no internal names. */
export function checkTarget(raw, allow) {
  let u;
  try { u = new URL(String(raw || '')); } catch { return { ok: false, error: 'invalid_url' }; }
  if (u.protocol !== 'https:') return { ok: false, error: 'https_only' };
  if (u.username || u.password) return { ok: false, error: 'credentials_not_allowed' };
  if (u.port && u.port !== '443') return { ok: false, error: 'port_not_allowed' };
  const h = u.hostname.toLowerCase();
  if (h.startsWith('[') || h.includes(':')) return { ok: false, error: 'ip_literal_not_allowed' };
  if (/^\d+(\.\d+){0,3}$/.test(h) || isPrivateV4(h)) return { ok: false, error: 'ip_literal_not_allowed' };
  if (h === 'localhost' || !h.includes('.') || /\.(local|internal|localdomain|lan|home|corp)$/.test(h)) return { ok: false, error: 'internal_host' };
  if (!hostAllowed(h, allow)) return { ok: false, error: 'host_not_allowlisted' };
  return { ok: true, url: u };
}

/** Constant-time string compare for the bearer token. */
export function safeEqual(a, b) {
  a = String(a || ''); b = String(b || '');
  let d = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

export function bearer(header) {
  const m = /^Bearer\s+(.+)$/i.exec(String(header || ''));
  return m ? m[1] : '';
}

/** Cheap HTML to text for fetched pages. */
export function htmlToText(html, max = 200000) {
  return String(html || '')
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}

/** Per-isolate sliding-window limiter. Not global: pair with Cloudflare rate limiting rules for a hard cap. */
export function makeLimiter(limit, windowMs) {
  const hits = new Map();
  return (key, now = Date.now()) => {
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= limit) { hits.set(key, arr); return false; }
    arr.push(now); hits.set(key, arr);
    if (hits.size > 500) for (const k of hits.keys()) { if (!hits.get(k).some((t) => now - t < windowMs)) hits.delete(k); }
    return true;
  };
}
