# Plan Template

Sweep-mode findings the user selects become plans. Every plan is written for an executor with **zero context** — it has not seen the advisor session, the audit, or any other plan, and it may be a much smaller model. Assume it follows explicit instructions well and recovers from ambiguity badly.

Three properties make a plan executable by a weaker model:

1. **Self-contained context** — paths, current-state excerpts, conventions with an exemplar file, verified commands. All of it in the file.
2. **Verification gates** — every step ends with a command and its expected result; done criteria are machine-checkable.
3. **Hard boundaries and escape hatches** — explicit out-of-scope files, and STOP conditions instead of improvisation when reality doesn't match.

File naming: `ds-plans/NNN-<slug>.md`, numbered in recommended execution order.

---

## Template

```markdown
# Plan NNN: <Imperative title — what will be true after this plan>

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on.
> If any STOP condition occurs, stop and report — do not improvise. When
> done, update this plan's status row in `ds-plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat <planned-at SHA>..HEAD -- <in-scope paths>`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against live code; on mismatch, STOP.

## Status

- **Priority**: P1 | P2 | P3
- **Effort**: S | M | L
- **Risk**: LOW | MED | HIGH
- **Depends on**: ds-plans/NNN-*.md (or "none")
- **Category**: adoption | tokens | usage | a11y | extraction
- **Class**: <machine key, e.g. token.literal.exact>
- **Planned at**: commit `<short SHA>`, <YYYY-MM-DD>
- **Issue**: <URL — only when published via --issues>

## Why this matters

2–5 sentences: the violation, its concrete cost, what conforms after this
lands. Intent is what lets a correct judgment call happen when a detail is off.

## Current state

All facts inlined, from the advisor's own reads — never a subagent's report:

- Relevant files, one line each on their role.
- Short excerpts with `file:line` markers — enough to confirm the location.
- The DS component/token being adopted, with its actual API excerpted from
  the package types (the executor must not guess props).
- Repo conventions that apply, with one exemplar file: "component tests
  follow `src/components/Card.test.tsx` — match it."
- The manifest lines this plan enforces, quoted (the executor hasn't read it).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Tests | `pnpm test -- <filter>` | all pass |
| Stories | `pnpm build-storybook` | exit 0 |

(Exact commands verified during recon, not guessed. Include visual-regression
or axe commands only if the repo has them.)

## Scope

**In scope** (the only files you may modify): explicit list.
**Out of scope** (do NOT touch, even though they look related): explicit list,
each with one line on why.

## Git workflow

Branch `ds/NNN-<slug>` (or the repo's evident convention); commit per step,
message style matched to `git log`. Do NOT push or open a PR unless instructed.

## Steps

### Step 1: <imperative title>
Precise instructions naming exact files and symbols; include the target code
shape when load-bearing.
**Verify**: `<command>` → <expected output>

(Each step independently verifiable; order steps so the codebase is never
broken between them — add new path, switch callers, remove old path.)

## Test plan

New tests, their file, the cases (happy path, the regression this prevents,
named edge cases), and which existing test to use as the structural pattern.

## Done criteria

Machine-checkable; ALL must hold:
- [ ] typecheck / lint / tests exit 0
- [ ] `grep -rn "<old pattern>" src/` returns no matches
- [ ] no files outside the in-scope list modified (`git status`)
- [ ] ds-plans/README.md status row updated

## STOP conditions

- Current-state excerpts don't match live code (drift).
- A verification fails twice after a reasonable fix attempt.
- The fix appears to require an out-of-scope file.
- <the plan-specific assumption that must hold>, discovered false.

## Maintenance notes

What future changes interact with this; what a reviewer should scrutinize;
follow-ups deliberately deferred (and why).
```

---

## Category addenda

The skeleton above always applies; each category adds its load-bearing section.

**Adoption plans** add a **prop map** and a **worked exemplar**:

- Prop-map table: `old prop/behavior → DS prop/behavior`, including dropped
  props with one line on why dropping is safe. Unmappable rows mean the plan
  is wrong — route the gap to extraction instead of hand-waving it.
- One call site fully worked as a before/after diff. Executors generalize far
  better from "call site 1 done precisely; apply the same transform to the
  other N" than from prose.
- Batch order: leaf components before their parents; the codebase compiles
  between batches.

**Token plans** are codemod specs:

- The mapping table from `nearest_token.mjs` output, split hard: **exact**
  rows are the codemod; **near** rows require human confirmation and are
  listed as a STOP-gated second phase, never merged with exact; **none** rows
  are excluded entirely (design review, not this plan).
- Done criterion includes re-running the script over the in-scope files →
  zero exact matches remain.

**Usage plans** are before/after correction specs per call site, with the
deprecated→replacement mapping quoted from the manifest inventory.

**Extraction plans** are **design/spike plans, never build-everything**:
the proposed TypeScript interface, anatomy/slots, states and keyboard map,
a11y contract, token usage, file manifest mined from one exemplar DS
component, story and test checklist, and open questions for the DS owner.
The deliverable is a reviewable RFC; building it is a later, separate plan.

---

## Index: `ds-plans/README.md`

```markdown
# DS Conformance Plans

Generated by ds-align on <date>. Execute in order unless dependencies say
otherwise. Executors: read the full plan, honor STOP conditions, update your row.

| Plan | Title | Priority | Effort | Depends on | Status |

Status: TODO | IN PROGRESS | DONE | BLOCKED (reason) | REJECTED (rationale)

## Dependency notes

## Findings considered and rejected
- <finding>: <one line>. (So nobody re-audits it.)
```

## Quality bar — check before finishing each plan

- Could a model that has never seen this repo execute this with only the plan
  file and the repo? Inline anything that fails that test.
- Every verification a command with expected output, not a judgment.
- Every step names exact files and symbols.
- STOP conditions specific to this plan's real risks, not boilerplate.
- Adoption plans: every used prop appears in the prop map. Token plans: no
  near/none rows inside the codemod phase.
- "Planned at" SHA filled; drift-check paths match the Scope section.
