import {
  DetectEventInputSchema,
  LogisticsPlanSchema,
  type DetectEventInput,
  type LogisticsPlan,
  type Checklist,
  type LogisticsCalendarBlock as CalendarBlock,
  type ScheduledReminder,
  type PrepCategory,
} from "@alfy2/shared";

/**
 * Life Logistics Engine (docs/adr/ADR-0094-life-logistics.md). Detects a future event and auto-generates
 * the preparation so Alyssa never has to remember it — prep checklists keyed by event flags, calendar
 * blocks (the event, a travel block, a decompression block), reminders (night-before, two-hours-before,
 * after-event follow-up), and networking follow-ups. All datetimes are computed from `starts_at` via ISO
 * math. Deterministic. Tenant-scoped.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export class LifeLogisticsEngine {
  private readonly plans = new Map<string, LogisticsPlan>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Detect an event and produce its full preparation plan. */
  plan(tenantId: string, input: DetectEventInput): LogisticsPlan {
    const i = DetectEventInputSchema.parse(input);
    const start = new Date(i.starts_at);
    const startMs = start.getTime();

    // --- Checklists, keyed by flags ---
    const checklists: Checklist[] = [];
    const add = (category: PrepCategory, items: string[]) => checklists.push({ category, items });

    if (i.overnight) {
      add("packing", ["Pack toiletries", "Pack overnight bag", "Pack chargers"]);
      add("clothing", ["Choose outfits for each day", "Pack sleepwear"]);
      add("charging", ["Charge phone and laptop", "Pack charging cables and adapters"]);
      add("documents", ["ID / passport", "Booking confirmations"]);
    }
    if (i.travel) {
      add("travel", ["Confirm itinerary", "Check-in online", "Pack travel essentials"]);
      add("transportation", ["Arrange airport transfer", "Confirm rental or rideshare"]);
      add("hotel", ["Confirm hotel reservation", "Note check-in / check-out times"]);
    }
    if (i.networking) {
      add("business_materials", ["Pack business cards", "Prepare one-line intro"]);
      add("networking", ["Review attendee list", "Set 3 connection goals"]);
    }
    if (i.has_pet) {
      add("pet_care", ["Arrange pet sitter or boarding", "Stock pet food and supplies"]);
    }
    // Always-on.
    add("weather", ["Check forecast for the dates", "Pack weather-appropriate layers"]);
    add("recovery", ["Block recovery time after the event", "Plan light schedule the next morning"]);

    // --- Reminders ---
    const reminders: ScheduledReminder[] = [];
    // Night-before: 1 day before, at a sensible 20:00.
    const nightBefore = new Date(startMs - DAY_MS);
    nightBefore.setUTCHours(20, 0, 0, 0);
    reminders.push({ at: nightBefore.toISOString(), label: `Night-before prep for "${i.description}"` });
    // Two hours before.
    reminders.push({ at: new Date(startMs - 2 * HOUR_MS).toISOString(), label: `Leave / final prep for "${i.description}"` });
    // After-event follow-up: 1 day after.
    reminders.push({ at: new Date(startMs + DAY_MS).toISOString(), label: `Follow up after "${i.description}"` });

    // --- Calendar blocks ---
    const blocks: CalendarBlock[] = [];
    const eventEndMs = startMs + 2 * HOUR_MS;
    if (i.travel) {
      blocks.push({
        starts_at: new Date(startMs - 2 * HOUR_MS).toISOString(),
        ends_at: start.toISOString(),
        label: `Travel to "${i.description}"`,
      });
    }
    blocks.push({ starts_at: start.toISOString(), ends_at: new Date(eventEndMs).toISOString(), label: i.description });
    blocks.push({
      starts_at: new Date(eventEndMs).toISOString(),
      ends_at: new Date(eventEndMs + HOUR_MS).toISOString(),
      label: `Decompression after "${i.description}"`,
    });

    // --- Follow-ups ---
    const followUps: string[] = i.networking
      ? ["Note new contacts made", "Send follow-ups to new contacts"]
      : [];

    const plan = LogisticsPlanSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      event: i.description,
      starts_at: i.starts_at,
      checklists,
      calendar_blocks: blocks,
      reminders,
      follow_ups: followUps,
      created_at: this.clock().toISOString(),
    });
    this.plans.set(plan.id, plan);
    return plan;
  }

  get(tenantId: string, id: string): LogisticsPlan | undefined {
    const p = this.plans.get(id);
    return p && p.tenant_id === tenantId ? p : undefined;
  }

  list(tenantId: string): LogisticsPlan[] {
    return [...this.plans.values()].filter((p) => p.tenant_id === tenantId);
  }
}
