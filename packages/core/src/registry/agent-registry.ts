import { AgentRegistrationSchema, type AgentRegistration } from "@alfy2/shared";

/**
 * In-memory agent registry. The Dispatcher resolves an agent key to a registration and uses its
 * endpoint to send Tasks. Swapping an agent = changing the registration, no orchestrator change.
 * See ARCHITECTURE.md §3.2.
 */
export class AgentRegistry {
  private readonly agents = new Map<string, AgentRegistration>();

  register(raw: unknown): AgentRegistration {
    const reg = AgentRegistrationSchema.parse(raw);
    if (this.agents.has(reg.key)) {
      throw new Error(`Duplicate agent key in registry: ${reg.key}`);
    }
    this.agents.set(reg.key, reg);
    return reg;
  }

  registerAll(raws: unknown[]): void {
    for (const raw of raws) this.register(raw);
  }

  get(key: string): AgentRegistration | undefined {
    return this.agents.get(key);
  }

  require(key: string): AgentRegistration {
    const a = this.agents.get(key);
    if (!a) throw new Error(`Unknown agent: ${key}`);
    return a;
  }

  list(): AgentRegistration[] {
    return [...this.agents.values()];
  }

  /** Can the named agent perform the requested capability? */
  supports(key: string, capability: string): boolean {
    return this.get(key)?.capabilities.includes(capability) ?? false;
  }
}
