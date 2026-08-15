# Agent Instructions

Always read before implementing:

1. PROJECT_SCOPE.md
2. PROJECT_RULES.md
3. Relevant existing feature files

## Critical Rule

DO NOT break the existing application shell.

The Sidebar, navigation, routing, and AppLayout are shared infrastructure.

Feature implementations must integrate into them.

Never replace App.tsx with a standalone feature page.

Never remove navigation to simplify implementation.

## Before coding

Inspect:

- src/App.*
- routing configuration
- AppLayout
- Sidebar
- current feature page
- active classroom/database state

## Key routes

| Route | Feature |
|---|---|
| `/` | Dashboard |
| `/students` | Student management |
| `/teams` | Team management |
| `/points` | Point actions & quick scoring |
| `/rewards` | Rewards |
| `/badges` | Badge catalog & student awards |
| `/tools` | Lucky Wheel, Study Timer, Lucky Star |
| `/games` | Classroom games |
| `/recognition` | Recognition |
| `/settings` | Classroom settings, roles, backup |

## After coding

Verify:

- Sidebar still renders.
- Existing navigation items still exist.
- Existing routes still work.
- New page renders inside the existing layout.
- Existing functionality is preserved.