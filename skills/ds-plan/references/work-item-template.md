# DS Work-Item Template

Extension and Net-new items the user promotes become standalone plans. This template is a sibling of ds-drift's plan template, duplicated here rather than shared — skills are self-contained at their boundaries, and a reference into another skill's folder is a broken reference.

The executor is a DS maintainer or a cheaper model working in the **design system repo**, with zero context: it has not seen the feature, the design, or the coverage map. It knows the DS well and the consuming app not at all — so inline the demand-side evidence, and never assume the reader agrees the change is needed.

Two shapes below. **Extension** items change an existing component and their risk is entirely in the blast radius. **Net-new** items are design/spike RFCs — the deliverable is a reviewed contract, not a shipped component; building it is a later, separate plan. Do not merge the two shapes: an extension that quietly becomes a rewrite has lost its blast-radius argument.

File naming: `plans/NNN-<slug>.md`, sharing the numbering and index with coverage maps, reviews, and plans. Number in build order — Wave 0 items first.

---

## Shape A — Extension

```markdown
# Plan NNN: <Imperative title — "Add tone=critical to Banner">

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If any
> STOP condition occurs, stop and report — do not improvise. When done, report
> completion back to the requester (this plan's index lives in the requesting
> app repo, not here).
>
> **Drift check (run first)**: this plan was written from the *consuming app
> repo* — its commit SHAs are not valid in this repo. Instead, compare every
> "Current state" excerpt below against this repo's live code at its cited
> `file:line`; on any mismatch, STOP.

## Status

- **Priority**: P1 (blocks app work) | P2 | P3
- **Effort**: S | M | L   ·   **Risk**: LOW | MED | HIGH
- **Class**: `ds.extension.variant` | `ds.extension.prop`
- **Delta class**: additive | behavior-changing
- **Repo**: design system
- **Requested by**: <feature name>, elements <ids> — coverage map `plans/NNN-map-<slug>.md`
  in the requesting app repo (not readable from this repo; the demand evidence is inlined below)
- **Depends on**: plans/NNN-*.md (or "none")
- **Planned at**: <YYYY-MM-DD>, against `@scope/ds@<installed version>` (app-repo commit
  `<short SHA>` — informational only; not a valid ref in this repo)
- **Issue**: <URL — only when published via --issues>

## Why this matters

2–5 sentences: which feature needs it, what that feature does without it (the
honest answer is usually "hand-rolls a variant, which the gate then blocks"),
and the second use case that makes this general rather than bespoke. If the
second use case is hypothetical, say so — a maintainer is entitled to decline.

## Current state

From your own reads, never a subagent's report:

- The component's file, its prop types excerpted with `file:line`.
- The existing variants and how they are implemented (a map object, a cva
  config, a switch — the executor must match the existing mechanism, not
  introduce a second one).
- The tokens the neighboring variants use, quoted from `ds/tokens.json`.
- The stories and tests that already exist for it, with paths.
- The docs page that will need the new row, with the exemplar to match.

## The delta

```diff
  type BannerProps = {
    variant: 'info' | 'success'
+   /** Renders the destructive treatment. Default unchanged. */
+   tone?: 'neutral' | 'critical'
  }
```

- **Default behavior**: unchanged for every existing call site — state this
  explicitly, or state exactly what changes and for whom.
- **Tokens it consumes**: named semantic tokens only. If the treatment needs a
  token that does not exist, that is a blocking dependency, not a literal —
  STOP and route it to `/ds-doctor`.

## Blast radius

- N call sites across M packages: <paths, or the ripgrep command that finds them
  and its count at planning time>.
- Variants currently in use: <list>.
- Owners to review: <from CODEOWNERS>.
- **Behavior-changing only**: the specific call sites whose rendering changes,
  and the migration note the changelog needs.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Tests | `pnpm test -- Banner` | all pass |
| Stories | `pnpm build-storybook` | exit 0 |
| Visual regression | `<only if the repo has it>` | no unexpected diffs |

(Verified during recon, not guessed.)

## Scope

**In scope**: the component, its types, stories, tests, and docs page — listed explicitly.
**Out of scope**: every consuming app (this plan does not migrate call sites);
sibling components (a tone system across five components is a different plan —
if this one implies that, say so in Maintenance notes and stop).

## Steps

### Step 1: <imperative title>
Exact files and symbols; the target code shape where it is load-bearing.
**Verify**: `<command>` → <expected>

(Order so the package compiles between steps: types, implementation, stories,
tests, docs.)

## Test plan

The new variant's rendering test, a token assertion if the repo tests tokens,
and — for behavior-changing deltas — a regression test proving existing usage is
unaffected. Name the existing test file whose structure to match.

## Done criteria

- [ ] typecheck / lint / tests / stories exit 0
- [ ] The new API appears in the docs page and the component's story set
- [ ] No files outside the in-scope list modified (`git status`)

## Hand back to the requester

Not the executor's work — these live in other repos or need the skills. On merge,
the requester:
- re-runs `/ds-doctor manifest` in this DS repo so the inventory row reflects the new API;
- marks the coverage map's Wave 0 row done and updates this plan's row in the
  app repo's `plans/README.md`.

## STOP conditions

- Current-state excerpts don't match live code (drift).
- The treatment requires a token that doesn't exist.
- Implementing it cleanly requires changing shared internals other components use.
- The delta turns out to be behavior-changing when this plan says additive.

## Maintenance notes

Whether sibling components now need the same API for consistency (usually yes —
name them, do not build them), and what the next DS release note must say.
```

---

## Shape B — Net-new (design/spike RFC)

Same header, executor instructions, and status block, with `Class: ds.net-new.primitive | ds.net-new.composite`. The body differs, because the deliverable is a decision:

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

## Quality bar

- Could a DS maintainer who has never seen the feature evaluate this on its merits, and could a cheaper model execute Shape A from this file plus the repo?
- Is the demand-side evidence inlined — which elements, which feature, what happens without it?
- Extension: is every claim about blast radius a number with paths behind it, and is the additive/behavior-changing call explicit and correct?
- Net-new: is the a11y contract written, and is the API free of props no one asked for?
- Does the plan stop where it should — no call-site migrations in an extension, no implementation in an RFC?
- Every verification a command with expected output, not a judgment.
