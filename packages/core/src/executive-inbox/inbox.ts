import {
  InboxDropSchema,
  ProcessedInboxItemSchema,
  type InboxDrop,
  type ProcessedInboxItem,
  type InboxItemType,
  type InboxCategory,
  type LinkedEntity,
  type SuggestedTask,
  type CreateMemoryInput,
  type MemoryRecord,
  type MemoryQuery,
  type FieldRequest,
} from "@alfy2/shared";
import type { DecisionEngine } from "../decision/engine.js";
import {
  detectItemType,
  classifyCategory,
  memoryKindFor,
  REQUIRED_FIELDS_BY_TYPE,
} from "./classify.js";
import type {
  InboxRepository,
  StoredInboxItem,
  InboxListFilter,
  InboxItemStatus,
} from "./repository.js";

/**
 * The Executive Inbox — the single entry point into Alfy2 (docs/adr/ADR-0011-executive-inbox.md).
 * Anything dropped in is identified, classified, routed to a business/owner, linked to existing
 * memories, turned into tasks when appropriate, checked for missing info, matched to agents, saved as
 * reusable memory, and gated for approval only when necessary — so the operator never decides where
 * something belongs. It COMPOSES the existing engines; it adds detection + routing on top.
 */

export interface InboxBusiness {
  id: string;
  name: string;
  keywords?: string[];
}

/** Read+write memory port (satisfied by MemoryEngine). Optional — the inbox degrades gracefully. */
export interface InboxMemory {
  peek(tenantId: string, query: MemoryQuery): Promise<Array<{ memory: MemoryRecord; score: number }>>;
  remember(tenantId: string, input: CreateMemoryInput): Promise<MemoryRecord>;
}

