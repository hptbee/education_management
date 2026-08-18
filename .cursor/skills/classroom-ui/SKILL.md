---
name: classroom-ui
description: Project-specific UI constraints for the classroom gamification app. Use before ui-ux-pro-max or redesign skills when designing, polishing, or auditing UI. Enforces pastel palette, Sidebar shell, Lucide icons, and playful classroom aesthetic per PROJECT_SCOPE.
---

# Classroom UI Overlay

**This skill overrides generic UI/UX advice** when it conflicts with project design rules.

## Source of truth

Read before any UI work:

- [docs/PROJECT_SCOPE.md](../../../docs/PROJECT_SCOPE.md) — §12 UI/UX Requirements
- [`.cursor/rules/frontend.mdc`](../../rules/frontend.mdc)
- Existing CSS tokens in `src/app/globals.css` and component patterns in `src/components/classroom/`

## Design direction

- **Cute, chibi, playful, gamified** classroom companion
- **Not** corporate admin, SaaS dashboard, or Awwwards luxury agency
- Pastel sky `#4ba3e8` + dusty pink `#efa3bc` — **do not invent new palettes**
- Page background `#f7fafd`
- Team colors: soft pastel cycle (pink, sky, lavender, peach) — not neon

## Shell (non-negotiable)

- Keep **Sidebar** (`components/sidebar.tsx`) and **AppLayout** (`src/app/layout.tsx`)
- Feature pages only replace main content — never remove nav
- Do not switch to floating pill nav, top-only nav, or marketing landing layouts

## Icons & typography

- **Keep Lucide** — do not swap to Phosphor/Heroicons per generic taste-skill advice
- Playful headings allowed; body text must stay readable for teacher use
- Larger typography on student-facing / TV display pages

## Components

Reuse before creating:

- `src/components/classroom/*` — ClassroomButton, ClassroomCard, PageHeader, etc.
- `components/ui/*` — shadcn primitives
- Existing dashboard widgets in `components/dashboard/`

## Motion

- Framer Motion is already in the repo — prefer it over adding GSAP
- Respect `prefers-reduced-motion` (required for student-facing celebration effects)
- Motion: light and cheerful — confetti on wheel results OK; no cinematic scroll hijacking

## Safe dials (when taste-skill dials apply)

| Dial | Value | Rationale |
|---|---|---|
| DESIGN_VARIANCE | 3–5 | Symmetrical classroom dashboard, not marketing asymmetry |
| MOTION_INTENSITY | 4–6 | Playful but not distracting during class |
| VISUAL_DENSITY | 5–7 | Teacher needs quick access to scoring actions |

## Touch & accessibility

- Min 44×44px touch targets for classroom actions (+1, spin, pick student)
- Visible focus rings for keyboard nav
- CRUD/scoring overlays: `useModalFocusTrap` + `role="dialog"` + `aria-modal` + labelled heading (`gift-redeem-dialog.tsx`). Leave Lucky Wheel without a keyboard trap unless requested.
- Do not rely on color alone for important state
- No emoji as icons — use Lucide

## Overrides for cloned skills

When using `ui-ux-pro-max` or `redesign-existing-projects`, **ignore** advice to:

- Replace Lucide icons
- Change fonts globally
- Remove Sidebar or restructure navigation
- Use pure black `#000` backgrounds or OLED dark luxury themes
- Add picsum/placeholder hero images
- Apply `--persist` design-system files that overwrite pastel tokens
- Use 3-column equal feature rows or centered dark mesh hero (AI slop patterns)

## ui-ux-pro-max search hints

When running `search.py`, use queries like:

```bash
py -3 ".cursor/skills/ui-ux-pro-max/scripts/search.py" "education kids gamification playful" --domain product
py -3 ".cursor/skills/ui-ux-pro-max/scripts/search.py" "touch target accessibility" --domain ux
py -3 ".cursor/skills/ui-ux-pro-max/scripts/search.py" "card rounded shadow" --stack shadcn
py -3 ".cursor/skills/ui-ux-pro-max/scripts/search.py" "dashboard layout" --stack nextjs
```

Never run `--persist` or `--design-system --persist` in this project.
