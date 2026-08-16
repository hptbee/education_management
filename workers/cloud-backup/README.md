# Classroom Cloud Backup Worker

Cloudflare Worker for **Google-authenticated teacher accounts**, **signed Ed25519 entitlements**, **D1 licenses**, and **per-user R2 classroom backups**.

**Deployed URL:** `https://classroom-cloud-backup.phuontun-01.workers.dev`

Full setup guide: [`docs/ACCOUNTS.md`](../../docs/ACCOUNTS.md)

---

## Architecture

```
App (Tauri / Next.js)
  → Google OAuth (PKCE or id_token)
  → POST /auth/google
  → D1 (users + licenses)
  → signed entitlement JWT
  → Bearer on PUT /backup, GET /classrooms, GET /restore/:id
  → R2 users/{userId}/classrooms/{classroomId}/database.json
```

Classroom JSON remains local-first in the app. This Worker does **not** replace `ClassroomDatabase` persistence.

---

## Endpoints

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/google` | `{ code, codeVerifier, redirectUri }` (PKCE) or `{ idToken }` |
| `GET` | `/me` | Bearer entitlement → fresh user + license from D1 |
| `POST` | `/auth/refresh` | Bearer → re-issue JWT if license still valid |
| `POST` | `/auth/logout` | `204` (stateless; client deletes local entitlement) |

### Backup

Requires Bearer entitlement with `permissions.cloudBackup`.

| Method | Path | Description |
|---|---|---|
| `PUT` | `/backup` | Upload classroom JSON wrapper |
| `GET` | `/classrooms` | List user's classroom backups |
| `GET` | `/restore/:classroomId` | Download backup JSON |

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
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put ENTITLEMENT_PRIVATE_KEY
npx wrangler secret put INITIAL_ADMIN_GOOGLE_SUB   # optional
```

### Vars (`wrangler.toml` `[vars]`)

| Var | Default | Purpose |
|---|---|---|
| `DEFAULT_TRIAL_DAYS` | `7` | Auto-trial length for new teachers |

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
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----"
```

---

## R2 object layout

```
users/<user-id>/classrooms/<classroom-id>/database.json
```

Legacy `backups/<device-id>/...` is **no longer written**. Pre-account backups are not auto-migrated.

---

## License plans

| Plan | `appAccess` | `cloudBackup` | Typical expiry |
|---|---|---|---|
| **trial** | yes | no | 7 days on first login |
| **basic** | yes | no | Admin-assigned |
| **premium** | yes | yes | Admin-assigned |
| **lifetime** | yes | yes | No expiry |

`permissionsForPlan()` in [`src/entitlement.ts`](src/entitlement.ts) is the source of truth. Backup routes use `requireCloudBackup`; admin routes use `requireAuth` only.

---

## Security

- R2 + D1 credentials stay in Cloudflare (Worker bindings only).
- Backup routes require a valid **signed entitlement** JWT.
- Legacy shared `BACKUP_API_TOKEN` / `CLOUD_BACKUP_TOKEN` are **removed**.
- PUT body limit: **25 MB**; `payload` must be a JSON object.
- Upload ownership comes from JWT `userId` only — client cannot spoof another user's prefix.
- Client uploads only when teacher opts in per class (`cloudBackupEnabled`).

---

## Tests

From **repository root** (Vitest includes this package):

```bash
npm test
```

Worker-only file: `src/index.test.ts` — auth, entitlement, backup ownership, admin 403.

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