export interface ExecutiveInboxOptions {
  clock?: () => Date;
  idFactory?: () => string;
  memory?: InboxMemory;
  /** Known businesses for routing (id + name + optional keywords). */
  businesses?: InboxBusiness[];
  /** Persistence for processed items. Optional — without it, process() routes but does not store. */
  inbox?: InboxRepository;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export class ExecutiveInbox {
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly memory: InboxMemory | undefined;
  private readonly businesses: InboxBusiness[];
  private readonly inbox: InboxRepository | undefined;

  constructor(
    private readonly decisions: DecisionEngine,
    options: ExecutiveInboxOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.memory = options.memory;
    this.businesses = options.businesses ?? [];
    this.inbox = options.inbox;
  }

  /** Process one drop into a fully-routed ProcessedInboxItem. */
  async process(tenantId: string, input: InboxDrop): Promise<ProcessedInboxItem> {
    const drop = InboxDropSchema.parse(input);
    const now = this.clock();

    // 1. Identify what it is.
    const detected = detectItemType(drop);
    const itemType = detected.type;

    // Classify + score via the Decision Engine.
    const decision = await this.decisions.decide(tenantId, {
      text: drop.content,
      source: drop.source,
      context: drop.context,
    });

    // 2. Classify automatically.
    const category = classifyCategory(itemType, decision.primary_category, drop.content);
    const catConf = decision.categories[0]?.confidence ?? 0.5;
    const confidence = round2(0.5 * detected.certainty + 0.5 * catConf);

    // 3. Existing business?
    const biz = this.matchBusiness(drop.content);
    const suggested_business = biz?.id ?? null;

    // suggested owner + 4. linked memories
    const owner = this.ownerFor(category, biz?.name);
    const linked_entities = await this.linkMemories(tenantId, drop);

    // 5. tasks · 6. missing info · 7. agents
    const suggested_tasks = this.suggestTasks(drop, itemType, category, decision);
    const missing_info = this.missingInfo(itemType, drop);
    const recommended_agents = this.agentsFor(itemType, decision.recommended_agents);

    // 9. approval only when necessary
    const { requires_approval, approval_reason } = this.approval(itemType, category, decision);

    // next action
    const next_action = this.nextAction(itemType, category, owner, decision, requires_approval);

    // 8. save reusable memory
    const saved_memory_id = await this.saveMemory(tenantId, drop, itemType, category, decision);

    const summary = `${labelType(itemType)} → ${category}${biz ? ` / ${biz.name}` : ""}; ${
      suggested_tasks.length ? `${suggested_tasks.length} task(s); ` : ""
    }${requires_approval ? "needs approval." : "routed."}`;

    const explanation =
      `Identified a ${labelType(itemType)} (confidence ${confidence}) and filed it under ${category}` +
      `${biz ? ` for ${biz.name}` : ""}. ` +
      `${linked_entities.length ? `Linked ${linked_entities.length} related memor${linked_entities.length === 1 ? "y" : "ies"}. ` : ""}` +
      `${suggested_tasks.length ? `Drafted ${suggested_tasks.length} task(s). ` : ""}` +
      `${saved_memory_id ? "Saved it for reuse. " : ""}` +
      `${requires_approval ? approval_reason : "No approval needed."}`;

    const processed: ProcessedInboxItem = {
      id: this.newId(),
      tenant_id: tenantId,
      created_at: now.toISOString(),
      source: drop.source,
      item_type: itemType,
      category,
      confidence,
      suggested_business,
      suggested_owner: owner,
      urgency: decision.urgency,
      urgency_level: decision.priority_level,
      next_action,
      linked_entities,
      suggested_tasks,
      missing_info,
      recommended_agents,
      saved_memory_id,
      requires_approval,
      approval_reason,
      dashboard_updated: true, // 10. the inbox/dashboard counters refresh on every item
      explanation,
      summary,
    };

    const result = ProcessedInboxItemSchema.parse(processed);

    // Persist when a store is configured. Status starts at "new"; the original content is kept for
    // full-text search and re-display.
    if (this.inbox) {
      await this.inbox.save({ item: result, content: drop.content, status: "new" });
    }

    return result;
  }

  // --- persistence read/advance (require options.inbox) -------------------

  /** Fetch one stored item by id. Throws if no inbox repository was configured. */
  async getItem(tenantId: string, id: string): Promise<StoredInboxItem | null> {
    return this.requireInbox().get(tenantId, id);
  }

  /** List stored items (newest first), optionally filtered. Throws if no inbox repository. */
  async listItems(tenantId: string, filter?: InboxListFilter): Promise<StoredInboxItem[]> {
    return this.requireInbox().list(tenantId, filter);
  }

  /** Advance an item's workflow status. Throws if no inbox repository. */
  async markStatus(tenantId: string, id: string, status: InboxItemStatus): Promise<void> {
    return this.requireInbox().setStatus(tenantId, id, status);
  }

  private requireInbox(): InboxRepository {
    if (!this.inbox) {
      throw new Error(
        "ExecutiveInbox: no inbox repository configured (pass options.inbox to persist/list items).",
      );
    }
    return this.inbox;
  }

  // --- internals ----------------------------------------------------------

  private matchBusiness(content: string): InboxBusiness | null {
    const blob = content.toLowerCase();
    let best: { biz: InboxBusiness; score: number } | null = null;
    for (const biz of this.businesses) {
      const terms = new Set<string>([...tokenize(biz.name), ...(biz.keywords ?? []).map((k) => k.toLowerCase())]);
      let score = 0;
      for (const t of terms) if (t.length >= 3 && blob.includes(t)) score++;
      if (score > 0 && (!best || score > best.score)) best = { biz, score };
    }
    return best?.biz ?? null;
  }

  private ownerFor(category: InboxCategory, businessName?: string): string {
    const dept: Partial<Record<InboxCategory, string>> = {
      business: "Operations",
      finance: "Finance",
      legal: "Legal",
      technology: "Deployment",
      relationship: "Customer Success",
      opportunity: "Sales",
      project: "Projects",
      task: "Operations",
      idea: "Product",
      risk: "Legal",
      learning: "You",
      asset: "Finance",
      health: "You (personal)",
      personal: "You (personal)",
    };
    const d = dept[category] ?? "You";
    return businessName ? `${businessName} / ${d}` : d;
  }

  private async linkMemories(tenantId: string, drop: InboxDrop): Promise<LinkedEntity[]> {
    if (!this.memory) return [];
    const hits = await this.memory.peek(tenantId, {
      text: drop.content,
      keywords: tokenize(drop.content).slice(0, 6),
      kinds: [],
      min_importance: 0,
      min_confidence: 0,
      limit: 5,
      include_archived: false,
    });
    return hits
      .filter((h) => h.score > 0.05)
      .map((h) => ({
        memory_id: h.memory.id,
        title: h.memory.title,
        kind: h.memory.kind,
        relevance: round2(Math.min(1, h.score)),
      }));
  }

  private suggestTasks(
    drop: InboxDrop,
    itemType: InboxItemType,
    category: InboxCategory,
    decision: Awaited<ReturnType<DecisionEngine["decide"]>>,
  ): SuggestedTask[] {
    if (itemType === "todo_list") {
      return drop.content
        .split(/\n+/)
        .map((l) => l.replace(/^\s*[-*]\s*|\[\s?\]\s*/g, "").trim())
        .filter((l) => l.length > 0)
        .slice(0, 10)
        .map((title) => ({ title, due: null, priority_level: decision.priority_level }));
    }
    const wantsTask =
      ["invoice", "contract", "calendar_invite", "meeting_notes"].includes(itemType) ||
      ["task", "project"].includes(category) ||
      decision.automation_opportunities.some((a) => /follow|reminder|schedule/i.test(a));
    if (!wantsTask) return [];
    return [
      {
        title: `${this.taskVerb(itemType)}: ${shortTitle(drop.content)}`,
        due: decision.recommended_deadline,
        priority_level: decision.priority_level,
      },
    ];
  }

  private taskVerb(itemType: InboxItemType): string {
    switch (itemType) {
      case "invoice":
        return "Pay";
      case "contract":
        return "Review & sign";
      case "calendar_invite":
        return "Confirm / prep";
      case "meeting_notes":
        return "Action items from";
      default:
        return "Handle";
    }
  }

  private missingInfo(itemType: InboxItemType, drop: InboxDrop): FieldRequest[] {
    const required = REQUIRED_FIELDS_BY_TYPE[itemType];
    if (!required) return [];
    const blob = drop.content.toLowerCase();
    const ctxKeys = new Set(Object.keys(drop.context).map((k) => k.toLowerCase()));
    return required
      .filter((f) => !blob.includes(f.replace(/_/g, " ")) && !blob.includes(f) && !ctxKeys.has(f))
      .map((field) => ({ field, prompt: `${humanize(field)}?`, required: false }));
  }

  private agentsFor(itemType: InboxItemType, base: string[]): string[] {
    const out = [...base];
    if ((itemType === "url" || itemType === "github_link") && !out.includes("research.web")) {
      out.push("research.web");
    }
    return out.slice(0, 4);
  }

  private approval(
    itemType: InboxItemType,
    category: InboxCategory,
    decision: Awaited<ReturnType<DecisionEngine["decide"]>>,
  ): { requires_approval: boolean; approval_reason: string } {
    if (itemType === "invoice") {
      return { requires_approval: true, approval_reason: "Paying money is irreversible — needs your sign-off." };
    }
    if (itemType === "contract" || category === "legal") {
      return { requires_approval: true, approval_reason: "Signing/legal commitments need your review." };
    }
    if (decision.required_approvals.length > 0) {
      return { requires_approval: true, approval_reason: "The Decision Engine flagged an irreversible step." };
    }
    return { requires_approval: false, approval_reason: "" };
  }

  private nextAction(
    itemType: InboxItemType,
    category: InboxCategory,
    owner: string,
    decision: Awaited<ReturnType<DecisionEngine["decide"]>>,
    requiresApproval: boolean,
  ): string {
    const base: Partial<Record<InboxItemType, string>> = {
      invoice: "Review and schedule payment",
      receipt: "File for expenses/taxes",
      contract: "Review the terms before signing",
      todo_list: "Add these to your task list",
      meeting_notes: "Extract and assign the action items",
      calendar_invite: "Confirm and prep",
      idea: "Run it through the Idea Builder",
      github_link: "Review and triage the technical item",
      url: "Review and file the link",
      business_card: "Save the contact and note the follow-up",
    };
    const verb = base[itemType] ?? `Review and route to ${owner}`;
    const due = decision.recommended_deadline ? ` by ${decision.recommended_deadline.slice(0, 10)}` : "";
    const appr = requiresApproval ? " (needs your approval)" : "";
    return `${verb}${due}; route to ${owner}${appr}.`;
  }

  private async saveMemory(
    tenantId: string,
    drop: InboxDrop,
    itemType: InboxItemType,
    category: InboxCategory,
    decision: Awaited<ReturnType<DecisionEngine["decide"]>>,
  ): Promise<string | null> {
    if (!this.memory) return null;
    const record = await this.memory.remember(tenantId, {
      kind: memoryKindFor(itemType, category),
      title: shortTitle(drop.content),
      body: drop.content,
      attributes: { source: drop.source, item_type: itemType, category, from_inbox: true },
      importance: decision.priority_score,
      confidence: 0.7,
      source: drop.source,
      keywords: tokenize(drop.content).slice(0, 8),
      expires_at: null,
    });
    return record.id;
  }
}

function tokenize(text: string): string[] {
  return [...new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3))];
}
function humanize(field: string): string {
  const s = field.replace(/_/g, " ");
  return s.length ? s[0]!.toUpperCase() + s.slice(1) : s;
}
function shortTitle(text: string): string {
  const first = text.replace(/\s+/g, " ").trim().split(/[.!?\n]/)[0]!.trim() || text.trim();
  return first.length > 80 ? `${first.slice(0, 77)}…` : first;
}
function labelType(itemType: InboxItemType): string {
  return itemType.replace(/_/g, " ");
}
