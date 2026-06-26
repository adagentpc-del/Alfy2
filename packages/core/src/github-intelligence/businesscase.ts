import type { RepoScanInput, BusinessCase, EffortBucket, RoiLevel } from "@alfy2/shared";

/**
 * Business-case generator — runs ONLY when a repo is SAFE. Deterministic; derives applications,
 * benefiting businesses, a roadmap, required agents, effort, and ROI from the (already-vetted)
 * metadata. See docs/GITHUB_INTELLIGENCE.md.
 */

export interface KnownBusiness {
  id: string;
  name: string;
  keywords?: string[];
}

function tokenize(text: string): string[] {
  return [...new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3))];
}

function matchBusinesses(input: RepoScanInput, businesses: KnownBusiness[]): string[] {
  const blob = `${input.name} ${input.description} ${input.readme}`.toLowerCase();
  return businesses
    .filter((b) => [...tokenize(b.name), ...(b.keywords ?? []).map((k) => k.toLowerCase())].some((t) => t.length >= 3 && blob.includes(t)))
    .map((b) => b.id);
}

export function generateBusinessCase(
  input: RepoScanInput,
  businesses: KnownBusiness[],
  difficulty: number,
  quality: number,
): BusinessCase {
  const topic = (tokenize(input.description)[0] ?? tokenize(input.name)[0] ?? "capability");

  const estimated_effort: EffortBucket = difficulty < 0.4 ? "small" : difficulty < 0.7 ? "medium" : "large";
  const estimated_effort_hours = difficulty < 0.4 ? 12 : difficulty < 0.7 ? 40 : 90;

  const roi_level: RoiLevel = quality >= 0.7 && difficulty < 0.5 ? "high" : quality >= 0.5 ? "medium" : "low";
  const estimated_roi =
    roi_level === "high"
      ? `High — strong quality, low integration cost; clear ${topic} leverage across businesses.`
      : roi_level === "medium"
        ? `Medium — useful ${topic} capability with moderate integration effort.`
        : `Low — niche value or significant integration work; adopt only if a business needs it.`;

  const which_businesses = matchBusinesses(input, businesses);

  const required_agents = [
    { proposed_key: "research.web", purpose: `Evaluate and apply ${topic} in real workflows`, capabilities: ["evaluate", "summarize"] },
    { proposed_key: "draft.text", purpose: "Draft the integration plan and operator-facing docs", capabilities: ["draft"] },
  ];

  return {
    business_applications: [
      `Expose ${input.name} as an internal agent capability`,
      `Apply ${topic} to ${which_businesses.length ? "the matched businesses'" : "relevant"} workflows`,
      "Reduce manual effort by wrapping it behind an approved agent",
    ],
    which_businesses,
    implementation_roadmap: [
      { name: "Integrate", goal: "Wrap behind an agent and the AI Gateway", actions: ["Add a worker that calls it", "Map its output into memory/contracts"] },
      { name: "Pilot", goal: "Validate value on real data", actions: ["Run on a small real sample", "Measure accuracy and time saved"] },
      { name: "Roll out", goal: "Adopt where it pays off", actions: ["Enable for the benefiting businesses", "Add to the Asset Library and dashboards"] },
    ],
    required_agents,
    estimated_effort,
    estimated_effort_hours,
    estimated_roi,
    roi_level,
  };
}
