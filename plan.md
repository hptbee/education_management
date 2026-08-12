# Implementation Plan

This plan is based on `docs/PROJECT_SCOPE.md` as the primary source of truth.

Priority order:

1. Business Rules
2. Functional Requirements
3. Acceptance Criteria
4. Product Principles
5. Simple and pragmatic implementation

## Current Baseline

The project already has:

- React, Vite, TypeScript, Tailwind CSS, React Router, Framer Motion, Lucide React, and `canvas-confetti`.
- A local React context store using `localStorage`.
- Basic dashboard, sidebar, students, teams, points, rewards, recognition, lucky wheel, games, and settings pages.
- A first-pass classroom settings model.
- Basic point changes through `applyPoints`.
- Basic fair random selection helper for Lucky Wheel.

Important current gaps:

- Some source text appears encoding-corrupted and should be normalized.
- Data models are missing several required fields such as `createdAt`, `updatedAt`, `isActive`, `source`, team score history, and lucky-wheel history.
- First-time setup exists but does not fully validate settings.
- Reward redemption deducts student points but does not create `PointHistory`.
- Student, team, reward, and point action management are incomplete.
- Presentation mode is not fully implemented and privacy separation is incomplete.
- Backup, import, and reset are missing.
- Storage is a single localStorage blob instead of a small centralized storage layer with structured validation.

## Phase 1 - Foundation and Data Safety

Goal: make the data layer trustworthy before expanding features.

### Scope

- Align TypeScript models with `PROJECT_SCOPE.md`.
- Add missing timestamps where required.
- Add `PointHistory.source`.
- Add `isActive` to point actions and rewards.
- Add `TeamScoreHistory`.
- Add `LuckyWheelSelection`.
- Add optional `AppSettings`.
- Normalize classroom settings to required fields.
- Add a small centralized storage helper.
- Validate stored data before using it.
- Show a friendly persistence warning if localStorage fails.
- Fix corrupted Vietnamese display strings in source files.

### Business Rules Covered

- BR-001: every persisted entity has a stable unique `id`.
- BR-002: history records include `createdAt`; mutable entities include `updatedAt` where useful.
- BR-003: successful changes persist immediately.
- BR-004: classroom identity comes from settings.
- BR-010: data remains local-only.

### Acceptance Criteria

- App loads valid stored data safely.
- Invalid stored JSON does not crash the app.
- Classroom settings are considered valid only when required fields pass validation.
- First launch shows onboarding when settings are missing or invalid.
- Source text displays Vietnamese correctly.
- Build passes.

## Phase 2 - Classroom Setup and Settings

Goal: complete first-time setup and classroom identity management.

### Scope

- Validate class name, teacher name, and school year.
- Trim text input before saving.
- Enforce length limits:
  - Class name: 1-50 characters.
  - Teacher name: 1-50 characters.
  - School year: 1-30 characters.
- Add class avatar upload.
- Add teacher avatar upload.
- Validate uploaded files are browser-supported images.
- Preserve old avatar when upload fails.
- Update all visible classroom identity immediately after saving.
- Ensure settings persist after refresh.

### Business Rules Covered

- BR-003: immediate persistence.
- BR-004: no hardcoded classroom identity.
- BR-010: local-only data.

### Acceptance Criteria

- First launch shows setup instead of an empty dashboard.
- Valid setup saves locally and navigates to dashboard.
- Refreshing does not repeat onboarding after valid setup.
- Settings page updates class name, teacher name, school year, and avatars.
- Dashboard, sidebar, welcome message, and activity text read from settings.

## Phase 3 - Points and Point Actions

Goal: make individual point changes audit-safe and configurable.

### Scope

- Complete point action management:
  - Add action.
  - Edit action.
  - Disable action.
  - Delete action.
- Validate positive actions:
  - `type = reward`.
  - `points > 0`.
- Validate negative actions:
  - `type = penalty`.
  - `points < 0`.
- Keep existing point history when actions are deleted.
- Add optional note to point changes.
- Add manual quick actions such as `+1`, `+5`, and `-1`.
- Ensure every point change creates exactly one `PointHistory`.
- Sort point history newest first.
- Show point history with action name, value, date/time, note, and source.

### Business Rules Covered

- BR-005: every point change creates history.
- BR-006: student points and team scores remain separate.
- BR-009: penalty reasons/private detail are not shown in presentation mode.

### Acceptance Criteria

- Student balance changes correctly after reward and penalty actions.
- One history record exists for every point change.
- Ranking recalculates after point changes.
- Deleted point actions do not delete history.
- Negative student balances are allowed for point actions.
- Build passes.

## Phase 4 - Rewards and Redemption

Goal: complete reward management and fix redemption history.

### Scope

- Complete reward CRUD:
  - Create reward.
  - Edit reward.
  - Delete reward.
  - Enable/disable reward.
  - Upload/change reward image.
- Validate reward name and required points.
- Prevent reward redemption when points are insufficient.
- Confirm redemption before applying it.
- On successful redemption:
  - Deduct student points.
  - Create `RewardHistory`.
  - Create `PointHistory` with source `reward-redemption`.
  - Increase `student.totalRewards`.
  - Persist all changes.
- Keep reward history readable after reward deletion.

### Business Rules Covered

- BR-005: reward redemption point deduction creates history.
- BR-010: all data remains local-only.

### Acceptance Criteria

- Rewards can be created, edited, deleted, enabled, and disabled.
- Redemption is blocked when points are insufficient.
- Successful redemption updates student points and total rewards.
- Successful redemption creates both reward history and point history.
- Deleted rewards do not remove reward history.

