import type {
  DecisionCategory,
  MarketResearch,
  CompetitorAnalysis,
  PricingPlan,
  Offer,
  Positioning,
  MvpPlan,
  DataModel,
  ApiPlan,
  RequiredAgents,
  MarketingPlan,
  SeoPlan,
  LaunchPlan,
  MonetizationPlan,
  RiskAssessment,
  Recommendation,
  RiskSeverity,
  PricingModel,
} from "@alfy2/shared";

/**
 * Deterministic generators for the fifteen Idea Builder sections. No AI, no live web — these produce
 * a structured starting blueprint (hypotheses, frameworks, scaffolds) from the idea text and a few
 * shape heuristics. Research sections are explicitly framed as hypotheses + open questions, not
 * fetched facts; a research agent (behind the AI Gateway) can deepen them later. See docs/IDEA_BUILDER.md.
 */

const STOP = new Set([
  "the", "a", "an", "and", "or", "for", "with", "that", "this", "have", "idea", "app", "platform",
  "to", "of", "in", "on", "is", "it", "be", "by", "as", "are", "i", "my", "we", "our", "you",
]);

export interface IdeaShape {
  ideaText: string;
  title: string;
  category: DecisionCategory;
  priority: number;
  keywords: string[];
  isMarketplace: boolean;
  isApp: boolean;
  isSaaS: boolean;
  isService: boolean;
  sensitive: boolean; // health/finance/legal -> compliance risk
}

export function analyzeShape(
  ideaText: string,
  title: string,
  category: DecisionCategory,
  priority: number,
): IdeaShape {
  const lower = ideaText.toLowerCase();
  const keywords = [...new Set(
    lower.split(/[^a-z0-9]+/).filter((t) => t.length >= 4 && !STOP.has(t)),
  )].slice(0, 8);
  return {
    ideaText,
    title,
    category,
    priority,
    keywords: keywords.length ? keywords : ["product"],
    isMarketplace: /marketplace|match|connect|two[- ]sided|vendors|providers|listings/.test(lower),
    isApp: /\bapp\b|mobile|ios|android/.test(lower),
    isSaaS: /saas|software|tool|dashboard|automation|workflow/.test(lower),
    isService: /service|coaching|consult|agency|done[- ]for[- ]you/.test(lower),
    sensitive: /health|medical|peptide|hormone|therapy|clinic|patient|finance|invest|trading|legal|insurance|securit/.test(lower),
  };
}

const kw = (s: IdeaShape, i = 0): string => s.keywords[i] ?? s.keywords[0] ?? "product";

export function marketResearch(s: IdeaShape): MarketResearch {
  return {
    summary: `Demand hypothesis for "${s.title}": a real, growing need with fragmented or low-trust supply. Validate before building.`,
    target_segments: [
      `Primary buyers seeking ${kw(s)}`,
      s.isMarketplace ? "Supply-side providers/vendors" : "Early adopters in the niche",
      "Power users willing to pay for time saved",
    ],
    demand_signals: [
      `Search and community interest around ${kw(s)} and ${kw(s, 1)}`,
      "Existing manual workarounds people already pay for",
    ],
    open_questions: [
      "What is real willingness-to-pay, and from whom?",
      "How are people solving this today, and why is that insufficient?",
      s.sensitive ? "What regulatory/compliance constraints apply?" : "What is the cheapest test that would falsify this?",
    ],
    tam_hypothesis: "Size top-down (category spend) and bottom-up (target users × price); treat as a hypothesis until tested.",
  };
}

export function competitors(s: IdeaShape): CompetitorAnalysis {
  return {
    competitors: [
      { name: "Established incumbent(s)", kind: "direct", notes: "Own distribution but rarely specialized for this exact need." },
      { name: "DIY / manual workaround", kind: "substitute", notes: "Spreadsheets, agencies, or doing it by hand." },
      { name: "Adjacent tools", kind: "indirect", notes: "Solve a neighboring problem; could expand into this." },
    ],
    positioning_gap: `The opening: be the focused, trusted option for ${kw(s)} that incumbents are too broad to serve well.`,
  };
}

