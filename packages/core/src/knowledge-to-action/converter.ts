import {
  ConvertIdeaInputSchema,
  KnowledgeActionSchema,
  type ConvertIdeaInput,
  type KnowledgeAction,
  type ActionDisposition,
} from "@alfy2/shared";

/**
 * The Knowledge-to-Action Converter (docs/adr/ADR-0031-knowledge-to-action-converter.md). Knowledge
 * must not sit unused. For every useful idea it produces an action item, a business use case, an
 * implementation plan, a revenue hypothesis, the required assets and agents, a test plan, an owner, a
 * deadline, a dashboard card, and a reusable operating manual — then decides: use now, save for later,
 * ignore, or convert into a campaign. Deterministic. Tenant-scoped.
 */

export interface KnowledgeToActionOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

const firstClause = (s: string): string => s.split(/[.;\n]/)[0]!.trim();

/** Decide the disposition from the value signal and whether the idea is campaign-shaped. */
export function decideDisposition(valueSignal: number, isCampaignShaped: boolean): ActionDisposition {
  if (valueSignal < 0.35) return "ignore";
  if (isCampaignShaped && valueSignal >= 0.6) return "convert_to_campaign";
  if (valueSignal >= 0.65) return "use_now";
  return "save_for_later";
}

export class KnowledgeToActionConverter {
  private readonly actions = new Map<string, KnowledgeAction>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: KnowledgeToActionOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Convert an idea into a ready-to-execute action with a reusable operating manual. */
  convert(tenantId: string, input: ConvertIdeaInput): KnowledgeAction {
    const i = ConvertIdeaInputSchema.parse(input);
    const now = this.clock().toISOString();
    const core = firstClause(i.idea);
    const biz = i.business ?? "the relevant business";
    const disposition = decideDisposition(i.value_signal, i.is_campaign_shaped);

    const action_item = `Pilot: ${core}`;
    const business_use_case = `For ${biz}: ${i.idea}`;
    const implementation_plan = [
      `Define the smallest version of "${core}"`,
      "Assemble the required assets and agent",
      "Run a time-boxed pilot",
      "Measure against the revenue hypothesis",
      i.is_campaign_shaped ? "If it works, hand to Campaign Intelligence to scale" : "If it works, codify as an SOP and scale",
    ];
    const revenue_hypothesis = `If "${core}" works, it improves a key metric for ${biz} — validate the lift in the pilot.`;
    const required_assets = ["Pilot brief", "Tracking sheet", ...(i.is_campaign_shaped ? ["A/B variants"] : ["SOP draft"])];
    const required_agents = i.is_campaign_shaped ? ["marketing.campaigns"] : ["operations.automation"];
    const test_plan = ["Baseline the current metric", "Run the pilot for 2 weeks", "Compare against baseline", "Decide scale / iterate / drop"];
    const dashboard_card = `${core} — pilot status vs baseline`;
    const operating_manual =
      `Operating Manual — ${core}\n` +
      `1. Trigger: when this situation arises for ${biz}.\n` +
      `2. Steps: ${implementation_plan.join("; ")}.\n` +
      `3. Owner: ${i.owner}.\n` +
      `4. Success: the revenue hypothesis is confirmed.\n` +
      `This manual is reusable IP — apply it wherever the same situation recurs.`;

    const action: KnowledgeAction = KnowledgeActionSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      idea: i.idea,
      action_item,
      business_use_case,
      implementation_plan,
      revenue_hypothesis,
      required_assets,
      required_agents,
      test_plan,
      owner: i.owner,
      deadline: i.deadline,
      dashboard_card,
      disposition,
      operating_manual,
      created_at: now,
      updated_at: now,
    });
    this.actions.set(action.id, action);
    return action;
  }

  get(tenantId: string, id: string): KnowledgeAction | undefined {
    const a = this.actions.get(id);
    return a && a.tenant_id === tenantId ? a : undefined;
  }

  list(tenantId: string, disposition?: ActionDisposition): KnowledgeAction[] {
    return [...this.actions.values()].filter(
      (a) => a.tenant_id === tenantId && (disposition ? a.disposition === disposition : true),
    );
  }
}
