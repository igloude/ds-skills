# Classification Playbook

How to decompose a feature and put every element in exactly one bucket. Each subagent (or direct pass) gets the element inventory, the bucket it is testing, and **Evidence requirements** plus **Work-item format** at the bottom.

A classification is only a classification with evidence. "Button probably works here" is not a classification; "`Button variant=danger size=sm`, props verified at `packages/ds/src/Button/Button.types.ts:14-31`" is.

**The input under-specifies; that is normal.** Tickets and designs describe the state the author was thinking about. Every classification error that costs real money comes from an element nobody wrote down — the loading state that needed a skeleton the DS doesn't have, the error banner that needed a variant that doesn't exist. Enumerate before you classify.

---

## Phase A — Element inventory

Walk the feature and list every element. Mark each `drawn` (present in the input) or `implied` (you added it) — the distinction is what lets a designer audit your additions rather than absorb them silently.

**Per surface**: layout container, navigation and breadcrumbs, headings and their hierarchy, body content, media, data display (tables, lists, cards), forms and every field type, actions (primary, secondary, destructive), feedback (inline validation, toasts, banners), overlays (dialogs, drawers, popovers, tooltips), and any chrome the screen inherits from its shell.

**Per element, the states designs skip** — walk this list explicitly in `deep`, sample it in `quick`:

| Axis | What to ask |
|---|---|
| Empty | First-run, filtered-to-nothing, and permanently-empty are three different designs. Which does this need? |
| Loading | Skeleton, spinner, or optimistic? Does the DS ship the one implied? |
| Error | Field-level, form-level, and page-level are different components. Which appear? |
| Permission | What does a read-only or unentitled user see — hidden, disabled, or explained? |
| Content extremes | Longest realistic string, zero items, 10,000 items, RTL, a locale that doubles the string length. |
| Interaction | Hover, focus-visible, active, disabled, and the keyboard path through the whole surface. |
| Theme | Every theme the manifest lists. An element that only works in light is an element that isn't covered. |
| Viewport | The breakpoints the repo actually defines. Does the element change component at any of them? |
| Motion | Any transition, and its `prefers-reduced-motion` behavior. |

**Also inventory the non-visual contracts** the DS owns: focus order across the surface, what gets announced on async completion, and where focus returns after an overlay closes. These are elements too, and they are the ones most often reinvented badly.

---

## Phase B — The policy screen (bucket 1 first)

Before the ladder, test every element against what the system has explicitly rejected. This ordering is the whole reason the screen exists: an element the DS deliberately refuses looks exactly like a reasonable Extension, and running the ladder first generates DS work for something the DS already declined.

Sources, in order of authority: the manifest's policy zone, a deprecation record naming a replacement, a documented guideline or ADR, a component's own docs saying "do not use this for X." Signals worth screening for: patterns with a named sanctioned alternative (a nested modal where the system mandates a drawer or a route; a custom select where the system mandates the native one; a bespoke tooltip carrying interactive content), deprecated components the design reproduces by name, and anything the palette or motion policy forbids outright.

**Hard Rule 3 governs here.** No quotable source means this is not bucket 1. Classify the element on the ladder and attach the concern as an advisory note — "the system has no policy on this, but it is the third feature to ask for it" is useful; a fabricated prohibition is not.

### Bucket 1 — Don't build

```
- **Element**: <name>, <drawn|implied>
- **Rejected because**: <quoted policy or deprecation record, with its source path>
- **Sanctioned equivalent**: <component + variant, or the interaction pattern to use instead>
- **What the design loses**: honest, one sentence — the equivalent is rarely identical.
- **Route to**: <who decides — usually the design owner, not the engineer reading this>
```

Push back once, precisely, and route it. If the design owner overrules the policy, that is a policy change and it belongs in the manifest — say so rather than re-litigating.

---

## Phase C — The ladder

Take the cheapest correct rung. Never classify down the ladder to avoid work, and never up it to manufacture DS work; both are visible in review and both destroy the map's credibility.

### Bucket 2 — Covered

One component, one variant, exact props. This is the rung that generating agents transcribe, so it carries the strictest evidence bar.

**Evidence required**: the manifest inventory row *and* the component's real prop types at `file:line`. Every prop you name appears in those types. Every behavior the element needs maps onto a prop, a documented default, or a slot.

**Source** is `ds` or `local` — a local composite that already solves the element counts, and missing it means the team builds it twice. Local answers carry an extra line: whether the composite is a good extraction candidate, which is intelligence `/ds-drift extraction` should get for free.

