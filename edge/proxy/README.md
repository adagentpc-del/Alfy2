# alfy-proxy (Cloudflare Worker, free tier)

Read-only fetch and search for Alfy2 agents and GitHub Actions. Not callable from the dashboard artifact (its CSP blocks outside requests).

- `GET /fetch?url=https://...&format=text` : https, port 443, allowlisted hosts only; no IP literals, credentials or internal names; redirects re-checked (max 3); 1.5 MB cap; text/JSON/XML only.
- `GET /search?q=...` : Brave Search API (free tier). Returns 501 until `BRAVE_API_KEY` is set.
- Every call needs `Authorization: Bearer $PROXY_TOKEN`. 30 requests/min per IP per isolate (add a Cloudflare rate-limit rule for a hard cap).
- Never posts, writes or sends anything. No cookies are forwarded.

Deploy: `npx wrangler deploy`, then `npx wrangler secret put PROXY_TOKEN` (and `BRAVE_API_KEY`). Test: `node --test test/`.
