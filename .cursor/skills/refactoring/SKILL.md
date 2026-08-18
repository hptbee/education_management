---
name: refactoring
description: Improves code structure without changing behavior. Use when cleaning structure, removing dead code, or reducing duplication.
---

# Refactoring

Preserve behavior. Follow `.cursor/rules/00-tool-routing.mdc` for caller checks — do not run both CBM and Serena for the same question.

| Tier | Examples | Action |
|---|---|---|
| **SAFE** | Unused internals | Delete after one caller check |
| **CAUTION** | Shared components, routes, exports | Check dynamic imports |
| **DANGER** | Config, entry points, nav routes | Investigate before touching |

Known symbol + defining file → Serena `find_referencing_symbols` with `relative_path`. Unknown callers / impact → CBM `trace_path`. Leftover string → Grep.

Preserve `src/app/layout.tsx` and `components/sidebar.tsx`. Update `ClassroomDatabase` immutably. Do not mix bugfixes into the same pass unless asked. Do not install knip unless asked.
