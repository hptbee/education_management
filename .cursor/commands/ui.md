---
description: Design or polish UI within classroom-ui constraints
---

Design or polish UI for:

$ARGUMENTS

Read and follow **in this order**:
1. `.cursor/skills/classroom-ui/SKILL.md` (project design constraints — wins over generic UI advice)
2. `.cursor/skills/ui-ux-pro-max/SKILL.md` (search tool for UX guidelines)

Run the search script when stack or UX guidance is needed:

```bash
py -3 ".cursor/skills/ui-ux-pro-max/scripts/search.py" "education classroom gamification kids" --design-system -p "Classroom App"
py -3 ".cursor/skills/ui-ux-pro-max/scripts/search.py" "<specific concern>" --domain ux
py -3 ".cursor/skills/ui-ux-pro-max/scripts/search.py" "<keyword>" --stack nextjs
```

Do **not** use `--persist` or generate `design-system/MASTER.md` — existing pastel tokens in PROJECT_SCOPE are the source of truth.

Preserve: Sidebar, AppLayout, Lucide icons, pastel palette (`#4ba3e8`, `#efa3bc`).
Reuse `src/components/classroom/*` and shadcn components before creating new primitives.
