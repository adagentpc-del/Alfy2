import {
  AI_PRICES_CENTS_PER_MTOK,
  AiRequestSchema,
  AiResultSchema,
  type AiRequest,
  type AiResult,
  type AiUsage,
} from "@alfy2/shared";

/**
 * The live AI layer (docs/MODEL_ROUTER.md; docs/VISION_GAP_AUDIT.md critical-path step 2).
 * Provider transport is injected so everything is testable without a key, and the whole layer is
 * OPTIONAL by design: no AI_PROVIDER_API_KEY → `createAiFromEnv` returns undefined and callers
 * degrade gracefully (503 ai_not_configured / job skipped). Every call is metered via the shared
 * price table and reported through `onUsage` — the Cost & Token CFO gets real numbers from call #1.
 */

export interface AiTransport {
  complete(req: AiRequest): Promise<{ text: string; input_tokens: number; output_tokens: number }>;
}

/** Anthropic Messages API transport. fetch is injectable for tests; key comes from env, never code. */
export class AnthropicTransport implements AiTransport {
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(apiKey: string, options: { fetchImpl?: typeof fetch; baseUrl?: string } = {}) {
    this.apiKey = apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.baseUrl = options.baseUrl ?? "https://api.anthropic.com";
  }

  async complete(req: AiRequest): Promise<{ text: string; input_tokens: number; output_tokens: number }> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: req.model,
        max_tokens: req.max_tokens,
        ...(req.system ? { system: req.system } : {}),
        messages: [{ role: "user", content: req.prompt }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`ai provider HTTP ${res.status}${body ? ` — ${body.slice(0, 160)}` : ""}`);
    }
    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    return {
      text: (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join(""),
      input_tokens: data.usage?.input_tokens ?? 0,
      output_tokens: data.usage?.output_tokens ?? 0,
    };
  }
}

export interface MeteredAiOptions {
  clock?: () => Date;
  /** Called after every completion — wire to observability/action logs. Never throws upstream. */
  onUsage?: (usage: AiUsage) => void;
  /** Daily spend ceiling in cents (default $5.00) — the kill-switch against runaway cost. */
  daily_budget_cents?: number;
}

export class MeteredAi {
  private readonly transport: AiTransport;
  private readonly clock: () => Date;
  private readonly onUsage: (u: AiUsage) => void;
  private readonly budget: number;
  private spentToday = 0;
  private spentDate = "";

  constructor(transport: AiTransport, options: MeteredAiOptions = {}) {
    this.transport = transport;
    this.clock = options.clock ?? (() => new Date());
    this.onUsage = options.onUsage ?? (() => undefined);
    this.budget = options.daily_budget_cents ?? 500;
  }

  spentTodayCents(): number {
    return this.spentDate === this.clock().toISOString().slice(0, 10) ? this.spentToday : 0;
  }

  async complete(input: AiRequest): Promise<AiResult> {
    const req = AiRequestSchema.parse(input);
    const today = this.clock().toISOString().slice(0, 10);
    if (this.spentDate !== today) { this.spentDate = today; this.spentToday = 0; }
    if (this.spentToday >= this.budget) {
      throw new Error(`ai daily budget exhausted (${this.budget}¢) — raise ALFY_AI_DAILY_BUDGET_CENTS deliberately, never silently`);
    }
    const out = await this.transport.complete(req);
    const price = AI_PRICES_CENTS_PER_MTOK[req.model] ?? { input: 300, output: 1500 };
    const cost_cents = (out.input_tokens / 1_000_000) * price.input + (out.output_tokens / 1_000_000) * price.output;
    this.spentToday += cost_cents;
    const usage: AiUsage = {
      model: req.model, kind: req.kind,
      input_tokens: out.input_tokens, output_tokens: out.output_tokens,
      cost_cents: Math.round(cost_cents * 10000) / 10000,
      at: this.clock().toISOString(),
    };
    try { this.onUsage(usage); } catch { /* observability must never break the call */ }
    return AiResultSchema.parse({ text: out.text, usage });
  }
}

/** The single credential seam: returns undefined (feature off, gracefully) when no key is set. */
export function createAiFromEnv(
  apiKey: string | undefined,
  options: MeteredAiOptions & { fetchImpl?: typeof fetch } = {},
): MeteredAi | undefined {
  if (!apiKey || !apiKey.trim() || apiKey.startsWith("YOUR_")) return undefined;
  return new MeteredAi(
    new AnthropicTransport(apiKey, options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    options,
  );
}
