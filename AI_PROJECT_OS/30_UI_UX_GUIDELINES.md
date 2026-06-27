# 30 · UI / UX Guidelines

Principles (Constitution §9): one clear entry point; lead with **what changed, why it matters, the next
action**; surface the decision, not the data dump; respect attention (batch the non-urgent, interrupt
only for critical); make the safe path the easy path (approvals/undo built in); premium + plain, no
jargon; trust through transparency (show status honestly, including failures and uncertainty).

**Current UI:** `apps/web/index.html` — a single self-contained dashboard with Mission Control, Executive
Inbox, Approvals, and Founder tabs. It runs on representative data and a **Connect** control that points
it at the live API (token stored in-browser only). Live at https://alfy2.vercel.app.

**Next:** wire the remaining tabs to live endpoints; eventually a full app (Next.js) — Release 15. There
is a rendered preview/mockup history in chat and the SVG references `docs/ALFIE_SYSTEM_MAP.svg`,
`docs/ALFIE_ROADMAP.svg`.
