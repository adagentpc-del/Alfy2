/**
 * Runtime smoke for the live AI layer (packages/core/src/ai-adapter). Proves: the Anthropic transport
 * speaks the Messages API correctly (headers, body, response parsing) against a fake fetch; metering
 * prices every call and reports usage; the daily budget kill-switch stops runaway spend; and the
 * credential seam degrades gracefully (no key / placeholder key → undefined, feature off).
 * No real key, no real calls. Run: `tsx scripts/ai-adapter-smoke.mts`.
 */
import assert from "node:assert/strict";
import { AnthropicTransport, MeteredAi, createAiFromEnv } from "@alfy2/core";
import { AI_PRICES_CENTS_PER_MTOK } from "@alfy2/shared";

let now = new Date("2026-07-02T12:00:00.000Z");

// === 1. Transport: correct request shape, correct parsing. ===
let captured: any = null;
const fakeFetch = (async (url: string, init: RequestInit) => {
  captured = { url, headers: init.headers, body: JSON.parse(String(init.body)) };
  return {
    ok: true, status: 200,
    json: async () => ({ content: [{ type: "text", text: "TRIAGED: revenue/now" }], usage: { input_tokens: 120, output_tokens: 40 } }),
    text: async () => "",
  };
}) as unknown as typeof fetch;
const transport = new AnthropicTransport("sk-test-key", { fetchImpl: fakeFetch });
const raw = await transport.complete({ kind: "triage", system: "sys", prompt: "hello", max_tokens: 300, model: "claude-sonnet-5" });
assert.equal(captured.url, "https://api.anthropic.com/v1/messages");
assert.equal(captured.headers["x-api-key"], "sk-test-key");
assert.equal(captured.headers["anthropic-version"], "2023-06-01");
assert.equal(captured.body.model, "claude-sonnet-5");
assert.equal(captured.body.system, "sys");
assert.deepEqual(captured.body.messages, [{ role: "user", content: "hello" }]);
assert.equal(raw.text, "TRIAGED: revenue/now");
console.log("[1] Anthropic transport: request shape + response parsing ✔");

// === 2. Metering: exact price math + usage callback. ===
const usages: any[] = [];
const ai = new MeteredAi(transport, { clock: () => now, onUsage: (u) => usages.push(u) });
const r = await ai.complete({ kind: "triage", prompt: "hello", max_tokens: 300, model: "claude-sonnet-5", system: "" });
const price = AI_PRICES_CENTS_PER_MTOK["claude-sonnet-5"];
const expected = (120 / 1e6) * price.input + (40 / 1e6) * price.output;
assert.ok(Math.abs(r.usage.cost_cents - expected) < 1e-9, "cost math exact");
assert.equal(usages.length, 1, "usage reported");
assert.equal(ai.spentTodayCents() > 0, true);
console.log(`[2] metering: 120in/40out @ sonnet = ${r.usage.cost_cents}¢, usage callback fired ✔`);

// === 3. Daily budget kill-switch: exhausted → throws; new day → resets. ===
const bigFetch = (async () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: "x" }], usage: { input_tokens: 0, output_tokens: 400_000 } }) })) as unknown as typeof fetch;
const capped = new MeteredAi(new AnthropicTransport("k", { fetchImpl: bigFetch }), { clock: () => now, daily_budget_cents: 500 });
await capped.complete({ kind: "other", prompt: "big", max_tokens: 4096, model: "claude-sonnet-5", system: "" }); // 400k out ≈ 600¢ > 500¢ budget consumed
await assert.rejects(() => capped.complete({ kind: "other", prompt: "more", max_tokens: 10, model: "claude-sonnet-5", system: "" }), /daily budget exhausted/);
now = new Date("2026-07-03T09:00:00.000Z");
await capped.complete({ kind: "other", prompt: "new day", max_tokens: 10, model: "claude-sonnet-5", system: "" });
console.log("[3] budget kill-switch: blocks after cap, resets next day ✔");

// === 4. Credential seam: off gracefully without a real key. ===
assert.equal(createAiFromEnv(undefined), undefined);
assert.equal(createAiFromEnv(""), undefined);
assert.equal(createAiFromEnv("YOUR_AI_KEY"), undefined);
assert.ok(createAiFromEnv("sk-real-looking", { fetchImpl: fakeFetch }) instanceof MeteredAi);
console.log("[4] credential seam: no key / placeholder → OFF; real key → live ✔");

// === 5. Provider errors surface with status + body, never silently. ===
const errFetch = (async () => ({ ok: false, status: 429, json: async () => ({}), text: async () => '{"error":{"type":"rate_limit_error"}}' })) as unknown as typeof fetch;
await assert.rejects(
  () => new AnthropicTransport("k", { fetchImpl: errFetch }).complete({ kind: "other", prompt: "x", max_tokens: 10, model: "claude-sonnet-5", system: "" }),
  /HTTP 429.*rate_limit_error/,
);
console.log("[5] provider errors carry status + body ✔");

console.log("\nAI ADAPTER SMOKE OK — transport correct, every call metered with exact cost math, daily budget kill-switch enforced, credential seam degrades gracefully, provider errors legible. Plug AI_PROVIDER_API_KEY in and this layer goes live unchanged.");
