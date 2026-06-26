import {
  EpisodeIdeaInputSchema,
  EpisodePlanSchema,
  PODCAST_NAME,
  type EpisodeIdeaInput,
  type EpisodePlan,
  type EpisodeStage,
} from "@alfy2/shared";

/**
 * The Podcast Studio OS (docs/adr/ADR-0071-podcast-studio.md). Runs "Decoded with Alyssa DelTorre" from
 * idea to published episode to monetization. For every episode idea it deterministically generates a
 * title, hook, premise, why now, target audience, key story, talking points, guest fit, business tie-in,
 * monetization angle, clips, CTA, related businesses, and assets needed. Deterministic. Tenant-scoped.
 */

export class PodcastStudioError extends Error {}

export interface PodcastStudioOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export class PodcastStudioOS {
  private readonly episodes = new Map<string, EpisodePlan>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: PodcastStudioOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Turn an episode idea into a fully fleshed plan at the "idea" stage. */
  plan(tenantId: string, input: EpisodeIdeaInput): EpisodePlan {
    const i = EpisodeIdeaInputSchema.parse(input);
    const now = this.clock().toISOString();

    const topic = i.topic;
    const angle = i.angle || `what most people get wrong about ${topic}`;
    const audience = audienceFor(topic);
    const guestFit = i.guest_name
      ? `${i.guest_name} brings firsthand, credible perspective on ${topic} — strong fit for this episode.`
      : "Solo episode — Alyssa carries the narrative end to end.";
    const tieIn = i.related_businesses.length
      ? `On ${PODCAST_NAME}, this connects directly to ${listOf(i.related_businesses)} — lived proof, not theory.`
      : `On ${PODCAST_NAME}, Alyssa ties ${topic} back to her own operating experience.`;

    const plan = EpisodePlanSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      stage: "idea",
      title: titleFor(topic, angle),
      hook: `What if everything you believed about ${topic} was only half the story?`,
      premise: `In this episode of ${PODCAST_NAME}, we decode ${topic} — ${angle} — and what it actually takes to win.`,
      why_now: i.source
        ? `Surfaced via ${i.source}: ${topic} is moving fast right now and the window to act is open.`
        : `${topic} is at an inflection point — the people who understand it now will be ahead of everyone in twelve months.`,
      target_audience: audience,
      key_story: `A turning-point story on ${topic}: the moment it nearly broke, the decision that changed everything, and the result.`,
      talking_points: talkingPointsFor(topic, angle),
      guest_fit: guestFit,
      business_tie_in: tieIn,
      monetization_angle: `Sponsor read aligned to ${topic}; lead magnet + email capture; upsell to Alyssa's relevant offer; affiliate placements in show notes.`,
      clips_to_create: clipsFor(topic),
      cta: `Subscribe to ${PODCAST_NAME}, grab the free ${topic} playbook in the show notes, and DM "DECODE" to go deeper.`,
      related_businesses: i.related_businesses,
      assets_needed: [
        "Episode cover art",
        "Show notes + timestamps",
        "Audiogram template",
        "Title + thumbnail variants",
        i.guest_name ? `Guest brief for ${i.guest_name}` : "Solo talking-track outline",
      ],
      created_at: now,
      updated_at: now,
    });

    this.episodes.set(plan.id, plan);
    return plan;
  }

  /** Move an episode to a new production stage. */
  advance(tenantId: string, id: string, stage: EpisodeStage): EpisodePlan {
    const cur = this.require(tenantId, id);
    const next = EpisodePlanSchema.parse({ ...cur, stage, updated_at: this.clock().toISOString() });
    this.episodes.set(next.id, next);
    return next;
  }

  get(tenantId: string, id: string): EpisodePlan | undefined {
    const e = this.episodes.get(id);
    return e && e.tenant_id === tenantId ? e : undefined;
  }

  list(tenantId: string): EpisodePlan[] {
    return [...this.episodes.values()].filter((e) => e.tenant_id === tenantId);
  }

  private require(tenantId: string, id: string): EpisodePlan {
    const e = this.get(tenantId, id);
    if (!e) throw new PodcastStudioError(`No episode ${id} in tenant ${tenantId}.`);
    return e;
  }
}

function titleFor(topic: string, angle: string): string {
  const t = topic.trim();
  const cap = t.charAt(0).toUpperCase() + t.slice(1);
  return `Decoding ${cap}: ${angle.charAt(0).toUpperCase() + angle.slice(1)}`;
}

function audienceFor(topic: string): string {
  return `Founders, operators, and ambitious builders who care about ${topic} and want an edge.`;
}

function talkingPointsFor(topic: string, angle: string): string[] {
  return [
    `The real definition of ${topic} — and the myth to drop first`,
    `${angle} — the counterintuitive truth`,
    `The framework Alyssa uses to navigate ${topic}`,
    `The biggest, most expensive mistake people make with ${topic}`,
    `What to do in the next 30 days to get ahead on ${topic}`,
  ];
}

function clipsFor(topic: string): string[] {
  return [
    `Hook clip: the bold claim about ${topic}`,
    `Framework clip: the 3-step ${topic} model`,
    `Story clip: the turning-point moment`,
    `CTA clip: where to get the ${topic} playbook`,
  ];
}

function listOf(items: string[]): string {
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]!}`;
}
