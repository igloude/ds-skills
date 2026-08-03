# Plan 001: Fix issues found in the three-skill audit

- **Audited**: `skills/ds-doctor/**`, `skills/ds-plan/**`, `skills/ds-drift/**` (SKILL.md + all references + `nearest_token.mjs`), `examples/**`, `README.md`, plugin metadata
- **Planned at**: commit `8671e48`, 2026-08-02
- **Scope of this plan**: documentation and script fixes only — no change to the skills' report-only philosophy or file layout

Issues are grouped by consequence: **A** — things that will work improperly at runtime; **B** — ways real discrepancies slip past the skills (or false positives erode the gate); **C** — documentation inconsistencies. Each issue has a concrete fix; ordering within a group is by leverage.

---

## A. Will work improperly

### A1. `nearest_token.mjs` invocation path breaks in every audited repo

- **Where**: `skills/ds-drift/SKILL.md:48` — "run `scripts/nearest_token.mjs <tokens.json> <literals.txt>`"
- **Problem**: The path is relative to cwd, but the skill runs with cwd set to the *audited repo*, where `scripts/nearest_token.mjs` does not exist. The agent will either fail the command or — worse — silently skip mechanical classification and eyeball color distance, which the same sentence forbids.
- **Fix**: State that the script ships with the skill and must be invoked by its skill-directory path, e.g. "run `node <this skill's directory>/scripts/nearest_token.mjs …` — the script is part of this skill, not the audited repo." Mention the Node 18+ requirement here too (currently only in the README).

### A2. Waiver handling contradicts itself: suppressed at subagent level, but required in the output

- **Where**: `skills/ds-drift/SKILL.md:46` tells subagent prompts to include "the manifest's waiver ledger and severity digest (**so waived findings never surface**)". But Phase 3 (`SKILL.md:52`) says to "record the waiver id, exclude from verdict", the review template's header counts `waived N` (`references/review-template.md:26`), its **Waived** section says "listing them keeps the waiver honest and visible" (`review-template.md:55-60`), and `reconcile` audits "waivers whose matched locations no longer exist" (`references/closing-the-loop.md:22`).
- **Problem**: If subagents suppress waived findings, the Waived table is always empty, the `waived` count is always 0, and reconcile's waiver audit has no data. The two halves of the skill cannot both be followed.
- **Fix**: Make waiver application a vet-phase (Phase 3) responsibility. Subagents report all findings; the lead matches them against the ledger, tags matches `waived`, excludes them from the verdict, and lists them in the Waived table. Update `SKILL.md:46` to pass the ledger to subagents only so they can *annotate* likely waivers, not drop them.

### A3. ds-plan work items break across the repo boundary they're written for

- **Where**: `skills/ds-plan/references/work-item-template.md` — the executor works "in the **design system repo**" (line 5), but:
  - the **drift check** (`lines 22-25`) runs `git diff --stat <planned-at SHA>..HEAD` where the planned-at SHA is a commit of the *app repo* (ds-plan runs there) — invalid in the DS repo;
  - **Requested by** (`line 34`) points at `plans/NNN-map-<slug>.md`, a file in the app repo the DS-repo executor cannot read;
  - done criteria (`lines 117-123`) include "the requesting coverage map's Wave 0 row marked done" — an app-repo edit the executor can't make — and "`/ds-doctor manifest` re-run", which a cheap executor may not have available.
- **Fix**: Split the template's provenance into two stamps: the app-repo planning stamp (informational — repo, commit, map file) and a DS-repo drift anchor the planner records at write time (installed DS package version + the `file:line` excerpts, which are DS-repo paths already). Change the drift check to "compare the Current state excerpts against the DS repo's live code; on mismatch, STOP." Move the map-row update and manifest re-run out of the executor's done criteria into a "Hand back to the requester" section.

### A4. Writing `literals.txt` violates ds-drift's own Hard Rule 1

