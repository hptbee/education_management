# Classroom Cloud Backup Worker

Cloudflare Worker for **Google-authenticated teacher accounts**, **signed Ed25519 entitlements**, **D1 licenses**, and **per-user R2 classroom backups**.

**Deployed URL:** `https://classroom-cloud-backup.phuontun-01.workers.dev`

Full setup guide: [`docs/ACCOUNTS.md`](../../docs/ACCOUNTS.md)

---

## Architecture

```
App (Tauri / Next.js)
  → Google OAuth
      Web dev: GIS id_token → POST /auth/google { idToken }
      Desktop: PKCE loopback → POST /auth/google { code, codeVerifier, redirectUri }
  → D1 (users + licenses)
  → signed entitlement JWT
  → Bearer on PUT /backup, PUT /sync, GET /classrooms, GET /restore/:id
  → R2 structured tree under users/{userId}/ (see docs/DATA_ARCHITECTURE.md)
```

| Runtime | App OAuth client env | Worker secret |
|---|---|---|
| Web (`npm run dev`) | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_ID` |
| Tauri `.exe` | `NEXT_PUBLIC_GOOGLE_CLIENT_ID_DESKTOP` | `GOOGLE_CLIENT_ID_DESKTOP` (+ `GOOGLE_CLIENT_SECRET` if required) |

`NEXT_PUBLIC_*` values are embedded at Next build time — rebuild the desktop app after changing `.env.local`.

Classroom JSON remains local-first in the app. This Worker does **not** replace `ClassroomDatabase` persistence.

---

## Endpoints

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/google` | `{ code, codeVerifier, redirectUri }` (PKCE) or `{ idToken }` — JSON ≤ 64 KB |
| `GET` | `/me` | Bearer entitlement → fresh user + license from D1 |
| `POST` | `/auth/refresh` | Bearer → re-issue JWT if license still valid |
| `POST` | `/auth/logout` | `204` (stateless; client deletes local entitlement) |

### Backup

Requires Bearer entitlement with `permissions.cloudBackup`.

| Method | Path | Description |
|---|---|---|
| `PUT` | `/backup` | Legacy monolith classroom JSON upload |
| `PUT` | `/sync` | Batch upload structured domain files (+ optional `classrooms.json` registry) |
| `GET` | `/classrooms` | List classrooms (prefers `classrooms.json` registry) |
| `GET` | `/restore/:classroomKey` | Download assembled monolith JSON for import |

### Admin

Requires Bearer entitlement with `role=admin` and active D1 admin user.

| Method | Path |
|---|---|
| `GET` | `/admin/users` |
| `PATCH` | `/admin/users/:userId` |
| `GET` | `/admin/licenses?userId=` |
| `POST` | `/admin/licenses` |
| `PATCH` | `/admin/licenses/:licenseId` |

---

## Project layout

```
workers/cloud-backup/
├── migrations/0001_users_licenses.sql
├── src/
│   ├── index.ts           # Router
│   ├── auth-handlers.ts
│   ├── backup-handlers.ts
│   ├── admin-handlers.ts
│   ├── entitlement.ts
│   ├── google.ts
│   ├── http.ts            # CORS, JSON/body limits
│   ├── db.ts
│   └── index.test.ts
└── wrangler.toml
```

---

## Setup

Requires **Node.js 18+** (Wrangler 3.x). For Wrangler 4.x use Node **22+**.

```bash
cd workers/cloud-backup
npm install
npx wrangler login
```

### Bindings (`wrangler.toml`)

| Binding | Resource | Current value |
|---|---|---|
| `BACKUP_BUCKET` | R2 | `education-2302` |
| `DB` | D1 | `classroom-app` (`4c53a22f-957b-4411-8ef0-a6673a5c17c7`) |

### D1 migrations

```bash
# Remote (production)
npx wrangler d1 migrations apply classroom-app --remote

# Local dev database
npx wrangler d1 migrations apply classroom-app
```

### Secrets

```bash
npx wrangler secret put GOOGLE_CLIENT_ID              # Web application client
npx wrangler secret put GOOGLE_CLIENT_ID_DESKTOP      # Desktop app client (PKCE)
npx wrangler secret put GOOGLE_CLIENT_SECRET          # Desktop client secret (Worker only)
npx wrangler secret put ENTITLEMENT_PRIVATE_KEY
npx wrangler secret put INITIAL_ADMIN_GOOGLE_SUB      # optional
```

### Vars (`wrangler.toml` `[vars]`)

