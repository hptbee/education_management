# Chibi Classroom Manager

A local-first classroom management and gamification app for teachers to use during class.

The app is designed for a single classroom and focuses on student profiles, classroom identity, points, rewards, team competition, recognition, random student selection, and simple classroom games. It uses a cute, playful, chibi-inspired visual style suitable for elementary students and projector display.

## Tech Stack

- **Next.js 16 (Turbopack)** - Framework
- **React 19** - UI
- **Tauri 2** - Desktop App & Local Filesystem API
- **Rust** - Tauri Backend
- **TypeScript** - Language
- **React Router** - Client-side Routing
- **Tailwind CSS 4** - Styling
- **shadcn/ui-inspired** - Local UI components
- **Lucide React** - Icons
- **Framer Motion** - Animations
- **canvas-confetti** - Effects

## Architecture & Constraints

- **Local-first Desktop App**: Runs natively on Windows/macOS/Linux via Tauri.
- **Classroom data stays local**: `ClassroomDatabase` JSON on disk (Tauri) or IndexedDB (web dev) is the source of truth for students, points, teams, etc.
- **Google sign-in required**: Teachers authenticate via Google; the app receives a signed **entitlement** from the Cloudflare Worker.
- **7-day trial**: New Google accounts get a one-time 7-day trial (`DEFAULT_TRIAL_DAYS` on the Worker). Existing users with **no license rows** also receive that one-time trial. Expired trials are not reminted. Upgrade to Basic or Premium 1 năm for continued access and cloud backup.
- **Optional cloud backup**: Per-class opt-in upload to R2 (Premium / lifetime only) — not a replacement for local storage.
- **JSON File Persistence**: Classroom data is stored in local JSON files via Tauri filesystem APIs.

See [docs/ACCOUNTS.md](./docs/ACCOUNTS.md) for OAuth, Worker, D1, and entitlement setup.

## Getting Started

### Environment

Copy `.env.example` to `.env.local` and configure:

```env
NEXT_PUBLIC_CLOUD_BACKUP_URL=https://classroom-cloud-backup.phuontun-01.workers.dev
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-google-client-id>
NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----"
```

See [docs/ACCOUNTS.md](./docs/ACCOUNTS.md) for Google OAuth and Worker secret setup.

Install dependencies:

```bash
npm install
```

Start the web development server (Note: File system features will fallback to IndexedDB in web mode):

```bash
npm run dev
```

### Tauri Desktop App (Recommended)

Start the Tauri development app:

```bash
npm run tauri:dev
```

Build the Tauri executable for production:

```bash
npm run tauri:build
```

## GitHub Releases

This repo builds desktop installers automatically via [GitHub Actions](.github/workflows/release.yml).

1. Bump the version in `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`.
2. Commit and push to the `release` branch, **or** push a version tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

3. GitHub Actions builds Windows, macOS, and Linux bundles and creates a **draft** release.
4. Review the draft on GitHub, edit release notes if needed, then publish it.

You can also trigger a release manually from the **Actions** tab (`Release` workflow → **Run workflow**).

If the workflow fails with "Resource not accessible by integration", enable **Read and write permissions** for GitHub Actions under repository **Settings → Actions → General → Workflow permissions**.

## Persistence Migration

The application has been migrated from a web-based `localStorage`/`IndexedDB` setup to a native desktop architecture using **Tauri**.

- The source of truth for classroom data is local JSON files in the OS app-data directory (`classrooms/*.json` plus `index.json`).
- A valid `index.json` is still reconciled against `classrooms/*.json` so a classroom file is not hidden if the index write was interrupted.
- IndexedDB → JSON migration writes `indexeddb-migration.complete` only after every IDB classroom is verified. If the marker is missing, remaining IDs are copied without overwriting JSON that already exists.
- The **Dữ liệu** settings tab (open data folder, cloud restore, rename DB) is implemented but **hidden** by default (`SETTINGS_TABS.showDataTab`).

## Current Features

