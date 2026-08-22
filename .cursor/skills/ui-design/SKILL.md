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
| MOTION_INTENSITY | 4–6 |
| VISUAL_DENSITY | 5–7 |

## Copy and empty states

- Teacher-facing plain verbs; empty/error states give a **next action**
- No emoji as icons — use Lucide

## ui-ux-pro-max search hints

```bash
py -3 ".cursor/skills/ui-ux-pro-max/scripts/search.py" "education kids gamification playful" --domain product
py -3 ".cursor/skills/ui-ux-pro-max/scripts/search.py" "touch target accessibility" --domain ux
py -3 ".cursor/skills/ui-ux-pro-max/scripts/search.py" "card rounded shadow" --stack shadcn
```

Never run `--persist` or `--design-system --persist`.
