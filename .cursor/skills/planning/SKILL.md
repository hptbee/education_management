---
name: planning
description: Creates an implementation plan before significant changes. Use after investigating the codebase. Wait for confirmation before implementing.
---

# Planning

Do not modify code. Investigate first (`.cursor/skills/investigate/SKILL.md`). **WAIT for explicit confirmation** before implementing.

Capture one existing example per category (path:line): naming, error handling, data access (`DatabaseService` / `useAppData()`), tests. If none exist, say so.

Read [AGENTS.md](../../../AGENTS.md), [PROJECT_RULES.md](../../../PROJECT_RULES.md), [docs/PROJECT_SCOPE.md](../../../docs/PROJECT_SCOPE.md) when the task touches shell, routing, or classroom data.

## Output

- Summary and current behavior
- Patterns to mirror (path:line)
- Files to change (file | action | why)
- Approach, steps, risks, test plan
- Complexity: Low / Medium / High
