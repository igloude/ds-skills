# Doc-Fix Plan Template

A delta on the family's one executor-plan skeleton, [../../ds-drift/references/plan-template.md](../../ds-drift/references/plan-template.md) — **read that file first**; everything not named below (executor instructions, drift check, Why this matters, Current state, Commands, Scope, Steps with per-step Verify, Done criteria, STOP conditions, Maintenance notes, the quality bar) applies as written there. Documentation work is lower-risk and ideal for the cheapest executors; these plans should read that way.

File naming and the shared index follow [conventions.md](../../ds-drift/references/conventions.md).

## Deltas

**Status block** — replace `Category` and `Class` with:

```markdown
- **Category**: contracts | tokens | guidelines | machine-surface | deprecation
- **Downstream effect**: <which conformance class this unblocks or sharpens>
```

**Scope** — component source is always out of scope. A doc-fix plan never changes behavior; if correct docs would require a code change, that is a STOP condition, not an invitation.

**Steps** — for policy plans, the step includes the **drafted policy text itself**, so the executor is transcribing a decision, never making one. A policy plan whose decision is missing is incomplete: report, don't invent policy.

**Git workflow** — branch prefix `ds-docs/NNN-<slug>` (or the repo's evident convention).

**Commands** — the verification gates are the docs/stories builds (`pnpm build-docs`, `pnpm build-storybook`) and typecheck if the repo compiles doc snippets; there is no test-suite step. Verified during recon, not guessed.

**Done criteria** — in addition to builds exiting 0:

```markdown
- [ ] The gap is closed verbatim: <a grep or check proving the content exists>
- [ ] No source files modified (`git status` shows docs/policy paths only)
```

**Maintenance notes** — always state whether `/ds-doctor manifest` should be re-run after the plan lands (usually yes).

## Quality bar additions

- Policy plans carry the drafted decision text — the executor transcribes, never legislates.
- Zero component-source files in scope.