- **Where**: `skills/ds-drift/SKILL.md:48` ("write the deduplicated literals to a file") vs Hard Rule 1 (`SKILL.md:18`): "The only writes go under `plans/`".
- **Problem**: The workflow requires a write the rules forbid; an agent following the rules literally has no compliant place to put the file, and one following the workflow literally may drop `literals.txt` into the audited repo's working tree.
- **Fix**: Specify a temp/scratch location outside the repo for intermediate files, and add the carve-out to Hard Rule 1 ("…plus throwaway intermediates written outside the repo").

### A5. Batch mode has no sanctioned way to read the other branches

- **Where**: `skills/ds-drift/SKILL.md:43` (batch = "gate scope per ref") + Hard Rule 2 (no working-tree mutation).
- **Problem**: Auditing N refs naively means `git checkout` per ref — a working-tree mutation Rule 2 forbids. The skill never says how to read files at a ref without one.
- **Fix**: One sentence in the batch bullet: read refs without checkout via `git show <ref>:<path>`, `git diff <base>...<ref>`, and `git ls-tree`; never checkout or create worktrees.

### A6. `coverage` mode has a baseline with no storage

- **Where**: `skills/ds-drift/SKILL.md:67` — "per-package deltas **since the last sweep**".
- **Problem**: No template or index section defines where a sweep records its metrics, so the next `coverage` run has nothing to diff against.
- **Fix**: Add a `## Coverage baselines` section to the `plans/README.md` index spec (in `references/plan-template.md` or `review-template.md`): date, commit, adoption rate, token compliance rate, per-package numbers — appended by `sweep` and `coverage` runs.

### A7. Manifest discovery step 3 requires knowing `<ds-package>` with no way to find it

- **Where**: `skills/ds-drift/SKILL.md:31`, `skills/ds-plan/SKILL.md:33`, `skills/ds-doctor/references/manifest-spec.md:103` — discovery ends at `node_modules/<ds-package>/ds/`.
- **Problem**: Nothing says how to identify the DS package. In a repo with several plausible candidates (a `@scope/ui` and a `@scope/icons`), the agent guesses.
- **Fix**: Add the mechanical rule to the manifest-spec's Consumption contract (and one line in both SKILL.md recon phases): glob `node_modules/{*,@*/*}/ds/MANIFEST.md`; exactly one hit is the manifest; multiple hits → report and ask (or take `--manifest`); zero → the no-manifest path.

### A8. Script robustness: silent misclassification paths in `nearest_token.mjs`

- **Where**: `skills/ds-drift/scripts/nearest_token.mjs`
- **Problems**:
  1. `--threshold` with a missing/garbled value yields `NaN` (`line 21`), which makes every non-exact literal classify as `none` — silently, which understates codemod-able drift.
  2. Named CSS colors (`white`, `red`, …) parse to `unparsed` — see B1; the script could resolve them.
  3. Dedup is case-sensitive on the raw line (`line 95-97`): `#FFF` and `#fff` are processed as two literals.
  4. Negative hues (`hsl(-30, …)`) fail the `[\d.]+` regex → `unparsed`.
- **Fix**: Validate the threshold (exit 1 with the usage line on NaN); add the CSS named-color table (a ~150-entry map is small and removes a whole slip-through class); dedupe on `trim().toLowerCase()`; allow `-?` in the hue.

---

## B. Discrepancies that slip past (or false positives that erode trust)

### B1. Named CSS colors are invisible to the token audit

- **Where**: `skills/ds-drift/references/audit-playbook.md:31` — the literal list is `#hex`, `rgb()`, `hsl()`, `oklch()`, `color-mix()`.
- **Problem**: `color: white`, `background: black`, `border-color: red` are among the most common hardcoded colors in generated code and match none of the listed patterns — they are never collected, so they never reach the script. Whole class of drift slips through.
- **Fix**: Add named colors to the literal list (excluding the already-listed semantic keywords), and have the script resolve them (A8.2).

### B2. The `unparsed` class exists in the script but not in the docs

- **Where**: script emits `exact | near | none | unparsed` (`nearest_token.mjs:10`); `audit-playbook.md:29,39` and the token-plan addendum (`plan-template.md:133-140`) discuss only exact/near/none.
- **Problem**: "Let the exact/near/none classes be the evidence" invites an agent to drop `unparsed` rows (oklch, color-mix, named colors) on the floor — precisely the literals that need a human eye.
- **Fix**: Document `unparsed` in both places: unparsed rows are findings pending manual resolution, reported under the token category with the raw literal; never silently omitted; excluded from codemod phases.

