---
name: security-review
description: Security review for auth, Worker, XSS, and secrets in this local-first classroom app.
origin: ECC, claude-code
---

# Security Review

> On conflict, [docs/ACCOUNTS.md](../../../docs/ACCOUNTS.md), [docs/DATA_ARCHITECTURE.md](../../../docs/DATA_ARCHITECTURE.md), and [backend.mdc](../../rules/backend.mdc) win.

## When to activate

- Google OAuth or entitlement changes
- `workers/cloud-backup` handlers or R2/D1 bindings
- Student/teacher name or text rendered in UI
- File uploads (avatars, gifts, banners)
- `.env` / `NEXT_PUBLIC_*` / Tauri env usage

## Threat model (this app)

| Area | Rule |
|---|---|
| Classroom data | Local-first — no classroom REST API; Worker is auth + optional backup only |
| Auth | Google OAuth + signed entitlement JWT; separate Web vs Desktop client IDs |
| Secrets | Worker secrets in Cloudflare only; never `GOOGLE_CLIENT_SECRET` in app |
| `NEXT_PUBLIC_*` | **Public** build-time config — never put secrets here; rebuild Tauri after env changes |
| Cloud | R2 projection + D1 licenses; JWT `userId` owns upload prefix |
| XSS | Student/teacher names are untrusted — no raw HTML sinks |

## Checklist

### Secrets

- [ ] No hardcoded API keys, tokens, or passwords in TS/RS/Worker
- [ ] `.env.local` gitignored; no secrets in commits
- [ ] Worker: `GOOGLE_CLIENT_SECRET` only in Wrangler secrets

### OAuth / entitlements

- [ ] Web uses `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; desktop uses `NEXT_PUBLIC_GOOGLE_CLIENT_ID_DESKTOP`
- [ ] Entitlement in OS keychain (desktop); fail closed if keyring write fails
- [ ] Logout/lock does **not** delete local classrooms

### Worker endpoints

- [ ] Auth/admin JSON bounded (~64 KB); sync/backup limits per `AGENTS.md`
- [ ] Upload ownership from JWT only — no spoofed `userId`
- [ ] No new classroom CRUD routes unless explicitly requested

### XSS and DOM sinks (claude-code patterns)

Never use with student/teacher/user-provided text:

- `dangerouslySetInnerHTML`
- `.innerHTML` / `.outerHTML` / `insertAdjacentHTML`
- `eval()` / `new Function()`
- `document.write()`

Prefer React text nodes or sanitized static markup only.

### Input

- Validate file uploads (size, MIME) via existing `images.ts` / asset pipeline
- Trim/sanitize display names where already patterned in codebase
- Zod is **optional** — not a project-wide requirement

### Desktop (Tauri)

- FS access scoped to app data dir; OAuth via PKCE loopback
- No arbitrary shell execution from untrusted input

## Explicitly skip

- Mandatory Zod on every handler
- CSRF on every endpoint (no cookie session API for classroom data)
- SQL injection as default threat (no app SQL for classroom JSON)
- Vercel-specific deployment hardening

## Output format

For each finding: **Severity**, **Confidence**, **Evidence** (path:line), **Impact**, **Suggested fix**.
