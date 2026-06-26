import {
  DetectFrameworkInputSchema,
  TaughtFrameworkSchema,
  type DetectFrameworkInput,
  type TaughtFramework,
  type FrameworkArtifact,
  type FrameworkArtifactKind,
} from "@alfy2/shared";

const ARTIFACT_KINDS: FrameworkArtifactKind[] = [
  "explanation", "step_by_step", "examples", "use_cases", "checklist", "worksheet",
  "training_module", "podcast_topic", "consulting_asset", "founderos_feature",
];

/**
 * Teach My Framework Engine (docs/adr/ADR-0133-teach-framework.md). generate() distills a recurring
 * problem-solving pattern into a named, teachable framework with all ten reusable artifacts, and scores its
 * strength from how many times Alyssa has solved the problem. Turns her natural intelligence into reusable
 * IP. Deterministic scaffolding. Tenant-scoped. Append-only in-memory store.
 */
export class TeachMyFrameworkEngine {
  private readonly frameworks = new Map<string, TaughtFramework>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  generate(tenantId: string, input: DetectFrameworkInput): TaughtFramework {
    const i = DetectFrameworkInputSchema.parse(input);
    const name = `The ${titleCase(i.problem_type)} Framework`;
    const explanation = `A repeatable approach Alyssa uses to solve "${i.problem_type}", distilled from ${i.solution_count} solved case(s).`;
    const artifacts: FrameworkArtifact[] = ARTIFACT_KINDS.map((kind) => ({ kind, content: this.artifactContent(kind, i.problem_type) }));

    const framework = TaughtFrameworkSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      name,
      problem_type: i.problem_type,
      explanation,
      artifacts,
      strength: round(Math.min(1, i.solution_count / 5)),
      created_at: this.clock().toISOString(),
    });
    this.frameworks.set(framework.id, framework);
    return framework;
  }

  get(tenantId: string, id: string): TaughtFramework | undefined {
    const f = this.frameworks.get(id);
    return f && f.tenant_id === tenantId ? f : undefined;
  }

  list(tenantId: string): TaughtFramework[] {
    return [...this.frameworks.values()].filter((f) => f.tenant_id === tenantId);
  }

  private artifactContent(kind: FrameworkArtifactKind, problem: string): string {
    const map: Record<FrameworkArtifactKind, string> = {
      explanation: `What this framework is and when to use it for "${problem}".`,
      step_by_step: `The ordered steps to apply the framework to "${problem}".`,
      examples: `Worked examples of "${problem}" solved with the framework.`,
      use_cases: `Where the framework fits — and where it does not — for "${problem}".`,
      checklist: `A checklist to run the framework on "${problem}".`,
      worksheet: `A fill-in worksheet for applying the framework to "${problem}".`,
      training_module: `A short training module teaching the framework for "${problem}".`,
      podcast_topic: `A podcast episode outline on solving "${problem}".`,
      consulting_asset: `A client-ready consulting asset for "${problem}".`,
      founderos_feature: `A candidate FounderOS feature that productizes the framework.`,
    };
    return map[kind];
  }
}

const titleCase = (s: string): string => s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const round = (n: number): number => Math.round(n * 1000) / 1000;
