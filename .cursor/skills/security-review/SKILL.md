---
name: security-review
description: Security review for auth, Worker, XSS, and secrets in this local-first classroom app.
---

# Security Review

> On conflict, [docs/ACCOUNTS.md](../../../docs/ACCOUNTS.md), [docs/DATA_ARCHITECTURE.md](../../../docs/DATA_ARCHITECTURE.md), and [persistence.mdc](../../rules/persistence.mdc) win.

## When to activate

- Google OAuth or entitlement changes
- `workers/cloud-backup` handlers or R2/D1 bindings
- Student/teacher name or text rendered in UI
- File uploads (avatars, gifts, banners)
- `.env` / `NEXT_PUBLIC_*` / Tauri env usage

## Threat model

See [persistence.mdc](../../rules/persistence.mdc) (local-first, Worker scope) and [docs/ACCOUNTS.md](../../../docs/ACCOUNTS.md) (OAuth, JWT, entitlements). Student/teacher names are untrusted — no raw HTML sinks.

## Checklist

### Secrets

- [ ] No hardcoded API keys, tokens, or passwords in TS/RS/Worker
- [ ] `.env.local` gitignored; no secrets in commits
- [ ] Worker: `GOOGLE_CLIENT_SECRET` only in Wrangler secrets

### OAuth / entitlements

- [ ] Web vs desktop client IDs per ACCOUNTS.md
- [ ] Entitlement in OS keychain (desktop); fail closed if keyring write fails
- [ ] Logout/lock does **not** delete local classrooms

### Worker endpoints

- [ ] Auth/admin JSON bounded; sync/backup limits per DATA_ARCHITECTURE.md
- [ ] Upload ownership from JWT only
- [ ] No new classroom CRUD routes unless explicitly requested

### XSS and DOM sinks

Never use with student/teacher/user-provided text: `dangerouslySetInnerHTML`, `.innerHTML`, `insertAdjacentHTML`, `eval`, `new Function`, `document.write`.

### Desktop (Tauri)

- FS scoped to app data dir; OAuth via PKCE loopback
- No arbitrary shell execution from untrusted input

## Explicitly skip

- Mandatory Zod on every handler
- CSRF on classroom data APIs (no cookie session API for classroom JSON)
- Vercel-specific deployment hardening

## Output format

For each finding: **Severity**, **Confidence**, **Evidence** (path:line), **Impact**, **Suggested fix**.
