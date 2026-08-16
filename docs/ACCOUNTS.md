# Accounts, licensing, and cloud backup

Login is **required** to use the app. Classroom data stays **local-first** (`ClassroomDatabase` on disk / IndexedDB). The Cloudflare Worker handles **identity**, **licensing**, and **optional cloud backup** only.

| Concern | Where it lives |
|---|---|
| Classroom JSON (students, points, teams, …) | Local Tauri FS or IndexedDB |
| Teacher account + license | Cloudflare D1 (via Worker) |
| Signed access token (entitlement) | OS keychain (Tauri) or `sessionStorage` (web dev) |
| Cloud backup JSON | Cloudflare R2 (`users/{userId}/classrooms/...`) |

See also: [`workers/cloud-backup/README.md`](../workers/cloud-backup/README.md)

---

## Quick start (developer)

### 1. App `.env.local`

```env
NEXT_PUBLIC_CLOUD_BACKUP_URL=https://classroom-cloud-backup.phuontun-01.workers.dev
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----"
```

Restart `npm run dev` or `npm run tauri:dev` after changing env.

### 2. Worker secrets

```bash
cd workers/cloud-backup
npx wrangler secret put GOOGLE_CLIENT_ID          # same value as NEXT_PUBLIC_GOOGLE_CLIENT_ID
npx wrangler secret put ENTITLEMENT_PRIVATE_KEY   # PKCS#8 PEM (pair of public key above)
npx wrangler secret put INITIAL_ADMIN_GOOGLE_SUB  # optional: Google `sub` for first admin
npx wrangler deploy
```

### 3. D1 (first time only)

`wrangler.toml` already binds database `classroom-app` (`4c53a22f-957b-4411-8ef0-a6673a5c17c7`).

```bash
cd workers/cloud-backup
npx wrangler d1 migrations apply classroom-app --remote
```

Verify tables:

```bash
npx wrangler d1 execute classroom-app --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

---

## Google OAuth setup

Console: [Google Cloud → Credentials](https://console.cloud.google.com/apis/credentials)

### OAuth consent screen (required first)

1. **APIs & Services → OAuth consent screen**
2. User type: **External** (or Internal for Workspace)
3. Scopes: `openid`, `email`, `profile`
4. While in **Testing**: add teacher emails under **Test users**

### Client IDs (you may need two)

| Platform | Client type | Configuration |
|---|---|---|
| **Web** (`npm run dev`) | Web application | **Authorized JavaScript origins:** `http://localhost:3000` (add `http://127.0.0.1:3000` if you use that URL) |
| **Tauri** (`npm run tauri:dev`) | Desktop app | PKCE loopback `http://127.0.0.1:<port>/oauth/callback` (dynamic port; Desktop client type handles this) |

Use the matching client ID in `.env.local` and `GOOGLE_CLIENT_ID` Worker secret for the platform you are testing.

**Do not** put the Google **client secret** in the React app or `.env.local`. This app uses public OAuth (PKCE / id_token).

### Common Google errors

| Error | Fix |
|---|---|
| `no registered origin` / `401 invalid_client` | Add exact browser origin to **Authorized JavaScript origins** (Web client) |
| `access blocked` | Add email to OAuth consent screen **Test users** |
| `redirect_uri_mismatch` (Tauri) | Use **Desktop app** client, not Web client |

---

## Entitlement signing keys

Generate Ed25519 key pair:

```bash
node -e "import('jose').then(async j=>{const {publicKey,privateKey}=await j.generateKeyPair('EdDSA',{extractable:true}); console.log('PRIVATE\\n',await j.exportPKCS8(privateKey)); console.log('PUBLIC\\n',await j.exportSPKI(publicKey));})"
```

