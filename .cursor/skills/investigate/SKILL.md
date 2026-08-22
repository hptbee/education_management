---
name: investigate
description: Retrieves minimal context with one primary tool before changing code. Use when starting a feature, tracing behavior, locating unknown code, or investigating a bug.
---

# Investigate

Do not modify code. Follow [`.cursor/rules/00-tool-routing.mdc`](../../rules/00-tool-routing.mdc) — one primary tool, then stop.

Known anchors: `src/app/layout.tsx`, `components/sidebar.tsx`, `src/database/`, `src/store/AppDataContext.tsx`.

When the task touches shell, routing, or classroom data, read [AGENTS.md](../../../AGENTS.md) and relevant docs linked there.

## Bugs

State expected vs actual. Trace UI → state → `DatabaseService` → storage. Separate:

- **Confirmed findings** (evidence only)
- **Likely causes**
- **Hypotheses** (unverified)

## Output

Relevant files, execution flow if needed, existing patterns with path evidence, what is still unknown. For bugs: root cause with evidence, similar areas, recommended fix options (not implemented).
