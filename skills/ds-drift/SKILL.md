---
name: ds-drift
description: Review a branch, PR, or whole repo for design-system conformance. Report-only — verdicts, reviews, and remediation plans.
disable-model-invocation: true
license: MIT
metadata:
  author: Ian Gloude
  version: "0.4.0"
---

# ds-drift

Judge whether work — increasingly, work produced by other models — conforms to this repo's design system, render a verdict a team can trust, and specify every required change precisely enough that the generating agent or a cheaper executor applies it without you. The review is the product. A noisy gate is an ignored gate, so precision outranks recall everywhere in this skill.

This skill is **report-only** and every output must survive a **cold read** — both terms, the family rules they summarize, and the `plans/` directory conventions are defined in [references/conventions.md](references/conventions.md). Read it now; it is short and load-bearing.

## Skill rules

1. **Report the gap the toolchain can't see.** If tsc, eslint, or an existing lint rule would flag it, it is not a finding — it is noise that erodes the gate's authority.
2. **Severity comes from policy, not per-run invention.** Use the manifest's severity map (fall back to the playbook defaults) and honor its waiver ledger. Consistency between runs is what makes the verdict meaningful.
3. **Review files carry a `-review-` slug** (`plans/NNN-review-<slug>.md`) so reviews and plans read apart in the shared directory.

## Done means

A gate/batch run is done when: the review file exists and survives a cold read; every blocking finding carries a verify command with an expected result; every finding is tagged `introduced` or `pre-existing`; every element of the Phase 2 scope was audited or named under "Not audited"; and the verdict recomputes mechanically from the stated counts and policy. Phase 5 checks exactly this before you finish.

## Workflow

### Phase 1 — Recon (always)

**Manifest first.** The conformance manifest is both the rulebook and your recon cache. Locate it in this order: a `--manifest <path>` argument → `ds/MANIFEST.md` + `ds/tokens.json` in the repo root → `node_modules/<ds-package>/ds/` (design systems that publish their manifest; find packages by globbing `node_modules/{*,@*/*}/ds/MANIFEST.md`). Manifests are **per-package**: multiple hits are a monorepo consuming several DS packages, not an error — load each, judge every component and token against the manifest of the package that owns it (the package it is imported from, or whose token namespace it matches), and report per package. A component name claimed by two manifests is a conflict to report, never a guess. `--manifest` restricts a run to one. Read the severity policy, waiver ledger, exclusions table, component inventory, and synonym map — excluded paths are skipped entirely and listed under the review's "Not audited" line.

- **Stamp check**: three comparisons per manifest. (1) **Schema** — the header's `Manifest schema` number against what this skill reads (schema 1–2; see the manifest spec); an unknown schema → stop and report, don't parse by guesswork. (2) **Version** — the header's package stamp against the installed version. (3) **API hash** — the header's hash against a recompute over the installed package's `.d.ts` files, per the spec's recipe; a matching version with a mismatched hash means the package moved without a version bump, which is exactly the staleness a version compare misses. On any mismatch, record `manifest.stale` in the review header with a degraded-confidence note — a scope-level condition, never a verdict-counted finding — and do not silently proceed as if current.
- **No manifest**: derive a working inventory and token map from the DS package source or published types, say so in the report, and recommend running `/ds-doctor` — the gate's precision is bounded by the rulebook's quality.

Then the standard recon: exact build/typecheck/lint/test commands (these become verification gates in every remediation spec and plan), repo conventions with exemplar files, the default branch and merge-base for gate scoping, and which lint rules already exist (feeds Skill Rule 1). In gate mode, also check `plans/` for a ds-plan coverage map covering this branch's feature: a finding against an element the map marks Covered or Composable means the map was wrong — record a one-line "Map corrections" row in the index alongside the finding, so ds-plan's classification bar learns from it.

### Phase 2 — Audit

**Read [references/review-template.md](references/review-template.md) before auditing, not before writing** — knowing the shape the evidence must land in changes what you collect. The skeleton you are filling:

> **Verdict** + one-line why → header facts (Scope · Manifest status · Counts, introduced only · Pre-existing count · Not audited · Toolchain note) → **Blocking (introduced)**, each finding carrying Evidence at `file:line`, why-blocking with its policy source, and a remediation spec (Change / Verify → expected / STOP if) → Should fix → Advisory → Waived table → Pre-existing backlog → Recurrence counts.

Scope follows the mode:

- **Gate** (default): files changed since `git merge-base origin/<default> HEAD`, plus their direct importers. **Tag every finding `introduced` (by this branch) or `pre-existing` (in touched files)** — verdicts are rendered on `introduced` only; a gate that blames the branch for legacy debt gets bypassed. The tag is mechanical, not a judgment call: a finding is `introduced` iff its evidence lines are added or modified in `git diff <merge-base>...HEAD` (a regression counts as introduced via the lines that removed the affordance); everything else in touched files is `pre-existing`.
- **Batch**: gate scope per ref, plus one cross-set pass for divergence — the same pattern independently invented on multiple branches is invisible to any single-branch review and is exactly how parallel agents fork a design system. Read each ref in place — `git show <ref>:<path>`, `git diff <merge-base>...<ref>`, `git ls-tree` — checkouts and worktrees are working-tree mutations (family rule 2).
- **Sweep**: whole repo, effort dial applies — `quick` (hotspots, top findings), `standard`, `deep` (every package, LOW-confidence items included).

