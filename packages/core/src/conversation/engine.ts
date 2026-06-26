import {
  ProcessConversationInputSchema,
  ConversationExtractionSchema,
  type ProcessConversationInput,
  type ConversationExtraction,
  type ConversationOutput,
} from "@alfy2/shared";

/**
 * Conversation Engine (docs/adr/ADR-0124-conversation.md). Alfy² as a thinking partner, not a command
 * processor. When Alyssa speaks naturally it listens, asks clarifying questions, connects to existing
 * knowledge, identifies opportunities, respectfully challenges assumptions, generates options, detects
 * patterns, remembers conclusions — and quietly proposes the tasks, assets, agents, businesses,
 * workflows, knowledge, and capital the conversation should become. Nothing executes: every output is a
 * proposal. Extraction is derived by deterministic heuristics on the utterance text. Append-only.
 * Tenant-scoped. (Distinct from the existing ConversionEngine — do not confuse.)
 */

export class ConversationEngine {
  private readonly extractions = new Map<string, ConversationExtraction>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Turn a natural utterance into a structured extraction of proposals. Nothing executes. */
  process(tenantId: string, input: ProcessConversationInput): ConversationExtraction {
    const i = ProcessConversationInputSchema.parse(input);
    const text = i.utterance;
    const lower = text.toLowerCase();

    const extraction = ConversationExtractionSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      utterance: text,
      clarifying_questions: clarifyingQuestions(lower),
      connections: connections(lower, i.known_topics),
      opportunities: opportunities(lower),
      challenged_assumptions: challengedAssumptions(text, lower),
      options: options(lower),
      patterns: patterns(lower, i.known_topics),
      conclusion: conclusion(lower, text),
      outputs: outputs(lower),
      created_at: this.clock().toISOString(),
    });
    this.extractions.set(extraction.id, extraction);
    return extraction;
  }

  get(tenantId: string, id: string): ConversationExtraction | undefined {
    const e = this.extractions.get(id);
    return e && e.tenant_id === tenantId ? e : undefined;
  }

  list(tenantId: string): ConversationExtraction[] {
    return [...this.extractions.values()].filter((e) => e.tenant_id === tenantId);
  }
}

const VAGUE_WORDS = ["maybe", "not sure", "i think", "kind of", "sort of", "somehow"];

function clarifyingQuestions(lower: string): string[] {
  const questions: string[] = [];
  const isShort = lower.trim().split(/\s+/).filter(Boolean).length <= 4;
  const isVague = VAGUE_WORDS.some((w) => lower.includes(w));
  if (isShort) {
    questions.push("Can you say a bit more about what you're trying to achieve here?");
  }
  if (isVague) {
    questions.push("What would the ideal outcome look like, concretely?");
  }
  return questions.slice(0, 2);
}

function connections(lower: string, knownTopics: readonly string[]): string[] {
  const found: string[] = [];
  for (const topic of knownTopics) {
    const t = topic.trim();
    if (t.length > 0 && lower.includes(t.toLowerCase())) {
      found.push(`Connects to existing knowledge: ${topic}.`);
    }
  }
  return found;
}

const OPPORTUNITY_TRIGGERS: ReadonlyArray<[string, string]> = [
  ["money", "There may be a direct path to revenue here worth scoping."],
  ["revenue", "There may be a direct path to revenue here worth scoping."],
  ["launch", "A launch could be an opportunity to package and announce this."],
  ["partner", "A partnership opportunity may be worth pursuing here."],
  ["clients", "There may be an opportunity to convert this into client work."],
];

function opportunities(lower: string): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const [trigger, line] of OPPORTUNITY_TRIGGERS) {
    if (lower.includes(trigger) && !seen.has(line)) {
      seen.add(line);
      lines.push(line);
    }
  }
  return lines;
}

const ABSOLUTE_WORDS = ["always", "never", "everyone", "impossible"];

function challengedAssumptions(text: string, lower: string): string[] {
  const challenges: string[] = [];
  for (const word of ABSOLUTE_WORDS) {
    if (lower.includes(word)) {
      challenges.push(
        `You said "${word}" — is that always true, or are there exceptions worth considering?`,
      );
    }
  }
  return challenges;
}

const DECISION_WORDS = ["should", "decide", " or "];

function options(lower: string): string[] {
  const hasDecision = DECISION_WORDS.some((w) => lower.includes(w));
  if (!hasDecision) return [];
  return [
    "Option A: commit now and move fast.",
    "Option B: run a small test first to de-risk it.",
    "Option C: hold and revisit once more is known.",
  ];
}

function patterns(lower: string, knownTopics: readonly string[]): string[] {
  const found: string[] = [];
  for (const topic of knownTopics) {
    const t = topic.trim();
    if (t.length > 0 && lower.includes(t.toLowerCase())) {
      found.push(`Recurring focus on ${topic}.`);
    }
  }
  return found;
}

const CONCLUSION_WORDS = ["so ", "decision", "going to", "let's"];

function conclusion(lower: string, text: string): string {
  if (CONCLUSION_WORDS.some((w) => lower.includes(w))) {
    return `Remembered conclusion: ${text.trim()}`;
  }
  return "";
}

interface OutputRule {
  kind: ConversationOutput["kind"];
  triggers: readonly string[];
  description: string;
}

const OUTPUT_RULES: readonly OutputRule[] = [
  {
    kind: "task",
    triggers: [" do ", "send", "build", "schedule"],
    description: "Propose a task to action what was discussed.",
  },
  {
    kind: "business",
    triggers: ["business", "company", "venture"],
    description: "Propose a new business or venture to explore.",
  },
  {
    kind: "agent",
    triggers: ["agent", "automate"],
    description: "Propose an agent to handle this automatically.",
  },
  {
    kind: "workflow",
    triggers: ["process", "workflow"],
    description: "Propose a workflow to make this repeatable.",
  },
  {
    kind: "asset",
    triggers: ["deck", "doc", "page", "content"],
    description: "Propose an asset to capture this for reuse.",
  },
  {
    kind: "knowledge",
    triggers: ["learned", "insight", "note"],
    description: "Propose saving this as knowledge.",
  },
  {
    kind: "capital",
    triggers: ["raise", "invest", "fund"],
    description: "Propose a capital action to evaluate.",
  },
];

function outputs(lower: string): ConversationOutput[] {
  const padded = ` ${lower} `;
  const results: ConversationOutput[] = [];
  for (const rule of OUTPUT_RULES) {
    if (rule.triggers.some((t) => padded.includes(t))) {
      results.push({ kind: rule.kind, description: rule.description });
    }
  }
  return results;
}
