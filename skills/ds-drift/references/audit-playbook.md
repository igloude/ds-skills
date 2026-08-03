# Audit Playbook

What to look for, per category. Each subagent (or direct audit pass) gets its section plus the **Finding format** and **Severity defaults** at the bottom.

A finding is only a finding with evidence. "Uses hardcoded colors in places" is not a finding; `SettingsPanel.tsx:41 uses #64748b where --color-text-muted resolves to the same value` is.

**AI work fails in signatures, not drift.** Human codebases decay gradually; generated code fails in recognizable patterns — the model's training prior beating the repo's context. Each category below names its signatures. When you see one, check for siblings: these failures arrive in clusters, one per generation session.

**The toolchain delta rule (Hard Rule 7) applies to every category**: before reporting, ask whether tsc, eslint, or an existing lint rule would catch this. If yes, it is not a finding.

---

## 1. Adoption — hand-rolled duplicates of existing DS components

The DS already solves this; the code solved it again.

- Local components whose names match the manifest inventory or its synonym map (Dialog↔Modal, Select↔Dropdown/Picker, Toast↔Snackbar, Tooltip↔Hint, Tabs↔TabBar, Menu↔ContextMenu, Input↔TextField).
- Raw semantic elements carrying heavy styling where a DS equivalent exists: `<button`, `<input`, `<select`, `<table`, `<a` with large className bundles or styled wrappers.
- ARIA fingerprints of complex widgets built by hand: `role="dialog"`, `role="tablist"`, `role="combobox"`, `role="menu"`, `aria-modal`, `aria-expanded` on non-DS elements.
- Hand-rolled interaction plumbing: `createPortal`, Escape handlers, click-outside hooks, focus-trap imports.
- Competing library imports doing a DS component's job: react-modal, react-select, downshift, headlessui, floating-ui used directly, one-off MUI/AntD.

**AI signatures**: the *confabulated parallel implementation* — a complete, polished, often well-accessibilized component built from scratch because the training prior was stronger than the repo context. It looks like good code; that is the trap. Also: shadcn-idiom components pasted wholesale (cn() helpers, cva variants) into a repo that uses neither.

Vet requirement before any adoption finding: open the DS component's types and map **every prop and behavior the candidate actually uses** onto them. If coverage is partial, the finding is a DS gap (route to extraction), not a swap.

## 2. Tokens — color values that bypass the token system

Run the mechanical classification first: dedupe literals, run `scripts/nearest_token.mjs`, and let the exact/near/none classes be the evidence.

- Literals: `#hex`, `rgb()/rgba()`, `hsl()/hsla()`, `oklch()`, `color-mix()`. (`transparent`, `currentColor`, `inherit` are semantics, not colors — skip.)
- Tailwind arbitrary values: `-[#...]`, `-[rgb(...)]`.
- Raw palette classes (`bg-blue-500`) — only if the manifest's palette policy forbids them; this policy changes hit counts by an order of magnitude, so never guess it.
- Inline style objects with color-ish keys, styled-components/emotion literals, SVG `fill`/`stroke` in checked-in assets and JSX, canvas fill/stroke styles.
- **Nonexistent token references**: `var(--anything)` and theme-object paths that do not resolve against `ds/tokens.json`. Check every reference, not just literals.

**AI signatures**: *hallucinated tokens* — `var(--color-brand-primary)` that has never existed in this repo (plausible name, no definition; mechanically checkable, always blocking); default-Tailwind palette bleed (slate/gray/blue-500 families) in semantic-token repos; shadcn CSS-variable idioms (`hsl(var(--primary))`) in repos with a different token architecture.

Distinguish in reporting: **exact** matches are codemod-ready; **near** (ΔE ≤ 10) need a human eye — occasionally deliberate; **none** is a design decision (new token or off-brand), never a codemod. Data-viz palettes are chart-token gaps, not UI-token violations. Shadows and gradients: report the embedded color, not the whole value.

## 3. Usage — DS components used against their own API

The component is right; the usage is wrong.

- Deprecated-but-still-working props and components (the manifest inventory marks them, with replacements).
- Override-fighting: `!important`, deep className surgery, or wrapper CSS that battles the component's own styles — usually means the intended variant exists and wasn't used, or the DS API has a gap (note which).
- Re-wrapping a DS component to change core behavior it already parameterizes.
- Wrong composition: skipping required subcomponents, misusing controlled/uncontrolled modes, ignoring the component's layout contract.

**AI signatures**: *plausible-but-deprecated API* — prop shapes from the training-data era of the library, valid-looking, sometimes still typed; *hallucinated props* that survive because of loose typing or prop spreading (these are bugs, not style — blocking); mixing API generations of the same component in one file.

