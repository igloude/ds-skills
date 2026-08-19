# Closing the Loop — reconcile, --issues

The reviewer's job doesn't end at the verdict. This file covers backlog upkeep (`reconcile`) and publishing (`--issues`). The founding rule survives unchanged: **ds-drift never edits source code.**

---

## `reconcile` — keep the record honest

Process what happened since the last session. Read `plans/README.md` (the shared reviews + plans index) and the manifest's waiver ledger, then:

**Reviews**
- For each review whose ref has merged: spot-check that blocking findings were actually resolved on the default branch (cheap checks only — grep for the old pattern, re-run the token script over the files). Mark the review `resolved` or `merged-with-findings` in the index. Don't delete review files — they're the record.
- Reviews for refs that were deleted or abandoned: mark `retired`.

**Plans**
- **DONE** — spot-check the done criteria still hold at current HEAD; mark verified.
- **BLOCKED** — investigate the obstacle; rewrite the plan around it (new number if the approach changed fundamentally) or mark REJECTED with one line.
- **TODO** — run the drift check. If drifted, re-verify the finding still exists (it may have been fixed in passing), refresh the current-state excerpts and `Planned at` SHA. If gone, REJECTED ("fixed independently").
- **IN PROGRESS** (stale) — flag to the user; an executor likely died mid-run.

**Coverage maps** (if `plans/` contains ds-plan maps)
- Manifest stamp moved since a map was planned → mark the map STALE in the index and point at `/ds-plan recheck`.
- Maps whose feature branches merged → mark BUILT; spot-check that gate reviews of those branches recorded any due "Map corrections" rows.

**Waivers and exclusions**
- Expired waivers, waivers with no owner, and waivers whose matched locations no longer exist are each a finding for the next review or sweep. A waiver ledger nobody audits becomes a hole in the gate.
- The same pass runs over the exclusions table: expired exclusions (their paths are auditable again — say so), exclusions with no owner, and exclusions whose globs match nothing anymore. Exclusions need this audit even more than waivers do: excluded paths are never scanned, so by construction nobody else will ever notice a stale one.

**Recurrence**
- Recompute class counts from the review log. Any class at 3+ reviews without a lint-rule plan gets one proposed now — this is the skill automating itself out of a violation class, and it is the highest-leverage output reconcile produces.

Finish with a short report: verified, refreshed, retired, rejected, and what's actionable right now.

---

## `--issues` — publish where work gets picked up

The flag is the user's authorization — never create issues without it. This is the only step in the skill that sends anything off the machine, and issues are hard to unpublish: an issue is visible the moment it is created, and deleting one later does not un-notify the watchers, un-index it, or clear it from anyone's inbox. Run the sequence in order and do not compress it.

1. **Preflight, read-only.** Confirm both, and if either fails, write the files as normal and say plainly why issues were skipped:

   ```sh
   gh auth status                  # authenticated, and as whom
   gh repo view --json nameWithOwner,visibility   # the exact repo about to receive issues
   ```

   Report the account and `nameWithOwner` back to the user. Publishing to the wrong remote is the failure mode this catches, and it is silent otherwise.

2. **Visibility gate.** If the repo is **public**, say so explicitly and get confirmation before publishing anything that describes internal architecture, an unpatched weakness, or a security-adjacent finding. Reviews quote source and name file paths; that is exactly the content a public issue tracker makes permanent.

3. **Show the work before it leaves.** List every title about to be created, with the count and the target repo, and get an explicit go-ahead. Ask every time — never treat a prior `--issues` run, or a non-interactive session, as standing consent for this one.

4. **Create, one at a time.** Per plan:

   ```sh
   gh issue create --title "<plan title>" --body-file <plan file>
   ```

   Per review (gate mode): one issue per **blocking** finding, body = the finding plus its remediation spec, so each is independently assignable. Use `--body-file` rather than an inline `--body` — the file is what the user reviewed, and it keeps the shell out of the content. Labels: `ds-drift` plus the class, applied only if they already exist or can be created without erroring; skip labels rather than fail the publish.

5. **Record each URL** in the plan's Status block or the review's finding, and in the index, so the next run knows what was already filed and doesn't duplicate it.

The file remains the source of truth; the issue is distribution. Self-containment is what makes the issue body work unedited.

---

## `execute` — reserved

Not implemented; this skill ships report-only by design. When dispatch-and-review is wanted, it lands here as: spawn one executor subagent in an isolated git worktree with the full plan inlined, review its diff like a tech lead (re-run every done criterion, scope compliance via `git diff --stat` against the in-scope list, read the diff against intent, audit the new tests for meaningful assertions), verdict APPROVE / REVISE (max 2 rounds) / BLOCK. Merging stays the user's. Nothing in the current grammar or file layout changes when this is added — that's why the verb is reserved.