### Classroom & Students
- Classroom dashboard
- **Settings** (`/settings`) — classroom selector when no class is open; tabs when a class is active:
  - **Tài khoản** — Google account, plan, verification status, logout; first-login cloud backup prompt
  - **Hồ sơ** — teacher name, display class name, avatar (auto-save on pick), home banner; single **Lưu thay đổi** for text fields
  - **Vai trò** — classroom role catalog
  - **Dữ liệu** — switch class, rename database / school year, duplicate, export JSON, open data folder (Tauri), opt-in cloud backup, restore from cloud (**hidden** unless `SETTINGS_TABS.showDataTab` is `true`)
  - **Nguy hiểm** — delete classroom (implemented but hidden; set `SETTINGS_TABS.showDangerTab` to `true` in `settings-flags.ts` to enable)
- Configurable classroom roles (e.g. class president, vice president)
- Student management with search, import, and detailed profiles
- Student badges on cards and profiles; award/toggle via **Tuyên dương → Huy hiệu** tab (catalog in **Danh mục**)
- Classroom role badges shown on student cards and team views

### Points & Rewards
- Configurable point actions (positive and negative)
- Quick point assignment from the points page
- Point history
- Reward creation and redemption

### Teams
- Team creation and scoring
- Team leader and vice-leader assignment
- Projector-friendly student and team ranking (`/ranking` presentation follows the current student/teams mode)

### Activities & Tools (`/tools`)
- **Lucky Wheel** — fair random student selection with animated wheel, student checklist, randomized spin duration, and confetti
- **Study Timer** — preset (1/2/5/10 min) or custom duration (1–180 min), start/pause/reset; state persists across page refresh via `localStorage`
- **Lucky Star** — pick-a-star surprise student reveal
- **Points Challenge** — top-students strip with shortcut to the points page

### Other
- **Tuyên dương** (`/recognition`) — ceremony, badge roster, title catalog (1:1 badge per title), Wall of Fame; `/badges` redirects here
- Activity history (`/history`) — points, rewards, recognition, lucky wheel, badges
- Classroom tools (`/tools`; `/games` redirects here)
- Local image uploads (stored as base64 strings in the JSON database)
- Export / Import JSON database backups
- **Cloud backup** (opt-in per class; requires **premium** or **lifetime** plan) — automatic upload to R2 after local save when signed in
- **Cloud restore** — list and import classrooms from the teacher's cloud account (Settings → Dữ liệu when that tab is enabled). Cloud list HTTP errors surface as errors instead of an empty list.
- Duplicate databases for new school years

## Design System

Visual style: **Cute Modern Classroom** — friendly and playful without feeling childish or cluttered.

Shared UI primitives live in `src/components/classroom/`:

| Component | Use |
|---|---|
| `ClassroomButton` | Primary actions (`rounded-2xl`, brand purple) |
| `ClassroomCard` | Content panels (`rounded-3xl`, soft border/shadow) |
| `PageHeader` | Page title + icon + subtitle |
| `EmptyState` | Friendly Vietnamese empty/coming-soon states |

Design tokens in `src/app/globals.css`:

- Primary: `--color-brand-purple` (`#6d5ce7`)
- Background: `--color-page` (`#f4f1fb`)
- Pastel accents: `pastel-sky`, `pastel-mint`, `pastel-peach`, `pastel-lavender`, `pastel-yellow`
- Typography: Nunito (body) + Baloo 2 (display headings)

Teacher pages (Dashboard, Students, Teams, Settings): ~70% clean / 30% playful.
Student-facing tools (Lucky Wheel, Timer, Lucky Star): larger type, more celebration, still readable from a projector.

## Project Scope

See [docs/PROJECT_SCOPE.md](./docs/PROJECT_SCOPE.md) for the full product requirements and implementation scope.

**Accounts & cloud backup** (added after v0.1.6 scope): see [docs/ACCOUNTS.md](./docs/ACCOUNTS.md). Classroom JSON remains local-first; Worker handles auth, licensing, and optional backup only.