| Key | Where |
|---|---|
| Private (PKCS#8 PEM) | Worker secret `ENTITLEMENT_PRIVATE_KEY` |
| Public (SPKI PEM) | App `NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY` |

Rotating keys invalidates existing entitlements — teachers must sign in again.

---

## License plans

| Plan | `appAccess` | `cloudBackup` | Typical expiry |
|---|---|---|---|
| **trial** | yes | yes | 30 days (`DEFAULT_TRIAL_DAYS`) on first login |
| **basic** | yes | no | Set by admin |
| **premium** | yes | yes | Set by admin |
| **lifetime** | yes | yes | None (`expires_at` null) |

Permissions are embedded in the signed entitlement JWT and re-derived from D1 on each Worker request. When an admin changes a teacher's plan, the teacher must **refresh** (or wait for auto-refresh when online) to get updated permissions in the app.

**Basic plan:** app works normally; cloud backup toggle, upload, list, and restore are hidden/disabled in **Cài đặt**.

---

## Access model

### App states (`AccessGate`)

| State | UI |
|---|---|
| `AUTHENTICATED_AND_ACTIVE` | Normal app |
| `OFFLINE_GRACE` | Normal app (offline within 30-day window) |
| `AUTH_REQUIRED` | Lock screen — Google login |
| `ONLINE_VERIFICATION_REQUIRED` | Lock — retry / logout |
| `LICENSE_EXPIRED` | Lock — contact admin |
| `ACCOUNT_DISABLED` / `ACCOUNT_SUSPENDED` | Lock — account suspended |

Local classroom files are **never deleted** on lock, logout, disable, or license expiry.

### Offline grace

- Worker sets `offlineValidUntil` = `iat` + **30 days**
- JWT `exp` ≈ **7 days** (refresh when online)
- Clock rollback: if local time &lt; last trusted `iat` − 5 min → require online verification

---

## Cloud backup

### Opt-in

**Cài đặt → Dữ liệu** → enable **Tự động sao lưu lớp này lên đám mây** per classroom.

First login does **not** auto-upload all local classes. **Tài khoản** tab may prompt to enable backup for the current class.

### R2 layout

```
users/{userId}/classrooms/{classroomId}/database.json
```

Legacy `backups/{deviceId}/...` objects are **not** migrated automatically.

### Restore

**Cài đặt → Dữ liệu → Khôi phục từ đám mây** — lists cloud classrooms; confirm before import.

---

## Worker API reference

Base URL: `https://classroom-cloud-backup.phuontun-01.workers.dev`

### Auth

| Method | Path | Body / headers |
|---|---|---|
| `POST` | `/auth/google` | `{ idToken }` or `{ code, codeVerifier, redirectUri }` |
| `GET` | `/me` | `Authorization: Bearer <entitlement>` |
| `POST` | `/auth/refresh` | `Authorization: Bearer <entitlement>` |
| `POST` | `/auth/logout` | (no body; client clears local entitlement) |

### Backup (requires `permissions.cloudBackup`)

| Method | Path | Notes |
|---|---|---|
| `PUT` | `/backup` | Classroom JSON wrapper; ownership from JWT `userId` |
| `GET` | `/classrooms` | List user's backups |
| `GET` | `/restore/:classroomId` | Download backup JSON |

### Admin (requires `role=admin` in entitlement + active D1 user)

| Method | Path |
|---|---|
| `GET` | `/admin/users` |
| `PATCH` | `/admin/users/:userId` — `{ status?, role? }` |
| `GET` | `/admin/licenses?userId=` |
| `POST` | `/admin/licenses` |
| `PATCH` | `/admin/licenses/:licenseId` |

Errors: `{ ok: false, code, error }` — codes include `AUTH_REQUIRED`, `ACCOUNT_DISABLED`, `ACCOUNT_SUSPENDED`, `LICENSE_EXPIRED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`.

---

## Admin bootstrap

### Option A — secret (first login)

```bash
npx wrangler secret put INITIAL_ADMIN_GOOGLE_SUB
# Paste Google JWT "sub" claim for your admin Google account
```

### Option B — D1 after first login

```bash
npx wrangler d1 execute classroom-app --remote --command "UPDATE users SET role='admin' WHERE email='you@example.com'"
```

### Example admin curl

```bash
# List users
curl -H "Authorization: Bearer $ADMIN_ENTITLEMENT" \
  https://classroom-cloud-backup.phuontun-01.workers.dev/admin/users

# Disable user
curl -X PATCH \
  -H "Authorization: Bearer $ADMIN_ENTITLEMENT" \
  -H "Content-Type: application/json" \
  -d '{"status":"disabled"}' \
  https://classroom-cloud-backup.phuontun-01.workers.dev/admin/users/usr_xxx

# Assign premium license
curl -X POST \
  -H "Authorization: Bearer $ADMIN_ENTITLEMENT" \
  -H "Content-Type: application/json" \
  -d '{"userId":"usr_xxx","plan":"premium","expiresAt":"2027-12-31T00:00:00.000Z"}' \
  https://classroom-cloud-backup.phuontun-01.workers.dev/admin/licenses
```

There is **no admin UI** in the app — API + docs only.

---

## Entitlement storage

| Platform | Storage | Notes |
|---|---|---|
| Tauri | OS keychain (`keyring`) | Fallback: `entitlement.sec` in app data dir |
| Web dev | `sessionStorage` | Weaker; dev-only |

Never store entitlements in classroom JSON, IndexedDB, `localStorage`, or settings files.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `POST /auth/google` **404** | Old Worker not deployed — run `npx wrangler deploy` from `workers/cloud-backup` |
| `POST /auth/google` **401** | Invalid Google token, or `GOOGLE_CLIENT_ID` secret mismatch |
| Login OK but app stays locked | Missing/wrong `NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY` |
| Google `no registered origin` | Web client missing JavaScript origin for your dev URL |
| Cloud backup skipped | Not signed in, no entitlement, or per-class opt-in disabled |
| `LICENSE_EXPIRED` on first login | D1 migration not applied, or trial license creation failed |

Run Worker tests from repo root:

```bash
npm test
```

(includes `workers/cloud-backup/src/index.test.ts`)
