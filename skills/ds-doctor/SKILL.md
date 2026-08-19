---
name: ds-doctor
description: Audit whether a design system can be enforced, and generate its conformance manifest (ds/MANIFEST.md + ds/tokens.json).
disable-model-invocation: true
license: MIT
metadata:
  author: Ian Gloude
  version: "0.4.0"
---

# ds-doctor

Audit the design system as the subject — its contracts, tokens, guidelines, and machine surface — and produce the one artifact everything downstream reads: the conformance manifest. A conformance gate is only as precise as the standard it enforces: nobody can police "use the right component" against a DS that never says whether `Chip` or `Tag` is right, and an agent generating work can't follow guidelines that exist only in a maintainer's head.

This skill is **report-only** and every output must survive a **cold read** — both terms, the family rules they summarize, and the `plans/` directory conventions are defined in [../ds-drift/references/conventions.md](../ds-drift/references/conventions.md). Read it now; it is short and load-bearing.

## Skill rules

1. **This skill's writes are the manifest pair** — `ds/MANIFEST.md` + `ds/tokens.json` — **and plans under `plans/`**; documentation gaps become doc-fix plans, never edits (report-only applies to the DS's source and docs exactly as it does to app code).
2. **Regeneration rewrites `generated` zones and preserves `hand-maintained` zones verbatim.** The zone markers are defined in the manifest spec, one marker per section. On a conflict between a hand zone and regenerated content, stop and report which section conflicts; resolving it is the DS owner's call.

## Done means

A run is done when: the readiness summary names every category ready / partial / absent with a one-line reason; every finding cites `file:line` (or the precisely named absent file); the manifest pair, if written, validates against the spec — schema number stamped, generated zones complete, hand zones byte-identical to before; and each selected doc-fix plan survives a cold read. The quality check in Phase 4 confirms this before you finish.

## Workflow

### Phase 1 — Recon

**Read [references/manifest-spec.md](references/manifest-spec.md) first** — the manifest is the run's primary output, and knowing its exact shape (zones, header stamps, tokens.json schema) determines what the audit must collect. Then locate the subject: the DS package(s) and public entry points, prop types, docs (MDX, Storybook stories, doc sites in-repo), token sources (CSS custom properties, Tailwind config, theme objects, token packages), changelog/deprecation records, and any existing `ds/MANIFEST.md` — **read its hand-maintained zones first**; they are prior decisions, not audit targets. Record the exact commands that build docs/stories and typecheck the package; they become verification gates in doc-fix plans.

### Phase 2 — Audit

Audit against the categories in [references/readiness-playbook.md](references/readiness-playbook.md) — read it now: **component contracts, token layer, guidelines & policy, machine surface, deprecation hygiene**. The audit's organizing question is always: *could an agent that has never seen this codebase use — or police — this correctly from what's written down?* For large systems, fan out read-only subagents per category with the playbook path, the recon facts, a findings-only instruction, and a verbatim copy of family rules 3–5 (subagents inherit nothing).

### Phase 3 — Vet

Open every cited location yourself before it reaches the table. Expected failure classes: guidance that exists but lives somewhere unindexed (a finding about *discoverability*, not absence — say which); intentionally undocumented internals (not every export is public API — check the entry point); duplicates across subagents. Record rejections in the plans index.

### Phase 4 — Present, then write

Present, in order: the **readiness summary** (per category: ready / partial / absent, with the one-line reason), the vetted findings table ordered by leverage — where impact is measured in downstream effect: a gap that makes a whole category unenforceable outranks any single missing docstring — and a **manifest diff preview** (what regeneration will change, hand zones untouched). Then ask which findings become doc-fix plans; default suggestion, the top 3–5.

On confirmation: write the manifest pair per the spec and the selected plans per [references/plan-template.md](references/plan-template.md) into `plans/` with the shared index. Doc-fix plans are ideal cheap-executor work; write them that way. Before finishing, run the plan template's quality bar over each plan, re-check the manifest against the spec's zone and header requirements, and confirm every clause of **Done means** above.

State gaps plainly with evidence and downstream cost, credit what's already good, and prefer "this area is ready" over invented findings. The readiness summary should be quotable in a planning meeting.

## Invocation variants

- Bare invocation → full workflow above.
- `manifest` → the fast path: regenerate the manifest pair from current DS state, report only the blockers that make it incomplete (e.g. unresolvable token references), skip the full findings table. Run this after any DS release.
- `component <name>` → audit one component's contract in depth; useful before promoting an extraction candidate.
- `tokens` → token-layer category only.
- `quick` / `deep` → effort dial for the audit; `deep` reads every exported component, `quick` samples the highest-traffic ones (by import count in sibling apps, if visible).
- `--issues` → also publish selected plans as GitHub issues. Follow [../ds-drift/references/closing-the-loop.md](../ds-drift/references/closing-the-loop.md) — read it before creating anything.
