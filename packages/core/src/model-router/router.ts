import {
  ModelDescriptorSchema,
  RouteConstraintsSchema,
  RoutingDecisionSchema,
  type ModelDescriptor,
  type TaskType,
  type RouteConstraints,
  type RoutingDecision,
  type CostTier,
} from "@alfy2/shared";
import { DEFAULT_MODEL_CATALOG } from "./catalog.js";

/**
 * The Model Router — Alfy2 never depends on a single AI provider. It scores registered models per
 * task type and returns a choice plus a CROSS-PROVIDER fallback chain. Models are registry entries,
 * so any current or future model is added as data (catalog or `register()`), never code. The chosen
 * model id is consumed by the AI Gateway. See docs/adr/ADR-0012-router-and-connectors.md.
 */

const COST_ORDER: Record<CostTier, number> = { low: 0, medium: 1, high: 2 };

export class ModelRouter {
  private readonly models = new Map<string, ModelDescriptor>();

  constructor(catalog: ModelDescriptor[] = DEFAULT_MODEL_CATALOG) {
    for (const m of catalog) this.register(m);
  }

  /** Register (or replace) a model. Adding a future model is just this — no code change. */
  register(raw: unknown): ModelDescriptor {
    const model = ModelDescriptorSchema.parse(raw);
    this.models.set(model.id, model);
    return model;
  }

  list(): ModelDescriptor[] {
    return [...this.models.values()];
  }

  /** Pick the best model for a task, with a provider-diverse fallback chain. */
  route(task: TaskType, constraints: RouteConstraints = {} as RouteConstraints): RoutingDecision {
    const c = RouteConstraintsSchema.parse(constraints);

    const candidates = this.list().filter((m) => {
      if (c.require_available && !m.available) return false;
      if (c.max_cost_tier && COST_ORDER[m.cost_tier] > COST_ORDER[c.max_cost_tier]) return false;
      return true;
    });
    if (candidates.length === 0) {
      throw new Error(`No models available for task "${task}" under the given constraints`);
    }

    const scoreOf = (m: ModelDescriptor): number => {
      const base = m.strengths[task] ?? 0;
      const localBonus = c.prefer_local && m.local ? 0.05 : 0;
      return Math.min(1, base + localBonus);
    };

    const ranked = candidates
      .map((m) => ({ model: m, score: Math.round(scoreOf(m) * 100) / 100 }))
      .sort((a, b) => b.score - a.score);

    const chosen = ranked[0]!.model;

    // Build a fallback chain that guarantees provider diversity (resilience).
    const rest = ranked.slice(1).map((r) => r.model);
    const differentProvider = rest.filter((m) => m.provider !== chosen.provider);
    const sameProvider = rest.filter((m) => m.provider === chosen.provider);
    // Put at least one different-provider model first so we never depend on a single provider.
    const orderedFallbacks = [...differentProvider, ...sameProvider].slice(0, 3);

    const hasDiverse = differentProvider.length > 0;
    const rationale =
      `${chosen.name} scores ${ranked[0]!.score} for ${task}` +
      (c.prefer_local && chosen.local ? " (local preferred)" : "") +
      `. ` +
      (hasDiverse
        ? `Fallbacks lead with ${differentProvider[0]!.name} (${differentProvider[0]!.provider}) so routing never depends on a single provider.`
        : `Only one provider is available under these constraints — broaden the catalog to add resilience.`);

    return RoutingDecisionSchema.parse({
      task,
      chosen_model_id: chosen.id,
      ranked: ranked.map((r) => ({ model_id: r.model.id, score: r.score })),
      fallbacks: orderedFallbacks.map((m) => m.id),
      rationale,
    });
  }
}
