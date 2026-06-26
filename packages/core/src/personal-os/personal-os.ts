import {
  type MemoryRecord,
  type MemoryQuery,
  type CreateMemoryInput,
  type PersonalModuleKind,
  type PersonalEntitySpec,
  type ResolveResult,
  type KnownEntity,
  type InfoRequest,
  type FieldRequest,
  type RememberPersonalInput,
  type PreparePack,
  ResolveResultSchema,
  PreparePackSchema,
  KnownEntitySchema,
  RememberPersonalInputSchema,
} from "@alfy2/shared";
import { findSpec } from "./catalog.js";

/**
 * Personal OS — Alfy2's life layer (docs/adr/ADR-0007-personal-os.md).
 * Core behavior: if information already exists, REUSE it; if not, ASK ONCE and REMEMBER it forever
 * (unless updated); next time, AUTO-PREPARE everything. Built entirely on the Memory Engine.
 *
 * resolve() and prepare() are READ-ONLY (memory peek — no reinforcement). remember() is the only
 * write, and it UPSERTS (updates in place) so the same entity is never duplicated.
 */

/** Read+write memory port. Satisfied by MemoryEngine. */
export interface PersonalMemory {
  peek(tenantId: string, query: MemoryQuery): Promise<Array<{ memory: MemoryRecord; score: number }>>;
  remember(tenantId: string, input: CreateMemoryInput): Promise<MemoryRecord>;
  revise(
    tenantId: string,
    id: string,
    patch: { body?: string; attributes?: Record<string, unknown>; keywords?: string[] },
  ): Promise<MemoryRecord>;
}

export interface PersonalEntityRef {
  module: PersonalModuleKind;
  entity_type: string;
  identity: string;
}

export class PersonalOS {
  constructor(private readonly memory: PersonalMemory) {}

  /** Reuse if known; otherwise return a one-time info request. Read-only. */
  async resolve(tenantId: string, ref: PersonalEntityRef): Promise<ResolveResult> {
    const spec = this.requireSpec(ref);
    const existing = await this.findExisting(tenantId, ref, spec);

    if (!existing) {
      return ResolveResultSchema.parse({
        status: "missing",
        entity: null,
        request: this.buildRequest(ref, spec, spec.required_fields, "missing"),
        explanation: `No saved "${ref.identity}" found. I'll ask once and remember it forever.`,
      });
    }

    const entity = this.toKnownEntity(existing, ref, spec);
    if (entity.missing_fields.length === 0) {
      return ResolveResultSchema.parse({
        status: "reused",
        entity,
        request: null,
        explanation: `Reusing saved "${ref.identity}" — everything I need is already on file.`,
      });
    }
    return ResolveResultSchema.parse({
      status: "partial",
      entity,
      request: this.buildRequest(ref, spec, entity.missing_fields, "partial"),
      explanation: `Found "${ref.identity}" but missing: ${entity.missing_fields.join(", ")}. I'll ask once for those.`,
    });
  }

  /** Remember (or update) an entity — written to memory forever; upserts, never duplicates. */
  async remember(tenantId: string, rawInput: RememberPersonalInput): Promise<KnownEntity> {
    const input = RememberPersonalInputSchema.parse(rawInput);
    const ref: PersonalEntityRef = {
      module: input.module,
      entity_type: input.entity_type,
      identity: input.identity,
    };
    const spec = this.requireSpec(ref);
    const existing = await this.findExisting(tenantId, ref, spec);
    const keywords = unique([
      ...tokenize(input.identity),
      input.entity_type,
      input.module,
      ...input.keywords,
    ]);

    let record: MemoryRecord;
    if (existing) {
      const prevFields = (asRecord(existing.attributes).fields as Record<string, unknown>) ?? {};
      const mergedFields = { ...prevFields, ...input.fields };
      record = await this.memory.revise(tenantId, existing.id, {
        body: this.summarize(input.identity, mergedFields),
        attributes: { module: input.module, entity_type: input.entity_type, fields: mergedFields },
        keywords,
      });
    } else {
      record = await this.memory.remember(tenantId, {
        kind: spec.memory_kind,
        title: input.identity,
        body: this.summarize(input.identity, input.fields),
        attributes: { module: input.module, entity_type: input.entity_type, fields: input.fields },
        importance: 0.6,
        confidence: 0.9,
        source: "operator",
        keywords,
        expires_at: null,
      });
    }
    return this.toKnownEntity(record, ref, spec);
  }

