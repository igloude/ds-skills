# Review Template

The review's primary reader is **the agent that generated the work** — it will be re-prompted with this file and expected to fix everything blocking. The secondary reader is a human deciding whether to merge. Both get one document: self-contained, evidence-first, with remediation specs precise enough to apply without this session.

Three properties make a review actionable:

1. **Verdict first, reasons attached** — the decision is the headline; findings justify it.
2. **Remediation specs, not descriptions** — every blocking finding carries current-state excerpt, exact change, and a verification command with expected output. The fixer never judges whether it succeeded.
3. **Scope honesty** — what was audited, what wasn't, and what the toolchain already covers. A review that overclaims its coverage gets one bad merge before nobody trusts it.

File naming: `plans/NNN-review-<branch-or-pr-slug>.md`. Reviews and plans share `plans/` and one monotonic numbering sequence; the `-review-` slug is what tells them apart. Parallel branches can race the sequence: number from the highest NNN visible across the default branch *and* your own branch; if a merge still collides, the later-merged file renumbers and its index row moves with it.

---

## Template

```markdown
# Review NNN: <branch or PR ref>

## Verdict: NEEDS CHANGES | PASS WITH FINDINGS | PASS

<One sentence: why. e.g. "2 blocking findings introduced by this branch; both have specs below.">

- **Scope**: <ref> vs merge-base `<sha>` — N files changed, M importers pulled in
- **Manifest**: `ds/MANIFEST.md` @ <ds-package>@<version> (current | STALE vs installed <version> — confidence degraded)
- **Counts** (introduced): blocking N · should-fix N · advisory N · waived N
- **Pre-existing** (in touched files, not counted in verdict): N — see backlog section
- **Not audited**: <files/areas skipped and why; categories not run>
- **Toolchain note**: nothing below duplicates tsc/eslint output; N additional issues are already covered by the toolchain and omitted.

## Blocking (introduced)

### [CAT-NN] <imperative title>   `class.key`

**Evidence** — `path/file.tsx:41`:
    <short current-state excerpt, enough to confirm the right location>

**Why blocking**: <one line, citing the severity policy source — manifest or default>

**Remediation**:
- Change: <exact edit — old → new, with the DS component/token/prop named>
- Verify: `<command>` → <expected output>
- STOP if: <the one assumption that, if false, means don't improvise — report instead>

(Repeat per blocking finding. If a remediation is too large for an inline spec —
e.g. replacing a hand-rolled Dialog — write it as a plan (`plans/NNN-*.md`) and link it here.)

## Should fix (introduced)

Compact list: finding title, `class.key`, evidence location, one-line remediation, verify command.

## Advisory (introduced)

One line each. Extraction candidates land here in gate mode, with their evidence.

## Waived

| Waiver id | Class | Locations matched | Expires |
(From the manifest ledger. Waived findings never affect the verdict; listing them
keeps the waiver honest and visible.)

## Pre-existing backlog

Findings in touched files that predate this branch. Not this branch's burden;
recorded so sweeps can pick them up. Title, class, location, severity-if-introduced.

## Recurrence

Classes seen this review: `token.literal.exact` (x4), `usage.deprecated-prop` (x1).
(Counts are findings, not evidence locations; list every class that appeared,
including advisory ones.)
<If any class has now appeared in 3+ reviews per the index: "`class` has recurred
across N reviews — graduating to a lint-rule plan; see plans/ or next sweep.">
```

---

## Batch addendum

`batch` mode produces one review per ref using the template above, plus `plans/NNN-review-batch-<slug>.md`:

```markdown
# Batch Review NNN: <n> branches

## Verdicts

| Ref | Verdict | Blocking | Should-fix | Review |
|-----|---------|----------|------------|--------|

## Divergence

Patterns independently implemented on multiple branches — invisible to any
single review, and the strongest extraction evidence there is:

### <pattern name> — implemented on <refs>
- Variants: per-ref file + one line on how each differs
- Shared remediation: <which implementation wins and why, or the unification
  sketch if none should — this becomes an extraction candidate with a proposed
  interface>
- Interim: <what each branch should do *now* so they stop diverging further>

## Shared findings

Identical violations across refs (same class, same cause — usually the same
prompt): fix once, apply everywhere. Class, refs affected, single remediation spec.
```

## Index: `plans/README.md`

One index for the whole `plans/` directory, shared with plan files (the plan template owns the Plans section). Written on the first review, appended every run — this log is what makes recurrence detection and reconcile possible:

```markdown
## Reviews

| NNN | Ref | Date | Verdict | Blocking | Classes seen |
|-----|-----|------|---------|----------|--------------|

## Findings considered and rejected

- <finding>: <one line why — by-design, toolchain-covered, waived-by, replacement-gap>.
  (So the next run doesn't re-litigate it. Shared with plans — one list.)

## Coverage baselines

Appended by every sweep and coverage run; the deltas `coverage` reports are
computed against the previous row.

| Date | Commit | DS adoption | Token compliance | Per-package notes |
```

## Quality bar — check before finishing each review

- Could the generating agent fix every blocking finding with only this file and the repo? If any remediation needs session context, inline it.
- Is every verification a command with an expected result, not "make sure it matches the DS"?
- Does the verdict follow mechanically from the counts and the stated policy? A reader should be able to recompute it.
- Are pre-existing findings cleanly separated from introduced ones?
- Is anything in here something eslint/tsc already reports? Remove it.
- No secret values anywhere; locations and types only.
