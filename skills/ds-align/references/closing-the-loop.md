# Closing the Loop — reconcile, --issues

The reviewer's job doesn't end at the verdict. This file covers backlog upkeep (`reconcile`) and publishing (`--issues`). The founding rule survives unchanged: **ds-align never edits source code.**

---

## `reconcile` — keep the record honest

Process what happened since the last session. Read `ds-reviews/README.md`, `ds-plans/README.md`, and the manifest's waiver ledger, then:

**Reviews**
- For each review whose ref has merged: spot-check that blocking findings were actually resolved on the default branch (cheap checks only — grep for the old pattern, re-run the token script over the files). Mark the review `resolved` or `merged-with-findings` in the index. Don't delete review files — they're the record.
- Reviews for refs that were deleted or abandoned: mark `retired`.

**Plans**
- **DONE** — spot-check the done criteria still hold at current HEAD; mark verified.
- **BLOCKED** — investigate the obstacle; rewrite the plan around it (new number if the approach changed fundamentally) or mark REJECTED with one line.
- **TODO** — run the drift check. If drifted, re-verify the finding still exists (it may have been fixed in passing), refresh the current-state excerpts and `Planned at` SHA. If gone, REJECTED ("fixed independently").
- **IN PROGRESS** (stale) — flag to the user; an executor likely died mid-run.

**Waivers**
- Expired waivers, waivers with no owner, and waivers whose matched locations no longer exist are each a finding for the next review or sweep. A waiver ledger nobody audits becomes a hole in the gate.

**Recurrence**
- Recompute class counts from the review log. Any class at 3+ reviews without a lint-rule plan gets one proposed now — this is the skill automating itself out of a violation class, and it is the highest-leverage output reconcile produces.

Finish with a short report: verified, refreshed, retired, rejected, and what's actionable right now.

---

## `--issues` — publish where work gets picked up

The flag is the user's authorization — never create issues without it.

1. Preflight: `gh auth status` succeeds and the repo has a GitHub remote; otherwise write files as normal and say why issues were skipped.
2. Visibility: `gh repo view --json visibility`. If **public**, warn that issues are publicly visible and get explicit confirmation before publishing anything describing internal architecture or a security-adjacent finding.
3. Show the list of titles about to become issues; confirm once if interactive.
4. Per plan: `gh issue create --title "<plan title>" --body-file <plan file>`. Per review (gate mode): one issue per **blocking** finding, body = the finding plus its remediation spec, so each is independently assignable. Labels: `ds-align` plus the class — apply only if labels exist or can be created without erroring; skip labels rather than fail.
5. Record each URL in the plan's Status block or the review's finding, and in the index.

The file remains the source of truth; the issue is distribution. Self-containment is what makes the issue body work unedited.

---

## `execute` — reserved

Not implemented; this skill ships report-only by design. When dispatch-and-review is wanted, it lands here as: spawn one executor subagent in an isolated git worktree with the full plan inlined, review its diff like a tech lead (re-run every done criterion, scope compliance via `git diff --stat` against the in-scope list, read the diff against intent, audit the new tests for meaningful assertions), verdict APPROVE / REVISE (max 2 rounds) / BLOCK. Merging stays the user's. Nothing in the current grammar or file layout changes when this is added — that's why the verb is reserved.