  /** Assemble everything known for an upcoming need — the auto-prepare. Read-only. */
  async prepare(tenantId: string, ref: PersonalEntityRef): Promise<PreparePack> {
    const spec = this.requireSpec(ref);
    const existing = await this.findExisting(tenantId, ref, spec);

    if (!existing) {
      return PreparePackSchema.parse({
        module: ref.module,
        entity_type: ref.entity_type,
        identity: ref.identity,
        ready: false,
        entity: null,
        present_fields: [],
        missing_fields: spec.required_fields,
        prepared: [],
        explanation: `Nothing saved for "${ref.identity}" yet — I'll need to ask once before I can prepare it.`,
      });
    }

    const entity = this.toKnownEntity(existing, ref, spec);
    const prepared = entity.present_fields.map((f) => `${humanize(f)}: ${String(entity.fields[f])}`);
    const ready = entity.missing_fields.length === 0;
    return PreparePackSchema.parse({
      module: ref.module,
      entity_type: ref.entity_type,
      identity: ref.identity,
      ready,
      entity,
      present_fields: entity.present_fields,
      missing_fields: entity.missing_fields,
      prepared,
      explanation: ready
        ? `Everything for "${ref.identity}" is ready — prepared ${prepared.length} details from memory.`
        : `Prepared what I have for "${ref.identity}"; still missing: ${entity.missing_fields.join(", ")}.`,
    });
  }

  // --- internals ----------------------------------------------------------

  private requireSpec(ref: PersonalEntityRef): PersonalEntitySpec {
    const spec = findSpec(ref.module, ref.entity_type);
    if (!spec) throw new Error(`Unknown personal entity: ${ref.module}/${ref.entity_type}`);
    return spec;
  }

  /** Read-only lookup of the saved memory for this exact entity (module + type + identity). */
  private async findExisting(
    tenantId: string,
    ref: PersonalEntityRef,
    spec: PersonalEntitySpec,
  ): Promise<MemoryRecord | null> {
    const hits = await this.memory.peek(tenantId, {
      text: ref.identity,
      keywords: [ref.identity, ref.entity_type],
      kinds: [spec.memory_kind],
      min_importance: 0,
      min_confidence: 0,
      limit: 10,
      include_archived: false,
    });
    for (const { memory } of hits) {
      const attrs = asRecord(memory.attributes);
      if (
        attrs.module === ref.module &&
        attrs.entity_type === ref.entity_type &&
        memory.title.toLowerCase() === ref.identity.toLowerCase()
      ) {
        return memory;
      }
    }
    return null;
  }

  private toKnownEntity(
    record: MemoryRecord,
    ref: PersonalEntityRef,
    spec: PersonalEntitySpec,
  ): KnownEntity {
    const fields = (asRecord(record.attributes).fields as Record<string, unknown>) ?? {};
    const isPresent = (f: string): boolean =>
      fields[f] !== undefined && fields[f] !== null && fields[f] !== "";
    const present_fields = [...spec.required_fields, ...spec.optional_fields].filter(isPresent);
    const missing_fields = spec.required_fields.filter((f) => !isPresent(f));
    return KnownEntitySchema.parse({
      memory_id: record.id,
      module: ref.module,
      entity_type: ref.entity_type,
      identity: record.title,
      fields,
      present_fields,
      missing_fields,
      last_updated: record.updated_at ?? record.created_at,
      source: record.source,
    });
  }

  private buildRequest(
    ref: PersonalEntityRef,
    _spec: PersonalEntitySpec,
    fields: string[],
    mode: "missing" | "partial",
  ): InfoRequest {
    const missing_fields: FieldRequest[] = fields.map((f) => ({
      field: f,
      prompt: `${humanize(f)}?`,
      required: true,
    }));
    return {
      module: ref.module,
      entity_type: ref.entity_type,
      identity: ref.identity,
      missing_fields,
      reason:
        mode === "missing"
          ? `No saved "${ref.identity}". Asking once, then remembering forever.`
          : `Completing "${ref.identity}" — only the missing fields are needed.`,
      ask_once: true,
    };
  }

  private summarize(identity: string, fields: Record<string, unknown>): string {
    const parts = Object.entries(fields)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${humanize(k)}: ${String(v)}`);
    return `${identity} — ${parts.join("; ")}`;
  }
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
}

function unique(items: string[]): string[] {
  return [...new Set(items.filter((s) => s.length > 0))];
}

function humanize(field: string): string {
  const s = field.replace(/_/g, " ");
  return s.length ? s[0]!.toUpperCase() + s.slice(1) : s;
}
