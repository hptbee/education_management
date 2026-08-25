# Agent Instructions

Local-first classroom management app: Next.js 16, React 19, Tauri 2, TypeScript, Tailwind 4.

**Cursor config:** persistent constraints in [`.cursor/rules/`](.cursor/rules/); workflows in [`.cursor/skills/`](.cursor/skills/) and slash commands in [`.cursor/commands/`](.cursor/commands/). Human-readable project rules: [PROJECT_RULES.md](PROJECT_RULES.md).

Tool choice: [`.cursor/rules/00-tool-routing.mdc`](.cursor/rules/00-tool-routing.mdc) — one primary tool per question.

## Architecture invariants

1. **Application shell** — `src/app/layout.tsx` + `components/sidebar.tsx` are shared infrastructure. Feature pages fill `{children}` only. Never replace the layout or remove Sidebar navigation.
2. **Local-first classroom data** — `ClassroomDatabase` via `DatabaseService` is the source of truth. React access: `useAppData()` / `AppDataProvider`. Auth: `useAuth()` / `AuthProvider` (entitlement only).
3. **No duplicate global state** for teacher, classroom, school year, or students. Page navigation must not reset the active classroom.
4. **Cloudflare Worker** (`workers/cloud-backup`) is for Google auth, signed entitlements, licensing, and optional cloud backup only — not classroom CRUD or runtime sync.
5. **YAGNI** — no extra REST/GraphQL APIs, cloud DB, Redis, queues, or enterprise patterns unless explicitly requested.
6. **Never delete local classrooms** on auth lock, logout, disable, or license expiry.

## Authoritative documentation

Read before implementing when the task touches that area:

| Doc | When |
|---|---|
| [docs/PROJECT_SCOPE.md](docs/PROJECT_SCOPE.md) | Product scope, features, UI, motion, dropdowns |
| [PROJECT_RULES.md](PROJECT_RULES.md) | Shell, navigation, SSOT constraints |
| [docs/DATA_ARCHITECTURE.md](docs/DATA_ARCHITECTURE.md) | Persistence, assets, cloud backup layout |
| [docs/ACCOUNTS.md](docs/ACCOUNTS.md) | OAuth, entitlements, licensing |
| [docs/build-and-release.md](docs/build-and-release.md) | Tauri packaging, CI, desktop releases |

Route catalog, feature specs, and per-page behavior live in **PROJECT_SCOPE.md** — not here.

## Before coding

Inspect `src/app/layout.tsx`, `components/sidebar.tsx`, relevant `src/app/**/page.tsx`, and active classroom state.

## After coding

Run [`.cursor/skills/verification/SKILL.md`](.cursor/skills/verification/SKILL.md) or `/verify` after non-trivial changes. At minimum confirm: Sidebar renders, nav works, active classroom survives page change, new pages render inside AppLayout.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
