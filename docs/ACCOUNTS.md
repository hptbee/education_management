# Accounts, licensing, and cloud backup

Login is **required** to use the app. Classroom data stays **local-first** (`ClassroomDatabase` on disk / IndexedDB). The Cloudflare Worker handles **identity**, **licensing**, and **optional cloud backup** only.

| Concern | Where it lives |
|---|---|
| Classroom JSON (students, points, teams, …) | Local Tauri FS or IndexedDB |
| Teacher account + license | Cloudflare D1 (via Worker) |
| Signed access token (entitlement) | OS keychain (Tauri) or `localStorage` (web dev) |
| Cloud backup JSON | Cloudflare R2 structured files under `users/{userId}/` — see [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) |

See also: [`workers/cloud-backup/README.md`](../workers/cloud-backup/README.md), [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md), [build-and-release.md](./build-and-release.md).

---

## Quick start (developer)

### 1. App `.env.local`

```env
NEXT_PUBLIC_CLOUD_BACKUP_URL=https://classroom-cloud-backup.phuontun-01.workers.dev
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<web-application-client-id>.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID_DESKTOP=<desktop-app-client-id>.apps.googleusercontent.com
NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----"
```

Restart `npm run dev` or `npm run tauri:dev` after changing env.

**Tauri production builds:** `NEXT_PUBLIC_*` values are embedded at **Next.js build time**. After changing `.env.local`, run `npm run tauri:build` again so the `.exe` picks up new client IDs or entitlement keys.

### 2. Worker secrets

```bash
cd workers/cloud-backup
npx wrangler secret put GOOGLE_CLIENT_ID          # Web application client (id_token audience)
npx wrangler secret put GOOGLE_CLIENT_ID_DESKTOP  # Desktop app client (PKCE code exchange)
npx wrangler secret put GOOGLE_CLIENT_SECRET      # Desktop client secret — Worker only; never in the app
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

| Platform | Client type | App env | Worker secret/var |
|---|---|---|---|
| **Web** (`npm run dev`) | Web application | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_ID` |
| **Tauri** (`.exe`) | Desktop app | `NEXT_PUBLIC_GOOGLE_CLIENT_ID_DESKTOP` | `GOOGLE_CLIENT_ID_DESKTOP` |

Web: add **Authorized JavaScript origins** `http://localhost:3000` (and `http://127.0.0.1:3000` if needed).  
Desktop: PKCE loopback `http://127.0.0.1:<port>/oauth/callback` (dynamic port).

Use the matching client ID in `.env.local` and Worker for each platform you test.

**Do not** put the Google **client secret** in the React app or `.env.local`. Set `GOOGLE_CLIENT_SECRET` on the Worker only (`wrangler secret put GOOGLE_CLIENT_SECRET`).

### Auth flows (app)

