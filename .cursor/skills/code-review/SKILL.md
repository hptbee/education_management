---
name: code-review
description: Reviews pull requests or local diffs for functional bugs, regressions, and security issues. Use when reviewing code changes. Ignores style-only suggestions. Every finding includes severity, confidence, evidence, impact, and suggested fix.
---

# Code Review

## Review priorities

1. Functional bugs
2. Regression risks (sidebar, nav, classroom data, routes)
3. Data consistency (`ClassroomDatabase` SSOT)
4. Concurrency issues (if applicable)
5. Security issues (XSS from student names, secrets in source)
6. **Silent failures** — empty `catch`, swallowed errors, `console.warn` without user feedback, unjustified fallbacks that mask failures (see claude-code silent-failure-hunter; no Sentry/`errorIds` required)
7. Performance problems
8. Architecture violations (duplicate shell, bypass AppLayout)

## Ignore

- Formatting
- Personal style preferences
- Minor naming suggestions
- Emoji in UI (this is a playful classroom app)
- Arbitrary function length limits

## Mode selection

**Local review (default):** `git diff` / uncommitted changes. Read each changed file in full, not just hunks.

**PR review:** When input is a PR number or URL — use `gh pr diff` and read full file context at PR head.

Do not auto-publish `gh pr review` unless the user explicitly asks.

## Every finding must include

- **Severity:** Critical / High / Medium / Low
- **Confidence:** High / Medium / Low
- **Evidence:** File path and line reference
- **Impact:** What breaks or degrades
- **Suggested fix:** Concrete next step

## Blast radius

Non-trivial diffs: one impact check. Unknown blast radius → CBM `detect_changes`. Known edited symbol + file → Serena `find_referencing_symbols`. Do not run both.

## Project checks

- Sidebar still renders and nav items work
- New pages render inside AppLayout
- No duplicate global state for classroom/teacher/students
- No REST/auth/cloud DB introduced without explicit request
- Student-facing HTML: no unsafe `dangerouslySetInnerHTML`

## Constraints

- Focus only on actionable issues.
- Do not report speculative issues without evidence.