### B3. Non-color token drift is entirely out of scope, and nothing says so

- **Where**: `audit-playbook.md` category 2 is color-only; `manifest-spec.md`'s `tokens.json` is color-only by example; `nearest_token.mjs` is color-only by design.
- **Problem**: Hardcoded spacing (`padding: 13px`), font sizes, radii, z-indices, and shadows are classic token drift and are never audited. Because the scope limit is unstated, a "PASS" reads as full token conformance.
- **Fix (minimum)**: State the scope explicitly in `audit-playbook.md` category 2 ("this category audits color tokens; spacing/typography/radius/shadow drift is not audited — say so in the review's Not audited line") and in `readiness-playbook.md` category 2. **Fix (better, later)**: add non-color keys to `tokens.json` with a type prefix and an exact-match-only mode to the script.

### B4. Hallucinated-token check false-positives on app-local CSS custom properties

- **Where**: `audit-playbook.md:35` — "`var(--anything)` … that do not resolve against `ds/tokens.json`", and `:37` — "always blocking".
- **Problem**: Apps legitimately define their own custom properties (layout vars, component-local knobs). Checking every `var()` against the DS token file alone brands them all hallucinated-and-blocking. False blocking findings are the fastest way to get the gate bypassed (the skill's own stated failure mode).
- **Fix**: Tighten the definition: `token.hallucinated` requires the reference to (a) not resolve in `ds/tokens.json`, **and** (b) not be defined anywhere in the repo's own stylesheets/theme code, **and/or** (c) sit inside the DS's naming namespace (e.g. `--acme-*`/`--color-*` per the manifest). A resolvable app-local var is at most a `token.literal.*` finding on its *definition's* value. Update the example finding TOK-01's "Why blocking" wording to match (it currently checks only `ds/tokens.json`).

### B5. Theme-suffixed tokens produce theme-wrong remediation suggestions

- **Where**: `manifest-spec.md:93` (`@dark` entries matched independently — "which is correct") + script output.
- **Problem**: A literal used in a light-theme context can exact-match `color-text@dark`; a remediation that swaps in that token is wrong in a way the exact class actively hides.
- **Fix**: One vet-phase instruction in `audit-playbook.md` category 2: when the matched token carries a theme suffix, confirm the literal's context is that theme before writing the remediation; otherwise treat as `near`.

### B6. `introduced` vs `pre-existing` is never defined mechanically

- **Where**: `skills/ds-drift/SKILL.md:42` — "Tag every finding `introduced` (by this branch) or `pre-existing` (in touched files)".
- **Problem**: The whole verdict rests on this tag, and it's left to judgment. A branch touching one line of a 500-line file with old violations invites either blaming the branch for legacy debt or excusing new debt as legacy.
- **Fix**: Define it: a finding is `introduced` iff its evidence lines are added or modified in `git diff <merge-base>...HEAD` (deleted-affordance regressions count as introduced by the lines that removed them); everything else in touched files is `pre-existing`.

### B7. "Manifest exclusion" exists only in the examples — the spec has no exclusions zone

- **Where**: `examples/003-review-feat-billing-settings.md:16` and `examples/004-map-team-invitations.md:237` cite a "manifest exclusion" for `emails/**`; `manifest-spec.md` defines no such zone (waivers are the nearest thing, and they're `glob × class`, still audited and listed).
- **Problem**: The examples model a feature the manifest can't express. An agent generating a manifest will never emit exclusions; an agent reading the examples will expect them. Real repos genuinely need "don't audit these paths at all" (emails, generated code, vendored files).
- **Fix**: Add an `Exclusions` table to the hand-maintained policy zone in `manifest-spec.md` (glob + reason; excluded paths are skipped entirely and listed under "Not audited"), and reference it from `audit-playbook.md` and the review template's Not audited line. Alternatively, rewrite both examples to use waivers — but exclusions are the better primitive; waivers still burn audit time on paths nobody will ever conform.

### B8. Severity-defaults table gaps: introduced `a11y.parity-gap`, and `manifest.stale` doesn't fit the tagging model

- **Where**: `audit-playbook.md:91-109`.
- **Problems**: (1) Only `a11y.parity-gap (pre-existing)` has a default; a *standalone introduced* parity gap (new inaccessible UI with no DS equivalent, so not `adoption.duplicate`) has no defined severity. (2) `manifest.stale` (should-fix) is neither introduced nor pre-existing — if counted as introduced, every gate run against a stale manifest yields PASS WITH FINDINGS through no fault of the branch.
- **Fix**: Add `a11y.parity-gap (introduced)` → blocking-or-should-fix by user harm, stated. Reclassify `manifest.stale` as a scope-level condition: it lives in the review header (confidence degraded), never in the verdict counts.

### B9. Extraction candidates downgrade the verdict despite being "options, not violations"

- **Where**: `audit-playbook.md:64` ("Advisory in every mode … options for the DS owner, not violations") vs the verdict rule (`SKILL.md:58`): "should-fix or advisory only → PASS WITH FINDINGS".
- **Problem**: A clean branch containing one good extraction candidate gets PASS WITH FINDINGS — punished for containing praiseworthy code.
- **Fix**: Exclude `extraction.*` from verdict tiering: a branch whose only findings are extraction candidates is **PASS**, with the candidates listed in Advisory.

### B10. The map-corrections feedback loop has no owner

- **Where**: `coverage-map-template.md:117-122` (a drift finding against a Covered element "means this map was wrong; record it") and `:141-144` (Map corrections index section, STALE status) — but ds-drift's gate recon never looks for a coverage map, and `reconcile` (`closing-the-loop.md`) processes reviews, plans, and waivers only.
- **Problem**: The only feedback signal ds-plan has (its own words, `coverage-map-template.md:146`) is never written by anyone: ds-plan has finished by the time drift runs, and ds-drift was never told the maps exist.
- **Fix**: Two additions to ds-drift: (1) gate recon checks `plans/` for a coverage map covering the reviewed feature; findings against its Covered/Composable elements get a one-line "Map corrections" entry in the index; (2) `reconcile` gains a **Maps** subsection — mark maps STALE when the manifest stamp moved (pointing at `/ds-plan recheck`), and mark BUILT maps whose features merged.

### B11. Shared `plans/` numbering collides across parallel branches

- **Where**: every template — "one directory, one monotonic numbering sequence" (`review-template.md:11`, `plan-template.md:11`, `coverage-map-template.md:5`, both work-item/doc-fix templates).
- **Problem**: The flagship use case is N parallel agent branches. Two branches each writing `plans/004-…` collide on merge, and the index (recurrence tracking's substrate) merges dirty.
- **Fix**: Add a collision rule to the shared-index convention (state it once in the review template, reference elsewhere): number from the highest NNN visible on the default branch *plus* branch-local files; on merge conflict, the later-merged file renumbers and its index row moves with it. (Or: reviews take the branch name in the slug and numbering collisions are declared acceptable for review files, which never cross-reference each other.)

---

## C. Documentation issues

### C1. Stale ds-doctor version strings

`manifest-spec.md:20` and `examples/MANIFEST.example.md:9` say "by ds-doctor v0.1.0"; the skills are at 0.2.0. Genericize to `vX.Y.Z` in the spec so it can't rot again; bump the example.

### C2. Example review's Recurrence line is internally wrong

`examples/003-review-feat-billing-settings.md:66` — "Classes seen: `token.literal.exact` (x2) …" counts TOK-04's two *locations* as 2 while every other class counts *findings*, and omits TOK-03's `token.literal.near` entirely. Fix the example, and add one sentence to `review-template.md`'s Recurrence section defining the counting basis (findings, not locations — the graduation rule at `audit-playbook.md:113` counts reviews anyway).

### C3. Example review noise and category confusion

`examples/003:16` — "extraction ran, a11y ran, **upgrade** did not": `upgrade` is a mode, not a category; the Not audited line should name categories. `examples/003:31` — "Verify: `node scripts/check.mjs` not required — grep …" references a script that exists nowhere; delete the clause.

### C4. Example map's removal plan points at an RFC's build step

`examples/004:56` — the local adapter's removal plan is "plans/006 step 6 deletes it", but plans/006 is NEW-01's RFC, and Shape B explicitly "does not build it" (`work-item-template.md:192`). Point the removal at the future build plan ("the build plan that follows plans/006; its final step deletes the adapter") — this also models the right behavior for the Wave 2 "Removal plan" column.

### C5. Example map summary row diverges from template

`examples/004:31` — Net-new row says "**DS work** — blocks app work"; the template (`coverage-map-template.md:37`) says "DS **or app** work" (net-new items can be `owner: app`). Align the example.

### C6. README install section omits the plugin path

README badges advertise "Claude Code plugin" and `.claude-plugin/` exists, but Install shows only `npx skills add igloude/ds-skills`. Add the marketplace route (`/plugin marketplace add igloude/ds-skills`, then install `ds-skills`) so the badge's promise is documented.

### C7. README usage block omissions

Missing vs the SKILL.md variant lists: ds-doctor `tokens` and `quick|deep`; the `--manifest <path>` modifier (ds-plan and ds-drift). Add or consciously omit; today the README reads as the complete grammar.

### C8. The `gh issue create` carve-out is framed inconsistently across the three skills

ds-drift Hard Rule 2 carves `gh issue create` out of the *working-tree* rule (which it never violated — it's a network write, not a tree write); ds-doctor and ds-plan don't mention it in their rules at all despite having `--issues`. Harmonize: give all three the same sentence — "No writes outside `plans/` (+ manifest pair for ds-doctor); no working-tree mutations; the only external write is `gh issue create`, strictly behind `--issues`."

### C9. ds-doctor Rule 3 contradicts its own manifest write

`skills/ds-doctor/SKILL.md:20` — "Never run commands that mutate the working tree" sits two lines under Rule 1's manifest-pair write. Add "(other than the writes Rule 1 permits)" so a literal-minded run doesn't refuse to write the manifest.

### C10. Doc-fix plan template lacks the Git workflow section its sibling has

ds-drift's plan template tells the executor how to branch and commit (`plan-template.md:75-78`); ds-doctor's doc-fix template (`plan-template.md` in ds-doctor) has no equivalent, so doc-fix executors improvise. Copy the section (adjusted branch prefix, e.g. `ds-docs/NNN-<slug>`).

### C11. Zone-marker-less manifests have undefined regeneration behavior

`manifest-spec.md` defines conflict behavior ("stop and report") only for hand-zone collisions. A pre-existing manifest with *no* zone markers (hand-written before adopting ds-doctor) hits neither rule. Add: no markers → treat the whole file as hand-maintained; write nothing; report and propose the marker retrofit.

### C12. Semi-transparent literal guidance missing

`rgba(22,22,22,0.5)` ΔE-matches its opaque token at 0 and is downgraded to `near` only via `alphaMismatch`. One line in `audit-playbook.md` category 2: alpha-mismatch rows are design decisions (overlay/scrim usage), not codemod rows — treat like `none`, not `near`.

---

## Suggested execution order

1. **A1, A4, A8** — script + invocation fixes (one sitting; A8's named-color table also closes B1).
2. **A2, B8, B9, B6** — the verdict pipeline: waiver flow, severity table, extraction exclusion, introduced/pre-existing definition. These four make gate verdicts reproducible.
3. **B4, B5, B2, B3, B7** — token-category precision (false-positive tightening, unparsed/scope documentation, exclusions zone in the manifest spec).
4. **A3** — rewrite the work-item template's cross-repo provenance.
5. **A5, A6, A7, B10, B11** — mode plumbing (batch ref access, coverage baseline, package discovery, map corrections, numbering).
6. **C1–C12** — examples and README, last, so they're regenerated against the corrected specs rather than patched twice.

Items requiring a design decision before edit: **B7** (exclusions zone vs waiver rewrite — recommend exclusions zone), **B11** (renumber-on-merge vs branch-scoped review numbering — recommend renumber-on-merge), **B3** (document color-only scope now vs extend tokens.json — recommend document now, extend later).