```
- **Element**: <name>, <drawn|implied>
- **Use**: `<Component variant="x" size="y">` — source: ds | local `<path>`
- **Props**: every prop with its value and why: `tone="critical"` (the design's red banner)
- **Verified**: `packages/ds/src/X/X.types.ts:14-31`, manifest inventory row `X`
- **Tokens**: the semantic tokens this uses, if the element specifies color/spacing directly
- **Not covered by this**: any deliberate difference from the design, one line each
```

The `Not covered by this` line is where honesty lives. "The design's icon is 20px, the component ships 16px" is either acceptable or it is an Extension — decide it here, in writing, rather than letting an implementer discover it.

**Failure mode — props don't cover.** The signature error of this skill. A component fits until you map every behavior onto its API, and then one doesn't fit: the design needs a third action slot, or a loading state the component has no prop for. One unmapped behavior means this is bucket 4, not bucket 2. Open the types; do not reason from the component's name.

### Bucket 3 — Composable

No single component, but two or more compose into it, and the composition is one the system supports.

**Evidence required**: each constituent verified as in bucket 2, plus a reason to believe the composition is sanctioned — a documented pattern, an existing call site in the DS's own examples, or slots explicitly designed for it. A composition that fights any constituent's API is override-fighting with extra steps; that is bucket 4.

```
- **Element**: <name>, <drawn|implied>
- **Compose**: <one sentence — Popover hosting a Menu, triggered by an IconButton>
- **Sketch**:
  ```tsx
  <Popover placement="bottom-end">
    <Popover.Trigger><IconButton icon={More} label="Row actions" /></Popover.Trigger>
    <Popover.Content><Menu>{/* items */}</Menu></Popover.Content>
  </Popover>
  ```
- **Verified**: one `file:line` per constituent
- **Pattern precedent**: <docs path or DS example call site>
- **Owns what**: which constituent owns focus, escape, and announcements — state it, because
  hand-composed overlays are exactly where a11y gets dropped
- **Repetition**: how many times this feature composes it. Three or more is an extraction
  candidate — note it, do not silently promote it to bucket 5.
```

The sketch is the deliverable. A generating agent given the sketch produces the composition; given prose it invents a new component.

### Bucket 4 — Extension

The right component exists; it needs a new variant or prop to cover this element. **This is DS-repo work and it blocks the app work that depends on it.**

**The generality test, before anything else.** Would a second, unrelated feature use this delta? Is it expressible without a noun from this feature's domain? Does it belong to the component's concept, or to this screen's? Fail any of these and it is not an extension — it is a domain composite that stays in the app, and it drops to bucket 3 or bucket 5 with `owner: app`. Domain composites belong to the app regardless of how many call sites they get.

**Blast radius is a count, not an adjective.** Establish it mechanically:

```sh
rg -l "\bComponentName\b" --glob '!**/node_modules/**' --glob '!**/dist/**'
rg -n "<ComponentName[^>]*" -o --glob '!**/node_modules/**' | head -50
```

Read a sample of the call sites — enough to know which variants and props are actually in use — and check CODEOWNERS for who reviews the change. Then classify the delta itself, which is what actually determines risk:

- **Additive** — a new optional prop or variant whose default preserves every existing rendering. Blast radius is review surface, not regression surface. Most extensions should be this shape; if yours isn't, ask why.
- **Behavior-changing** — a changed default, an altered rendering for an existing variant, a widened type that makes previously-invalid usage compile. Every consumer is now a test case, and this needs a migration note in the DS changelog.

```
- **Element**: <name>, <drawn|implied>
- **Component**: `<X>` — `packages/ds/src/X/X.tsx`
- **API delta**:
  ```diff
    type XProps = {
      variant: 'default' | 'muted'
  +   /** Renders the destructive treatment. Default unchanged. */
  +   tone?: 'neutral' | 'critical'
    }
  ```
- **Delta class**: additive | behavior-changing
- **Blast radius**: N call sites across M packages (`app/a`, `app/b`); variants in use: …;
  owners: <from CODEOWNERS>. For behavior-changing: which call sites change rendering.
- **Generality**: the second use case that justifies it, named concretely
- **Blocks**: which elements in this map cannot ship until this lands
- **Effort**: S | M | L, including stories, tests, and docs
- **Interim**: wait | local adapter | waiver — see the sequencing section
```

### Bucket 5 — Net-new

