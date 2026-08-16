# Agent Instructions

Always read before implementing:

1. PROJECT_SCOPE.md
2. PROJECT_RULES.md
3. [docs/ACCOUNTS.md](docs/ACCOUNTS.md) — when touching auth, entitlements, or cloud backup
4. Relevant existing feature files

## Critical Rule

DO NOT break the existing application shell.

The Sidebar, navigation, routing, and AppLayout are shared infrastructure.

Feature implementations must integrate into them.

Never replace `src/app/layout.tsx` with a standalone feature page.

Never remove navigation to simplify implementation.

## Before coding

Inspect:

- `src/app/layout.tsx`
- `src/app/**/page.tsx` routes
- `components/sidebar.tsx`
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
| `/badges` | Redirects to `/recognition?tab=badges` (legacy route) |
| `/tools` | Lucky Wheel, Study Timer, Lucky Star |
| `/games` | Redirects to `/tools` (legacy route) |
| `/recognition` | Recognition ceremony, badge roster, title catalog, Wall of Fame |
| `/ranking` | Student & team rankings |
| `/history` | Activity history |
| `/settings` | Classroom selector; in-class settings (Tài khoản, Hồ sơ, Vai trò; **Dữ liệu** hidden by flag) |

## Settings (`/settings`)

Route: `src/app/settings/page.tsx`. When `data` is null, render `ClassroomSelectorScreen`; otherwise `SettingsPage` (max width 1100px).

| Tab | Component | Purpose |
|---|---|---|
| Tài khoản | `account-section.tsx` | Google account, plan, verification, logout; backup prompt |
| Hồ sơ | `profile-section.tsx` | Teacher name, display class name, avatar, home banner |
| Vai trò | `classroom-roles-section.tsx` | Role catalog CRUD |
| Dữ liệu | `data-section.tsx` | Switch class, rename DB, duplicate, export, data folder, cloud backup opt-in, cloud restore (**hidden:** `SETTINGS_TABS.showDataTab`) |

**Nguy hiểm** (delete classroom) exists in `settings-page.tsx` but is hidden by default (`SETTINGS_TABS.showDangerTab` in `settings-flags.ts` — currently `false`).

Shared: `settings-tabs.tsx`, `classroom-list.tsx`, `classroom-selector-screen.tsx`.

**Auth shell:** `AuthProvider` → `AppDataProvider` → `AccessGate` → `AppShell` in `src/app/layout.tsx`. Lock screens hide Sidebar (same pattern as presentation mode). Never delete local classrooms on lock/logout.

**Display name vs database rename:** Tab **Hồ sơ** updates sidebar/dashboard labels. Tab **Dữ liệu** → **Đổi tên / Năm học** renames the on-disk database identity (tab hidden by default — same pattern as **Nguy hiểm**).

**Trial license:** First Google login auto-creates a **one-time 7-day** trial (`DEFAULT_TRIAL_DAYS` on the Worker). Existing users with **zero license rows** also get that one-time trial. If any license row exists (including expired), do **not** remint — admin `POST /admin/licenses` restores access. Trial includes app access only — no cloud backup. Existing trial rows in D1 keep their original `expires_at` until admin changes the plan. Redeploy the Worker after license-logic changes.

## Ranking (`/ranking`)

Presentation mode follows the current `mode`: students show podium + list; teams show `TeamRankingList` (empty-team copy if none). Do not open `StudentDetailsModal` in presentation.

## Persistence (desktop)

- Classroom JSON lives in `classrooms/*.json`; `index.json` is reconciled against those files so an orphan classroom is not hidden after a crash between file write and index write.
- IndexedDB → JSON migration is complete only after `indexeddb-migration.complete` is written. Missing marker resumes remaining IDs without overwriting existing JSON.
- Async gift save/delete: `commitData(next)` then `await persistNow()` — never write a stale snapshot back into `dataRef` after `await`.
- Entitlement: OS keychain. Legacy `entitlement.sec` is migrated once; fail closed if the keyring write fails (do not return plaintext).

## Dialogs

CRUD/scoring overlays use `useModalFocusTrap` plus `role="dialog"`, `aria-modal`, labelled heading, and `tabIndex={-1}`. Pattern: `gift-redeem-dialog.tsx`. Leave `lucky-wheel-dialog.tsx` without a keyboard trap unless explicitly requested.

Auth JSON (`POST /auth/google`) and admin JSON bodies are bounded to ~64 KB (`readJsonWithLimit`). Backup PUT stays on the 25 MB reader. `listCloudClassrooms` throws on non-2xx.

## Recognition (`/recognition`)

Four tabs: **Tuyên dương mới**, **Huy hiệu** (roster toggle), **Danh mục** (title catalog; each title auto-creates a linked badge), **Góc tuyên dương**. Query: `?tab=badges&studentId=` for deep links. Legacy `/badges` redirects here.

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
