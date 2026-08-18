---
name: implementation
description: Implements an approved solution with minimal diff. Use after a plan is confirmed, when building features or applying fixes.
---

# Implementation

Reuse investigation context. Do not rediscover the same question.

## Before

Read [AGENTS.md](../../../AGENTS.md), [PROJECT_RULES.md](../../../PROJECT_RULES.md), [docs/PROJECT_SCOPE.md](../../../docs/PROJECT_SCOPE.md) when touching shell, routing, or classroom data. Follow the approved plan. Inspect patterns in the files already identified.

## During

- Change only what the task requires.
- Reuse `src/components/classroom/*`, `AppDataProvider`, `DatabaseService`.
- Add tests only if the user asked or the plan includes them.

## After

1. Inspect the diff.
2. Check sidebar, nav, classroom switch, existing routes.
3. Smallest RTK checks (`rtk vitest run`; `rtk next build` only if needed).
4. Summarize modified files.

Do not replace `src/app/layout.tsx`, break Sidebar, or duplicate global classroom state.
