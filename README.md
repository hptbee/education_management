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
- **No backend / No cloud services**: Data is entirely owned by the user.
- **No authentication**: Designed for single-teacher local use.
- **JSON File Persistence**: Data is safely stored in local JSON files via Tauri filesystem APIs.

## Getting Started

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
- The source of truth for your data is now local JSON files located in your operating system's `AppData` directory. 
- You can access these files directly through the **Cài đặt** (Settings) -> **Năm học** (School Year) tab by clicking the **Mở thư mục dữ liệu** (Open Data Folder) button.
- On first launch of the Tauri app, it will automatically migrate any existing data from IndexedDB into the new JSON filesystem format safely.

## Current Features

- Classroom dashboard
- Classroom settings with avatar upload
- Student management
- Detailed student profile pages
- Configurable point actions
- Point history
- Team creation and scoring
- Projector-friendly leaderboard
- Reward creation and redemption
- Recognition ceremony screen
- Lucky Wheel random student selector
- Random student classroom games
- Local image uploads (stored as base64 strings in the JSON database)
- Export / Import JSON database backups
- Duplicate databases for new school years

## Project Scope

See [docs/PROJECT_SCOPE.md](./docs/PROJECT_SCOPE.md) for the full product requirements and implementation scope.
