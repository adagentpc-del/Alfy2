import type { Decision, AgentRecommendation, ToolSpec } from "@alfy2/shared";

/**
 * Recurrence detection for the Agent Factory. Deterministic: it groups recent Decisions by a
 * signature (primary category + the agent the decision keeps wanting) and, when a signature recurs
 * at or above a threshold, recommends a dedicated agent. No AI. See docs/AGENT_FACTORY.md.
 */

export interface DetectOptions {
  /** Minimum occurrences of a signature before recommending an agent. */
  threshold?: number;
}

interface Bucket {
  category: Decision["primary_category"];
  agentKey: string;
  decisions: Decision[];
  tools: Set<string>;
  capabilities: Set<string>;
}

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 16) || "assistant"
  );
}

export function detectRecurring(
  decisions: Decision[],
  options: DetectOptions = {},
): AgentRecommendation[] {
  const threshold = options.threshold ?? 3;
  const buckets = new Map<string, Bucket>();

  for (const d of decisions) {
    const agentKey = d.recommended_agents[0] ?? `${d.primary_category}.assistant`;
    const sig = `${d.primary_category}::${agentKey}`;
    let b = buckets.get(sig);
    if (!b) {
      b = {
        category: d.primary_category,
        agentKey,
        decisions: [],
        tools: new Set(),
        capabilities: new Set(),
      };
      buckets.set(sig, b);
    }
    b.decisions.push(d);
    for (const a of d.recommended_agents) b.tools.add(a);
    for (const auto of d.automation_opportunities) b.capabilities.add(slugCapability(auto));
  }

  const recommendations: AgentRecommendation[] = [];
  for (const b of buckets.values()) {
    if (b.decisions.length < threshold) continue;

    const proposed_key = b.agentKey.includes(".")
      ? b.agentKey
      : `${b.category}.${slug(b.agentKey)}`;
    const suggested_tools: ToolSpec[] = [...b.tools].map((name) => ({
      name,
      description: `Used by the ${b.category} workflow`,
    }));
    const frequency = b.decisions.length;

    recommendations.push({
      proposed_key,
      primary_category: b.category,
      rationale:
        `"${b.category}" work routed to ${b.agentKey} recurred ${frequency} times. ` +
        `A dedicated agent would handle this responsibility automatically (with approval gates intact).`,
      frequency,
      evidence_refs: b.decisions.map((d) => d.id),
      suggested_capabilities: [...b.capabilities].slice(0, 6),
      suggested_tools,
      // Confidence rises with frequency; saturates so it never reads as certainty.
      confidence: Math.min(0.95, 0.4 + 0.12 * (frequency - threshold + 1)),
    });
  }

  return recommendations.sort((a, b) => b.frequency - a.frequency);
}

function slugCapability(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .split("_")
      .slice(0, 3)
      .join("_") || "handle_task"
  );
}
