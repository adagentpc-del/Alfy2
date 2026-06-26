import {
  IngestMediaInputSchema,
  MediaJobSchema,
  type IngestMediaInput,
  type MediaAsset,
  type MediaInputKind,
  type MediaJob,
  type MediaOutputKind,
} from "@alfy2/shared";

/**
 * The Media Operating System (docs/adr/ADR-0075-media-os.md). Mission: give Alyssa her life back while
 * maintaining an elite media presence — she lives, builds, travels, and records ideas; the Media OS turns
 * one raw moment into many finished, brand-correct media assets (right account, voice, intro/outro,
 * captions, CTA, schedule, tracking). Maximum leverage from minimum effort. Nothing publishes until she
 * approves. Deterministic. Tenant-scoped.
 */

/** Persist a produced asset to the Asset Library; returns its asset id. */
export type MediaAssetSink = (tenantId: string, entry: { kind: string; title: string }) => string;

/** Default output set per input kind when the caller does not specify outputs. */
const DEFAULT_OUTPUTS: Record<MediaInputKind, MediaOutputKind[]> = {
  raw_video: ["reel", "tiktok", "youtube_short", "x_post"],
  podcast: ["podcast_episode", "youtube_video", "reel", "youtube_short", "linkedin_post", "x_post", "newsletter"],
  photo: ["instagram_carousel", "x_post", "linkedin_post"],
  screenshot: ["x_post", "linkedin_post"],
  voice_note: ["x_post", "linkedin_post", "newsletter"],
  written_thought: ["linkedin_post", "x_post", "blog", "newsletter"],
  meeting_recording: ["linkedin_post", "x_post", "newsletter", "blog"],
  interview: ["podcast_episode", "youtube_video", "reel", "linkedin_post", "x_post"],
  webinar: ["youtube_video", "reel", "youtube_short", "linkedin_post", "blog"],
  presentation: ["youtube_video", "linkedin_post", "x_post", "blog"],
  livestream: ["youtube_video", "reel", "youtube_short", "x_post"],
};

export class MediaOperatingSystem {
  private readonly jobs = new Map<string, MediaJob>();
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly assetSink: MediaAssetSink;

  constructor(
    options: { clock?: () => Date; idFactory?: () => string; assetSink?: MediaAssetSink } = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.assetSink = options.assetSink ?? ((_t, e) => `asset:${slug(e.title)}`);
  }

  /** Ingest one raw moment → produce the full set of brand-correct media assets (queued for approval). */
  ingest(tenantId: string, input: IngestMediaInput): MediaJob {
    const i = IngestMediaInputSchema.parse(input);
    const outputs = i.outputs.length ? i.outputs : DEFAULT_OUTPUTS[i.kind];
    const now = this.clock().toISOString();

    const assets: MediaAsset[] = outputs.map((kind) => {
      const title = `${i.title} — ${kindLabel(kind)}`;
      return {
        kind,
        title,
        outline: outlineFor(kind, i.title),
        cta: "Follow for more.",
        asset_id: this.assetSink(tenantId, { kind, title }),
      };
    });

    const job = MediaJobSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      kind: i.kind,
      title: i.title,
      brand: i.brand,
      business_id: i.business_id ?? null,
      status: "queued",
      assets,
      requires_approval: true,
      created_at: now,
      updated_at: now,
    });
    this.jobs.set(job.id, job);
    return job;
  }

  /** Approve a job — Alyssa's sign-off before anything is produced for real. */
  approve(tenantId: string, id: string): MediaJob | undefined {
    return this.transition(tenantId, id, "approved");
  }

  /** Schedule an approved job for publishing. */
  schedule(tenantId: string, id: string): MediaJob | undefined {
    return this.transition(tenantId, id, "scheduled");
  }

  get(tenantId: string, id: string): MediaJob | undefined {
    const j = this.jobs.get(id);
    return j && j.tenant_id === tenantId ? j : undefined;
  }

  list(tenantId: string): MediaJob[] {
    return [...this.jobs.values()].filter((j) => j.tenant_id === tenantId);
  }

  private transition(tenantId: string, id: string, status: "approved" | "scheduled"): MediaJob | undefined {
    const current = this.get(tenantId, id);
    if (!current) return undefined;
    const updated = MediaJobSchema.parse({ ...current, status, updated_at: this.clock().toISOString() });
    this.jobs.set(updated.id, updated);
    return updated;
  }
}

function kindLabel(kind: MediaOutputKind): string {
  return kind.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function outlineFor(kind: MediaOutputKind, title: string): string[] {
  return [`Hook for ${title}`, `Core point as a ${kindLabel(kind)}`, "Brand CTA + caption"];
}

const slug = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "asset";
