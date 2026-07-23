# Doc-Fix Plan Template

A deliberately slimmer sibling of ds-conform's plan template, duplicated here rather than shared: skills are self-contained at their boundaries, the same way plans are (a reference this skill can't see in another skill's folder is a broken reference). The three properties are identical — self-contained context, verification gates, hard boundaries with STOP conditions — trimmed to documentation work, which is lower-risk and ideal for the cheapest executors.

File naming: `ds-plans/NNN-<slug>.md`, sharing the numbering and index with any existing `ds-plans/` content.

---

## Template

```markdown
# Plan NNN: <Imperative title — what will be documented/decided after this>

> **Executor instructions**: Follow step by step; run every verification and
> confirm the expected result. On any STOP condition, stop and report. Update
> this plan's row in `ds-plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat <planned-at SHA>..HEAD -- <in-scope paths>`
> On changes to in-scope files, compare "Current state" against live content
> before proceeding; mismatch = STOP.

## Status

- **Priority** / **Effort** / **Risk**: P1–P3 / S–L / LOW–HIGH
- **Category**: contracts | tokens | guidelines | machine-surface | deprecation
- **Downstream effect**: <which conformance class this unblocks or sharpens>
- **Planned at**: commit `<short SHA>`, <date>
- **Issue**: <URL if published>

## Why this matters

2–4 sentences: the gap, who hits it (generating agents, the gate, humans),
what becomes enforceable once closed.

## Current state

- The files involved, one line each; short excerpts with `file:line` markers.
- What exists vs. what's missing, stated exactly (e.g. "variants `ghost`,
  `inline`, `compact` are in `select.types.ts:12-18` and appear in zero docs").
- The writing conventions to match, with one exemplar: "prop tables follow
  `docs/components/dialog.mdx` — match its structure."

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Docs build | `pnpm build-docs` | exit 0 |
| Stories | `pnpm build-storybook` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 (doc snippets compile if the repo checks them) |

## Scope

**In scope**: the exact doc/story/policy files (created or edited).
**Out of scope**: component source — a doc-fix plan never changes behavior;
if correct docs would require a code change, that is a STOP condition, not
an invitation.

## Steps

### Step 1: <imperative title>
Exact content to add or the decision to record — for policy plans, include
the drafted policy text itself so the executor is transcribing, not deciding.
**Verify**: `<command>` → <expected>

## Done criteria

- [ ] Builds above exit 0
- [ ] The gap is closed verbatim: <a grep or check proving the content exists>
- [ ] No source files modified (`git status` shows docs/policy paths only)
- [ ] Index row updated

## STOP conditions

- Current-state excerpts don't match (drift).
- Closing the gap correctly would require changing component behavior.
- The needed decision isn't in this plan (policy plans must carry the decision;
  if it's missing, the plan is incomplete — report, don't invent policy).

## Maintenance notes

What future DS changes must touch this doc; whether `/ds-readiness manifest`
should be re-run after it lands (usually yes — say so explicitly).
```

---

## Quality bar

- Executable by a model that has never seen the DS repo, with only this file and the repo?
- Policy plans carry the drafted decision text — the executor transcribes, never legislates.
- Every verification is a command with an expected result.
- Zero component-source files in scope.
