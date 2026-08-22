---
name: verification
description: Run the smallest relevant validation after changes; report Passed, Failed, Not run, and manual checks honestly.
---

# Verification

Never claim a check passed unless it actually ran.

## Steps

1. **Inspect the diff** — confirm scope matches the task.
2. **Choose smallest validation** — targeted before broad.
3. **Tests:** `rtk vitest run` — affected files first; full suite if unsure.
4. **Build:** `rtk next build` only when the change can break production (routing, layout, static export, env, Tauri `out/`).
5. **Typecheck/lint** — only if relevant to the change.
6. **List what could not run** — missing env, desktop-only paths, manual UI.

## Manual verification (UI or classroom data)

- Sidebar renders and nav items work
- Active classroom survives page change
- New pages render inside AppLayout

## Output format

Report each check as one of:

- **Passed** — command ran and succeeded
- **Failed** — command ran and failed (include relevant output)
- **Not run** — skipped with reason
- **Manual verification required** — cannot automate; list what the user should check

Do not require 80% coverage or TDD unless the user asked.
