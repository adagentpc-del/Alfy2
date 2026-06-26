# Identity, Conversation & Voice — who Alyssa is, and how she talks to Alfy²

Alfy² now has its **identity, conversation & voice layer**: five engines that protect who Alyssa is and make natural
conversation the primary way she runs the whole system. Where the rest of the platform optimizes, this layer
remembers that optimization serves a person — and that the person, not the optimizer, is in command. All
deterministic, tenant-scoped, and governed: the engines propose and stage; **nothing executes without approval**.

## Identity OS — protect who Alyssa is, override optimization

Optimization is amoral. Left alone it recommends the most efficient path even when that path violates who the
founder is. The **Identity OS** (ADR-0122) puts identity above the optimizer: **`setAnchor()`** records a value,
boundary, or non-negotiable, and **`check()`** tests any proposed action against the anchors so that **on conflict,
identity OVERRIDES optimization** — every time. Anchors are **mutable**, because identity evolves; they are revised,
not frozen. This sits above even the Constitution and the Five Immutable Laws for the founder's personal
non-negotiables, and the Conversation Engine reads it before staging anything.

## Philosophy Library and Today's Reminder — keep the principles alive

Principles that live only in a founder's head fade under pressure. The **Philosophy Library** (ADR-0123) captures
Alyssa's operating maxims — **`add()`**, **`revise()`**, **`pin()`** — and surfaces them back to her with
**`todaysReminder()`**, a **deterministic daily** "Today's Reminder" where the same day always yields the same
pinned principle, so the reminder is a stable ritual rather than a random quote. Philosophies are mutable; the
library accumulates and re-pins as Alyssa's thinking sharpens. Identity OS protects who she is; the Philosophy
Library keeps why she does it present every day.

## Conversation Engine and Vision Builder — think out loud, Alfy² builds underneath

The primary interface to Alfy² is conversation, not forms. The **Conversation Engine** (ADR-0124) is a **thinking
partner**: **`converse()`** turns natural speech into structured extractions across **tasks, assets, agents,
businesses, workflows, knowledge, and capital**, each staged for approval — Alyssa thinks out loud and Alfy² quietly
builds the OS underneath, but **nothing executes without approval**. It is **distinct from the Conversion Engine**
(ADR-0032): Conversation is the dialogue interface, Conversion optimizes revenue surfaces. Its idea-shaped sibling is
the **Vision Builder** (ADR-0125): triggered by "I have an idea…", **`build()`** runs a collaborative thinking
session that generates plans — **composing the Idea Builder** (ADR-0008) — and **`awaiting_approval` is always
true**, so it produces plans, never built artifacts. Between them, natural conversation becomes the way the whole
system is operated: she speaks, it stages, she approves.

## Voice Interface — hands-free, with a confirmation gate

The hands-free form of the conversation interface is voice. The **Voice Interface** (ADR-0126) is a **calm
companion**: **`interpret()`** maps an **utterance → `VoiceCommand`**, and for any **sensitive action it requires
confirmation first** — a misheard word never fires an irreversible command. The deterministic core is the
utterance-to-command mapping with its confirmation gate; **speech recognition and synthesis are runtime**, outside
the engine. It is the hands-free surface over the Conversation Engine, and its confirmation gate mirrors the
platform's human-in-command posture: aggressive understanding, conservative action, the founder in command of every
gate.

## How they compose

Identity OS protects who Alyssa is and overrides optimization on conflict. The Philosophy Library and Today's
Reminder keep her principles alive and in front of her. On top of that foundation, the Conversation Engine and
Vision Builder make natural conversation the primary interface — where Alyssa thinks out loud and Alfy² quietly
builds the OS underneath, never executing without approval — and the Voice Interface makes that hands-free with a
confirmation gate. The order matters: identity and philosophy first, so that everything conversation stages is
already filtered through who she is and what she believes; conversation and voice second, so the interface is
natural and the founder stays in command.

## Smoke

One consolidated smoke runs all five engines once with a frozen clock and deterministic ids; each engine parses its
own output through its Zod schema, so a clean run proves schema-valid output end to end:

```
pnpm identity:smoke
```

## See also

- ADRs: [ADR-0122](./adr/ADR-0122-identity-os.md) … [ADR-0126](./adr/ADR-0126-voice-interface.md).
- Composed / related engines: Idea Builder ([ADR-0008](./adr/ADR-0008-idea-builder.md)), Conversion Engine
  ([ADR-0032](./adr/ADR-0032-conversion-engine.md)), Founder Operating Principle
  ([ADR-0050](./adr/ADR-0050-founder-principle.md)), Institutional Memory
  ([ADR-0057](./adr/ADR-0057-institutional-memory.md)).
- Doctrine above it: [`CONSTITUTION_AND_ENTERPRISE.md`](./CONSTITUTION_AND_ENTERPRISE.md) (ADR-0051), the Five
  Immutable Laws ([ADR-0087](./adr/ADR-0087-immutable-laws.md)).