| Runtime | Google proof | App env | Worker validates with |
|---|---|---|---|
| Web dev (`npm run dev`) | Google Identity Services → `idToken` | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_ID` |
| Tauri `.exe` | PKCE loopback → `code` + `codeVerifier` + `redirectUri` | `NEXT_PUBLIC_GOOGLE_CLIENT_ID_DESKTOP` | `GOOGLE_CLIENT_ID_DESKTOP` + optional `GOOGLE_CLIENT_SECRET` |

The app picks the client via `getGoogleClientId()` in `src/auth/api.ts` (`isTauri()` → desktop ID). Tauri opens the browser with `rundll32 url.dll,FileProtocolHandler` on Windows so `&` in the OAuth query string is not truncated.

Worker failures and missing entitlement verification surface as login errors in the UI (not a silent return to the lock screen).

### Common Google errors

| Error | Fix |
|---|---|
| `no registered origin` / `401 invalid_client` | Add exact browser origin to **Authorized JavaScript origins** (Web client) |
| `access blocked` | Add email to OAuth consent screen **Test users** |
| `redirect_uri_mismatch` (Tauri) | Use **Desktop app** client, not Web client |
| `response_type` missing (Windows `.exe`) | OAuth URL must not go through unquoted `cmd start` (query `&` was truncated). Use a current `.exe` build (`rundll32` launcher). |
| Browser shows success on `127.0.0.1` but app stays on login | Worker `POST /auth/google` failed or entitlement verify failed — check alert text; verify `GOOGLE_CLIENT_ID_DESKTOP`, `GOOGLE_CLIENT_SECRET`, and `NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY` in the **built** app |

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
| **trial** | yes | no | **7 days** (`DEFAULT_TRIAL_DAYS = 7` in `wrangler.toml`) on **first** Google login, or when an existing user has **zero** license rows |
| **basic** | yes | no | Set by admin |
| **premium** | yes | yes | Set by admin |
| **lifetime** | yes | yes | None (`expires_at` null) |

Teacher-facing plan comparison in **Cài đặt → Tài khoản** shows **Dùng thử** (7 ngày), **Gói Cơ bản**, and **Premium 1 năm** only. The `lifetime` plan remains fully supported for existing licenses but is not advertised as an upgrade option.

Changing `DEFAULT_TRIAL_DAYS` affects **new** trial licenses only. Teachers who already have a trial row in D1 keep their stored `expires_at` until an admin updates the license.

**Trial is once per Google account.** `findOrCreateUserFromGoogle` mints a trial only when the user is new **or** the user exists and `listLicensesForUser` is empty. If any license row exists (including an expired trial), later logins do **not** remint — they return `LICENSE_EXPIRED` until an admin issues a new license via `POST /admin/licenses`. Redeploy the Worker after changing trial or backup validation logic.

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
- **License expiry:** if cached `license.expiresAt` is in the past, the app locks with `LICENSE_EXPIRED` even while still within the JWT offline window (lifetime licenses have `expiresAt` null and are not affected)

---

## Cloud backup

### Plan gating

Cloud backup requires `permissions.cloudBackup` on the entitlement — **premium** or **lifetime** plans only. **Trial** and **basic** can use the app but cannot upload, list, or restore from R2.

### Opt-in

**Quản lý lớp → Dữ liệu** (or cloud backup controls where shown) → **Tự động sao lưu** is enabled automatically when entitlement includes `cloudBackup` (Premium / Lifetime). Trial and Basic cannot sync.

On login with `cloudBackup`, the app **pulls `classrooms.json` first** (before any upload), merges stubs into the local index, and lazy-downloads full data when you open a class. Manual **Khôi phục từ đám mây** re-downloads/overwrites a single class.

### R2 layout

Structured incremental backup (current client uses `PUT /sync`):

```
users/{userId}/classrooms.json
users/{userId}/classrooms/{classroomKey}/
  manifest.json, classroom.json, students.json, teams.json, roles.json,
  recognitions.json, rewards.json, settings.json, catalog.json,
  activity/index.json, activity/YYYY-MM-DD.json
  database.json   # legacy monolith — kept after migration, not deleted
