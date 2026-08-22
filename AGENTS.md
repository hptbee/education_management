# Agent Instructions

Tool choice: `.cursor/rules/00-tool-routing.mdc` (one primary tool per question).

Always read before implementing:

1. PROJECT_SCOPE.md
2. PROJECT_RULES.md
3. [docs/DATA_ARCHITECTURE.md](docs/DATA_ARCHITECTURE.md) — local vs cloud R2 layout and incremental `PUT /sync`
4. [docs/ACCOUNTS.md](docs/ACCOUNTS.md) — when touching auth, entitlements, or cloud backup
5. [docs/build-and-release.md](docs/build-and-release.md) — when changing Tauri packaging, version, or CI
6. Relevant existing feature files

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
| `/badges` | Redirects to `/recognition?tab=catalog` (legacy route) |
| `/tools` | **Trò chơi** (modals): Lucky Wheel, Đua vịt, Vòng quay điểm — **Công cụ nhanh** (inline): Study Timer, Chọn ngẫu nhiên; Points Challenge strip; presentation mode |
| `/points-wheel` | Redirects to `/tools?tool=points-wheel` |
| `/games` | Redirects to `/tools` (legacy route) |
| `/recognition` | Recognition ceremony, badge roster, title catalog, Wall of Fame |
| `/ranking` | Student & team rankings |
| `/history` | Activity history |
| `/settings` | Account & license only (`account-section.tsx`) |
| `/classrooms` | Classroom list, create / import JSON, **cloud restore** |
| `/classrooms/manage` | Per-class tabs: Hồ sơ, Vai trò, Dữ liệu (and Nguy hiểm when enabled) |

## Settings (`/settings`)

Route: `src/app/settings/page.tsx` — **account / license only** (max width 1100px). Classroom selector and per-class settings live under `/classrooms`.

| Area | Route | Component | Purpose |
|---|---|---|---|
| Tài khoản | `/settings` | `account-section.tsx` | Google account, plan, verification, logout; backup prompt |
| Hồ sơ | `/classrooms/manage` | `profile-section.tsx` | Teacher name, display class name, avatar, home banner |
| Vai trò | `/classrooms/manage` | `classroom-roles-section.tsx` | Role catalog CRUD |
| Dữ liệu | `/classrooms/manage` | `data-section.tsx` | Switch class, rename DB, duplicate, export, data folder, cloud backup opt-in, cloud restore (**hidden:** `SETTINGS_TABS.showDataTab`). Cloud restore also on `/classrooms` via `cloud-restore-card.tsx`. |

**Nguy hiểm** (delete classroom) exists in manage UI but is hidden by default (`SETTINGS_TABS.showDangerTab` in `settings-flags.ts` — currently `false`).

Shared: `settings-tabs.tsx` / `classroom-manage-tabs.tsx`, `classroom-list.tsx`, classrooms page.

**Auth shell:** `AuthProvider` → `AppDataProvider` → `AccessGate` → `AppShell` in `src/app/layout.tsx`. Layout also mounts `SoundInit` (preload + first-gesture unlock) and `DesktopLoggingInit`. Lock screens hide Sidebar (same pattern as presentation mode). Never delete local classrooms on lock/logout.

**Display name vs database rename:** Tab **Hồ sơ** (manage) updates sidebar/dashboard labels. Tab **Dữ liệu** → **Đổi tên / Năm học** renames the on-disk database identity (tab hidden by default — same pattern as **Nguy hiểm**).

**Trial license:** First Google login auto-creates a **one-time 7-day** trial (`DEFAULT_TRIAL_DAYS` on the Worker). Existing users with **zero license rows** also get that one-time trial. If any license row exists (including expired), do **not** remint — admin `POST /admin/licenses` or D1 `UPDATE` + `license_version` bump restores access. Trial includes app access only — no cloud backup. Existing trial rows in D1 keep their original `expires_at` until admin changes the plan. Redeploy the Worker after license-logic changes.

**Google OAuth clients (v0.1.8+):** Web dev uses `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (GIS `idToken`). Tauri uses `NEXT_PUBLIC_GOOGLE_CLIENT_ID_DESKTOP` (PKCE via Rust `start_google_oauth`). Worker secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_ID_DESKTOP`, `GOOGLE_CLIENT_SECRET`. `getGoogleClientId()` in `src/auth/api.ts` selects by runtime. Rebuild `.exe` after `.env.local` changes.

