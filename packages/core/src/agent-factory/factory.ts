import {
  AgentBlueprintSchema,
  GeneratedAgentSchema,
  type AgentRecommendation,
  type AgentBlueprint,
  type GeneratedAgent,
  type GeneratedFile,
  type AgentRegistration,
  type DecisionCategory,
  type MemoryKind,
  type Decision,
} from "@alfy2/shared";
import { detectRecurring, type DetectOptions } from "./detector.js";
import {
  familyFromKey,
  renderConfigJson,
  renderInitPy,
  renderAgentPy,
  renderInstructionsMd,
  renderTestPy,
  renderDocMd,
} from "./templates.js";

/**
 * The Agent Factory — Alfy2's self-extension layer (docs/adr/ADR-0005-agent-factory.md).
 * Detects recurring responsibilities, recommends a new agent, and — ONLY after operator approval —
 * generates the full agent (folder, config, instructions, memory scope, permissions, tools, success
 * metrics, dashboard card, task queue, tests, docs) and registers it so the orchestrator can dispatch
 * to it immediately.
 *
 * Core stays infra-free: file writing goes through a FileWriter port; registration goes through an
 * AgentRegistrar port. Generation is gated — it throws unless `blueprint.approved` is true.
 */

/** Port for materializing files to disk (provided by the service/CLI; never by core). */
export interface FileWriter {
  write(path: string, content: string): Promise<void>;
}

/** Port for making the agent live to the orchestrator (satisfied by AgentRegistry). */
export interface AgentRegistrar {
  register(raw: unknown): AgentRegistration;
}

export class AgentApprovalError extends Error {
  constructor() {
    super("Agent generation requires operator approval (blueprint.approved is false).");
    this.name = "AgentApprovalError";
  }
}

export interface AgentFactoryOptions {
  clock?: () => Date;
  /** Base URL used to derive the generated agent's endpoint. */
  workersBaseUrl?: string;
}

export interface GenerateTargets {
  /** If provided, the generated files are written to disk through this port. */
  writer?: FileWriter;
  /** If provided, the agent is registered and becomes immediately resolvable by the orchestrator. */
  registry?: AgentRegistrar;
}

/** Decision category -> memory kinds the generated agent should be scoped to. */
const MEMORY_SCOPE_BY_CATEGORY: Record<DecisionCategory, MemoryKind[]> = {
  business: ["business", "company", "person", "project"],
  personal: ["home", "vehicle", "preference", "task"],
  health: ["health_event", "doctor"],
  finance: ["account", "subscription", "contract"],
  relationship: ["person", "conversation"],
  idea: ["idea", "project"],
  learning: ["lesson", "idea"],
  risk: ["decision", "contract"],
  opportunity: ["company", "business"],
};

const AGENT_KEY = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/;

export class AgentFactory {
  private readonly clock: () => Date;
  private readonly baseUrl: string;

  constructor(options: AgentFactoryOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.baseUrl = options.workersBaseUrl ?? "http://localhost:8081";
  }

  /** Detect recurring responsibilities and recommend agents (pre-approval). */
  recommend(decisions: Decision[], options?: DetectOptions): AgentRecommendation[] {
    return detectRecurring(decisions, options);
  }

  /**
   * Turn a recommendation into a complete, UN-approved blueprint with safe defaults. The operator
   * reviews/edits this and sets `approved: true` before generation.
   */
  draftBlueprint(rec: AgentRecommendation): AgentBlueprint {
    const key = AGENT_KEY.test(rec.proposed_key)
      ? rec.proposed_key
      : `${rec.primary_category}.assistant`;
    const capabilities =
      rec.suggested_capabilities.length > 0
        ? rec.suggested_capabilities
        : [`handle_${rec.primary_category}`];

    const blueprint: AgentBlueprint = {
      key,
      runtime: "python",
      version: "0.1.0",
      description: `Handles recurring ${rec.primary_category} work (${rec.rationale}).`,
      capabilities,
      tools: rec.suggested_tools,
      memory_scope: {
        kinds: MEMORY_SCOPE_BY_CATEGORY[rec.primary_category],
        can_read: true,
        can_write: false,
        max_items: 50,
      },
      permissions: {
        network: false,
        irreversible_actions: false,
        requires_approval_for: [],
      },
      instructions:
        `Watch for recurring ${rec.primary_category} responsibilities. For each, prepare the work and ` +
        `place results in the decision queue for operator approval. Never execute irreversible steps yourself.`,
      success_metrics: [
        {
          name: "coverage",
          description: `Share of ${rec.primary_category} items this agent handled`,
          target: ">= 90%",
        },
      ],
      dashboard_card: {
        title: `${capitalize(rec.primary_category)} Agent`,
        subtitle: `Auto-handles recurring ${rec.primary_category} work`,
        metric_keys: ["coverage"],
        status: "proposed",
      },
      task_queue: { name: `${key}.queue`, max_concurrency: 1, retry_limit: 2 },
      approved: false,
    };
    // Validate the draft against the contract (applies defaults, enforces patterns).
    return AgentBlueprintSchema.parse(blueprint);
  }

  /**
   * Generate the full agent from an APPROVED blueprint. Throws unless `blueprint.approved` is true.
   * Optionally writes files (via `writer`) and registers the agent (via `registry`) so the
   * orchestrator can dispatch to it immediately.
   */
  async generate(blueprint: AgentBlueprint, targets: GenerateTargets = {}): Promise<GeneratedAgent> {
    const bp = AgentBlueprintSchema.parse(blueprint);
    if (!bp.approved) throw new AgentApprovalError();

    const family = familyFromKey(bp.key);
    const dir = `workers/alfy_workers/${family}`;
    const doc_path = `docs/agents/${family}.md`;
    const test_path = `${dir}/test_agent.py`;

    const registration: AgentRegistration = {
      key: bp.key,
      runtime: bp.runtime,
      endpoint: `${this.baseUrl}/agents/${family}/run`,
      capabilities: bp.capabilities,
      version: bp.version,
    };

    const files: GeneratedFile[] = [
      { path: `${dir}/__init__.py`, content: renderInitPy(bp) },
      { path: `${dir}/agent.py`, content: renderAgentPy(bp, family) },
      { path: `${dir}/config.json`, content: renderConfigJson(bp, registration) },
      { path: `${dir}/INSTRUCTIONS.md`, content: renderInstructionsMd(bp) },
      { path: test_path, content: renderTestPy(bp, family) },
      { path: doc_path, content: renderDocMd(bp, family) },
    ];

    const generated: GeneratedAgent = {
      registration,
      files,
      dashboard_card: { ...bp.dashboard_card, status: "active" },
      task_queue: bp.task_queue,
      success_metrics: bp.success_metrics,
      memory_scope: bp.memory_scope,
      permissions: bp.permissions,
      doc_path,
      test_path,
      summary: `Generated agent ${bp.key} with ${files.length} files; ${
        targets.registry ? "registered and live to the orchestrator" : "ready to register"
      }.`,
      created_at: this.clock().toISOString(),
    };

    // Validate the output contract before any side effects.
    const result = GeneratedAgentSchema.parse(generated);

    // Side effects happen ONLY through the provided ports.
    if (targets.writer) {
      for (const file of result.files) await targets.writer.write(file.path, file.content);
    }
    if (targets.registry) {
      targets.registry.register(result.registration);
    }
    return result;
  }
}

function capitalize(s: string): string {
  return s.length ? s[0]!.toUpperCase() + s.slice(1) : s;
}