Nothing covers it. The deliverable is a **contract, not an implementation** — enough for a DS maintainer to review the shape before anyone builds it, and enough for an app engineer to know what they are waiting for.

Run the generality test again to set the owner: `owner: ds` for a generic primitive; `owner: app` for a domain composite that happens to be new. Getting this backwards is expensive in both directions — a domain composite in the DS is permanent maintenance for one consumer, and a generic primitive in the app is the duplicate `/ds-drift` will flag next quarter.

```
- **Element**: <name>, <drawn|implied>
- **Owner**: ds | app — with the generality test result in one line
- **Contract**:
  ```ts
  interface ThingProps {
    /* the minimum API the design requires, no speculative props */
  }
  ```
- **Anatomy**: named slots and their required/optional status
- **States**: the state matrix from Phase A that applies
- **Keyboard & a11y contract**: roles, names, focus behavior, what is announced.
  Non-negotiable — this is the part hand-rolls get wrong and the reason it belongs in the DS.
- **Tokens**: the semantic tokens it consumes. Any gap here is a token request, not an
  invented value — route it to `/ds-doctor`.
- **Prior art**: the closest existing component and why it doesn't stretch. If this section
  is hard to write, re-check bucket 3.
- **Open questions**: what the DS owner must decide before build
- **Blocks**: which elements in this map depend on it
- **Effort**: S | M | L
- **Interim**: wait | local adapter | waiver
```

Speculative props are the trap. Ship the API the design requires; a prop added "while we're in there" is permanent surface area bought with no evidence.

---

## Phase D — Sequencing

Buckets 4 and 5 block; buckets 2 and 3 do not. The sequence follows from that, and the useful insight is that most app work starts *today*, in parallel with the DS work — not after it.

- **Wave 0 — DS repo, blocking.** Every `owner: ds` extension and net-new item that something in Wave 2 depends on. Ordered by how many elements each unblocks, then by effort ascending.
- **Wave 1 — app repo, unblocked now.** Every Covered and Composable element. Runs in parallel with Wave 0; this is usually the bulk of the feature, and saying so out loud is what stops a team from blocking the whole feature on one missing variant.
- **Wave 2 — app repo, blocked.** Elements consuming Wave 0 output, each annotated with what it waits on.
- **Not built.** Bucket 1, with the routing note.

Every Wave 2 element carries an **interim strategy**, chosen explicitly rather than defaulted into:

| Strategy | Use when | Cost |
|---|---|---|
| Wait | The DS work is small or the feature can ship without the element | Schedule risk only |
| Local adapter | The element is needed now; a thin app-local wrapper is written *to the proposed DS API* so the swap is a one-line import change later | Requires a scheduled removal — name the plan that removes it, or it is permanent |
| Waiver | Ship non-conforming knowingly | A waiver row in the manifest with an owner and an expiry, per the manifest spec. Not a decision you make alone. |

An interim choice with no removal plan is how design systems acquire permanent duplicates. Say the removal step out loud, in the map.

---

## Work-item format

Bucket 4 and 5 entries carry the fields above *plus* this block, so they read the same as findings from the sibling skills and can be triaged in the same queue:

```markdown
### [EXT-NN] / [NEW-NN] Short imperative title

- **Class**: machine key — `ds.extension.variant`, `ds.extension.prop`,
  `ds.net-new.primitive`, `ds.net-new.composite`, `ds.policy.rejected`
- **Repo**: ds | app
- **Blocks**: <element ids in this map, and other features if a `backlog` run found them>
- **Effort**: S (hours) / M (a day-ish) / L (multi-day), including stories, tests, docs
- **Confidence**: HIGH (read the types, certain) / MED (needs a DS owner's read) /
  LOW (the design is ambiguous — say what would resolve it)
- **Priority**: P1 blocks app work · P2 improves it · P3 opportunistic
```

Priority here means schedule position, not importance: an item is P1 because something waits on it, which is a fact about the map rather than a judgment about the design system.

## Ordering and honesty

Order the map by surface, then by the reader's path through the screen — the map is read next to the design, so it should scan in the same order. Order the work items by blocking count, then effort ascending.

Two things to state explicitly every time, because their absence reads as coverage:

- **What you did not classify**, and why — an element the input describes too vaguely to place, a chart layer outside the DS's stated scope, a third-party embed the system doesn't govern.
- **Confidence in the manifest itself** — stale stamp, missing manifest, or an inventory with undocumented variants. Every classification inherits it.

"The system covers this feature entirely, no DS work required" is a complete and excellent result. Report it plainly when it's true.
