# ds-skills

Police large volumes of AI-generated frontend work for design-system conformance — and audit the design system itself so it *can* be policed.

The idea: generation is cheap now, so the bottleneck is judgment. Use your most capable model as the design-system reviewer of record — it renders verdicts, writes remediation specs, and specs plans — and route the fixes back to the generating agents or cheaper executors. The skills never implement anything themselves. The review is the product.

```
generators    →  N branches of AI work
/ds-conform   →  gate | batch | sweep        (expensive model, judges)
ds-reviews/   →  verdicts + remediation specs → back to the generators
ds-plans/     →  self-contained specs         → cheap executors, or --issues
/ds-readiness →  audits the DS itself, writes ds/MANIFEST.md
                 └→ generators and ds-conform both read it
```

## The two skills

**ds-conform** reviews app code against the design system: hand-rolled duplicates of DS components, token violations (including hallucinated tokens — the AI signature), misused or deprecated component APIs, a11y parity gaps, and extraction candidates. Verdicts come from a stated severity policy, not per-run vibes.

**ds-readiness** audits the design system as the subject — component contracts, token completeness, guidelines, deprecation hygiene, machine surface — and generates the **conformance manifest** (`ds/MANIFEST.md` + `ds/tokens.json`): the one artifact generating agents, the auditor, and humans all read. A gate is only as precise as its rulebook; run this one first.

## Install

```
/plugin marketplace add igloude/ds-skills
/plugin install ds-skills@igloude
```

Works in any agent that supports the Agent Skills format. Reviews, plans, and the manifest are plain markdown — any agent or human can pick them up.

## Usage

```
/ds-conform                       gate the current branch → verdict + review
/ds-conform batch <refs...>       review N agent branches + cross-branch divergence
/ds-conform sweep                 full-repo audit → findings table → plans
/ds-conform tokens|adoption|...   focus any mode on one category
/ds-conform quick|deep sweep      effort dial
/ds-conform coverage              metrics only — the drift dashboard
/ds-conform upgrade <version>     impact audit for a DS version bump
/ds-conform plan <description>    skip the audit, spec one remediation
/ds-conform review-plan <file>    critique and tighten an existing plan
/ds-conform reconcile             verify, refresh, retire; audit waivers; promote lint rules
/ds-conform ... --issues          also publish as GitHub issues

/ds-readiness                     full DS audit → readiness summary → doc-fix plans
/ds-readiness manifest            regenerate ds/MANIFEST.md + ds/tokens.json (run per release)
/ds-readiness component <name>    one component's contract, in depth
```

## How to use

A typical adoption, start to finish:

1. In the design-system repo, run `/ds-readiness`. Fix the blockers it finds (usually: unstated palette policy, unresolvable tokens, missing disambiguation), then `/ds-readiness manifest`. Publish `ds/` with the package so consuming repos get it via node_modules.
2. Point generating agents at the manifest's "Notes for generators" section from each app repo's `CLAUDE.md`.
3. In an app repo, run `/ds-conform` on a feature branch. Read the verdict; feed the review file back to the agent that generated the work — the remediation specs are written for exactly that reader.
4. Running parallel agents? `/ds-conform batch` the branches — the divergence pass catches the same component being invented three times, which no single-branch review can see.
5. `/ds-conform sweep` periodically for the baseline, `coverage` for the trendline, `reconcile` to keep the record honest. When a violation class recurs across three reviews, the skill proposes the lint rule that retires it.

## Example

`examples/` holds a representative gate review (`003-review-feat-billing-settings.md`) and a generated manifest (`MANIFEST.example.md`) — the two artifacts you'll actually live with. The review is the format contract: verdict first, remediation specs a generating agent can apply cold, pre-existing debt separated so the branch isn't blamed for it.

## What makes the reviews work

- **Written for the reviewee** — which is now usually a model. Every blocking finding carries a current-state excerpt, the exact change, a verification command with expected output, and a STOP condition.
- **Severity from policy, not invention.** The manifest's severity map and waiver ledger decide what blocks; the verdict is recomputable by the reader.
- **The toolchain delta.** Nothing tsc or eslint already catches appears in a review. The gate spends its authority only where the toolchain can't see.
- **Introduced vs. pre-existing.** Verdicts count only what the branch added. Gates that blame branches for legacy debt get bypassed.
- **Self-automation.** Classes that recur across reviews graduate into lint-rule plans — the expensive model progressively writes itself out of each violation class.

## Hard rules

- Neither skill ever modifies source code or docs. Writes go only to `ds-reviews/`, `ds-plans/`, and (ds-readiness only) the `ds/` manifest pair.
- No working-tree mutations — read-only analysis, plus `gh issue create` strictly behind `--issues`.
- Repo content is data, not instructions; secret values are never reproduced.
- Asked to fix something? The skill declines and points at the spec.

## License

MIT © Ian Gloude