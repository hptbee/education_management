# Build and release (Tauri desktop)

Desktop distribution for **Windows** and **macOS** only. The app remains a Tauri local-first client; this document covers packaging, CI, and releases—not feature development.

See also: [ACCOUNTS.md](./ACCOUNTS.md) (OAuth, Worker, entitlement), [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) (local vs cloud backup).

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ (22 recommended; matches CI) |
| npm | comes with Node |
| Rust | stable (1.77+) |
| Windows | WebView2 (usually preinstalled on Windows 10/11) |
| macOS | Xcode Command Line Tools (for local macOS builds) |

Clone the repo and install dependencies:

```bash
npm install
```

---

## Environment variables

Copy `.env.example` to `.env.local` (never commit `.env.local`).

| Variable | Safe in app bundle? | Used for |
|----------|---------------------|----------|
| `NEXT_PUBLIC_CLOUD_BACKUP_URL` | Yes (public URL) | Worker API base URL |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Yes | Web dev (`npm run dev`) GIS login |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID_DESKTOP` | Yes | Tauri PKCE desktop login |
| `NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY` | Yes (public key) | Verify entitlement JWT |

**Never** embed in the app: `GOOGLE_CLIENT_SECRET`, `ENTITLEMENT_PRIVATE_KEY`, or any Worker secrets.

`NEXT_PUBLIC_*` values are embedded at **Next.js build time**. After changing `.env.local`, run `npm run tauri:build` again before distributing installers.

### Google OAuth (desktop)

Production Tauri builds use **PKCE loopback** (`http://127.0.0.1:<port>/oauth/callback`), not `localhost:3000`. Configure a **Desktop app** OAuth client in Google Cloud Console and set `NEXT_PUBLIC_GOOGLE_CLIENT_ID_DESKTOP`. Worker must have matching `GOOGLE_CLIENT_ID_DESKTOP` and `GOOGLE_CLIENT_SECRET`.

---

## Development

Web-only dev (IndexedDB fallback; no native FS):

```bash
npm run dev
```

Tauri desktop dev (recommended):

```bash
npm run tauri:dev
```

---

## Production builds (local)

Ensure `.env.local` has production values before building.

```bash
npm run tauri:build
```

This runs `npm run build` (Next static export → `out/`) then bundles the Tauri app.

### Artifact locations

After a successful build, installers are under:

```
src-tauri/target/release/bundle/
```

**Windows (x86_64):**

| Artifact | Typical path |
|----------|----------------|
| NSIS installer | `bundle/nsis/QuanLyLopHoc_<version>_x64-setup.exe` |
| MSI | `bundle/msi/QuanLyLopHoc_<version>_x64_en-US.msi` |

**macOS** (build on macOS only):

| Artifact | Typical path |
|----------|----------------|
| Apple Silicon DMG | `bundle/dmg/QuanLyLopHoc_<version>_aarch64.dmg` |
| Intel DMG | `bundle/dmg/QuanLyLopHoc_<version>_x64.dmg` |

Exact names follow Tauri bundler output; list the directory after build if unsure.

### Supported architectures

| Platform | Architecture | Notes |
|----------|--------------|-------|
| Windows | x86_64 | NSIS + MSI |
| macOS | aarch64 (Apple Silicon) | Separate DMG |
| macOS | x86_64 (Intel) | Separate DMG |

No Linux builds. No Windows ARM in this release pipeline.

---

## Versioning

Use semantic versioning: `MAJOR.MINOR.PATCH` (e.g. `1.0.0`, `0.1.13`).

**Source of truth:** `package.json` `version` (also synced to Tauri and Cargo).

Bump all targets in one step:

```bash
npm run version:bump -- 0.1.13
```

Or:

```bash
node scripts/bump-version.mjs 0.1.13
```

This updates:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

Commit the version bump, then tag:

```bash
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "chore: release v0.1.13"
git tag v0.1.13
git push origin main
git push origin v0.1.13
```

The git tag **must** match `v` + `package.json` version (CI enforces this on tag pushes).

---

## Application metadata

