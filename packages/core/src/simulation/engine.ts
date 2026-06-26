import {
  SimulationInputSchema,
  SimulationResultSchema,
  type SimulationInput,
  type SimulationResult,
  type ScenarioCase,
  type CaseLabel,
} from "@alfy2/shared";
import { runModel, type CaseData } from "./models.js";

/**
 * The Simulation Engine (docs/adr/ADR-0021-simulation-engine.md). Before launching a major workflow,
 * it simulates the outcome and returns a best / likely / worst case, the risks, a recommendation, and
 * the decision the operator needs to make. Covers campaign outcomes, revenue paths, hiring vs
 * automation, pricing changes, priority shifts, cash flow, implementation risk, and agent failure.
 * Deterministic. Tenant-scoped.
 */

export interface SimulationEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export class SimulationEngine {
  private readonly results = new Map<string, SimulationResult>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: SimulationEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Run a simulation and store the result. */
  simulate(tenantId: string, input: SimulationInput): SimulationResult {
    const i = SimulationInputSchema.parse(input);
    const m = runModel(i.kind, i.parameters, i.horizon_days);

    const best = toCase("best", m.best, m.headline);
    const likely = toCase("likely", m.likely, m.headline);
    const worst = toCase("worst", m.worst, m.headline);
    const expected_value =
      Math.round(
        (m.best.value * m.best.probability +
          m.likely.value * m.likely.probability +
          m.worst.value * m.worst.probability) *
          100,
      ) / 100;

    const result: SimulationResult = SimulationResultSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      kind: i.kind,
      name: i.name,
      horizon_days: i.horizon_days,
      best_case: best,
      likely_case: likely,
      worst_case: worst,
      expected_value,
      risks: m.risks,
      recommendation: m.recommendation,
      decision_needed: m.decision_needed,
      created_at: this.clock().toISOString(),
    });
    this.results.set(result.id, result);
    return result;
  }

  get(tenantId: string, id: string): SimulationResult | undefined {
    const r = this.results.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  list(tenantId: string): SimulationResult[] {
    return [...this.results.values()].filter((r) => r.tenant_id === tenantId);
  }
}

function toCase(label: CaseLabel, c: CaseData, headline: string): ScenarioCase {
  return {
    label,
    assumptions: c.assumptions,
    projection: { [headline]: c.value, ...c.extra },
    narrative: c.narrative,
    probability: c.probability,
  };
}