export function pricing(s: IdeaShape): PricingPlan {
  const model: PricingModel = s.isMarketplace
    ? "marketplace"
    : s.isApp
      ? "freemium"
      : s.isSaaS
        ? "tiered"
        : s.isService
          ? "one_time"
          : "subscription";
  const tiers = s.isMarketplace
    ? [
        { name: "Transaction take-rate", price: "8-15% / transaction", includes: ["Matching", "Trust/verification"] },
        { name: "Supply subscription", price: "$99-299/mo", includes: ["Listing", "Priority placement", "Analytics"] },
      ]
    : [
        { name: "Starter", price: "$0 or low", includes: ["Core value", "Limited usage"] },
        { name: "Pro", price: "$29-99/mo", includes: ["Full features", "Higher limits"] },
        { name: "Team/Business", price: "$199+/mo", includes: ["Collaboration", "Support"] },
      ];
  return {
    model,
    tiers,
    rationale: `Match price to value and the buyer's budget; start simple and raise as value is proven.`,
  };
}

export function offer(s: IdeaShape): Offer {
  return {
    headline: `${s.title}: get the outcome without the hassle.`,
    what_you_get: [
      `A faster, more trustworthy way to handle ${kw(s)}`,
      "Clear, transparent experience",
      "Time saved and fewer mistakes",
    ],
    guarantee: s.sensitive ? "Verified, compliant providers only." : "Cancel anytime.",
    primary_cta: "Get started",
  };
}

export function positioning(s: IdeaShape): Positioning {
  return {
    one_liner: `${s.title} — the focused, trusted way to handle ${kw(s)}.`,
    for_whom: `people who care about ${kw(s)} and want it done right`,
    unlike: "broad incumbents and manual workarounds",
    because: "it is purpose-built and trustworthy for this exact job",
    category: s.isMarketplace ? "Specialized marketplace" : s.isSaaS ? "Focused software" : "Niche product",
  };
}

export function mvp(s: IdeaShape): MvpPlan {
  return {
    goal: "Prove the core value loop with the smallest thing that could work.",
    must_have: [
      "The single core action that delivers value",
      s.isMarketplace ? "Both sides present (seed supply first)" : "A clear input → valuable output",
      "A way to capture intent and get paid (or a paid signal)",
    ],
    explicitly_not: ["Native mobile app (unless essential)", "Full automation", "Edge cases and admin polish"],
    success_metric: {
      name: "validated_demand",
      description: "Evidence real users take the core action and would pay",
      target: ">= 20 qualified actions in first 30-60 days",
    },
  };
}

export function database(s: IdeaShape): DataModel {
  const entity = kw(s).replace(/[^a-z0-9]/g, "_");
  const tables = [
    { name: "users", purpose: "Accounts and identity", key_fields: ["id", "tenant_id", "email", "created_at"] },
    { name: `${entity}s`, purpose: `Core ${kw(s)} records`, key_fields: ["id", "tenant_id", "owner_id", "status"] },
    { name: "events", purpose: "Activity log for analytics", key_fields: ["id", "tenant_id", "type", "created_at"] },
  ];
  if (s.isMarketplace) {
    tables.push({ name: "listings", purpose: "Supply-side listings", key_fields: ["id", "tenant_id", "provider_id", "verified"] });
    tables.push({ name: "matches", purpose: "Demand↔supply matches", key_fields: ["id", "tenant_id", "buyer_id", "listing_id", "status"] });
  }
  return { tables };
}

export function apiNeeds(s: IdeaShape): ApiPlan {
  const entity = kw(s).replace(/[^a-z0-9]/g, "-");
  const endpoints = [
    { method: "POST" as const, path: "/auth/session", purpose: "Sign in / identify the user" },
    { method: "POST" as const, path: `/${entity}`, purpose: `Create a ${kw(s)} record` },
    { method: "GET" as const, path: `/${entity}`, purpose: `List/browse ${kw(s)} records` },
  ];
  if (s.isMarketplace) {
    endpoints.push({ method: "POST" as const, path: "/match", purpose: "Match demand to supply" });
  }
  return {
    endpoints,
    integrations: [
      "Payments (PayPal by default)",
      "Email/SMS notifications",
      s.sensitive ? "Verification/compliance source" : "Analytics",
    ],
  };
}

export function requiredAgents(s: IdeaShape): RequiredAgents {
  const agents = [
    { proposed_key: "research.web", purpose: "Validate market, competitors, and pricing", capabilities: ["search", "summarize"] },
    { proposed_key: "draft.text", purpose: "Draft marketing, outreach, and onboarding copy", capabilities: ["draft"] },
  ];
  if (s.isMarketplace || s.isSaaS) {
    agents.push({ proposed_key: "analytics.track", purpose: "Track the core funnel and KPIs", capabilities: ["track_metrics"] });
  }
  return { agents };
}

