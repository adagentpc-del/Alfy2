# 31 · Design System

The dashboard (`apps/web/index.html`) uses a small, flat, premium design language:
- **Palette:** neutral ink `#1f2933` / muted `#6b7280`; surfaces white on `#f7f6f3`; one accent green
  `#2f6f5e` (built/healthy), amber `#9a5a22` (watch), red `#a32d2d` (critical), clay `#b8732e`.
- **Type:** system sans; two weights (400/500); sentence case everywhere; no ALL CAPS.
- **Components:** metric cards, bordered list rows, pills (green/amber/red/gray), flat buttons, status
  dots. Radius 12px cards / 8px controls. No gradients/shadows beyond a hairline.
- **Responsive:** sidebar collapses to a top bar under 760px.

> PLACEHOLDER: no separate exported design-token file yet. When a real component library is built
> (Release 15), formalize tokens here and align with `docs/IDENTITY_CONVERSATION_VOICE.md`.
