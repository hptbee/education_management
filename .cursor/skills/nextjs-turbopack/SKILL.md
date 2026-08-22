---
name: nextjs-turbopack
description: Next.js 16+ and Turbopack — dev bundling, FS caching, and production validation for this repo.
origin: ECC
---

# Next.js and Turbopack

> On conflict, follow [docs/PROJECT_SCOPE.md](../../../docs/PROJECT_SCOPE.md) and [`.cursor/rules/`](../../rules/).

Next.js 16+ uses **Turbopack by default** for `next dev`: faster cold start and HMR. Production builds use `next build` (check your Next.js version for Turbopack vs webpack in prod).

## When to use

- Debugging slow dev startup or HMR
- Deciding whether a dev issue is Turbopack-specific
- Validating changes that can break the production build

## Commands (this repo)

Prefer **RTK** for command output:

```bash
rtk next dev
rtk next build
```

Use `rtk next build` after changes that can break routing, static export, or Tauri packaging (`out/`).

## Practices

- Turbopack cache lives under `.next` — avoid clearing it unnecessarily.
- If a dev-only bug appears Turbopack-related, retry with webpack per [Next.js 16 docs](node_modules/next/dist/docs/) before changing app code.
- Read `node_modules/next/dist/docs/` when APIs are ambiguous — this project is Next.js 16, not 14/15.
- Tauri desktop loads static export from `out/`; verify shell routes after build changes.

## Skip

- Do not add server-only data layers or REST APIs for classroom data — local-first per `backend.mdc`.
