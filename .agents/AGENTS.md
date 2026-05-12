# AGENTS.md — AI Session Rules

> Read this file **first**, every session, before touching any code.

---

## Non-Negotiable Rules

| Rule | Detail |
|---|---|
| **DOC-FIRST** | Read `CLAUDE.md` (if present) and `docs/` before touching code |
| **Minimal change** | Touch only the files the task explicitly names; no bystander refactors |
| **No secret leakage** | Never paste `DATABASE_URL`, API keys, hostnames, usernames, or ports into code, UI, sessions, or topics |

---

## PR Workflow (multi-branch, Mormay owns `main`)

1. **`active.md` is single-writer.** Only the main owner updates it on `main`, in a separate commit after a PR merges. Contributors MUST NOT edit `active.md` in their PRs.
2. **Every PR must include at least 1 session note** under `.agents/sessions/`. Large PRs may include more than one.
3. **Session filename format:** `YYYYMMDD-HHMM_<author>_<topic>.md`
   Example: `20260418-0930_devA_mart-forecast.md`
4. Main owner merges PR → then updates `active.md` in a separate follow-up commit on `main`.

---

## Folder Usage

| Folder | Purpose |
|---|---|
| `sessions/` | Checkpoint per PR / task — required for team handoff |
| `topics/` | Long-lived notes that span multiple tasks (e.g., DB schema, auth model) |
| `private/` | **Gitignored.** Local scratch only — do NOT rely on it for team handoff |

---

## Session Note Template

Copy into `.agents/sessions/YYYYMMDD-HHMM_<you>_<topic>.md`:

```markdown
# Session: <topic>
**Date:** YYYY-MM-DD  **Author:** <name / AI tool>  **Branch:** <branch>

## Why this session exists
<!-- One sentence: what problem or feature prompted this work -->

## What changed
<!-- File list only -->
- `pages/1_ops_dashboard.py` — <what and why>
- `utils/db.py` — <what and why>

## Key decisions
<!-- Any non-obvious choice made; skip if none -->

## How to verify
```bash
python3 -m py_compile pages/1_ops_dashboard.py
streamlit run app.py
```
Manual: <steps you actually clicked / tested>

## Known issues / risks
<!-- Leave blank if none -->

## Next step / handoff
<!-- What the next AI or dev should do first -->
```

---

## How to Use

**Any AI tool (Claude, Codex, AI Studio) — start of session:**
1. Read `.agents/AGENTS.md` (this file).
2. Read `.agents/active.md` for current project state.
3. Read the most recent file in `.agents/sessions/` for last-session context.
4. Do your work.
5. Before opening a PR, add a session note to `.agents/sessions/`.

**Main owner, after merging a PR:**
1. Update `.agents/active.md` in a separate commit on `main`.
2. Optionally promote session findings to `.agents/topics/` for long-term reference.
