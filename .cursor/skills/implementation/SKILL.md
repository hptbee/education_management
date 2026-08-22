---
name: implementation
description: Implements an approved solution with minimal diff. Use after a plan is confirmed or when the user requests direct implementation.
---

# Implementation

Reuse investigation/plan context. Do not rediscover the same question.

## Before

Follow the approved plan or user request. Read [AGENTS.md](../../../AGENTS.md) when touching shell, routing, or classroom data.

Load on-demand when relevant:

- `src-tauri/` → [rust-patterns](../rust-patterns/SKILL.md)
- Worker / auth / cloud backup → [security-review](../security-review/SKILL.md)
- TSX / UI → [frontend.mdc](../../rules/frontend.mdc), [ui-design](../ui-design/SKILL.md)

## During

- Minimal diff; reuse `src/components/classroom/*`, `AppDataProvider`, `DatabaseService`
- Tests per [testing.mdc](../../rules/testing.mdc) when logic, persistence, state, or regressions are involved

## After

1. Inspect the diff
2. Run [verification](../verification/SKILL.md)
3. Summarize modified files

Do not replace `src/app/layout.tsx`, break Sidebar, or duplicate global classroom state.
