import test from 'node:test'; import assert from 'node:assert/strict';
import { parseAllowlist, hostAllowed, checkTarget, safeEqual, bearer, htmlToText, makeLimiter } from '../src/guard.js';
const allow = parseAllowlist('Example.com, substack.com');
test('allowlist', () => { assert.ok(hostAllowed('a.substack.com', allow)); assert.ok(!hostAllowed('evilsubstack.com', allow)); assert.ok(!hostAllowed('x.com', [])); });
test('rejects bad targets', () => {
  for (const [u, e] of [['http://example.com', 'https_only'], ['https://127.0.0.1/', 'ip_literal_not_allowed'], ['https://169.254.169.254/', 'ip_literal_not_allowed'], ['https://2130706433/', 'ip_literal_not_allowed'], ['https://[::1]/', 'ip_literal_not_allowed'], ['https://localhost/', 'internal_host'], ['https://db.internal/', 'internal_host'], ['https://user:pw@example.com/', 'credentials_not_allowed'], ['https://example.com:8443/', 'port_not_allowed'], ['https://other.com/', 'host_not_allowlisted'], ['nonsense', 'invalid_url'], ['', 'invalid_url']]) assert.equal(checkTarget(u, allow).error, e, u);
});
test('accepts allowlisted https', () => { assert.ok(checkTarget('https://www.example.com/a?b=1', allow).ok); assert.ok(checkTarget('https://example.com:443/', allow).ok); });
test('token compare', () => { assert.ok(safeEqual('abc', 'abc')); assert.ok(!safeEqual('abc', 'abd')); assert.ok(!safeEqual('abc', 'abcd')); assert.ok(!safeEqual('', 'x')); assert.equal(bearer('Bearer t0k'), 't0k'); assert.equal(bearer('Basic x'), ''); });
test('html to text', () => { assert.equal(htmlToText('<p>Hi <b>there</b></p><script>x()</script><p>a&amp;b</p>'), 'Hi there\na&b'); });
test('limiter', () => { const l = makeLimiter(2, 1000); assert.ok(l('k', 0)); assert.ok(l('k', 1)); assert.ok(!l('k', 2)); assert.ok(l('k', 2000)); });
