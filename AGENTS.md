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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
