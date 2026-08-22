---
description: Run RTK tests and build checks after non-trivial changes; confirm sidebar and classroom state
---

Verify changes for:

$ARGUMENTS

Run validation after non-trivial work:

1. Inspect the diff — confirm scope matches the task.
2. **Tests:** `rtk vitest run` — run targeted tests first when you know affected files; full suite if unsure.
3. **Build:** `rtk next build` only when the change can break production (routing, layout, static export, env, Tauri `out/`).
4. **Manual checks** when UI or classroom data is involved:
   - Sidebar renders and nav items work
   - Active classroom survives page change
   - New pages render inside AppLayout

Do not require 80% coverage or TDD unless the user asked.

Summarize what passed and what still needs manual verification.