export function marketing(s: IdeaShape): MarketingPlan {
  return {
    channels: ["SEO / content", "Founder-led social", s.isMarketplace ? "Supply-side partnerships" : "Targeted communities"],
    content_pillars: [`${kw(s)} education`, "Behind-the-scenes / build-in-public", "Customer stories"],
    hooks: [
      `The ${kw(s)} mistake almost everyone makes`,
      `How to handle ${kw(s)} without the usual headache`,
    ],
  };
}

export function seo(s: IdeaShape): SeoPlan {
  return {
    primary_keywords: [
      `${kw(s)} ${s.isApp ? "app" : "tool"}`,
      `best way to ${kw(s)}`,
      `${kw(s)} ${kw(s, 1)}`,
    ],
    content_ideas: [`Ultimate guide to ${kw(s)}`, `${kw(s)} vs the alternatives`, "Common pitfalls and how to avoid them"],
    notes: s.sensitive ? "Health/finance-sensitive: use compliant, non-claim language and cite sources." : "Target high-intent, low-competition long-tail first.",
  };
}

export function launch(): LaunchPlan {
  return {
    phases: [
      { name: "Private beta", goal: "Validate the core value loop", actions: ["Recruit 10-20 design partners", "Instrument the funnel"] },
      { name: "Public launch", goal: "Prove willingness to pay", actions: ["Open access", "Turn on monetization", "Publish launch content"] },
      { name: "Scale", goal: "Grow repeatably", actions: ["Double down on the best channel", "Build the content engine"] },
    ],
  };
}

export function monetization(s: IdeaShape): MonetizationPlan {
  return {
    primary: s.isMarketplace ? "Transaction take-rate" : s.isService ? "Project/retainer fees" : "Subscription",
    secondary: s.isMarketplace ? ["Supply subscriptions", "Featured placement"] : ["Premium tier", "Add-ons"],
    expansion: ["Data/insights products", "Higher tiers", "Adjacent use cases"],
  };
}

export function risks(s: IdeaShape): RiskAssessment {
  const risks = [
    { risk: "No real demand / weak willingness-to-pay", severity: "high" as RiskSeverity, mitigation: "Cheap demand test before building; pre-sell or waitlist with intent." },
    { risk: "Execution / focus (too broad too soon)", severity: "medium" as RiskSeverity, mitigation: "Ruthless MVP scope; one segment, one channel first." },
  ];
  if (s.isMarketplace) {
    risks.push({ risk: "Cold-start (chicken-and-egg supply/demand)", severity: "high" as RiskSeverity, mitigation: "Seed one side; concentrate a single niche/geo." });
  }
  if (s.sensitive) {
    risks.push({ risk: "Regulatory / compliance exposure", severity: "high" as RiskSeverity, mitigation: "Attorney/clinician review; restrict to compliant scope; no advice claims." });
  }
  const overall: RiskSeverity = risks.some((r) => r.severity === "high") ? "high" : "medium";
  return { risks, overall };
}

export function recommendation(s: IdeaShape, overallRisk: RiskSeverity): Recommendation {
  let verdict: Recommendation["verdict"];
  if (s.priority >= 0.5 && overallRisk !== "high") verdict = "pursue";
  else if (s.priority >= 0.4) verdict = "pursue_with_changes";
  else if (s.priority >= 0.25) verdict = "park";
  else verdict = "pass";
  const confidence = Math.min(0.9, Math.max(0.3, 0.4 + s.priority * 0.4 - (overallRisk === "high" ? 0.1 : 0)));
  return {
    verdict,
    confidence: Math.round(confidence * 100) / 100,
    rationale:
      verdict === "pursue"
        ? "Promising signal and manageable risk — worth a focused validation sprint."
        : verdict === "pursue_with_changes"
          ? "Real potential, but de-risk the biggest unknowns (demand and compliance) before building."
          : verdict === "park"
            ? "Interesting but not now — capture it and revisit when capacity or evidence improves."
            : "Weak fit right now — log the lesson and move on.",
    next_step: "Review the workup and approve to proceed. No building begins until you approve.",
  };
}
