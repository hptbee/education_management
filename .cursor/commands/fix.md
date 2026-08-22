---
description: Diagnose and fix a confirmed bug with minimal scope
---

Fix:

$ARGUMENTS

If the root cause is not already confirmed, read and follow `.cursor/skills/investigate/SKILL.md` first.

Then:
1. Create a minimal fix plan (read `.cursor/skills/planning/SKILL.md` if needed).
2. Read and follow `.cursor/skills/implementation/SKILL.md`.
3. Implement the safest minimal solution.
4. Check related occurrences for the same bug pattern.
5. Review the final diff (read `.cursor/skills/code-review/SKILL.md`).

Do not make unrelated refactoring.
Do not introduce a new test stack unless the user asked.
