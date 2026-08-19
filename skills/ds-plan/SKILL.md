---
name: ds-plan
description: Classify a feature's UI against the design system before it is built — coverage map, build sequence, and DS work items.
disable-model-invocation: true
license: MIT
metadata:
  author: Ian Gloude
  version: "0.4.0"
---

# ds-plan

Decide what gets built, from what, before anything is built. Every violation a gate catches was really a decision made seconds earlier, when someone — increasingly a generating agent — picked a component and guessed at its props. This skill moves that decision upstream, makes it with the actual API in hand, and writes it down. The byproduct is free: the extensions and gaps a feature exposes are exactly the design system's next backlog, discovered by demand instead of by committee.

The output is falsifiable, which is the point: run `/ds-drift` on the branch that implements this map, and every element you marked **Covered** should pass. If it doesn't, either the map was wrong or the generator ignored it — both worth knowing.

This skill is **report-only** and every output must survive a **cold read** — both terms, the family rules they summarize, and the `plans/` directory conventions are defined in [../ds-drift/references/conventions.md](../ds-drift/references/conventions.md). Read it now; it is short and load-bearing.

## Skill rules

1. **Family rule 5 is this skill's center of gravity**: every Covered and Composable classification cites the manifest inventory row or the component's actual types at `file:line`, and names every prop it claims. Unverified means not Covered — classify it down the ladder and say why.
2. **A Don't-build verdict quotes its policy source** — the manifest's policy zone, a documented guideline, or a deprecation record. No citation, no verdict: classify the element on the ladder and record the concern as advisory. Pushing back on a designer is authority you spend, not authority you assume.
3. **Coverage maps carry a `-map-` slug** (`plans/NNN-map-<slug>.md`) so maps, reviews, and plans read apart in the shared directory.

## Done means

A run is done when: the map file exists and survives a cold read; every inventoried element appears exactly once, in exactly one bucket, marked `drawn` or `implied`; every Covered and Composable row cites `file:line` in real types; every Extension and Net-new item names what it blocks and an interim strategy; and "Not classified" and the confidence line are filled in — even when the answers are "none" and "HIGH". Phase 6 checks exactly this before you finish.

## Workflow

### Phase 1 — Recon

**Manifest first.** Same discovery as ds-drift: `--manifest <path>` → `ds/MANIFEST.md` + `ds/tokens.json` in the repo root → `node_modules/<ds-package>/ds/` (glob `node_modules/{*,@*/*}/ds/MANIFEST.md`). Manifests are per-package; multiple hits mean a monorepo consuming several DS packages — load each and classify every element against the inventory of the package that owns the candidate component, noting the package in the map. Read the component inventory, variants, synonym map, policy zone, deprecations, and waiver ledger — this is the entire basis for classification.

- **Stamp check**: compare the manifest's schema number, package version, and API hash against the installed package (the manifest spec defines all three; ds-drift's recon describes the same check). On any mismatch, say so in the map header — planning against a stale inventory produces extensions for variants that already shipped.
- **No manifest**: derive a working inventory from the DS package's public entry point and types, mark the map's confidence degraded, and recommend `/ds-doctor`. Every classification here is a guess proportional to the rulebook's quality.

Then read the input artifact in full — a file path, a pasted spec, `gh issue view <n>`, or an image (the Read tool renders designs; state plainly what you *saw* versus what you *inferred*). Finally the app repo: which DS version is installed, an exemplar feature directory showing how UI is composed here, and the local composites that already exist — a local component that already solves an element is a real answer, and missing it means the team builds it twice.

### Phase 2 — Element inventory

**Read [references/coverage-map-template.md](references/coverage-map-template.md) before inventorying, not before writing** — knowing the shape the map must land in changes what you collect. The skeleton you are filling:

> Self-enforcing header for generating agents → header facts (Input · Manifest status · Planned-at · Confidence) → **Summary** (bucket counts + the one-line "Blocking DS work" answer) → **Build sequence** (Wave 0 DS-repo blocking · Wave 1 app-repo now · Wave 2 app-repo blocked, each with an interim strategy · Not built) → **Elements**, one section per surface, every element in exactly one bucket → Work items → Token and manifest requests → Not classified → Assumptions and open questions → Verification.

