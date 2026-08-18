UI audit for:

$ARGUMENTS

Read and follow **in this order**:
1. `.cursor/skills/classroom-ui/SKILL.md` (project constraints — filter generic advice)
2. `.cursor/skills/redesign-existing-projects/SKILL.md` (audit checklist)

Do not modify code unless the user explicitly asks to fix findings.

Apply classroom-ui overrides — ignore taste-skill advice that conflicts:
- Do not recommend replacing Lucide icons
- Do not recommend removing Sidebar or changing nav structure
- Do not recommend new fonts or palettes outside PROJECT_SCOPE §12
- Do not recommend marketing-style asymmetry or picsum placeholders

Return findings grouped by severity with file references:
- Severity, Confidence, Evidence, Impact, Suggested fix

Focus: touch targets, hover/focus states, empty/error states, reduced-motion, contrast, shell integrity.
