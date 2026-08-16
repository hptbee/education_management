# Classroom Cloud Backup Worker

Cloudflare Worker that receives classroom JSON backups from the Tauri desktop app and stores them in R2.

## Endpoints

- `PUT /backup` — upload latest classroom JSON
- `GET /backup?deviceId=...&classroomId=...` — download latest backup (for future restore)

## Setup

Requires **Node.js 18+** (Wrangler 3.x). For Wrangler 4.x use Node **22+**.

1. Install dependencies:

```bash
cd workers/cloud-backup
npm install
```

2. Log in to Cloudflare:

```bash
npx wrangler login
```

3. Create the R2 bucket:

```bash
npx wrangler r2 bucket create classroom-backups
```

4. Set a **required** API token (fail-closed — uploads without a valid token are rejected):

```bash
npx wrangler secret put BACKUP_API_TOKEN
```

5. Deploy:

```bash
npx wrangler deploy
```

6. Copy the deployed Worker URL and token into the app environment:

```env
NEXT_PUBLIC_CLOUD_BACKUP_URL=https://classroom-cloud-backup.<your-subdomain>.workers.dev
NEXT_PUBLIC_CLOUD_BACKUP_TOKEN=<same-as-BACKUP_API_TOKEN>
```

For Tauri desktop, also set `CLOUD_BACKUP_TOKEN` (not bundled in the client build).

7. In the app: **Cài đặt → Dữ liệu** → enable **Tự động sao lưu lớp này lên đám mây** (opt-in per classroom).

8. Restart the Tauri app (`npm run tauri:dev`) or Next dev server.

## R2 object layout

```
backups/<device-id>/<classroom-id>/latest.json
```

Identifiers are sanitized server-side. Client-controlled paths are never accepted.

## Security notes

- R2 credentials stay in Cloudflare (Worker binding only).
- `BACKUP_API_TOKEN` is **required** — missing or wrong token → `401`.
- PUT body limit: 25 MB; `payload` must be a JSON object.
- Client only uploads when URL + token are configured **and** the teacher opts in per classroom.
