/**
 * Runtime smoke for the GTM Factory. Proves one offer builds a complete launch plan (ICP, positioning,
 * channel plans owned by registry titles, asset checklist, phased calendar, execution packets,
 * measurement), that every external step carries its approval action class (nothing external moves
 * ungated), and that plans are tenant-scoped. Run with: `tsx scripts/gtm-factory-smoke.mts`.
 */
import assert from "node:assert/strict";
import { GtmFactory } from "@alfy2/core";
import { PlanLaunchInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-07-02T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const factory = new GtmFactory({ clock: () => NOW, idFactory });

// === 1. One offer → a complete plan with every section populated. ===
const plan = factory.plan(
  TENANT,
  PlanLaunchInputSchema.parse({
    offer: {
      name: "FounderOS Beta",
      promise: "Run your company from one command center",
      price_point: "$199/mo",
      business_key: "founderos",
    },
    icp_hints: ["Solo founders running 2+ ventures", "Already pay for 5+ SaaS tools"],
    channels: ["email", "social", "podcast"],
    launch_window_days: 30,
    revenue_target: "$10k MRR in 60 days",
  }),
);
assert.equal(plan.channel_plans.length, 3, "one channel plan per channel");
assert.equal(plan.execution_packets.length, 3, "one execution packet per channel");
assert.equal(plan.measurement.length, 3, "one measurement per channel");
assert.ok(plan.icp_summary.length >= 2 && plan.asset_checklist.length >= 3, "ICP + assets populated");
assert.equal(plan.positioning.promise, "Run your company from one command center");
console.log(`[1] one offer → complete plan (${plan.calendar.length} calendar entries, ${plan.asset_checklist.length} assets) ✔`);

// === 2. Every external step is approval-gated with the right action class. ===
const external = plan.calendar.filter((e) => e.phase !== "warm_up");
assert.ok(external.every((e) => e.requires_approval && e.approval_class !== "internal_action"),
  "every launch/follow-through step gated");
assert.ok(plan.calendar.filter((e) => e.phase === "warm_up").every((e) => !e.requires_approval),
  "warm-up (drafts only) is ungated");
const classFor = (c: string) => plan.execution_packets.find((p) => p.channel === c)?.approval_class;
assert.equal(classFor("email"), "send_message", "email packets gate as send_message");
assert.equal(classFor("social"), "publish_public", "social packets gate as publish_public");
assert.equal(classFor("podcast"), "publish_public", "podcast packets gate as publish_public");
console.log("[2] every external step carries its approval class (send_message / publish_public) ✔");

// === 3. Channels are owned by real registry titles; packets start as drafts. ===
const owners = plan.channel_plans.map((c) => c.owner_title);
assert.deepEqual(owners, ["Email Campaign Manager", "Social Media Manager", "PR Manager"],
  "channel owners are agent titles from docs/AGENT_TITLE_REGISTRY.md");
assert.ok(plan.execution_packets.every((p) => p.status === "draft"), "packets start as drafts");
console.log("[3] channels owned by registry titles; packets start as drafts ✔");

// === 4. Calendar phases sequence warm_up → launch → follow_through inside the window. ===
const days = (phase: string) => plan.calendar.filter((e) => e.phase === phase).map((e) => e.day_offset);
assert.ok(Math.max(...days("warm_up")) < Math.min(...days("launch")), "warm-up precedes launch");
assert.ok(Math.max(...days("launch")) < Math.min(...days("follow_through")), "launch precedes follow-through");
assert.ok(plan.calendar.every((e) => e.day_offset <= 30), "calendar fits the launch window");
console.log("[4] phased calendar (warm_up → launch → follow_through) inside the window ✔");

// === 5. No ICP hints → the plan demands answers instead of inventing them. ===
const bare = factory.plan(
  TENANT,
  PlanLaunchInputSchema.parse({
    offer: { name: "Oralia Pilot", promise: "A calmer mouth-care routine" },
    channels: ["community"],
  }),
);
assert.ok(bare.icp_summary.every((l) => l.startsWith("TO ANSWER:")), "missing ICP becomes explicit questions");
console.log("[5] missing ICP hints become explicit questions, never invented facts ✔");

// === 6. Tenant isolation — another tenant cannot see the plans. ===
assert.equal(factory.get(OTHER, plan.id), undefined, "get is tenant-scoped");
assert.equal(factory.list(OTHER).length, 0, "other tenant has no plans");
assert.equal(factory.list(TENANT).length, 2, "this tenant keeps both");
console.log("[6] tenant isolation ✔");

console.log(
  "\nGTM FACTORY SMOKE OK — one offer builds a complete launch plan (ICP, positioning, channel plans owned by registry titles, asset checklist, phased calendar, execution packets, measurement); every external step carries its approval action class; plans are tenant-scoped.",
);