## Phase 5 - Student Management and Profiles

Goal: complete teacher-facing student workflows.

### Scope

- Student list:
  - Card/grid view.
  - Search by name.
  - Add student.
  - Edit student.
  - Delete student.
  - Navigate to profile.
- Validate student names:
  - Required.
  - Trimmed.
  - 1-100 characters.
- Add optional fields:
  - Avatar.
  - Date of birth.
  - Gender.
  - Previous class.
  - Previous achievements.
  - Classroom role.
  - Potential note.
  - Team.
- Preserve points and histories when editing student details.
- Confirm before deleting a student.
- On deletion, clean related student histories and lucky-wheel references.
- Add friendly empty state when no students exist.
- Complete profile sections:
  - Header.
  - Basic information.
  - Achievements.
  - Classroom information.
  - Private teacher notes.
  - Activity history.

### Business Rules Covered

- BR-001: student IDs remain unique.
- BR-007: one student belongs to maximum one team.
- BR-009: teacher notes stay private.

### Acceptance Criteria

- Teacher can add, edit, delete, search, and view students.
- Delete confirmation includes student name.
- Editing does not reset points or histories.
- Student profile shows all required teacher-view sections.
- Teacher notes never appear in presentation screens.

## Phase 6 - Team Management and Competition

Goal: complete team competition without mixing it with individual points.

### Scope

- Team CRUD:
  - Create team.
  - Rename team.
  - Change avatar/mascot.
  - Delete team.
- Assign students to teams.
- Remove students from teams.
- Change team score explicitly.
- Reset team score with confirmation.
- Create team score history for score changes.
- Show team ranking and empty state.

### Business Rules Covered

- BR-006: student points and team scores are separate.
- BR-007: one student belongs to maximum one team.
- BR-008: deleting a team does not delete students.

### Acceptance Criteria

- Teacher can manage teams and assignments.
- Deleting a team keeps students and clears affected `teamId`.
- Team score changes do not change student points.
- Student point changes do not change team score.
- Team ranking updates immediately.

## Phase 7 - Activities and Games

Goal: complete classroom activity flows in a privacy-safe way.

### Scope

- Lucky Wheel:
  - Handle no students.
  - Select students fairly without repeats.
  - Reset cycle automatically when completed.
  - Record lucky-wheel selection history.
  - Show celebration feedback.
- Random Student game:
  - Reuse fair selection.
  - Allow teacher to award points.
- Quick Answer game:
  - Select or confirm student.
  - Award configured positive action.
- Who Is Next game:
  - Pick next student fairly.
  - Show large presentation-friendly result.
- Ensure game rewards use `applyPoints` and create `PointHistory`.

### Business Rules Covered

- BR-005: game point rewards create history.
- BR-009: games do not show private teacher notes.

### Acceptance Criteria

- Activities show useful empty states when no students exist.
- Lucky Wheel does not repeat students until the current cycle is exhausted.
- Game-awarded points create point history.
- Game screens are readable on projector-sized screens.

## Phase 8 - Recognition and Presentation Mode

Goal: support public classroom display while preserving privacy.

### Scope

- Recognition management:
  - Create recognition.
  - View recognition history.
  - Present recognition fullscreen-friendly.
- Presentation mode layout:
  - Hide sidebar where appropriate.
  - Hide edit/delete controls.
  - Use larger text and avatars.
  - Hide teacher-only/private data.
- Presentation screens:
  - Lucky Wheel.
  - Random Student.
  - Quick Answer result.
  - Who Is Next result.
  - Recognition.
  - Student leaderboard.
  - Team leaderboard.
- Support browser fullscreen where practical.

### Business Rules Covered

- BR-009: private notes never appear publicly.

### Acceptance Criteria

- Presentation screens do not expose teacher notes, potential notes, penalty reasons, or edit controls.
- Presentation views are readable at 1366x768 and larger.
- Recognition presentation uses celebration feedback.

## Phase 9 - Backup, Restore, Reset, and Polish

Goal: make local-only data safer for real classroom use.

### Scope

- Export structured data to JSON backup.
- Use filename format `classroom-backup-YYYY-MM-DD.json`.
- Include all structured data:
  - Classroom settings.
  - Students.
  - Teams.
  - Team score history.
  - Point actions.
  - Point history.
  - Rewards.
  - Reward history.
  - Recognition.
  - Lucky-wheel history.
  - App settings.
- Import backup:
  - Parse JSON.
  - Validate expected structure.
  - Confirm before replacing current data.
  - Preserve current data when import is invalid.
- Reset all data:
  - Strong confirmation.
  - Remove application data.
  - Return to first-time setup.
- Final empty states, validation messages, motion polish, and responsive review.

### Business Rules Covered

- BR-010: data remains local unless exported/imported manually.
- EC-009: storage failures are visible.

### Acceptance Criteria

- Backup export downloads valid JSON.
- Valid backup import replaces data only after confirmation.
- Invalid import does not corrupt current data.
- Reset all data returns to onboarding.
- App remains usable on laptop, tablet, and projector layouts.

## Recommended Immediate Next Step

Start with Phase 1 and the most serious business-rule bug:

- Add required data model fields and migrations.
- Create a small storage helper.
- Fix classroom setup validity checks.
- Fix reward redemption so it creates `PointHistory`.
- Normalize corrupted Vietnamese strings.
- Run `npm run build`.

This keeps the implementation pragmatic while protecting the core business rules before adding more feature surface.
