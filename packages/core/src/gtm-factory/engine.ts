import {
  GtmLaunchPlanSchema,
  PlanLaunchInputSchema,
  type GtmApprovalClass,
  type GtmAssetItem,
  type GtmCalendarEntry,
  type GtmChannel,
  type GtmChannelPlan,
  type GtmExecutionPacket,
  type GtmLaunchPlan,
  type GtmMeasurement,
  type PlanLaunchInput,
} from "@alfy2/shared";

/**
 * The GTM Factory (docs/GTM_FACTORY_SPEC.md). One offer in, one complete approval-gated launch plan out:
 * ICP summary, positioning, per-channel plans (owned by agent titles from the registry), asset checklist
 * (gaps route to the Sales Asset Generator / Content Factory), a phased warm-up → launch → follow-through
 * calendar, execution packets that each carry their approval action class, and a measurement plan. The
 * factory sequences existing engines for one launch — it never sends, publishes, or prices anything
 * itself. Deterministic. Tenant-scoped.
 */

interface ChannelDefaults {
  motion: string;
  cadence: string;
  owner_title: string;
  approval_class: GtmApprovalClass;
  assets: readonly string[];
  kpis: readonly string[];
}

const CHANNEL_DEFAULTS: Record<GtmChannel, ChannelDefaults> = {
  email: {
    motion: "warm list announcement + nurture sequence to the segment that matches the ICP",
    cadence: "3 sends across the window; replies handled within one business day",
    owner_title: "Email Campaign Manager",
    approval_class: "send_message",
    assets: ["email sequence", "landing page"],
    kpis: ["reply rate", "click-through rate", "revenue per send"],
  },
  social: {
    motion: "daily value posts building to the offer reveal, then social proof loop",
    cadence: "daily posts through the window; engagement replies twice daily",
    owner_title: "Social Media Manager",
    approval_class: "publish_public",
    assets: ["social posts pack", "carousel set"],
    kpis: ["qualified profile visits", "DM conversations started", "link conversions"],
  },
  podcast: {
    motion: "owned episode on the offer topic plus guest placements reaching the ICP",
    cadence: "1 owned episode + 2 placement pitches in the window",
    owner_title: "PR Manager",
    approval_class: "publish_public",
    assets: ["episode outline", "guest pitch one-pager"],
    kpis: ["listener-to-lead conversions", "placements booked"],
  },
  partners: {
    motion: "co-announcement with aligned partners who already own the ICP's trust",
    cadence: "partner outreach in warm-up; co-sends at launch",
    owner_title: "Outreach Agent",
    approval_class: "send_message",
    assets: ["partner one-pager", "co-marketing brief"],
    kpis: ["partner sends secured", "partner-attributed revenue"],
  },
  paid: {
    motion: "small validated-creative spend against the warmest lookalike segment",
    cadence: "creative test in warm-up; scale winners at launch; kill losers daily",
    owner_title: "Growth Strategist",
    approval_class: "publish_public",
    assets: ["ad creative set", "landing page"],
    kpis: ["cost per qualified lead", "paid ROAS"],
  },
  community: {
    motion: "founder-led value threads where the ICP already gathers; no drive-by promotion",
    cadence: "2 value contributions per week; offer mention only at launch",
    owner_title: "Social Media Manager",
    approval_class: "publish_public",
    assets: ["community value posts", "FAQ"],
    kpis: ["community conversations started", "community-attributed leads"],
  },
};

const ICP_PROMPTS = [
  "Who feels the pain this offer's promise removes, this week?",
  "What trigger event makes them look for a solution?",
  "Where do they already gather and whom do they trust?",
] as const;