Decompose the feature into UI elements, using the inventory checklist in [references/classification-playbook.md](references/classification-playbook.md) — read it now. This phase decides whether the map is worth anything: a design shows the happy path, at one breakpoint, in one theme, with three rows of realistic data. The extensions hide in everything it doesn't show — empty, loading, error, permission-denied, long content, dark theme, small viewport, keyboard-only. Enumerate those before classifying anything, and mark each element `drawn` or `implied` so the designer can see what you added on their behalf.

### Phase 3 — Classify

Apply the **policy screen first**, then the ladder — the order is load-bearing and explained in the playbook: an element the system deliberately rejects would otherwise classify as a perfectly reasonable Extension, and generate DS work for something the DS already said no to.

1. **Don't build** — the system rejects this pattern; name the sanctioned equivalent.
2. **Covered** — one component + variant + the exact props that get you there.
3. **Composable** — no single component, but a documented composition of two or more; emit the sketch.
4. **Extension** — a new variant or prop on an existing component. DS work, not app work: include the API delta and the blast radius.
5. **Net-new** — nothing covers it; stub a contract.

For features spanning several surfaces, fan out read-only subagents per surface. They inherit nothing, so each prompt carries: the playbook path with the sections to read, the manifest inventory and policy digest, the element list for that surface, a classify-only instruction, and a verbatim copy of family rules 3–5.

### Phase 4 — Vet

Open every cited type yourself before it reaches the map. The expected failure classes:

- **Props don't cover** — the signature false positive of this skill, and the inverse of ds-drift's: a component that plausibly fits until you map every behavior the element needs onto its actual API. One unmapped behavior means Extension, not Covered.
- **Missed composition** — Net-new asserted because no single component matched. Check the composition patterns in the DS docs before any element reaches bucket 5.
- **Extension that is really app work** — apply the generality test. A delta that only makes sense for this feature is a domain composite; it stays in the app.
- **Don't build asserted from taste** — no quotable policy, no verdict (Skill Rule 2).
- **Completeness** — every inventoried element appears in exactly one bucket. A map that quietly drops the awkward elements is worse than no map, because it reads as coverage.

### Phase 5 — Render

Write `plans/NNN-map-<slug>.md` per the coverage-map template. Present, in this order: the **bucket counts**, the **DS work that blocks app work** (the only thing anyone needs to act on today), and the **build sequence**. Then ask which Extension and Net-new items become full DS work items; default suggestion is everything in the blocking wave.

Selected items become `plans/NNN-<slug>.md` per [references/work-item-template.md](references/work-item-template.md), stamped with the current commit, plus the shared index. Items that are not selected still live in the map as advisory work items — that is the backlog, and it survives whether or not anyone acts on it today.

State coverage plainly with the props that prove it, prefer "the system covers this feature entirely" over manufacturing DS work, and say which elements you could not classify and why. The map's value is that a generating agent can follow it literally — every sentence that can't be followed literally is decoration.

### Phase 6 — Quality bar

Before finishing, run the coverage-map template's "Quality bar" checklist (and the work-item template's, for promoted items) against each file you wrote, and confirm every clause of **Done means** above. A run that skips this phase is not done.

## Invocation variants

- Bare invocation, or with a path / issue URL / pasted spec → full workflow above. With no input artifact, ask for one; there is nothing to plan against.
- `element <description>` → classify one element and stop. The fast path for "do we have something for this?" — no map file unless asked.
- `surface <name>` → restrict a large feature to one screen or flow.
- `quick` / `deep` → effort dial. `quick` classifies drawn elements only and says so; `deep` walks the full implied-state checklist per element and reads every candidate component's types.
- `backlog` → skip classification: aggregate the Extension and Net-new items across every existing coverage map in `plans/`, deduplicate by component, and rank by how many features each one blocks. The DS roadmap, derived from demand.
- `recheck <map-file>` → re-validate an existing map against the current manifest: extensions that shipped become Covered, deprecations that landed invalidate rows, stale stamps get flagged. Run after a DS release, before the feature starts.
- `--issues` → publish selected work items as GitHub issues, labeled per the manifest's contribution path (usually `ds-request`). Follow [../ds-drift/references/closing-the-loop.md](../ds-drift/references/closing-the-loop.md) — read it before creating anything.
- `--manifest <path>` → override manifest discovery.
