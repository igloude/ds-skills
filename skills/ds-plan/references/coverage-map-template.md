# Coverage Map Template

The coverage map is the skill's primary artifact and it has three readers, each of whom gets it as a cold read: a **generating agent** building the feature (it needs props it can transcribe), an **engineer or PM** sequencing the work (they need the waves), and a **DS maintainer** triaging what the feature exposed (they need the work items). Write for all three; each gets its own section rather than a compromise between them.

File naming: `plans/NNN-map-<slug>.md`; numbering, collision handling, and the shared index follow [conventions.md](../../ds-drift/references/conventions.md).

---

## Template

```markdown
# Coverage Map NNN: <Feature name>

> **For generating agents**: the Build section below is authoritative. Use the
> component, variant, and props exactly as written; they were verified against
> the design system's real types. If an element you need is not in this map, it
> was not planned — STOP and ask rather than inventing a component. Elements in
> "Blocked" are not ready to build; elements in "Not built" are deliberate
> refusals, not oversights.

## Header

- **Input**: <ticket URL / spec path / design file>, read <YYYY-MM-DD>
- **Manifest**: `<path>` — package `@scope/ds@4.2.0`, generated <date>
- **Installed DS version**: `4.2.0` (match | **MISMATCH — see confidence**)
- **Planned at**: commit `<short SHA>`, <YYYY-MM-DD>
- **Confidence**: HIGH | DEGRADED (<reason: no manifest / stale stamp / design read
  from an image / undocumented variants>) — every classification below inherits this.

## Summary

| Bucket | Count | Means |
|---|---|---|
| Covered | N | Build now, props below |
| Composable | N | Build now, sketch below |
| Extension | N | **DS work — blocks app work** |
| Net-new | N | **DS or app work — blocks app work** |
| Don't build | N | Routed back to design |

**Blocking DS work**: <one sentence naming the items in Wave 0, or "none — the
system covers this feature">. This is the only line most readers need today.

## Build sequence

### Wave 0 — DS repo (blocks Wave 2)
| Item | Component | Delta | Effort | Unblocks | Work item |
|---|---|---|---|---|---|
| EXT-01 | Banner | + `tone="critical"` | S | E-07, E-12 | plans/NNN-*.md |

### Wave 1 — app repo, start now
Every Covered and Composable element. Runs in parallel with Wave 0.
<element ids, grouped by surface>

### Wave 2 — app repo, blocked
| Element | Waits on | Interim strategy | Removal plan |
|---|---|---|---|
| E-07 | EXT-01 | Local adapter written to the proposed API | plans/NNN (deletes it) |

### Not built
<bucket 1 element ids, each with its sanctioned equivalent and who was asked to decide>

## Elements

One section per surface, in reading order. Every inventoried element appears
exactly once, in exactly one bucket, with its `drawn` / `implied` mark.

### Surface: <name>

#### E-01 — <element name>  ·  Covered  ·  drawn
- **Use**: `<Button variant="primary" size="md">` — source: ds
- **Props**: `variant="primary"` (the design's filled treatment) ·
  `size="md"` (32px height matches) · `loading` (bound to the submit mutation)
- **Verified**: `packages/ds/src/Button/Button.types.ts:14-31`; manifest inventory row `Button`
- **Tokens**: inherited from the component; no direct color use
- **Not covered by this**: the design's 20px icon; the component ships 16px. Accepted.

#### E-02 — <element name>  ·  Composable  ·  implied (empty state)
- **Compose**: EmptyState hosting an inline Button action
- **Sketch**: <tsx block, per the playbook>
- **Verified**: <file:line per constituent>
- **Owns what**: EmptyState owns the heading semantics; the Button owns focus.

#### E-07 — <element name>  ·  Extension  ·  drawn
<the bucket 4 block from the playbook, plus its work-item block>

#### E-11 — <element name>  ·  Don't build  ·  drawn
<the bucket 1 block from the playbook>

## Work items

The Extension and Net-new entries, collected — this is the section a DS
maintainer reads, and the section `/ds-plan backlog` aggregates across features.
Ordered by blocking count, then effort ascending. Each carries the work-item
block from the playbook. Items promoted to full plans link to their file; the
rest stay here as the backlog.

## Token and manifest requests

Gaps that are neither components nor code: missing semantic tokens, inventory
rows the design proved wrong, undocumented variants discovered while reading
types, policy the system needs but doesn't have. Route to `/ds-doctor` — one
line each, with what the design needed and what exists today.

## Not classified

Elements the input describes too vaguely to place, plus anything outside the
DS's stated scope (charting, third-party embeds, marketing surfaces under a
waiver). For each: what it is, why it stayed unclassified, and what would
resolve it. Absence of this section reads as complete coverage — include it,
or state "none" explicitly.

## Assumptions and open questions

What you inferred rather than read — especially from images — and the questions
whose answers would change a classification. Name the decision owner for each.

## Verification

After the feature lands, `/ds-drift` on the branch should return **PASS** for
every element marked Covered or Composable here. A conformance finding against
one of those elements means this map was wrong; record it in the index so the
next map doesn't repeat the error.
```

---

## Index: `plans/README.md`

Coverage maps get their own section in the shared index, alongside the reviews log and plans table:

```markdown
## Coverage maps

Generated by ds-plan. Read the map before building the feature; agents building
from a map should be given the file, not a summary of it.

| Map | Feature | Covered | Composable | Ext | New | Blocking DS work | Status |

Status: PLANNED | IN BUILD | BUILT | STALE (DS moved — run `/ds-plan recheck`)

## Map corrections
- <map id> · <element id>: classified Covered, ds-drift found <class>. <One line
  on the cause — usually a prop that didn't cover.> (So the error isn't repeated.)
```

The corrections log is small and worth keeping honestly: it is the only feedback signal this skill has, and every entry names a specific way the classification bar slipped.

## Quality bar — check before finishing a map

- Does the map survive a cold read — could a generating agent build the whole feature from this file plus the repo, without inventing a component or guessing a prop?
- Does every element in the Phase A inventory appear exactly once? Count them.
- Does every Covered and Composable row cite `file:line` for a type it actually names?
- Is every Extension's blast radius a count with paths, not an adjective?
- Does every Wave 2 element have an interim strategy, and every local adapter a removal plan?
- Does every Don't build quote a real policy source?
- Are "Not classified" and the confidence line filled in, even when the answer is "none" and "HIGH"?
