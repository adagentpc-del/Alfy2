import type { EntityRef, RelationshipKind } from "@alfy2/shared";

/**
 * Relationship matchers for Opportunity Intelligence. Given two entities, detect whether a meaningful
 * relationship exists between them and, if so, describe it. Deterministic — based on entity kinds and
 * shared keywords/tags. Each matcher is directional (source → target) and explains itself.
 */

/** A detected relationship before it is scored. */
export interface Candidate {
  kind: RelationshipKind;
  title: string;
  source: EntityRef;
  target: EntityRef;
  rationale: string;
  evidence: string[];
  recommended_action: string;
  recommended_agents: string[];
  /** Number of shared keywords/tags — drives probability scoring. */
  overlap: number;
}

const norm = (xs: string[]): string[] => xs.map((x) => x.toLowerCase().trim()).filter(Boolean);
function shared(a: EntityRef, b: EntityRef): string[] {
  const setB = new Set([...norm(a.keywords), ...norm(a.tags)]);
  return [...new Set([...norm(b.keywords), ...norm(b.tags)])].filter((k) => setB.has(k));
}

const isDeveloper = (e: EntityRef): boolean =>
  e.kind === "contact" &&
  (/develop|engineer|programmer|technical/i.test(String(e.attributes["role"] ?? "")) ||
    norm(e.keywords).some((k) => /develop|engineer|backend|frontend|fullstack/.test(k)));

const PROJECT_KINDS = new Set(["idea", "github_repo", "business"]);

/** Run all matchers on an unordered pair, trying both orientations. Returns every relationship found. */
export function match(a: EntityRef, b: EntityRef): Candidate[] {
  const out: Candidate[] = [];
  for (const [s, t] of [
    [a, b],
    [b, a],
  ] as const) {
    const overlap = shared(s, t).length;
    const ev = overlap > 0 ? [`Shared: ${shared(s, t).join(", ")}`] : [];

    // fit — a contact (esp. a developer) fits a business/idea that needs their skills.
    if (s.kind === "contact" && (t.kind === "business" || t.kind === "idea") && overlap >= 2) {
      out.push({
        kind: "fit",
        title: `This ${isDeveloper(s) ? "developer" : "contact"} also fits ${t.name}`,
        source: s,
        target: t,
        rationale: `${s.name}'s skills overlap ${t.name}'s needs (${shared(s, t).join(", ")}).`,
        evidence: ev,
        recommended_action: `Introduce ${s.name} to ${t.name} for a fit conversation.`,
        recommended_agents: ["operations", "sales"],
        overlap,
      });
    }

    // solves — a (safe) GitHub repo solves a business/idea problem.
    if (s.kind === "github_repo" && (t.kind === "business" || t.kind === "idea") && overlap >= 2) {
      const unsafe = String(s.attributes["verdict"] ?? "") === "do_not_use";
      if (!unsafe) {
        out.push({
          kind: "solves",
          title: `This GitHub repo solves ${t.name}`,
          source: s,
          target: t,
          rationale: `${s.name} addresses ${t.name}'s problem space (${shared(s, t).join(", ")}).`,
          evidence: [...ev, ...(s.attributes["verdict"] ? [`Repo verdict: ${s.attributes["verdict"]}`] : [])],
          recommended_action: `Evaluate ${s.name} for ${t.name}.`,
          recommended_agents: ["operations", "deployment"],
          overlap,
        });
      }
    }

    // investment — an investor should meet a project (idea/repo/business) matching their thesis.
    if (s.kind === "investor" && PROJECT_KINDS.has(t.kind) && overlap >= 1) {
      out.push({
        kind: "investment",
        title: `This investor should meet ${t.name}`,
        source: s,
        target: t,
        rationale: `${s.name}'s thesis aligns with ${t.name} (${shared(s, t).join(", ") || "sector match"}).`,
        evidence: ev,
        recommended_action: `Arrange an intro between ${s.name} and ${t.name}.`,
        recommended_agents: ["ceo", "finance"],
        overlap,
      });
    }

    // introduction — a vendor should be introduced to a contact/developer with complementary needs.
    if (s.kind === "vendor" && t.kind === "contact" && overlap >= 1) {
      out.push({
        kind: "introduction",
        title: `This vendor should be introduced to ${isDeveloper(t) ? "this developer" : t.name}`,
        source: s,
        target: t,
        rationale: `${s.name} complements ${t.name}'s work (${shared(s, t).join(", ") || "adjacent domains"}).`,
        evidence: ev,
        recommended_action: `Introduce ${s.name} to ${t.name}.`,
        recommended_agents: ["operations"],
        overlap,
      });
    }

    // synergy — an asset can accelerate a business/idea.
    if (s.kind === "asset" && (t.kind === "business" || t.kind === "idea") && overlap >= 1) {
      out.push({
        kind: "synergy",
        title: `${s.name} can accelerate ${t.name}`,
        source: s,
        target: t,
        rationale: `The asset ${s.name} is reusable for ${t.name} (${shared(s, t).join(", ")}).`,
        evidence: ev,
        recommended_action: `Reuse ${s.name} in ${t.name}.`,
        recommended_agents: ["operations", "automation"],
        overlap,
      });
    }

    // trend_tailwind — a market trend benefits a business/idea.
    if (s.kind === "market_trend" && (t.kind === "business" || t.kind === "idea") && overlap >= 1) {
      out.push({
        kind: "trend_tailwind",
        title: `The "${s.name}" trend is a tailwind for ${t.name}`,
        source: s,
        target: t,
        rationale: `${t.name} is positioned to benefit from ${s.name} (${shared(s, t).join(", ")}).`,
        evidence: ev,
        recommended_action: `Lean ${t.name} into the ${s.name} trend.`,
        recommended_agents: ["marketing", "ceo"],
        overlap,
      });
    }
  }

  // partnership — two businesses (or client + business) with strong overlap. Orientation-agnostic.
  const ov = shared(a, b).length;
  if (
    ((a.kind === "business" && b.kind === "business") ||
      (a.kind === "client" && b.kind === "business") ||
      (a.kind === "business" && b.kind === "client")) &&
    ov >= 2
  ) {
    out.push({
      kind: "partnership",
      title: `${a.name} and ${b.name} could partner`,
      source: a,
      target: b,
      rationale: `Strong overlap suggests a partnership (${shared(a, b).join(", ")}).`,
      evidence: [`Shared: ${shared(a, b).join(", ")}`],
      recommended_action: `Explore a partnership between ${a.name} and ${b.name}.`,
      recommended_agents: ["ceo", "sales"],
      overlap: ov,
    });
  }

  return out;
}
