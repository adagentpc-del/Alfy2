import {
  GuestCandidateInputSchema,
  GuestRecordSchema,
  type BookingDirection,
  type GuestCandidateInput,
  type GuestRecord,
  type GuestStatus,
} from "@alfy2/shared";

/**
 * The Podcast Guest Booking Agent (docs/adr/ADR-0072-podcast-guests.md). Mines contacts and external
 * experts for guests, ranks them by relevance, credibility, audience fit, and business value, drafts
 * outreach, tracks replies, schedules, and also gets Alyssa booked on OTHER podcasts. Never marks a
 * candidate contacted until outreach is approved (unless persistent approval exists). Deterministic.
 * Tenant-scoped.
 */

export class GuestBookingError extends Error {}

export interface PodcastGuestBookingOptions {
  clock?: () => Date;
  idFactory?: () => string;
  /** When true, drafted outreach is considered pre-approved and can be marked contacted without approval. */
  persistentApproval?: boolean;
}

export class PodcastGuestBookingAgent {
  private readonly guests = new Map<string, GuestRecord>();
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly persistentApproval: boolean;

  constructor(options: PodcastGuestBookingOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.persistentApproval = options.persistentApproval ?? false;
  }

  /** Add and rank a guest / appearance candidate, drafting (but not sending) outreach. */
  addCandidate(tenantId: string, input: GuestCandidateInput): GuestRecord {
    const i = GuestCandidateInputSchema.parse(input);
    const now = this.clock().toISOString();
    const rank_score = round(
      i.relevance * 0.3 + i.credibility * 0.25 + i.audience_fit * 0.25 + i.business_value * 0.2,
      3,
    );

    const record = GuestRecordSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      direction: i.direction,
      name: i.name,
      context: i.context,
      relevance: i.relevance,
      credibility: i.credibility,
      audience_fit: i.audience_fit,
      business_value: i.business_value,
      rank_score,
      status: "candidate",
      pitch_angle: i.pitch_angle,
      draft_outreach: draftOutreach(i),
      outreach_approved: false,
      booked_date: null,
      episode_link: "",
      relationship_value: 0.5,
      created_at: now,
      updated_at: now,
    });

    this.guests.set(record.id, record);
    return record;
  }

  /** Approve the drafted outreach so it can be sent / the candidate contacted. */
  approveOutreach(tenantId: string, id: string): GuestRecord {
    const cur = this.require(tenantId, id);
    return this.save({ ...cur, outreach_approved: true, status: "approved_to_contact" });
  }

  /** Mark the candidate contacted. Throws unless outreach is approved or persistent approval is set. */
  markContacted(tenantId: string, id: string): GuestRecord {
    const cur = this.require(tenantId, id);
    if (!cur.outreach_approved && !this.persistentApproval) {
      throw new GuestBookingError(
        `Cannot contact ${cur.name} (${id}) — outreach not approved and no persistent approval.`,
      );
    }
    return this.save({ ...cur, status: "contacted" });
  }

  /** Set an arbitrary status (e.g. "replied", "declined"). */
  updateStatus(tenantId: string, id: string, status: GuestStatus): GuestRecord {
    const cur = this.require(tenantId, id);
    return this.save({ ...cur, status });
  }

  /** Book the guest / appearance on a date with an episode link. */
  book(tenantId: string, id: string, date: string, link: string): GuestRecord {
    const cur = this.require(tenantId, id);
    return this.save({
      ...cur,
      booked_date: date,
      episode_link: link,
      status: cur.status === "recorded" ? "recorded" : "scheduled",
    });
  }

  /** Candidates ranked by rank_score (desc), optionally filtered by direction. */
  ranked(tenantId: string, direction?: BookingDirection): GuestRecord[] {
    return [...this.guests.values()]
      .filter((g) => g.tenant_id === tenantId && (direction === undefined || g.direction === direction))
      .sort((a, b) => b.rank_score - a.rank_score);
  }

  get(tenantId: string, id: string): GuestRecord | undefined {
    const g = this.guests.get(id);
    return g && g.tenant_id === tenantId ? g : undefined;
  }

  list(tenantId: string): GuestRecord[] {
    return [...this.guests.values()].filter((g) => g.tenant_id === tenantId);
  }

  private save(record: GuestRecord): GuestRecord {
    const next = GuestRecordSchema.parse({ ...record, updated_at: this.clock().toISOString() });
    this.guests.set(next.id, next);
    return next;
  }

  private require(tenantId: string, id: string): GuestRecord {
    const g = this.get(tenantId, id);
    if (!g) throw new GuestBookingError(`No guest ${id} in tenant ${tenantId}.`);
    return g;
  }
}

function draftOutreach(i: GuestCandidateInput): string {
  const angle = i.pitch_angle || "a conversation our audiences would both love";
  if (i.direction === "outbound_appearance") {
    return `Hi ${i.name}, I'm reaching out about ${i.context || "your show"}. I'd love to bring Alyssa DelTorre on as a guest — ${angle}. She's a sharp, story-driven operator and would deliver real value to your listeners. Open to it?`;
  }
  return `Hi ${i.name}, I host "Decoded with Alyssa DelTorre" and would love to have you on. Given your work in ${i.context || "your field"}, ${angle}. It's a relaxed, high-signal conversation — would you be up for it?`;
}

function round(n: number, places: number): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}
