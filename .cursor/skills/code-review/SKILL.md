---
name: code-review
description: Reviews pull requests or local diffs for functional bugs, regressions, and security issues. Ignores style-only suggestions. Every finding includes severity, confidence, evidence, impact, and suggested fix.
---

# Code Review

## Review priorities

1. Functional bugs
2. Regression risks (sidebar, nav, routes)
3. Data loss or persistence corruption
4. Stale async writes or snapshot overwrite risks (`commitData` / `persistNow`)
5. Classroom state consistency (`ClassroomDatabase` SSOT)
6. Web vs Tauri behavior divergence
7. Security (XSS, secrets)
8. Silent failures — empty `catch`, swallowed errors, unjustified fallbacks
9. Performance problems
10. Architecture violations (duplicate shell, bypass AppLayout)

## Ignore

- Formatting, personal preferences, arbitrary function length limits, unnecessary abstraction suggestions, emoji in UI

## Mode selection

**Local review (default):** `git diff` / uncommitted changes. Read each changed file in full when needed.

**PR review:** PR number or URL — `gh pr diff` and full file context at PR head.

Do not auto-publish `gh pr review` unless the user explicitly asks.

## Every finding must include

- **Severity:** Critical / High / Medium / Low
- **Confidence:** High / Medium / Low
- **Evidence:** File path and line reference
- **Impact:** What breaks or degrades
- **Suggested fix:** Concrete next step

## Blast radius

Non-trivial diffs: one impact check. Unknown blast radius → CBM `detect_changes`. Known symbol → Serena `find_referencing_symbols`. Do not run both.

## Constraints

- Focus only on actionable issues
- Do not report speculative issues without evidence
