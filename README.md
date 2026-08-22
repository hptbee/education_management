# Chibi Classroom Manager

A local-first classroom management and gamification app for teachers to use during class.

The app is designed for a single classroom and focuses on student profiles, classroom identity, points, rewards, team competition, recognition, random student selection, and simple classroom games. It uses a cute, playful, chibi-inspired visual style suitable for elementary students and projector display.

## Tech Stack

- **Next.js 16 (Turbopack)** - Framework
- **React 19** - UI
- **Tauri 2** - Desktop App & Local Filesystem API
- **Rust** - Tauri Backend
- **TypeScript** - Language
- **Next.js App Router** - Routing (`src/app/**/page.tsx`)
- **Tailwind CSS 4** - Styling
- **shadcn/ui-inspired** - Local UI components
- **Lucide React** - Icons
- **Framer Motion** - Animations
- **canvas-confetti** - Effects

## Architecture & Constraints

- **Local-first Desktop App**: Runs natively on **Windows** and **macOS** via Tauri (no Linux desktop builds in the release pipeline).
- **Classroom data stays local**: `ClassroomDatabase` JSON on disk (Tauri) or IndexedDB (web dev) is the source of truth for students, points, teams, etc.
- **Google sign-in required**: Teachers authenticate via Google; the app receives a signed **entitlement** from the Cloudflare Worker.
- **7-day trial**: New Google accounts get a one-time 7-day trial (`DEFAULT_TRIAL_DAYS` on the Worker). Existing users with **no license rows** also receive that one-time trial. Expired trials are not reminted. Upgrade to Basic or Premium 1 năm for continued access; **lifetime** is admin-assigned (not shown in the public plan comparison).
- **Optional cloud backup**: Per-class opt-in **incremental** upload to R2 (`PUT /sync`; **premium** or **lifetime** only) — not a replacement for local storage. See [docs/DATA_ARCHITECTURE.md](./docs/DATA_ARCHITECTURE.md).
- **JSON File Persistence**: Classroom data is stored in local JSON files via Tauri filesystem APIs.

See [docs/ACCOUNTS.md](./docs/ACCOUNTS.md) for OAuth, Worker, D1, and entitlement setup. See [docs/DATA_ARCHITECTURE.md](./docs/DATA_ARCHITECTURE.md) for local vs R2 layout. See [docs/build-and-release.md](./docs/build-and-release.md) for Windows/macOS packaging.

## Getting Started

### Environment

Copy `.env.example` to `.env.local` and configure:

```env
NEXT_PUBLIC_CLOUD_BACKUP_URL=https://classroom-cloud-backup.phuontun-01.workers.dev
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<web-application-client-id>
NEXT_PUBLIC_GOOGLE_CLIENT_ID_DESKTOP=<desktop-app-client-id>
NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----"
```

| Variable | Used when |
|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `npm run dev` (Web application OAuth client) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID_DESKTOP` | `npm run tauri:dev` / `tauri:build` (Desktop app PKCE client) |

Worker secrets must match: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_ID_DESKTOP`, and usually `GOOGLE_CLIENT_SECRET` for desktop code exchange. See [docs/ACCOUNTS.md](./docs/ACCOUNTS.md).

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

`NEXT_PUBLIC_*` env vars are baked in at build time. After changing `.env.local`, run `tauri:build` again before distributing a new `.exe`.

## GitHub Releases

Desktop installers are built via [GitHub Actions](.github/workflows/release.yml). Full process: [docs/build-and-release.md](./docs/build-and-release.md).

1. Bump version: `npm run version:bump -- 0.1.13` (syncs `package.json`, `tauri.conf.json`, `Cargo.toml`)
2. Commit and push a version tag:

```bash
git tag v0.1.13
git push origin v0.1.13
```

3. GitHub Actions builds **Windows** (NSIS + MSI) and **macOS** (Apple Silicon + Intel DMG) and creates a **draft** release.
4. Review the draft on GitHub, edit release notes if needed, then publish.

You can also trigger a release manually from the **Actions** tab (`Release` workflow → **Run workflow**).

Configure repository secrets (`NEXT_PUBLIC_*`) before the first CI build — see [docs/build-and-release.md](./docs/build-and-release.md).

If the workflow fails with "Resource not accessible by integration", enable **Read and write permissions** for GitHub Actions under repository **Settings → Actions → General → Workflow permissions**.

