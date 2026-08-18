---
name: repository-audit
description: Audits the repository without modifying code. Findings grouped by severity with evidence.
---

# Repository Audit

Do not modify code. Follow `.cursor/rules/00-tool-routing.mdc`. Architecture and impact → CBM (`get_architecture`, `search_graph`, `trace_path`). Known symbol precision → Serena. Literals/TODOs → Grep. One primary tool per question.

Divide when useful: `src/app/` + `components/`; `src/database/` + `src/store/`; shell/nav; local-first security; `src-tauri/`.

Read [AGENTS.md](../../../AGENTS.md), [PROJECT_RULES.md](../../../PROJECT_RULES.md), [docs/PROJECT_SCOPE.md](../../../docs/PROJECT_SCOPE.md).

Every finding needs file evidence. Label unverified items as hypotheses.

## Output

Executive summary; findings Critical → High → Medium → Low with evidence, impact, confidence, next action.
