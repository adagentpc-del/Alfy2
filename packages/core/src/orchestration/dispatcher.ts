import type { Task, SignalToAction, AgentRegistration } from "@alfy2/shared";
import { SignalToActionSchema } from "@alfy2/shared";
import type { AgentRegistry } from "../registry/agent-registry.js";

/**
 * The Dispatcher sends a Task to the registered agent and returns its SignalToAction result.
 * Transport is abstracted (AgentTransport) so today's HTTP can become a queue later WITHOUT
 * changing this class — switching transport is a config/composition change, not a rewrite.
 */

export interface AgentTransport {
  send(agent: AgentRegistration, task: Task): Promise<unknown>;
}

export class Dispatcher {
  constructor(
    private readonly registry: AgentRegistry,
    private readonly transport: AgentTransport,
  ) {}

  async dispatch(task: Task): Promise<SignalToAction> {
    const agent = this.registry.require(task.agent);
    if (!this.registry.supports(task.agent, task.capability)) {
      throw new Error(`Agent ${task.agent} does not support capability ${task.capability}`);
    }
    const raw = await this.transport.send(agent, task);
    // Validate the agent's output against the contract before it re-enters the core.
    return SignalToActionSchema.parse(raw);
  }
}

/** HTTP transport: POSTs the Task JSON to the agent endpoint. Default for Phase 0-2. */
export class HttpAgentTransport implements AgentTransport {
  async send(agent: AgentRegistration, task: Task): Promise<unknown> {
    const res = await fetch(agent.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(task),
      signal: AbortSignal.timeout(task.budget.timeout_ms),
    });
    if (!res.ok) {
      throw new Error(`Agent ${agent.key} returned ${res.status}`);
    }
    return res.json();
  }
}
