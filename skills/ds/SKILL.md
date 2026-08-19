---
name: ds
description: Which design-system skill to reach for — routes between /ds-doctor, /ds-plan, and /ds-drift.
disable-model-invocation: true
license: MIT
metadata:
  author: Ian Gloude
  version: "0.4.0"
---

# ds — the router

Three sibling skills police design-system conformance. All are **report-only** — they write verdicts, maps, and plans, never code. This skill only routes; when the user's intent matches a row below, tell them the command (or invoke the named skill if they ask you to proceed).

```
/ds-doctor    →  audits the DS itself, writes ds/MANIFEST.md + ds/tokens.json
                  └→  everything below reads it

/ds-plan      →  classifies a feature's UI against the DS before it is built
                  ├→ Covered / Composable  →  exact props, to the generators
                  └→ Extension / Net-new   →  DS work items → the DS backlog

generators    →  N branches of AI work

/ds-drift     →  reviews finished code for DS conformance
                  ├→ reviews: verdicts + specs    →  back to the generators
                  └→ plans: self-contained specs  →  cheap executor, or --issues
```

## Reach for

- **`/ds-drift`** — the work exists and needs judging: gate a branch or PR, batch-review parallel agent branches, sweep a repo for token/adoption/a11y drift, audit a DS version upgrade, or `reconcile` the backlog.
- **`/ds-plan`** — the work doesn't exist yet: a ticket, spec, or design needs classifying against the DS, sequencing into DS-repo vs app-repo waves, or a quick "do we have something for this?" (`element`).
- **`/ds-doctor`** — the design system itself is the subject: is it enforceable, where are the doc/token/policy gaps, and generate or refresh the conformance manifest (run `manifest` after every DS release).

## The loop

1. In the DS repo: `/ds-doctor`, fix blockers, `/ds-doctor manifest`, publish `ds/` with the package.
2. Before a feature: `/ds-plan <ticket|design>` in the app repo; ship Wave 0 DS work, hand the map to the building agent.
3. After generation: `/ds-drift` on the branch (or `batch` across parallel branches); feed the review back to the generator.
4. Periodically: `/ds-drift sweep` for the baseline, `coverage` for the trendline, `reconcile` to keep the record honest.
