# DS Work-Item Template

Extension and Net-new items the user promotes become standalone plans. This is a delta on the family's one executor-plan skeleton, [../../ds-drift/references/plan-template.md](../../ds-drift/references/plan-template.md) — **read that file first**; everything not named below applies as written there. File naming and the shared index follow [conventions.md](../../ds-drift/references/conventions.md); number in build order, Wave 0 items first.

The executor is a DS maintainer or a cheaper model working in the **design system repo**. The plan must survive a cold read by a reader who knows the DS well and the consuming app not at all — so inline the demand-side evidence, and never assume the reader agrees the change is needed.

Two shapes. **Extension** (Shape A) changes an existing component; its risk is entirely in the blast radius. **Net-new** (Shape B) is a design/spike RFC — the deliverable is a reviewed contract, not a shipped component; building it is a later, separate plan. Do not merge the shapes: an extension that quietly becomes a rewrite has lost its blast-radius argument.

## Cross-repo deltas (both shapes)

These plans are written from the *consuming app repo* and executed in the *DS repo*, which changes two skeleton sections:

**Drift check** — app-repo commit SHAs are not valid refs in the DS repo. Replace the skeleton's `git diff` drift check with:

```markdown
> **Drift check (run first)**: this plan was written from the consuming app
> repo — its commit SHAs are not valid here. Instead, compare every "Current
> state" excerpt below against this repo's live code at its cited `file:line`;
> on any mismatch, STOP.
```

**Executor instructions / status updates** — the plan's index lives in the requesting app repo, not the DS repo. The executor reports completion back to the requester instead of updating `plans/README.md`.

**Status block** — adds, alongside the skeleton's fields:

```markdown
- **Class**: `ds.extension.variant` | `ds.extension.prop` | `ds.net-new.primitive` | `ds.net-new.composite`
- **Delta class** (Shape A): additive | behavior-changing
- **Repo**: design system
- **Requested by**: <feature name>, elements <ids> — coverage map `plans/NNN-map-<slug>.md`
  in the requesting app repo (not readable from this repo; demand evidence is inlined below)
- **Planned at**: <YYYY-MM-DD>, against `@scope/ds@<installed version>` (app-repo commit
  `<short SHA>` — informational only; not a valid ref in this repo)
```

---

## Shape A — Extension

The skeleton applies, plus:

**Why this matters** — which feature needs it, what that feature does without it (the honest answer is usually "hand-rolls a variant, which the gate then blocks"), and the second use case that makes this general rather than bespoke. If the second use case is hypothetical, say so — a maintainer is entitled to decline.

**Current state** — from your own reads: the component's prop types excerpted with `file:line`; how the existing variants are implemented (a map object, a cva config, a switch — the executor matches the existing mechanism, never introduces a second one); the tokens neighboring variants use, quoted from `ds/tokens.json`; existing stories, tests, and the docs page with the exemplar to match.

**The delta** — its own section:

```diff
  type BannerProps = {
    variant: 'info' | 'success'
+   /** Renders the destructive treatment. Default unchanged. */
+   tone?: 'neutral' | 'critical'
  }
```

- **Default behavior**: unchanged for every existing call site — state this explicitly, or state exactly what changes and for whom.
- **Tokens it consumes**: named semantic tokens only. A treatment needing a token that does not exist is a blocking dependency, not a literal — STOP and route it to `/ds-doctor`.

**Blast radius** — its own section: N call sites across M packages (paths, or the ripgrep command and its count at planning time); variants currently in use; owners from CODEOWNERS; for behavior-changing deltas, the specific call sites whose rendering changes and the migration note the changelog needs.

**Scope** — in: the component, its types, stories, tests, and docs page, listed explicitly. Out: every consuming app (this plan does not migrate call sites) and sibling components (a tone system across five components is a different plan — if this one implies that, say so in Maintenance notes and stop).

**Steps** — ordered so the package compiles between steps: types, implementation, stories, tests, docs.

**Test plan** — the new variant's rendering test, a token assertion if the repo tests tokens, and — behavior-changing only — a regression test proving existing usage is unaffected.

**Hand back to the requester** — replaces the skeleton's index-row step. On merge, the requester: re-runs `/ds-doctor manifest` in the DS repo so the inventory reflects the new API, and marks the coverage map's Wave 0 row done in the app repo's `plans/README.md`.

**STOP conditions** — the skeleton's, plus: the treatment requires a token that doesn't exist; implementing cleanly requires changing shared internals other components use; the delta turns out behavior-changing when this plan says additive.

---

## Shape B — Net-new (design/spike RFC)

Same header, cross-repo deltas, and status block. The body differs, because the deliverable is a decision:

```markdown
## The gap

What the feature needs, why no existing component stretches to it (name the
closest two and the specific reason each fails), and the generality test result
that put this in the DS rather than the app.

## Proposed contract

```ts
interface ThingProps {
  /* the minimum API the requesting design requires — no speculative props */
}
```

- **Anatomy**: named slots, required vs. optional, and what each may contain.
- **States**: the full matrix — empty, loading, error, disabled, and every theme
  the manifest lists.
- **Keyboard map**: every key and what it does, including focus entry and exit.
- **A11y contract**: roles, accessible names, what is announced and when, focus
  return on dismissal. This is the reason the component belongs in the DS at all;
  it is not an optional section.
- **Tokens**: the semantic tokens it consumes. Gaps are token requests routed to
  `/ds-doctor`, never literals.
- **Responsive behavior**: what changes at the repo's real breakpoints.

## File manifest

Mined from one exemplar DS component — list every file the new component needs
(source, types, stories, tests, docs, barrel export) with that exemplar's paths
alongside, so the executor copies a known-good structure.

## Open questions for the DS owner

The decisions this RFC cannot make alone: naming, whether it is a primitive or a
composite, whether it subsumes an existing component, and whether the app should
ship a local adapter in the meantime. Each with a recommendation and its reason.

## Interim answer for the requesting feature

What the app does until this lands — wait, local adapter written to this exact
proposed API, or a waiver. Name the plan that removes the adapter; an interim
with no removal step is a permanent duplicate.

## Done criteria

- [ ] The contract above is reviewed and approved or amended by the DS owner
- [ ] Open questions all have recorded answers
- [ ] A build plan is written (separate file) — **this plan does not build it**
- [ ] Outcome reported to the requester, who updates this plan's row in the app repo's `plans/README.md`
```

---

## Quality bar additions

The skeleton's quality bar applies, plus:

- Could a DS maintainer who has never seen the feature evaluate this on its merits — is the demand-side evidence inlined (which elements, which feature, what happens without it)?
- Extension: is every claim about blast radius a number with paths behind it, and is the additive/behavior-changing call explicit and correct?
- Net-new: is the a11y contract written, and is the API free of props no one asked for?
- Does the plan stop where it should — no call-site migrations in an extension, no implementation in an RFC?