export class GtmFactory {
  private readonly plans = new Map<string, GtmLaunchPlan>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Build the complete launch plan for one offer. Deterministic for a given input + clock/idFactory. */
  plan(tenantId: string, input: PlanLaunchInput): GtmLaunchPlan {
    const i = PlanLaunchInputSchema.parse(input);
    const now = this.clock().toISOString();
    const channels = dedupe(i.channels);
    const window = i.launch_window_days;
    const launchDay = Math.floor(window / 3);
    const followDay = Math.floor((window * 2) / 3);

    const icp_summary =
      i.icp_hints.length > 0 ? i.icp_hints : ICP_PROMPTS.map((q) => `TO ANSWER: ${q}`);

    const positioning = {
      promise: i.offer.promise,
      differentiation: `Why ${i.offer.name} and not the usual alternative — name the one thing only this offer does.`,
      proof: `Strongest existing evidence for "${i.offer.promise}" (result, testimonial, or demo).`,
      primary_objection: i.offer.price_point
        ? `Is it worth ${i.offer.price_point}?`
        : "Why act now instead of waiting?",
      objection_answer: `Answer with the proof above, framed against the cost of the unsolved problem.`,
    };

    const channel_plans: GtmChannelPlan[] = channels.map((channel) => {
      const d = CHANNEL_DEFAULTS[channel];
      return {
        channel,
        motion: d.motion,
        cadence: d.cadence,
        owner_title: d.owner_title,
        required_assets: [...d.assets],
      };
    });

    const asset_checklist: GtmAssetItem[] = dedupe(
      channels.flatMap((c) => CHANNEL_DEFAULTS[c].assets),
    ).map((asset) => ({
      asset,
      exists: false,
      produced_by: asset.includes("post") || asset.includes("episode") ? "Content Factory" : "Sales Asset Generator",
    }));

    const calendar: GtmCalendarEntry[] = channels.flatMap((channel) => {
      const d = CHANNEL_DEFAULTS[channel];
      const gated = d.approval_class !== "internal_action";
      return [
        {
          day_offset: 0,
          phase: "warm_up" as const,
          channel,
          action: `Prepare ${channel} assets and warm the audience (drafts only; nothing external yet).`,
          requires_approval: false,
          approval_class: "internal_action" as const,
        },
        {
          day_offset: launchDay,
          phase: "launch" as const,
          channel,
          action: `Launch on ${channel}: ${d.motion}`,
          requires_approval: gated,
          approval_class: d.approval_class,
        },
        {
          day_offset: followDay,
          phase: "follow_through" as const,
          channel,
          action: `Follow through on ${channel}: social proof, replies, and follow-ups per cadence.`,
          requires_approval: gated,
          approval_class: d.approval_class,
        },
      ];
    });

    const execution_packets: GtmExecutionPacket[] = channels.map((channel) => {
      const d = CHANNEL_DEFAULTS[channel];
      return {
        id: this.newId(),
        channel,
        objective: `Run the ${channel} launch stream for "${i.offer.name}" to its measurement targets.`,
        owner_title: d.owner_title,
        steps: [
          "produce required assets via the producing engine",
          "queue external actions for approval with drafts attached",
          "execute approved actions per the calendar",
          "report results against the channel KPIs",
        ],
        requires_approval: d.approval_class !== "internal_action",
        approval_class: d.approval_class,
        status: "draft" as const,
      };
    });

    const measurement: GtmMeasurement[] = channels.map((channel) => ({
      channel,
      kpis: [...CHANNEL_DEFAULTS[channel].kpis],
    }));

    const plan = GtmLaunchPlanSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      offer: i.offer,
      icp_summary,
      positioning,
      channel_plans,
      asset_checklist,
      calendar,
      execution_packets,
      measurement,
      revenue_target: i.revenue_target,
      launch_window_days: window,
      created_at: now,
    });
    this.plans.set(plan.id, plan);
    return plan;
  }

  get(tenantId: string, id: string): GtmLaunchPlan | undefined {
    const p = this.plans.get(id);
    return p && p.tenant_id === tenantId ? p : undefined;
  }

  list(tenantId: string): GtmLaunchPlan[] {
    return [...this.plans.values()].filter((p) => p.tenant_id === tenantId);
  }
}

const dedupe = <T>(items: readonly T[]): T[] => [...new Set(items)];
