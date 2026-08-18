# Data architecture

This document describes how classroom data is stored locally vs in cloud backup (R2). **Runtime reads and writes always use local persistence**; R2 is a projection for backup and restore only.

## Local layer (source of truth at runtime)

| Runtime | Storage | Layout |
|---------|---------|--------|
| Web (browser) | IndexedDB | Single `ClassroomDatabase` JSON per classroom |
| Desktop (Tauri) | OS data folder | `classrooms/{id}.json` + `index.json` |

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
    database.json                 # legacy monolith — kept after migration, not deleted
```

`classroomKey` equals `metadata.id` (e.g. `2-7_2026-2027`).

### History / activity

Point, reward, team-score, lucky-wheel, and badge history rows are exported to dated activity files. Each activity log stores the full source row in `metadata.payload` so restore is lossless. `recognitions` (Wall of Fame records) stay in `recognitions.json`.

Activity dates use **device local calendar** via `toLocalDateKey()` — not UTC `iso.slice(0, 10)`.

### Sync path (client)

1. Mutations mark dirty domains in `CloudDirtyTracker` (inside data layer, not UI).
2. After local save, `CloudBackupScheduler` debounces 30s and uploads only dirty files via `PUT /sync`.
3. Per-file hashes in `backup-status.json` skip unchanged files on retry.
4. Classroom switch awaits `flushCloudSyncForClassroom()` before opening the next class.

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
| `GET /classrooms` | Prefer `classrooms.json`; fallback to R2 list |
| `GET /restore/{classroomKey}` | Assemble monolith JSON for import |

Auth and entitlement unchanged — see `docs/ACCOUNTS.md`.

### Scaling notes

- Activity files grow with daily edits; large histories are partitioned by date.
- Local `capHistory` (2000 rows) may still cap in-memory/history on write; cloud export includes all rows present in memory at sync time.
- Gift images remain local (`classrooms/{id}/images/gifts/`), not in JSON.

### Future seam

Local multi-file export (separate from cloud) can reuse `cloud-serializer.ts` split/merge without changing the runtime storage contract.