Audit against the categories in [references/audit-playbook.md](references/audit-playbook.md) — read it now: **adoption, tokens, usage, a11y, extraction**, each with the AI-generation failure signatures to watch for. For sweeps of any real size, fan out parallel read-only subagents per category. Subagents inherit nothing, so each prompt must include: the absolute path to the playbook plus the section headings to read (always including "Finding format"), the recon facts that scope the search, the manifest's waiver ledger and severity digest (so subagents can *annotate* findings that look waived — they still report them; matching and exclusion happen in Vet, never in a subagent), a findings-only instruction, and a verbatim copy of family rules 3–5.

For token findings, classify literals mechanically — don't eyeball color distance. Pipe the deduplicated literals into this skill's `scripts/nearest_token.mjs` (requires Node 18+), which reads its two inputs, writes nothing anywhere, and prints exact / near / none / unparsed with ΔE distances as JSON on stdout:

```sh
# Reads the token map and the literals below. Writes nothing; prints JSON to stdout.
node <this-skill-dir>/scripts/nearest_token.mjs ds/tokens.json - <<'LITERALS'
#64748b
rgb(15, 98, 254)
LITERALS
```

Three things make this trustworthy, and all three are your responsibility:

- **Use the absolute path to this skill's `scripts/` directory**, not a relative one — the audited repo's cwd has no such file, and a guessed path in a permission prompt reads as a script the user can't place.
- **Use the `-` (stdin) form.** It keeps the literals visible in the command the user approves, and it means no scratch file is written into the repo under audit (family rule 2). If the list is too long to inline, write the scratch file under the OS temp dir and say so.
- **Read the stderr summary before you use the results.** It reports the token count, the threshold in effect, and any token the script had to skip. A skipped token cannot be matched against, which silently turns a real exact match into a `none` — if the script warns, the token file is wrong and no `none` from that run is reportable.

The classes are the evidence. `unparsed` rows resolve manually — carry every one of them forward.

### Phase 3 — Vet

Subagents and greps over-report. Before anything reaches a verdict or table, open every cited location yourself and confirm it. Expect these failure classes: **by-design bespoke** (marketing pages, brand moments — flag as "possibly intentional" at most); **claimed replacement doesn't cover the used props** (open the DS component's actual types and map every used prop before asserting a swap — this domain's signature false positive); **already caught by toolchain** (drop, per Skill Rule 1); **waived** (apply the ledger here — match glob × class, record the waiver id, exclude from the verdict but list in the review's Waived table); mis-attributed evidence; duplicates. Record rejections in the output index so they aren't re-litigated next run.

### Phase 4 — Render

The modes diverge here:

- **Gate / batch** → write `plans/NNN-review-<slug>.md` per the review template. Render the verdict from introduced findings only: any blocking → **NEEDS CHANGES**; should-fix or advisory only → **PASS WITH FINDINGS**; none or waived-only → **PASS**. `extraction.*` findings are excluded from this tiering — they are options, not violations, so a branch whose only findings are extraction candidates is a **PASS** (candidates still listed under Advisory). Every blocking finding carries an inline remediation spec. No selection step — a gate that asks which violations to spec is not a gate.
- **Sweep** → present the vetted findings table ordered by leverage, with extraction candidates presented separately after it (they are options for the DS owner, not problems ranked against violations). Ask which findings become plans; do not write thirty plans nobody asked for. Selected findings become `plans/NNN-<slug>.md` per [references/plan-template.md](references/plan-template.md), stamped with the current commit, excerpts from your own reads only, plus the index.

State violations plainly with evidence, keep severity exactly where policy puts it, prefer "conforms — nothing to report" over padding, and say what was not audited.

### Phase 5 — Quality bar

Before finishing, run the review template's "Quality bar" checklist (or the plan template's, for sweep plans) against each file you wrote, and confirm every clause of **Done means** above. A run that skips this phase is not done.

## Invocation variants

- Bare invocation → gate the current branch. If on the default branch or zero commits ahead, say so and offer `sweep`.
- `batch <ref> <ref> ...` → gate each ref plus the cross-set divergence pass; one review file per ref plus a batch summary.
- `sweep` → full-repo audit with the selection step. `quick` / `deep` anywhere in the invocation set the effort dial; default `standard`.
- Category focus (`tokens`, `adoption`, `usage`, `a11y`, `extraction`) → restrict any mode to that category. Composes: `sweep tokens deep`.
- `coverage` → metrics only, no findings table, no plans: DS adoption rate, token compliance rate, per-package deltas since the last sweep. The drift dashboard between baselines. Baselines live in the index's "Coverage baselines" table — append a row each run; with no prior row, report absolutes and start the table.
- `upgrade <version|changelog>` → impact audit for a DS version bump: affected call sites per breaking change, codemod-able vs. needs-judgment split, ordered upgrade plan.
- `plan <finding-id|description>` → skip the audit; investigate just enough to spec one remediation properly and write a single plan.
- `review-plan <file>` → critique an existing plan or remediation spec against the template's standards and tighten it.
- `reconcile` → process what happened since last session: verify, refresh, retire. See [references/closing-the-loop.md](references/closing-the-loop.md).
- `--issues` (modifier) → also publish reviews/plans as GitHub issues, per closing-the-loop.
- `--manifest <path>` (modifier) → override manifest discovery.
- `execute` is **reserved and not implemented** — this skill ships report-only. The seam exists in closing-the-loop for when dispatch-and-review is wanted.
