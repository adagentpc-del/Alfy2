import { createHash } from "node:crypto";

/**
 * The AI Gateway — the ONLY place a model is ever called (docs/CODING_STANDARDS.md §4,
 * docs/COST_CONTROL_PLAN.md). Every call passes: flag check -> content-hash cache -> budget ->
 * model -> usage ledger. Agents/modules never touch a model SDK directly.
 *
 * Core stays infra-free: it defines ports (cache, usage, model) that Phase-2 wires to Supabase and
 * a concrete provider. The flag resolution is passed IN so core never hardcodes config key names.
 */

export class AiDisabledError extends Error {
  constructor(reason: string) {
    super(`AI call refused: ${reason}`);
    this.name = "AiDisabledError";
  }
}
export class AiBudgetError extends Error {
  constructor(reason: string) {
    super(`AI budget exceeded: ${reason}`);
    this.name = "AiBudgetError";
  }
}

export interface ModelRequest {
  model: string;
  prompt: string;
  maxTokens: number;
}
export interface ModelResult {
  output: unknown;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
}

export interface ModelPort {
  complete(request: ModelRequest): Promise<ModelResult>;
}
export interface CachePort {
  get(tenant_id: string, contentHash: string): Promise<unknown | null>;
  set(tenant_id: string, contentHash: string, model: string, output: unknown): Promise<void>;
}
export interface UsagePort {
  record(usage: {
    tenant_id: string;
    trace_id?: string;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    cost_usd: number;
  }): Promise<void>;
}

export interface AiRunArgs {
  tenant_id: string;
  trace_id?: string;
  /** From config: AI_ENABLED. */
  aiEnabled: boolean;
  /** From config: the relevant AI_FEATURE_<NAME> flag, resolved by the caller. */
  featureEnabled: boolean;
  /** Stable content used to compute the cache key (prompt + salient inputs). */
  content: string;
  request: ModelRequest;
  budget: { max_tokens: number; max_cost_usd: number };
}

export interface AiRunResult {
  output: unknown;
  cached: boolean;
}

export class AiGateway {
  constructor(
    private readonly model: ModelPort,
    private readonly cache: CachePort,
    private readonly usage: UsagePort,
  ) {}

  async run(args: AiRunArgs): Promise<AiRunResult> {
    if (!args.aiEnabled) throw new AiDisabledError("AI_ENABLED is false");
    if (!args.featureEnabled) throw new AiDisabledError("feature flag is false");
    if (args.budget.max_tokens <= 0) throw new AiBudgetError("max_tokens budget is 0");

    const contentHash = createHash("sha256")
      .update(`${args.request.model}::${args.content}`)
      .digest("hex");

    const cached = await this.cache.get(args.tenant_id, contentHash);
    if (cached !== null) {
      return { output: cached, cached: true };
    }

    const result = await this.model.complete({
      ...args.request,
      maxTokens: Math.min(args.request.maxTokens, args.budget.max_tokens),
    });

    await this.usage.record({
      tenant_id: args.tenant_id,
      model: args.request.model,
      prompt_tokens: result.prompt_tokens,
      completion_tokens: result.completion_tokens,
      cost_usd: result.cost_usd,
      ...(args.trace_id !== undefined ? { trace_id: args.trace_id } : {}),
    });

    if (result.cost_usd > args.budget.max_cost_usd) {
      throw new AiBudgetError(
        `actual ${result.cost_usd} exceeded max ${args.budget.max_cost_usd} (usage recorded)`,
      );
    }

    await this.cache.set(args.tenant_id, contentHash, args.request.model, result.output);
    return { output: result.output, cached: false };
  }
}
