---
name: react-patterns
description: Local-first React 19 patterns for this classroom app — derive during render, composition, and client performance without RSC/SWR.
origin: ECC, agent-skills
---

# React Patterns (local-first)

> On conflict, [classroom-ui](../classroom-ui/SKILL.md), [frontend.mdc](../../rules/frontend.mdc), and [backend.mdc](../../rules/backend.mdc) win.

## Scope

Use when writing or reviewing `src/**/*.tsx` components and hooks. **Not** for adding new global data layers.

## Data and state

- Classroom data: **`useAppData()` / `AppDataProvider`** only — do not add TanStack Query, SWR, or parallel REST fetching for classroom JSON.
- Local `useState` → lift to common ancestor → context when needed.
- Do **not** introduce Zustand/Redux for classroom state.

## Core patterns

### Derive during render

```tsx
// Good
const total = students.reduce((sum, s) => sum + s.points, 0);

// Bad — redundant effect
useEffect(() => {
  setTotal(students.reduce((sum, s) => sum + s.points, 0));
}, [students]);
```

### Composition over boolean prop proliferation

Prefer explicit variant components or `children` over `isThread`, `isEditing`, `showFooter`, etc. when modes are mutually exclusive.

### Avoid inline component declarations

Do not define components inside render — they remount every pass and break focus/state.

```tsx
// Bad
function Parent() {
  const Child = () => <span />;
  return <Child />;
}
```

### `forwardRef`

Keep existing `forwardRef` usage. Migrate to ref-as-prop only when that refactor is explicitly in scope.

## Performance (client-only)

Include **only** when profiler or bundle evidence supports it:

- `next/dynamic` for a heavy component **not** needed on first paint (e.g. optional modal) — not by default for game modals already lazy-opened.
- `useMemo` / `useCallback` when a measured re-render or dependency chain requires it — not by default.
- Passive scroll listeners where applicable.

## Explicitly skip

- `server-*`, `async-*`, `client-swr-*` rules from Vercel react-best-practices
- Server Components data fetching for classroom CRUD
- New API response envelopes or enterprise patterns

## Shell

New pages render inside existing `src/app/layout.tsx` — never a second Sidebar or AppLayout.
