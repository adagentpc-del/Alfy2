import {
  CaptureLegacyInputSchema,
  LegacyItemSchema,
  type CaptureLegacyInput,
  type LegacyItem,
  type LegacyItemKind,
  type LegacyForm,
} from "@alfy2/shared";

/**
 * The Legacy Engine (docs/adr/ADR-0083-legacy-engine.md). Ensures every meaningful insight, system,
 * framework, lesson and piece of IP becomes part of an enduring, decades-compounding body of work. When it
 * recognizes repeatable, strategically valuable knowledge it recommends the forms it should take — SOP,
 * FounderOS feature, course, podcast episode, keynote, book chapter, licensing opportunity, or consulting
 * framework — scored by repeatability and strategic value. Deterministic. Tenant-scoped.
 */

export class LegacyEngine {
  private readonly items = new Map<string, LegacyItem>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Capture a legacy item and recommend the enduring forms its knowledge should take. */
  capture(tenantId: string, input: CaptureLegacyInput): LegacyItem {
    const i = CaptureLegacyInputSchema.parse(input);

    const legacyScore = round(i.repeatability * 0.5 + i.strategic_value * 0.5);
    const forms = new Set<LegacyForm>();

    if (i.repeatability >= 0.6) {
      forms.add("sop");
      forms.add("founderos_feature");
    }
    if (i.strategic_value >= 0.6) {
      forms.add("keynote");
      forms.add("book_chapter");
      forms.add("consulting_framework");
    }
    if (i.repeatability >= 0.6 && i.strategic_value >= 0.6) {
      forms.add("course");
      forms.add("licensing_opportunity");
    }
    if (i.kind === "podcast_lesson") {
      forms.add("podcast_episode");
    }

    const item = LegacyItemSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      kind: i.kind,
      title: i.title,
      detail: i.detail,
      repeatability: i.repeatability,
      strategic_value: i.strategic_value,
      recommended_forms: [...forms],
      legacy_score: legacyScore,
      created_at: this.clock().toISOString(),
    });
    this.items.set(item.id, item);
    return item;
  }

  list(tenantId: string): LegacyItem[] {
    return [...this.items.values()].filter((it) => it.tenant_id === tenantId);
  }

  /** Items of a given kind. */
  byKind(tenantId: string, kind: LegacyItemKind): LegacyItem[] {
    return this.list(tenantId).filter((it) => it.kind === kind);
  }

  /** The top-N items by long-term legacy value. */
  topByLegacy(tenantId: string, n: number): LegacyItem[] {
    return this.list(tenantId)
      .sort((a, b) => b.legacy_score - a.legacy_score)
      .slice(0, Math.max(0, n));
  }
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