## Tools (`/tools`)

Page: `src/app/tools/page.tsx` — **Thử thách & Công cụ**. Shared card shell: `tool-card-shell.tsx`.

| Section | Tools | UX |
|---|---|---|
| **Trò chơi** (3-col grid) | Lucky Wheel, Đua vịt, Vòng quay điểm | Full-screen modal dialogs; deep links `?tool=lucky-wheel`, `?tool=duck-race`, `?tool=points-wheel` |
| **Công cụ nhanh** (2-col grid) | Study Timer, Chọn ngẫu nhiên | Inline on the page (no modal) |
| Footer strip | Points Challenge | Top students + shortcut to `/points` |

**Vòng quay điểm:** teacher picks **one student** per round (radio, whole class — no scope filter). Configurable point segments (`pointsWheelConfig`). Spin reveals a value; teacher **explicitly applies** points (`applyPoints`, `source: 'game'`). Does not auto-apply. Legacy route `/points-wheel` redirects here.

**Đua vịt:** multi-student checklist, classroom/team scope, optional prevent-repeat (`duckRaceStudentBag`). Records `duckRaceHistory`.

**Lucky Wheel:** fair bag (`wheelStudentBag`), checklist, single/multiple/sequential modes — see FR-010 in `PROJECT_SCOPE.md`.

Presentation mode: entire tools page can render inside `PresentationChrome` (sidebar hidden).

## Ranking (`/ranking`)

Presentation mode follows the current `mode`: students show podium + list; teams show `TeamRankingList` (empty-team copy if none). Do not open `StudentDetailsModal` in presentation.

## Persistence (desktop)

- Classroom JSON lives in `classrooms/*.json`; `index.json` is reconciled against those files so an orphan classroom is not hidden after a crash between file write and index write.
- IndexedDB → JSON migration is complete only after `indexeddb-migration.complete` is written. Missing marker resumes remaining IDs without overwriting existing JSON.
- Async gift save/delete: `commitData(next)` then `await persistNow()` — never write a stale snapshot back into `dataRef` after `await`.
- Entitlement: OS keychain. Legacy `entitlement.sec` is migrated once; fail closed if the keyring write fails (do not return plaintext).
- Optional cloud backup: after local save, `CloudBackupScheduler` (30s debounce) uploads via **`PUT /sync`** (structured domain files + dirty `assets/**` binaries). First structured sync / manual retry uploads all files; `GET /restore` still returns monolith JSON; `GET /restore/:id/assets` restores image binaries. Classroom switch awaits `flushPending()` before `openDatabase`. See [docs/DATA_ARCHITECTURE.md](docs/DATA_ARCHITECTURE.md).
- **Classroom images:** `ClassroomAssetService` stores WebP binaries locally; JSON holds asset keys only (`avatarAssetKey`, `bannerAssetKey`, `Gift.imagePath`, etc.). Migrate inline data URLs on `openDatabase`. Display via `useAssetUrl`; mark `dirtyAssets` on save/delete for cloud sync.

## Dialogs

CRUD/scoring overlays use `useModalFocusTrap` plus `role="dialog"`, `aria-modal`, labelled heading, and `tabIndex={-1}`. Pattern: `gift-redeem-dialog.tsx`. Nested overlays use `modalTrapStack` so only the top trap handles Escape/Tab. Leave `lucky-wheel-dialog.tsx` and sibling game modals (Duck Race, Points Wheel) without a keyboard trap unless explicitly requested.

Full-screen overlays that must cover the shell (e.g. recognition `CelebrationOverlay`) portal to `document.body` with high z-index — `main` uses `overflow-hidden` and traps focus incorrectly if the overlay stays inside it.

Auth JSON (`POST /auth/google`) and admin JSON bodies are bounded to ~64 KB (`readJsonWithLimit`). `PUT /backup` and `PUT /sync` use the 25 MB reader (`readJsonWithLimit` is **not** used for sync). `PUT /sync` also caps 64 files and 5 MB per file. `listCloudClassrooms` throws on non-2xx.

## Recognition (`/recognition`)

Four tabs: **Tuyên dương mới**, **Danh hiệu & huy hiệu** (title catalog + badge roster), **Góc tuyên dương**. Query: `?tab=catalog&studentId=` for deep links; legacy `?tab=badges` / `?tab=titles` still resolve. Legacy `/badges` redirects here.

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
