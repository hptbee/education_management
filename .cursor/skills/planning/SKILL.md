---
name: planning
description: Creates an implementation plan after investigating. Wait for confirmation only when the user asked to plan or did not request implementation.
---

# Planning

Do not modify code. Investigate first ([investigate](../investigate/SKILL.md)).

Capture one existing example per category (path:line): naming, error handling, data access (`DatabaseService` / `useAppData()`), tests. If none exist, say so.

Read [AGENTS.md](../../../AGENTS.md) and docs linked there when the task touches shell, routing, or classroom data.

## Confirmation

**Wait for explicit confirmation before implementing** only when the user asked for a plan or did not ask to implement. If the user requested both plan and implementation, proceed after presenting the plan.

## Output

- Summary and current behavior
- Patterns to mirror (path:line)
- Files to change (file | action | why)
- Approach, steps, risks, validation plan
- Complexity: Low / Medium / High
