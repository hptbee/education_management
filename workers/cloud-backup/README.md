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

4. Deploy:

```bash
npx wrangler deploy
```

5. Copy the deployed Worker URL into the app `.env.local`:

```env
NEXT_PUBLIC_CLOUD_BACKUP_URL=https://classroom-cloud-backup.<your-subdomain>.workers.dev
```

6. Restart the Tauri app (`npm run tauri:dev`).

## R2 object layout

```
backups/<device-id>/<classroom-id>/latest.json
```

Identifiers are sanitized server-side. Client-controlled paths are never accepted.

## Security notes

- R2 credentials stay in Cloudflare (Worker binding only).
- Optional future auth: set `BACKUP_API_TOKEN` in `wrangler.toml` / dashboard and send `Authorization: Bearer <token>` from the app.