## Persistence Migration

The application has been migrated from a web-based `localStorage`/`IndexedDB` setup to a native desktop architecture using **Tauri**.

- The source of truth for classroom data is local JSON files in the OS app-data directory (`classrooms/*.json` plus `index.json`).
- A valid `index.json` is still reconciled against `classrooms/*.json` so a classroom file is not hidden if the index write was interrupted.
- IndexedDB → JSON migration writes `indexeddb-migration.complete` only after every IDB classroom is verified. If the marker is missing, remaining IDs are copied without overwriting JSON that already exists.
- Classroom list, create/import, and **Khôi phục từ đám mây** live on **`/classrooms`**. Per-class **Dữ liệu** (rename DB, export, data folder, cloud backup toggle) is on **`/classrooms/manage`** and is **hidden** by default (`SETTINGS_TABS.showDataTab`). **Cài đặt** (`/settings`) is account & license only.

## Current Features

### Classroom & Students
- Classroom dashboard
- **Settings** (`/settings`) — Google account, plan, verification, logout; first-login cloud backup prompt
- **Quản lý lớp** (`/classrooms`) — list, create, import JSON, cloud restore
- **Cài đặt lớp** (`/classrooms/manage`) — per-class tabs when a class is selected:
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

Page title: **Thử thách & Công cụ**. Two sections plus a points strip:

**Trò chơi** (modal dialogs, projector-friendly):

- **Lucky Wheel** — fair random student selection with animated wheel, student checklist, scope (class/team), single/multiple/sequential modes, randomized spin duration, and confetti
- **Đua vịt (Duck Race)** — animated race among selected students; scope and prevent-repeat options; results stored in history
- **Vòng quay điểm (Points Wheel)** — spin configurable point values for **one chosen student** per round; teacher confirms before points are applied (`source: game`). Deep link: `/tools?tool=points-wheel` (legacy `/points-wheel` redirects)

**Công cụ nhanh** (inline cards):

- **Study Timer** — preset (1/2/5/10 min) or custom duration (1–180 min), start/pause/reset; state persists across page refresh via `localStorage`
- **Chọn ngẫu nhiên** — fair in-card random student picker (bag-based, no repeat until cycle completes)

**Points Challenge** — top-students strip with shortcut to the points page

Presentation mode hides the sidebar and enlarges the tools layout for classroom display.

### Other
- **Tuyên dương** (`/recognition`) — ceremony, badge roster, title catalog (1:1 badge per title), Wall of Fame; `/badges` redirects here
- Activity history (`/history`) — points, rewards, recognition, lucky wheel, duck race, badges
- Classroom tools (`/tools`; `/games` redirects here)
- Local image uploads (teacher/student photos, home banner, gift images) — processed to WebP and stored in the local asset store; JSON keeps stable keys only (`assets/**`). See [docs/DATA_ARCHITECTURE.md](./docs/DATA_ARCHITECTURE.md).
- Export / Import JSON database backups
- **Cloud backup** (opt-in per class; requires **premium** or **lifetime** plan) — incremental structured upload to R2 after local save (`PUT /sync`) when signed in. Restore still imports a monolith JSON snapshot.
- **Cloud restore** — list and import classrooms from the teacher's cloud account (**Quản lý lớp** `/classrooms`, or **Dữ liệu** on `/classrooms/manage` when that tab is enabled). Premium/lifetime only. Cloud list HTTP errors surface as errors instead of an empty list.
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
Student-facing tools (Lucky Wheel, Duck Race, Points Wheel, Timer, Chọn ngẫu nhiên): larger type, more celebration, still readable from a projector.

## Project Scope

See [docs/PROJECT_SCOPE.md](./docs/PROJECT_SCOPE.md) for the full product requirements and implementation scope.

**Accounts & cloud backup** (v0.1.7+; dual Web/Desktop OAuth in v0.1.8+): see [docs/ACCOUNTS.md](./docs/ACCOUNTS.md). Classroom JSON remains local-first; Worker handles auth, licensing, and optional backup only. R2 layout and `PUT /sync`: [docs/DATA_ARCHITECTURE.md](./docs/DATA_ARCHITECTURE.md).

**Desktop releases** (Windows + macOS): [docs/build-and-release.md](./docs/build-and-release.md).

**Sound effects:** [docs/audio-assets.md](./docs/audio-assets.md).