| Var | Default | Purpose |
|---|---|---|
| `DEFAULT_TRIAL_DAYS` | `7` | Auto-trial length for new teachers and existing users with zero license rows |
| `ENTITLEMENT_PUBLIC_KEY` | (see `wrangler.toml`) | Optional public key var; signing uses `ENTITLEMENT_PRIVATE_KEY` secret |
| `CORS_ALLOWED_ORIGINS` | see `wrangler.toml` | Required for browser/Tauri calls. Unset = no `Access-Control-Allow-Origin` (fail closed). Comma-separated origins. |

Generate Ed25519 keys:

```bash
node -e "import('jose').then(async j=>{const {publicKey,privateKey}=await j.generateKeyPair('EdDSA',{extractable:true}); console.log('PRIVATE\\n',await j.exportPKCS8(privateKey)); console.log('PUBLIC\\n',await j.exportSPKI(publicKey));})"
```

- **Private** → `ENTITLEMENT_PRIVATE_KEY` secret
- **Public** → app `NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY`

### Deploy

```bash
npx wrangler deploy
```

### App environment

```env
NEXT_PUBLIC_CLOUD_BACKUP_URL=https://classroom-cloud-backup.phuontun-01.workers.dev
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...           # Web dev
NEXT_PUBLIC_GOOGLE_CLIENT_ID_DESKTOP=...   # Tauri .exe (PKCE)
NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----"
```

See [`docs/ACCOUNTS.md`](../../docs/ACCOUNTS.md) for OAuth client types, admin license management, and troubleshooting.

### Admin license changes (no UI)

- **API:** `POST /admin/licenses`, `PATCH /admin/licenses/:id` with admin entitlement (see `docs/ACCOUNTS.md`).
- **D1:** direct `UPDATE` on `licenses` + bump `users.license_version` when Wrangler access is enough.

---

## R2 object layout

Structured backup (incremental sync):

```
users/<user-id>/classrooms.json
users/<user-id>/classrooms/<classroom-key>/
  manifest.json, classroom.json, students.json, teams.json, roles.json,
  recognitions.json, rewards.json, settings.json, catalog.json,
  activity/index.json, activity/YYYY-MM-DD.json
  database.json   # legacy monolith — kept after migration
```

Full field mapping and client sync flow: [`docs/DATA_ARCHITECTURE.md`](../../docs/DATA_ARCHITECTURE.md).

Legacy layout (still supported for restore):

```
users/<user-id>/classrooms/<classroom-id>/database.json
```

Legacy `backups/<device-id>/...` is **no longer written**. Pre-account backups are not auto-migrated.

---

## License plans

| Plan | `appAccess` | `cloudBackup` | Typical expiry |
|---|---|---|---|
| **trial** | yes | no | **7 days** on first login, or when an existing user has **zero** license rows (`DEFAULT_TRIAL_DAYS = 7`) |
| **basic** | yes | no | Admin-assigned |
| **premium** | yes | yes | Admin-assigned |
| **lifetime** | yes | yes | No expiry |

`permissionsForPlan()` in [`src/entitlement.ts`](src/entitlement.ts) is the source of truth. Backup routes use `requireCloudBackup`; admin routes use `requireAuth` only.

`findOrCreateUserFromGoogle` mints a one-time trial for new users and for existing users with **no** license rows. Any existing license row (including expired) is never reminted.

---

## Security

- R2 + D1 credentials stay in Cloudflare (Worker bindings only).
- Backup routes require a valid **signed entitlement** JWT.
- Legacy shared `BACKUP_API_TOKEN` / `CLOUD_BACKUP_TOKEN` are **removed**.
- PUT backup body limit: **25 MB** (`readBodyWithLimit`); `payload` must be a JSON object.
- PUT sync body limit: **25 MB** total batch; max **64** files, **5 MB** per file.
- Auth and admin JSON body limit: **64 KB** (`readJsonWithLimit` on `POST /auth/google` and admin JSON handlers).
- Upload ownership comes from JWT `userId` only — client cannot spoof another user's prefix.
- Client uploads only when teacher opts in per class (`cloudBackupEnabled`).

---

## Tests

From **repository root** (Vitest includes this package):

```bash
npm test
```

Worker-only files: `src/index.test.ts` (auth, entitlement, backup ownership, admin 403, oversized `/auth/google` body), `src/db.test.ts` (trial once / heal zero-license users), `src/http.test.ts` (25 MB backup / 64 KB JSON limits).

---

## Error codes

JSON shape: `{ ok: false, code, error }`

| Code | Meaning |
|---|---|
| `AUTH_REQUIRED` | Missing/invalid Google proof or entitlement |
| `ACCOUNT_DISABLED` | User status disabled |
| `ACCOUNT_SUSPENDED` | User status suspended |
| `LICENSE_EXPIRED` | No active license |
| `FORBIDDEN` | Valid auth but not allowed (e.g. teacher on admin route) |
| `NOT_FOUND` | Resource missing |
| `VALIDATION_ERROR` | Bad request body |
