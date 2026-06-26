import type {
  BriefingItem,
  CalendarBlock,
  MeetingPrep,
  EnergyPlan,
} from "@alfy2/shared";

/**
 * Deterministic markdown rendering of a briefing for the dashboard. Pure string assembly — no I/O.
 */

interface Sections {
  horizon: string;
  daily_priorities: BriefingItem[];
  revenue_focus: BriefingItem[];
  calendar_preparation: CalendarBlock[];
  meeting_preparation: MeetingPrep[];
  follow_ups: BriefingItem[];
  risk_alerts: BriefingItem[];
  blocked_projects: BriefingItem[];
  personal_reminders: BriefingItem[];
  energy_optimization: EnergyPlan;
  decision_queue: BriefingItem[];
}

const bullet = (i: BriefingItem): string => {
  const tags: string[] = [i.priority_level];
  if (i.required_approvals.length) tags.push("needs approval");
  if (i.due) tags.push(`due ${i.due.slice(0, 10)}`);
  return `- ${i.title} _(${tags.join(", ")})_`;
};

const section = (heading: string, lines: string[]): string =>
  lines.length ? `## ${heading}\n${lines.join("\n")}\n` : "";

export function renderDashboardMarkdown(s: Sections): string {
  const parts: string[] = [`# Chief of Staff — ${s.horizon}\n`];

  parts.push(section("Daily priorities", s.daily_priorities.map(bullet)));
  parts.push(section("Revenue focus", s.revenue_focus.map(bullet)));
  parts.push(
    section(
      "Decision queue",
      s.decision_queue.map((i) => `- ${i.title} _(${i.priority_level}, awaiting your approval)_`),
    ),
  );
  parts.push(section("Risk alerts", s.risk_alerts.map(bullet)));
  parts.push(section("Blocked projects", s.blocked_projects.map(bullet)));
  parts.push(section("Follow-ups", s.follow_ups.map(bullet)));
  parts.push(
    section(
      "Calendar",
      s.calendar_preparation.map(
        (b) => `- ${b.label}${b.when ? ` (${b.when.slice(11, 16)})` : ""}: ${b.recommendation}`,
      ),
    ),
  );
  parts.push(
    section(
      "Meeting prep",
      s.meeting_preparation.map(
        (m) => `- ${m.title}${m.when ? ` (${m.when.slice(11, 16)})` : ""} — ${m.prep_points.length} prep points`,
      ),
    ),
  );
  parts.push(section("Personal", s.personal_reminders.map(bullet)));
  parts.push(
    section("Energy plan", [
      s.energy_optimization.summary,
      ...s.energy_optimization.deep_work.map((i) => `- deep work: ${i.title}`),
      ...s.energy_optimization.quick_wins.map((i) => `- quick win: ${i.title}`),
    ]),
  );

  return parts.filter(Boolean).join("\n").trim();
}
