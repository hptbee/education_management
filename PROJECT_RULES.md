# PROJECT RULES

## 1. EXISTING UI AND NAVIGATION MUST BE PRESERVED

The existing application shell is part of the product.

Unless explicitly requested otherwise, NEVER:

- remove the sidebar
- remove navigation items
- hide navigation items
- replace the application layout
- bypass the application shell
- create a page that renders outside the main layout
- replace the existing routing structure

Every new feature page MUST remain accessible through the existing application navigation.

---

## 2. DO NOT BREAK EXISTING FEATURES

Before implementing any feature:

1. Inspect the existing application structure.
2. Identify existing routes.
3. Identify the existing layout.
4. Identify the existing navigation.
5. Reuse existing components where possible.

Do not rewrite unrelated files.

Do not replace working functionality with simplified placeholder implementations.

---

## 3. APPLICATION SHELL

The application shell consists of:

- Sidebar navigation
- Main application layout
- Header if available
- Active classroom context

All feature pages must render inside the application shell.

Expected structure:

App
└── AppLayout
    ├── Sidebar
    ├── Header
    └── Page Content

Feature pages must only replace:

Page Content

They must NOT replace the entire application layout.

---

## 4. NAVIGATION INTEGRITY

Every navigation item must always have:

- a valid route
- an accessible page
- active navigation state

When implementing a new page:

1. Check whether a route already exists.
2. Reuse the existing route if possible.
3. If creating a new route, add it to navigation only if appropriate.
4. Do not remove or modify unrelated navigation items.

Before completing a task, verify:

- Existing navigation is still visible.
- Existing navigation items still work.
- The current page is highlighted correctly.
- No route is broken.

---

## 5. ACTIVE CLASSROOM DATABASE

The active ClassroomDatabase is the single source of truth.

Do not create duplicate global state for:

- teacher
- classroom
- school year
- students

All feature data belongs to the currently active classroom database.

Switching pages must NOT reset the active classroom.

**Auth:** Google sign-in is required (`AccessGate` in `layout.tsx`). Local classrooms persist across lock/logout. Web uses GIS `idToken`; Tauri uses PKCE loopback with separate Desktop OAuth client — see `docs/ACCOUNTS.md`.

---

## 6. PAGE IMPLEMENTATION RULE

When implementing a feature:

DO:

- Add or update the feature page.
- Add feature-specific components.
- Reuse AppLayout.
- Reuse Sidebar.
- Reuse shared components.
- Preserve routing.

DO NOT:

- Replace `src/app/layout.tsx` with a standalone feature page.
- Render a feature outside AppLayout.
- Remove the sidebar for convenience.
- Create a separate application entry point.
- Duplicate the application shell.

---

## 7. BEFORE MAKING CHANGES

Before coding, inspect:

- PROJECT_SCOPE.md
- PROJECT_RULES.md
- docs/DATA_ARCHITECTURE.md (when touching persistence or cloud backup)
- docs/ACCOUNTS.md (when touching auth or entitlements)
- docs/build-and-release.md (when touching Tauri packaging or CI)
- existing routes
- existing navigation
- existing AppLayout
- relevant feature implementation

Understand the existing architecture before modifying it.

---

## 8. AFTER IMPLEMENTATION

Before finishing, verify:

### Navigation

- [ ] Sidebar is still visible.
- [ ] Existing navigation items still exist.
- [ ] Existing routes still work.
- [ ] New feature page works inside AppLayout.
- [ ] No feature accidentally replaced the application shell.

### Existing Features

- [ ] Existing functionality was not removed.
- [ ] Existing pages still render.
- [ ] Existing classroom data still works.

### Architecture

- [ ] No duplicate application layout was created.
- [ ] No unnecessary rewrite was performed.
- [ ] New code follows the existing project structure.

---

## 9. RULE PRIORITY

When implementing a feature:

1. Preserve the existing application shell.
2. Preserve navigation.
3. Preserve existing functionality.
4. Implement the requested feature.
5. Avoid unrelated refactoring.

If the requested implementation conflicts with the existing architecture, adapt the feature to the architecture instead of replacing the architecture.