```

`classroomKey` is `metadata.id` (e.g. `2-7_2026-2027`). Field mapping: [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md).

`GET /restore/{classroomKey}` returns a **monolith** `ClassroomDatabase` JSON (assembled from structured files when `manifest.json` exists; otherwise the legacy `database.json`). Restore UI is unchanged.

Legacy `backups/{deviceId}/...` objects are **not** migrated automatically. `PUT /backup` remains for compatibility; normal operation uploads via `PUT /sync`.

### Restore

**Quản lý lớp** (`/classrooms`) → **Khôi phục từ đám mây** — lists cloud classrooms; confirm before import.

**Cài đặt lớp → Dữ liệu → Khôi phục từ đám mây** — same restore UI when the **Dữ liệu** tab is enabled (`SETTINGS_TABS.showDataTab`; hidden by default).

Non-2xx list responses throw a parsed Worker error (empty list only when HTTP 200 returns no classrooms).

Import does **not** overwrite a classroom that already exists locally with the same `metadata.id` — delete or export the local class first, or restore onto a machine that does not already have that id.

After JSON import, the client downloads image binaries via **`GET /restore/{classroomKey}/assets`** and writes them under the local asset store. Missing remote assets keep keys in JSON and show bundled fallbacks in the UI.

Structured JSON in R2 does **not** embed `data:image/...` strings — only asset keys in domain files; binaries live under `assets/**`.

### Multi-device usage (not sync)

Cloud backup is **upload + manual restore**, not bidirectional sync between PCs.

| Question | Answer |
|---|---|
| Same Google account on PC1 and PC2? | Yes — one R2 namespace: `users/{userId}/classrooms/{classroomKey}/...` |
| Does login on PC2 pull cloud data? | **Registry only.** After sign-in with `permissions.cloudBackup`, the app fetches `users/{userId}/classrooms.json`, merges stubs into the local index, and shows every account classroom in **Quản lý lớp** / the sidebar switcher. Full classroom JSON is **not** downloaded for every class. |
| When does cloud update? | After a **local save** on that PC, when cloud backup is **enabled for that class** (~30s debounce). **Create/clone** triggers an immediate first structured upload when backup is enabled. Later uploads send dirty/changed files via `PUT /sync`. |
| What if PC2 saves with an old local copy? | Per-class domain files: last upload wins per path. **Registry** merges by classroom `key` (higher `updatedAt`); empty local registry cannot overwrite a non-empty remote registry. |
| How to get PC1’s data on PC2? | Sign in → stubs appear in **Quản lý lớp** → switch to a class (**Chưa tải về**) to hydrate from cloud. **Khôi phục từ đám mây** remains for manual overwrite of an already-hydrated class. |
| Back on PC1 the next day? | PC1 still shows **PC1 local** until you restore from cloud or edit locally; saving may upload PC1 local and overwrite cloud again. |

**Recommended workflow when switching machines:**

1. On the machine you finished on — wait for cloud upload (after last save; ~30s, or immediately after creating/cloning a class).
2. On the other machine — sign in, confirm all classes appear in **Quản lý lớp**, then switch into each class you need (lazy hydrate) before editing.
3. Avoid editing the same class on two PCs without restore — otherwise whichever PC uploads last replaces the cloud copy.

`checkStartupBackup` only compares **local** `metadata.updatedAt` to this device’s backup metadata — it does **not** compare to the cloud timestamp.

### New device / first login

First Google sign-in on a **new PC** (or empty app data folder):

| Layer | What you get |
|---|---|
| **Account & license** | Same D1 user and plan as other devices (trial / basic / premium / lifetime). `AccessGate` unlocks if the license is valid. |
| **Local classrooms** | **Empty** until registry merge, create, import JSON, or hydrate-on-switch. |
| **Classes from another PC** | With `permissions.cloudBackup`, login pulls the account registry and adds **stub** rows (`Chưa tải về`) for each remote class. Data exists in cloud only if the other PC completed a structured upload for that class. |
| **Opening a remote class** | Switch to the stub in **Quản lý lớp** or the sidebar — the app downloads structured JSON + assets, saves locally, then opens the class. If cloud data is missing, the stub stays and **Không tải được** is shown with **Thử tải lại**. |
| **Creating a new class on PC2 by mistake** | A **new** `classroomId` — separate from PC1’s class in cloud. Does not update PC1’s data. |

**Typical experience:** logged in, correct plan in **Tài khoản**, remote classes listed as stubs in **Quản lý lớp**. Startup opens a class already stored on this device. If none is hydrated yet, login discovery opens one registry class so the shell is not empty.

---

## Worker API reference

Base URL: `https://classroom-cloud-backup.phuontun-01.workers.dev`

### Auth

| Method | Path | Body / headers |
|---|---|---|
| `POST` | `/auth/google` | `{ idToken }` or `{ code, codeVerifier, redirectUri }` (JSON body ≤ 64 KB) |
| `GET` | `/me` | `Authorization: Bearer <entitlement>` |
| `POST` | `/auth/refresh` | `Authorization: Bearer <entitlement>` |
| `POST` | `/auth/logout` | Confirms the caller; client clears local entitlement. Does **not** bump `license_version` — other devices stay signed in. Admin disable and license edits still bump the version. |

### Backup (requires `permissions.cloudBackup`)

| Method | Path | Notes |
|---|---|---|
| `PUT` | `/backup` | Legacy monolith classroom JSON wrapper; ownership from JWT `userId` |
| `PUT` | `/sync` | Batch structured files (`{ classroomKey, files[], registry? }`); 25 MB batch, 64 files, 5 MB/file |
| `GET` | `/classrooms` | Prefer `classrooms.json`; fallback to deduped R2 list |
| `GET` | `/classrooms/registry` | Raw account registry JSON |
| `GET` | `/restore/:classroomKey` | Assembled monolith JSON for import |

### Admin (requires `role=admin` in entitlement + active D1 user)

| Method | Path |
|---|---|
| `GET` | `/admin/users` |
| `PATCH` | `/admin/users/:userId` — `{ status?, role? }` (JSON ≤ 64 KB) |
| `GET` | `/admin/licenses?userId=` |
| `POST` | `/admin/licenses` (JSON ≤ 64 KB) |
| `PATCH` | `/admin/licenses/:licenseId` (JSON ≤ 64 KB) |

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

# Upgrade existing license to lifetime (no expiry)
curl -X PATCH \
  -H "Authorization: Bearer $ADMIN_ENTITLEMENT" \
  -H "Content-Type: application/json" \
  -d '{"plan":"lifetime","status":"active","expiresAt":null}' \
  https://classroom-cloud-backup.phuontun-01.workers.dev/admin/licenses/lic_xxx
```

### Option C — D1 direct (no admin JWT)

Use when you have Wrangler access but no admin entitlement handy. **Always bump `license_version`** so refresh picks up the new plan.

```bash
cd workers/cloud-backup

# Find user id
npx wrangler d1 execute classroom-app --remote --command \
  "SELECT id, email, license_version FROM users WHERE email='teacher@example.com'"

# Upgrade active license to lifetime (replace ids)
npx wrangler d1 execute classroom-app --remote --command \
  "UPDATE licenses SET plan='lifetime', status='active', expires_at=NULL, updated_at=datetime('now') WHERE id='lic_xxx'; \
   UPDATE users SET license_version=license_version+1, updated_at=datetime('now') WHERE id='usr_xxx';"
```

The teacher must **sign in again** or wait for online refresh after an admin change.

There is **no admin UI** in the app — API + Wrangler D1 only.

---

## Entitlement storage

| Platform | Storage | Notes |
|---|---|---|
| Tauri | OS keychain (`keyring`) | Keyring is the only store after login. Legacy `entitlement.sec` is migrated once then deleted. Save verifies a keyring read-back and never writes plaintext. If keyring write/verify fails, require sign-in again. |
| Web dev | `localStorage` | Survives close/reopen of the browser; cleared on **Đăng xuất**. Weaker than OS keychain (dev-only). |

### Session persistence (close & reopen)

| Runtime | After close & reopen | Must sign in again when |
|---|---|---|
| **Tauri `.exe`** | **Usually stays signed in.** `AuthProvider.bootstrap()` loads keychain on startup; refreshes online when possible. | **Đăng xuất**; license expired / account disabled; offline grace ended (~30 days without online refresh); invalid entitlement or wrong `NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY` in build; keyring save failed at login. |
| **Web dev** (`npm run dev`) | **Stays signed in** after close/reopen (same browser profile). `localStorage` holds the entitlement; leftover `sessionStorage` is migrated once. | **Đăng xuất**; license expired / account disabled; offline grace ended; invalid entitlement; a different browser profile. |

JWT `exp` ≈ **7 days**, but offline use is allowed while `offlineValidUntil` (~30 days from issue) still verifies locally (see **Offline grace** above).

### Web vs desktop — separate sessions

Web (`npm run dev`) and Tauri `.exe` do **not** share a login session:

| | Web | Desktop `.exe` |
|---|---|---|
| Login | Google Identity Services button in browser | “Đăng nhập bằng Google” → PKCE loopback in system browser |
| OAuth client env | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `NEXT_PUBLIC_GOOGLE_CLIENT_ID_DESKTOP` |
| Session storage | `localStorage` | OS keychain |
| Logs in the other app automatically? | **No** | **No** |

Signing in on web does **not** sign you into the `.exe`, and vice versa. Same Google account still shares **license** (D1) and **cloud backup namespace** (R2), not local classroom JSON or entitlement files on disk.

Session refresh (`bootstrap` / `refreshSession`) keeps the previous session if `saveAuthSession` fails; it logs and does not throw from `online` / `visibilitychange` handlers.

Never store entitlements in classroom JSON, IndexedDB, or settings files. Web entitlement lives only under the `education-management:auth-session` `localStorage` key.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `POST /auth/google` **404** | Old Worker not deployed — run `npx wrangler deploy` from `workers/cloud-backup` |
| `PUT /sync` **404** | Worker predates structured backup — redeploy current Worker |
| `POST /auth/google` **401** | Invalid Google token; web `GOOGLE_CLIENT_ID` mismatch; or desktop `GOOGLE_CLIENT_ID_DESKTOP` / `GOOGLE_CLIENT_SECRET` mismatch |
| Plan changed in D1 but app still shows old plan | Cached JWT — refresh session, re-login, or wait for online auto-refresh after `license_version` bump |
| Login OK but app stays locked | Missing/wrong `NEXT_PUBLIC_ENTITLEMENT_PUBLIC_KEY` |
| Google `no registered origin` | Web client missing JavaScript origin for your dev URL |
| Cloud backup skipped | Not signed in, no entitlement, or per-class opt-in disabled |
| `LICENSE_EXPIRED` on first login | D1 migration not applied, or trial license creation failed |
| `POST /auth/google` **400** Invalid request body | JSON larger than 64 KB, or malformed JSON |
| Cloud classroom list looks empty after an error | Older clients treated non-2xx as `[]`; current app throws and **Quản lý lớp** / restore UI shows `cloudError` |
| Login required after a keyring error | `entitlement.sec` is not used as a plaintext fallback after a failed keyring migrate |
| Browser/Tauri blocked by CORS | Worker `CORS_ALLOWED_ORIGINS` missing that origin, or unset (fail closed). Redeploy `wrangler.toml` `[vars]`. A Cloudflare **secret** with the same name overrides the var — delete the secret if leftover. |

Run Worker tests from repo root:

```bash
npm test
```

(includes `workers/cloud-backup/src/index.test.ts`)