| Field | Value |
|-------|-------|
| productName | `QuanLyLopHoc` |
| identifier | `com.hptbee.quanlylophoc` (stable — do not change without migration plan) |
| Window title | Quản Lý Lớp Học |

Configured in `src-tauri/tauri.conf.json`.

---

## Icons

Icons live in `src-tauri/icons/` (`.ico`, `.icns`, PNG sizes).

Regenerate from a 1024×1024 source:

```bash
npx tauri icon path/to/source.png
```

---

## GitHub Actions release

Workflow: [.github/workflows/release.yml](../.github/workflows/release.yml)

**Triggers:**

- Push tag `v*` (e.g. `v0.1.12`)
- Manual: Actions → Release → Run workflow

**Runners:**

- `windows-latest` — NSIS + MSI (x64)
- `macos-latest` — DMG for aarch64 and x86_64 (separate matrix jobs)

Creates a **draft** GitHub Release. Review notes and publish when ready.

### Required repository secrets

Add under **Settings → Secrets and variables → Actions**:

| Secret | Purpose |
|--------|---------|
| `NEXT_PUBLIC_CLOUD_BACKUP_URL` | Worker URL baked into build |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Web OAuth client (CI tests / consistency) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID_DESKTOP` | Desktop PKCE client |
| `NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY` | Ed25519 public key (SPKI PEM) |

The workflow fails fast if any secret is missing.

**Desktop CSP:** Tauri `connect-src` in `src-tauri/tauri.conf.json` pins the production Worker host (`https://classroom-cloud-backup.phuontun-01.workers.dev`). If you change `NEXT_PUBLIC_CLOUD_BACKUP_URL` to a different Worker hostname, update that CSP entry and rebuild the desktop app.

**Local / staging Worker:** Desktop builds embed CSP at compile time. For a non-production Worker URL:

1. Set `NEXT_PUBLIC_CLOUD_BACKUP_URL` in `.env.local` (or your build env).
2. Add the same origin to `connect-src` in `src-tauri/tauri.conf.json` (keep Google OAuth hosts).
3. Rebuild Tauri (`npm run tauri build` or your dev flow). Web dev (`next dev`) is not limited by Tauri CSP.

Until step 2, cloud backup/auth calls from the packaged desktop app will be blocked by CSP even if the env URL is correct.

Enable **Read and write permissions** for GitHub Actions (**Settings → Actions → General → Workflow permissions**) if uploads fail with "Resource not accessible by integration".

---

## Code signing (not enabled)

### Windows

Installers are **unsigned** in the current pipeline. Windows SmartScreen may warn on first download. Future: sign with an Authenticode certificate via environment secrets in the workflow (do not hardcode certificates).

### macOS

Apps are **unsigned / not notarized**. Gatekeeper may block or warn on first open (right-click → Open, or System Settings → Privacy & Security). Future production:

- Apple Developer certificate
- `codesign` + `notarization` with secrets (`APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`)

---

## Auto-update (not enabled)

Auto-update is **intentionally disabled** until signed releases are in place.

Future path:

1. Add `tauri-plugin-updater` and pubkey in `tauri.conf.json`
2. Store updater signing key as GitHub secret
3. Point updater endpoint to GitHub Releases JSON
4. Require signed Windows/macOS artifacts before enabling

Do not ship unsigned auto-updates.

---

## Teacher test checklist

After installing a release build:

**Windows / macOS**

1. Install from NSIS/MSI or DMG
2. First launch — accept SmartScreen / Gatekeeper if unsigned
3. Local data directory created (Tauri app data / `ClassroomManagement`)
4. Google login (browser PKCE loopback)
5. Worker `/me` and entitlement verify
6. Open classroom, add student, restart app — data persists
7. Cloud backup (premium/lifetime + per-class opt-in) if entitled
8. Logout / login again

---

## Known limitations

- Unsigned installers (SmartScreen / Gatekeeper warnings)
- No in-app auto-update yet
- macOS builds require macOS runner or Mac hardware (not cross-compiled from Windows)
- `NEXT_PUBLIC_*` changes require a full rebuild; they cannot be patched post-build
