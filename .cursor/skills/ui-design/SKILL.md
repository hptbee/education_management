---
name: ui-design
description: Project-specific UI constraints for the classroom gamification app. Use before ui-ux-pro-max or redesign skills. Overrides generic UI advice per PROJECT_SCOPE.
---

# UI Design (classroom overlay)

**This skill overrides generic UI/UX advice** when it conflicts with project rules.

## Source of truth

- [docs/PROJECT_SCOPE.md](../../../docs/PROJECT_SCOPE.md) — §12 UI/UX Requirements
- [`.cursor/rules/frontend.mdc`](../../rules/frontend.mdc)
- `src/app/globals.css`, `src/components/classroom/*`
- Motion tokens: `src/utils/motion.ts` — see [PROJECT_SCOPE.md](../../../docs/PROJECT_SCOPE.md) §13
- Dropdowns: `ClassroomSelect` / `ClassroomMenuSelect` only (no native `<select>`)

## Design direction

- Cute, playful, gamified classroom companion — **not** corporate SaaS or luxury agency
- Pastel sky `#4ba3e8` + dusty pink `#efa3bc` — **do not invent new palettes**
- Team colors: soft pastel cycle — not neon

## Overrides for cloned skills

When using `ui-ux-pro-max` or `redesign-existing-projects`, **ignore** advice to:

- Replace Lucide icons or change fonts globally
- Remove Sidebar or restructure navigation
- Use pure black backgrounds, picsum placeholders, or marketing asymmetry
- Run `--persist` or generate `design-system/MASTER.md`
- Apply AI-slop patterns (dark mesh hero, 3-column feature rows)

## Safe dials (taste skills)

| Dial | Value |
|---|---|
| DESIGN_VARIANCE | 3–5 |
| MOTION_INTENSITY | 6–7 |
| VISUAL_DENSITY | 5–7 |

## Copy and empty states

- Teacher-facing plain verbs; empty/error states give a **next action**

## Icons vs emoji

- **Lucide** for functional application UI: navigation, buttons, menus, edit/delete actions, settings, search, close, and standard controls.
- **Emoji are allowed** when they are part of the intentional playful classroom identity: team avatars, rewards, celebrations, games, Wall of Fame, decorative feedback, and user-selectable visual content.
- Do **not** replace intentional playful emoji with Lucide merely to satisfy a generic “no emoji” rule.

## Page layout tiers

Use shared utilities from `globals.css` (`classroom-page--*`):

| Tier | Max width | Routes |
|------|-----------|--------|
| Management | 1100px | students, teams, points, ranking, history, settings, classrooms, rewards (manage) |
| Workspace / tools | 1200px | tools, recognition |
| Dashboard / overview | 1400px | home dashboard, `AppDataShell` header band |
| Presentation / games | custom | fullscreen `PresentationChrome`, game dialogs — do not force standard tiers |

Standard horizontal padding: `px-5` on normal scroll pages (included in `classroom-page--*` utilities).

## ui-ux-pro-max search hints

```bash
py -3 ".cursor/skills/ui-ux-pro-max/scripts/search.py" "education kids gamification playful" --domain product
py -3 ".cursor/skills/ui-ux-pro-max/scripts/search.py" "touch target accessibility" --domain ux
py -3 ".cursor/skills/ui-ux-pro-max/scripts/search.py" "card rounded shadow" --stack shadcn
```

Never run `--persist` or `--design-system --persist`.
