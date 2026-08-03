> **Sample output.** A representative review produced by `/ds-drift` (gate
> mode) against a fictional app consuming `@acme/ui`, kept here as an example
> of the format. Paths and findings are illustrative — run the skill on your
> own repo instead.

# Review 003: feat/billing-settings

## Verdict: NEEDS CHANGES

2 blocking findings introduced by this branch; both have specs below.

- **Scope**: `feat/billing-settings` vs merge-base `9c41f2e` — 11 files changed, 4 importers pulled in
- **Manifest**: `node_modules/@acme/ui/ds/MANIFEST.md` @ @acme/ui@4.2.0 (current)
- **Counts** (introduced): blocking 2 · should-fix 3 · advisory 1 · waived 0
- **Pre-existing** (in touched files, not counted in verdict): 2 — see backlog
- **Not audited**: `apps/billing/emails/**` (manifest exclusion — inline styles load-bearing); extraction ran, a11y ran, upgrade did not
- **Toolchain note**: nothing below duplicates tsc/eslint output; 3 unused-import hits already covered by eslint and omitted.

## Blocking (introduced)

### [TOK-01] Replace hallucinated token `--acme-color-primary-dark`   `token.hallucinated`

**Evidence** — `apps/billing/src/SettingsPanel.tsx:47`:

    style={{ borderColor: 'var(--acme-color-primary-dark)' }}

**Why blocking**: the token is defined neither in `ds/tokens.json` nor anywhere in the repo's own styles — the border silently renders `currentColor` today (manifest severity map: `token.hallucinated` → blocking).

**Remediation**:
- Change: `var(--acme-color-primary-dark)` → `var(--color-border-interactive)` (resolves `#0353e9`, the evident intent per the adjacent `--color-interactive` usage on line 44)
- Verify: `node scripts/check.mjs` not required — `grep -rn "acme-color-primary-dark" apps/billing/src/` → no matches; `pnpm typecheck` → exit 0
- STOP if: the intended color was genuinely the darker brand shade — no such semantic token exists; that is a `ds-request` issue, not an inline literal.

### [ADO-02] Replace hand-rolled confirmation dialog with `Dialog`   `adoption.duplicate`

**Evidence** — `apps/billing/src/ConfirmCancel.tsx:1-88`: full modal built from a portal, `role="dialog"`, an Escape handler, and a hand-written focus trap. `@acme/ui` `Dialog` (variant `danger`) covers every prop and behavior used — verified against `dialog.types.ts`: `open`, `onOpenChange`, `title`, `description`, footer actions all map.

**Why blocking**: newly introduced parallel implementation of an existing DS component (`adoption.duplicate` introduced → blocking, default policy).

**Remediation**:
- Change: replace the component body with `Dialog variant="danger"`; prop map — `isOpen`→`open`, `onClose`→`onOpenChange`, `heading`→`title`; drop the focus-trap import (Dialog traps internally — safe).
- Verify: `pnpm typecheck && pnpm test -- ConfirmCancel` → exit 0, all pass; `grep -n "createPortal" apps/billing/src/ConfirmCancel.tsx` → no matches
- STOP if: any used behavior fails to map onto `Dialog`'s types — report the gap; it becomes an extraction/DS-request finding, not a workaround.

## Should fix (introduced)

- **[TOK-03]** `token.literal.near` — `SettingsPanel.tsx:62` `#0f62fe` is ΔE 1.2 from `--color-interactive` (`#0353e9`); probable eyeballed shade. Confirm intent, then swap. Verify: token script over the file → no `near` rows.
- **[TOK-04]** `token.literal.exact` — `InvoiceTable.tsx:19,31` `#161616` = `--color-text` exactly. Mechanical swap. Verify: script → no `exact` rows.
- **[USE-05]** `usage.deprecated-prop` — `PlanCard.tsx:24` `Button appearance="ghost"`; `appearance` deprecated in 4.0 → `variant` (manifest inventory). Verify: `grep -rn "appearance=" apps/billing/src/` → no matches.

## Advisory (introduced)

- **[EXT-06]** `extraction.candidate` — `UsageMeter.tsx` is a generic, self-contained progress-with-thresholds primitive (no domain props, keyboard-focusable, 2 call sites already). Candidate for promotion; sketch on request.

## Waived

None matched this run.

## Pre-existing backlog

- `usage.override-fighting` — `LegacyPlanBanner.tsx:9` `!important` against `Card` internals (predates branch). Severity-if-introduced: should-fix.
- `token.palette.raw` — `SidebarNav.tsx:33` `bg-slate-100` (predates branch; policy forbids). Severity-if-introduced: blocking.

## Recurrence

Classes seen this review: `token.literal.exact` (x2), `token.hallucinated` (x1), `adoption.duplicate` (x1), `usage.deprecated-prop` (x1).
`usage.deprecated-prop` has now appeared in 3 reviews (001, 002, 003) — graduating: proposing a lint-rule plan (`no-deprecated-ds-props`, driven by the manifest inventory) in the next sweep.