## 4. A11y — parity gaps against what the DS provides free

Hand-rolled interactive UI missing what the DS equivalent ships by default: focus management, keyboard navigation, roles and names, announcements. Severity follows **user harm**, not effort.

- Interactive divs/spans without role, tabindex, or keyboard handlers where a DS component exists.
- Custom overlays without focus trap or return-focus; custom menus without arrow-key nav; icon buttons without accessible names.
- Regressions: a diff that *removes* a11y affordances a DS component was providing (swap-outs, prop deletions) — always blocking in gate mode.

Most a11y findings are adoption findings with sharper consequences; cross-reference rather than duplicate — one finding, both classes noted.

## 5. Extraction — what the DS should absorb next

**Advisory in every mode; presented separately in sweeps** (they are options for the DS owner, not violations). Grounding rule: every candidate cites evidence from this repo — a suggestion that fits any codebase is noise.

- Repeated patterns: the same UI built 2+ times; copy-paste lineage (long identical className runs are the highest-confidence signal — nobody writes the same twelve classes twice independently).
- Novel candidates: built once, but generic, self-contained, and encapsulating hard-won behavior (focus, keyboard, positioning). Hard-won a11y is the legitimate exception to the rule of three.
- **Batch-mode divergence**: the same component independently invented on N parallel branches. The strongest extraction evidence that exists, and only visible to the cross-set pass — report the variants, their diffs, and a unification sketch.

Score 0–2 on reuse, generality (no domain nouns), self-containment, centralization value, primitive-vs-composite. Domain composites stay in the app regardless of call-site count.

---

## Finding format

Every finding, from every category and every subagent, comes back in this shape:

```markdown
### [CAT-NN] Short imperative title

- **Evidence**: `path/file.tsx:123` — one sentence on what's there. (2–5 strongest locations; "and ~N similar sites" if widespread.)
- **Class**: machine key for recurrence tracking, e.g. `token.hallucinated`, `adoption.duplicate`, `usage.deprecated-prop`
- **Tag**: introduced | pre-existing   (gate/batch modes only)
- **Impact**: what this costs, concretely — not "inconsistent".
- **Severity**: blocking | should-fix | advisory — from the manifest's severity map, else the defaults below; name which.
- **Effort**: S (hours) / M (a day-ish) / L (multi-day), including tests.
- **Confidence**: HIGH (read it, certain) / MED (needs verification) / LOW (smell — reportable in deep sweeps only, as "investigate").
- **Fix sketch**: 1–3 sentences. Not the spec — just enough to judge effort honestly.
```

## Severity defaults

The manifest's severity map overrides this table; these are the fallbacks. Verdicts count `introduced` findings only.

| Class | Default | Why |
|---|---|---|
| `token.hallucinated` | blocking | References a token that doesn't exist — a bug wearing a token's name |
| `usage.hallucinated-prop` | blocking | Silently ignored props are bugs |
| `adoption.duplicate` (introduced) | blocking | New parallel implementation of an existing DS component |
| `a11y.regression` | blocking | The diff removes affordances users had |
| `token.literal.exact` / `.near` | should-fix | Mechanical / needs-a-look drift |
| `token.palette.raw` | per manifest policy | Default should-fix when policy is semantic-only |
| `usage.deprecated-prop` | should-fix | Works today, breaks on the announced timeline |
| `usage.override-fighting` | should-fix | Fragile now, broken on the next DS release |
| `a11y.parity-gap` (introduced) | blocking | New hand-rolled UI shipping without focus/keyboard/name affordances harms users now; downgrade to should-fix only when the gap is cosmetic (e.g. missing hint text), and say so |
| `a11y.parity-gap` (pre-existing) | should-fix | Real harm, but not this branch's doing |
| `token.literal.none` | should-fix | Escalates to design review, never a codemod |
| `usage.wrong-variant` | advisory | Judgment call territory |
| `extraction.*` | advisory | Options, not violations — excluded from verdict tiering; extraction candidates alone never downgrade a PASS |
| `manifest.stale` | header note — never verdict-counted | Scope-level condition, not the branch's doing: it degrades confidence in the review header and is neither `introduced` nor `pre-existing` |

## Recurrence → automation

The review index logs the classes seen per run. When a class appears in **three or more reviews**, the finding graduates: propose a plan to *write the lint rule* (or type tightening) that catches it mechanically. The expensive model's job is to progressively automate itself out of each violation class — flag the graduation in the next review or sweep.

## Ordering

Gate/batch: by severity, then effort ascending — the reader fixes blockers first. Sweep: by leverage (impact ÷ effort, discounted by confidence and fix risk); verification-unblocking findings float; "not worth flagging" is a valid verdict, recorded with one line so it isn't re-audited.
