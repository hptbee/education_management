# Data architecture

This document describes how classroom data is stored locally vs in cloud backup (R2). **Runtime reads and writes always use local persistence**; R2 is a projection for backup and restore only.

## Local layer (source of truth at runtime)

| Runtime | Storage | Layout |
|---------|---------|--------|
| Web (browser) | IndexedDB | Classroom JSON per id; image binaries in `ClassroomAssets` (`{classroomId}::{relativePath}`) |
| Desktop (Tauri) | OS data folder | `classrooms/{id}.json` + `index.json`; binaries under `classrooms/{id}/assets/...` |

React state flows through `AppDataProvider` → `DatabaseService` → storage adapter. UI never reads from R2.

## Cloud layer (R2 structured backup)

Cloud backup is optional, gated by entitlement (`permissions.cloudBackup`) and per-class `appSettings.cloudBackupEnabled`.

### R2 key layout

```
users/{userId}/
  classrooms.json                 # registry (name, school year, archived)
  classrooms/{classroomKey}/
    manifest.json
    classroom.json                # metadata + classroomSettings
    students.json
    teams.json
    roles.json
    recognitions.json
    rewards.json
    settings.json                 # appSettings only
    catalog.json                  # badges, pointActions, recognitionTitles, wheelStudentBag
    activity/
      index.json
      YYYY-MM-DD.json             # local calendar date partitions
    assets/                         # binary image files (see below)
      teacher/avatar.webp
      banner.webp
      students/{studentId}/avatar.webp
      rewards/{giftId}/image.webp
    database.json                 # legacy monolith — kept after migration, not deleted
```

`classroomKey` equals `metadata.id` (e.g. `2-7_2026-2027`).

### History / activity

Point, reward, team-score, lucky-wheel, and badge history rows are exported to dated activity files. Each activity log stores the full source row in `metadata.payload` so restore is lossless. `recognitions` (Wall of Fame records) stay in `recognitions.json`.

Activity dates use **device local calendar** via `toLocalDateKey()` — not UTC `iso.slice(0, 10)`.

### Sync path (client)

1. After local save, `CloudBackupScheduler` debounces 30s then calls `uploadCloudSyncBatch` (`PUT /sync`).
2. First structured sync for a classroom (`!migratedToStructured`) and manual retry (`triggerUploadNow`) upload **all** domain files and set `manifest.json` `migrationComplete`.
3. Incremental batches use `CloudDirtyTracker` (JSON domains + `dirtyAssets` image keys) plus per-file hashes in local `backup-status.json` (skip unchanged content).
4. Classroom switch (`switchDatabase`) awaits `persistNow()` then `flushPending()`; if the target is a cloud stub (`hydrated: false`), downloads via `GET /restore/{key}` before opening.
5. UI never reads R2 directly; account discovery uses `GET /classrooms` / `GET /classrooms/registry` on login.

### Account-level classroom registry

`users/{userId}/classrooms.json` lists **all** classrooms for the teacher (metadata only — not full JSON).

| Concern | Behavior |
|---------|----------|
| Discovery | On login (when `cloudBackup`), client pulls registry **before** first upload |
| Local stubs | Index rows with `hydrated: false` appear in switcher; full JSON downloaded on switch |
| Merge | `PUT /sync` merges registry by `key`; higher `updatedAt` wins; refuses empty overwrite of non-empty remote |
| Delete | Permanent delete sets `deletedAt` on registry entry; cloud class files remain until admin cleanup |
| Active class | `index.json` `activeClassroomId` is device-specific; registry is account-wide |

Lifecycle hooks (create, clone, rename metadata, archive, restore, delete) push registry merges after local index updates.

### Migration from legacy `database.json`

On first structured sync for a classroom:

1. If local `migratedToStructured` is false, upload full split + `manifest.json` with `migrationComplete: true`.
2. Legacy `database.json` on R2 is **not deleted**.
3. `GET /restore/{classroomKey}` assembles structured files server-side when `manifest.json` exists; otherwise returns legacy `database.json`.

### Worker API

| Route | Purpose |
|-------|---------|
| `PUT /backup` | Legacy monolith upload (kept for compatibility) |
| `PUT /sync` | Batch upload structured files + optional registry |
| `GET /classrooms` | Prefer `classrooms.json`; fallback to deduped R2 list |
| `GET /classrooms/registry` | Raw merged registry file |
| `GET /restore/{classroomKey}` | Assemble monolith JSON for import |
| `GET /restore/{classroomKey}/assets` | Download allowlisted `assets/**` binaries (base64) for local write after restore |

Auth and entitlement unchanged — see `docs/ACCOUNTS.md`.

## Classroom image assets

User-managed photos (teacher avatar, student avatars, home banner, gift images, legacy `classAvatar`) are **binary files**, not inline `data:` URLs in JSON.

### Stable keys (overwrite on replace)

| Feature | JSON field | Relative path |
|---------|------------|---------------|
| Teacher photo | `TeacherProfile.avatarAssetKey` | `assets/teacher/avatar.webp` |
| Home banner | `ClassroomSettings.bannerAssetKey` | `assets/banner.webp` |
| Legacy class cover | `ClassroomSettings.classAvatarAssetKey` | `assets/classroom/avatar.webp` |
| Student photo | `Student.avatarAssetKey` | `assets/students/{studentId}/avatar.webp` |
| Gift image | `Gift.imagePath` | `assets/rewards/{giftId}/image.webp` |

Deprecated inline fields (`avatar`, `homeBannerImage`, `classAvatar`, legacy `Gift.image`) are stripped on normalize. `migrateLegacyClassroomImages()` runs on `openDatabase` (data URLs and legacy `images/gifts/...` paths).

Processing rules live in `src/utils/images.ts` (`ASSET_IMAGE_RULES`): JPEG/PNG/WebP/GIF in → WebP out, 12 MB max input.

Display uses `useAssetUrl(classroomId, key)` (blob URL). Bundled fallbacks (`/avatar-boy-*.png`, etc.) when no key or missing file.

### Cloud sync for assets

- `CloudDirtyState.dirtyAssets` tracks changed asset keys independently of JSON domains.
- `PUT /sync` accepts `{ path, content, encoding: "base64" }` for allowlisted `assets/**` paths (max 5 MB decoded per file).
- First full structured sync uploads all referenced assets; incremental sync uploads only dirty keys.
- After `GET /restore/{classroomKey}` JSON import, client calls `GET /restore/{classroomKey}/assets` and writes files locally.

**Local JSON export/import** carries keys only — not bundled binaries. Use cloud restore (or manual file copy on desktop) to move photos between machines.

**Out of scope:** team/role/badge emoji icons, Google account picture URL, sound files.

### Scaling notes

- Activity files grow with daily edits; large histories are partitioned by date.
- Local `capHistory` (2000 rows) may still cap in-memory/history on write; cloud export includes all rows present in memory at sync time.
- Processed WebP assets sync to R2 under `assets/**`; JSON domain files store asset keys only.

### Future seam

Local multi-file export (separate from cloud) can reuse `cloud-serializer.ts` split/merge without changing the runtime storage contract.
