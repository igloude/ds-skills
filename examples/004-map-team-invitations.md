> **Sample output.** A representative coverage map produced by `/ds-plan`
> against a fictional app consuming `@acme/ui`, kept here as an example of the
> format defined in `skills/ds-plan/references/coverage-map-template.md`.
> Paths, elements, and classifications are illustrative — run the skill on your
> own ticket instead. It shares `plans/`' numbering with the reviews, hence 004.

# Coverage Map 004: Team invitations

> **For generating agents**: the Elements section below is authoritative. Use
> the component, variant, and props exactly as written; they were verified
> against `@acme/ui`'s real types. If an element you need is not in this map, it
> was not planned — STOP and ask rather than inventing a component. Elements in
> Wave 2 are not ready to build; elements under "Not built" are deliberate
> refusals, not oversights.

## Header

- **Input**: `PROD-2841` — "Invite teammates by email with a role", read 2026-07-30 (ticket + 2 Figma frames)
- **Manifest**: `node_modules/@acme/ui/ds/MANIFEST.md` — package `@acme/ui@4.2.0`, generated 2026-07-23
- **Installed DS version**: `4.2.0` (match)
- **Planned at**: commit `f7a19d2`, 2026-07-30
- **Confidence**: HIGH for the drawn elements. The frames were read as images, so spacing and icon sizes are inferred, not measured — every inference is marked in its element row.

## Summary

| Bucket | Count | Means |
|---|---|---|
| Covered | 10 | Build now, props below |
| Composable | 2 | Build now, sketch below |
| Extension | 1 | **DS work — blocks app work** |
| Net-new | 3 | **DS work — blocks app work** |
| Don't build | 1 | Routed back to design |

**Blocking DS work**: three items — `Tag` gains a dismiss affordance (S), a multi-value email field (L, RFC first), and an inline alert for partial failures (M). Twelve of seventeen elements are unblocked and can start today.

## Build sequence

### Wave 0 — DS repo (blocks Wave 2)

| Item | Component | Delta | Effort | Unblocks | Work item |
|---|---|---|---|---|---|
| EXT-01 | `Tag` | + `onDismiss?` — additive | S | E-11, NEW-01 | plans/005-tag-dismissible.md |
| NEW-01 | `EmailTokenField` (new) | contract stub | L | E-10, E-14 | plans/006-email-token-field.md |
| NEW-02 | `InlineAlert` (new) | contract stub | M | E-15 | plans/007-inline-alert.md |

NEW-01 depends on EXT-01 — it renders `Tag` for each recipient and needs the dismiss affordance. Ship EXT-01 first; it is a day's work and unblocks the RFC's implementation phase.

### Wave 1 — app repo, start now

Runs in parallel with Wave 0. E-01, E-02, E-03, E-04, E-05, E-06, E-08, E-09, E-12, E-13, E-16, E-17 — the whole invitations table and most of the dialog shell.

### Wave 2 — app repo, blocked

| Element | Waits on | Interim strategy | Removal plan |
|---|---|---|---|
| E-10, E-14 | NEW-01 | **Local adapter** — `apps/team/src/EmailTokenField.tsx`, written to NEW-01's proposed API exactly, so the swap is a one-line import change | The build plan that follows plans/006's RFC — its final step deletes the adapter |
| E-11 | EXT-01 | **Wait** — one day of DS work; a local dismissible tag would be a duplicate of a component that is about to exist | n/a |
| E-15 | NEW-02 | **Wait** — v1 ships partial-failure detail in the existing `Toast variant="danger"`; the persistent summary lands with NEW-02 | n/a |

### Not built

E-07 (custom-purple Owner badge) — sanctioned equivalent is `Tag variant="accent"`. Routed to @design-owner on the ticket; see the element for what the design gives up.

## Elements

### Surface: Team settings → Invitations tab

#### E-01 — Tab navigation (Members | Invitations) · Covered · drawn
- **Use**: `<Tabs variant="contained">` — source: ds
- **Props**: `variant="contained"` (the design's filled tab track) · `value` / `onValueChange` (controlled, driven by the route segment)
- **Verified**: `packages/ui/src/Tabs/Tabs.types.ts:9-22`; manifest inventory row `Tabs`
- **Not covered by this**: none.

#### E-02 — "Invite people" action · Covered · drawn
- **Use**: `<Button variant="primary" size="md">` — source: ds
- **Props**: `variant="primary"` · `size="md"`
- **Verified**: `packages/ui/src/Button/Button.types.ts:14-31`
- **Not covered by this**: the frame shows a 20px leading icon; `Button` renders slot icons at 16px. Inferred from the image, not measured — confirm with design; if 20px is deliberate it becomes an extension, not a className override.

#### E-03 — Pending invitations table · Covered · drawn
- **Use**: `<DataTable>` — source: **local**, `apps/team/src/components/DataTable.tsx:1-140`
- **Props**: `columns` · `rows` · `loading` · `emptyState` (all present in the local types at `DataTable.tsx:12-34`)
- **Verified**: local component read in full; `@acme/ui` has no table primitive (inventory confirms).
- **Extraction note**: generic, no domain props, 3 call sites across two apps. Strong extraction candidate — surface it to `/ds-drift extraction`, do not promote it here.

#### E-04 — Empty state (no pending invites) · Composable · implied
- **Compose**: the local `DataTable`'s `emptyState` slot hosting a `Button variant="secondary"` repeat of the invite action
- **Sketch**:
  ```tsx
  <DataTable
    rows={invites}
    emptyState={
      <>
        <p>No pending invitations.</p>
        <Button variant="secondary" onClick={openInvite}>Invite people</Button>
      </>
    }
  />
  ```
- **Verified**: `DataTable.tsx:28` (`emptyState?: ReactNode`); `Button.types.ts:14-31`
- **Owns what**: `DataTable` owns the empty region's `role="status"`; the Button owns focus.
- **Note**: first-run empty and filtered-to-nothing are the same copy here — confirmed with the ticket, not assumed.

#### E-05 — Loading state · Covered · implied
- **Use**: `<DataTable loading />` — source: local (`DataTable.tsx:31`, renders its own row skeletons)
- **Not covered by this**: none. `@acme/ui` ships no skeleton primitive; the local table already solves it, so this is not a DS gap.

#### E-06 — Row actions (Resend, Revoke) · Composable · drawn
- **Compose**: `Menu` anchored to a ghost `Button` trigger
- **Sketch**:
  ```tsx
  <Menu>
    <Menu.Trigger>
      <Button variant="ghost" size="sm" aria-label={`Actions for ${invite.email}`} />
    </Menu.Trigger>
    <Menu.Content>
      <Menu.Item onSelect={resend}>Resend invitation</Menu.Item>
      <Menu.Item onSelect={confirmRevoke} tone="danger">Revoke</Menu.Item>
    </Menu.Content>
  </Menu>
  ```
- **Verified**: `packages/ui/src/Menu/Menu.types.ts:7-40` (`tone` on `Menu.Item` exists at :33); `Button.types.ts:14-31`
- **Pattern precedent**: `packages/ui/docs/menu.mdx:88` shows the ghost-trigger composition verbatim.
- **Owns what**: `Menu` owns arrow-key navigation, Escape, and focus return to the trigger. Do not add keyboard handling around it.
- **Repetition**: once per row, one call site. Not an extraction candidate.

#### E-07 — Owner role badge · **Don't build** · drawn
- **Rejected because**: the frame specifies `#7C3AED` for the Owner badge. Manifest policy zone: *"Raw palette utilities (`bg-blue-500` etc.): forbidden in app code; permitted inside `packages/ui/**` only"* and *"Never invent a token name"* (Notes for generators). No semantic token resolves to this value — nearest is `--color-accent` at ΔE 18.
- **Sanctioned equivalent**: `<Tag variant="accent">Owner</Tag>`.
- **What the design loses**: Owner and Admin badges will not be visually distinct by hue — only by label. That is a real loss and worth the designer's judgment.
- **Route to**: @design-owner. Two legitimate paths if the distinction is load-bearing: a `ds-request` for a semantic role-color token (see Token requests below), or a waiver — note that W-001 scopes to `apps/marketing/**` and does **not** cover this app, so a new waiver row with an owner and expiry would be required.

#### E-08 — Revoke confirmation · Covered · implied
- **Use**: `<Dialog variant="danger">` — source: ds
- **Props**: `open` · `onOpenChange` · `title` · `description` · footer `Button variant="danger"`
- **Verified**: `packages/ui/src/Dialog/dialog.types.ts:11-38`
- **Not covered by this**: none. Dialog traps focus and handles Escape internally — do not hand-roll either.

### Surface: Invite dialog

#### E-09 — Dialog shell · Covered · drawn
- **Use**: `<Dialog variant="default">` — source: ds
- **Props**: `open` · `onOpenChange` · `title="Invite people"` · `description`
- **Verified**: `dialog.types.ts:11-38`

#### E-10 — Multi-address email entry · Net-new · drawn → **blocked on NEW-01**
- **Owner**: ds — a multi-value entry field is generic (the audit-log filter bar needs the same control); it carries no domain noun.
- See work item **NEW-01** below for the contract. Until it lands, build against the local adapter named in Wave 2.
- **Prior art**: `Select` is single-value and has no free-text entry (`select.types.ts:9`); `Menu` is action-only. Neither stretches.

#### E-11 — Dismissible recipient chips · Extension · drawn → **blocked on EXT-01**
- **Component**: `Tag` — `packages/ui/src/Tag/Tag.tsx`
- See work item **EXT-01**. Note for the design conversation: the frames label these "chips", and `Chip` is deprecated → `Tag` in the manifest inventory. The name in the design is not the component to reach for.

#### E-12 — Role selector · Covered · drawn
- **Use**: `<Select variant="inline">` — source: ds
- **Props**: `variant="inline"` (sits inside the recipient row) · `value` / `onValueChange` · three options: Admin, Member, Viewer
- **Verified**: `packages/ui/src/Select/select.types.ts:9-27`; manifest inventory row `Select` — "Use when" covers a list of any length, so three role options are in scope with no caveat.
- **Not covered by this**: none.

#### E-13 — Send button · Covered · drawn
- **Use**: `<Button variant="primary" loading={isSending} disabled={recipients.length === 0}>`
- **Verified**: `Button.types.ts:14-31` (`loading` at :22 renders the spinner and sets `aria-busy` — do not add your own)

#### E-14 — Per-address validation errors · Net-new · implied → **blocked on NEW-01**
- Field-level error display belongs to the entry control, not to the dialog. Covered by NEW-01's `error` slot; listed separately so the state is not lost in the handoff.

#### E-15 — Partial-failure summary ("3 of 8 invites failed") · Net-new · drawn → **blocked on NEW-02**
- **Owner**: ds — see work item **NEW-02**.
- **Prior art**: the tempting answer is an extension — add `persistent` to `Toast`. Rejected: `Toast` is *"Transient feedback"* per the inventory, and a summary the user must read and act on is a different concept. Extending Toast here would bend a component past its own definition, which is how components become unmaintainable.

#### E-16 — Success feedback · Covered · drawn
- **Use**: `<Toast variant="success">` — source: ds
- **Verified**: `packages/ui/src/Toast/Toast.types.ts:8-19`; inventory row `Toast`

#### E-17 — Focus return after dialog close · Covered · implied (non-visual contract)
- `Dialog` returns focus to its trigger on close (`dialog.types.ts:31`, documented at `docs/dialog.mdx:64`). Inventoried explicitly because hand-rolled focus restoration is the most commonly reinvented behavior in this codebase — the correct implementation is to write none.

## Work items

Ordered by blocking count, then effort ascending.

### [EXT-01] Add a dismiss affordance to `Tag` — `ds.extension.prop`

- **Repo**: ds · **Blocks**: E-11, and NEW-01's implementation · **Effort**: S · **Confidence**: HIGH · **Priority**: P1
- **API delta**:
  ```diff
    type TagProps = {
      variant?: 'neutral' | 'accent'
  +   /** Renders a dismiss button. Omitted = today's static rendering. */
  +   onDismiss?: () => void
  +   /** Accessible name for the dismiss button. Required when onDismiss is set. */
  +   dismissLabel?: string
    }
  ```
- **Delta class**: **additive** — no existing call site passes `onDismiss`, so every current rendering is byte-identical.
- **Blast radius**: 34 call sites across 4 packages (`apps/team`, `apps/billing`, `apps/admin`, `packages/ui` stories). Variants in use: `neutral` (29), `accent` (5). Owners: `@acme/design-system` per CODEOWNERS. No consumer changes.
- **Generality**: the audit-log filter bar (`apps/admin/src/FilterBar.tsx:41`) hand-rolls a dismissible tag today — a second, pre-existing use case, not a hypothetical one.

### [NEW-01] Contract for a multi-value email entry field — `ds.net-new.primitive`

- **Repo**: ds · **Blocks**: E-10, E-14 · **Effort**: L · **Confidence**: MED (needs a DS owner's read on naming and scope) · **Priority**: P1
- **Deliverable is an RFC**, not a component. Contract sketch:
  ```ts
  interface EmailTokenFieldProps {
    value: string[]
    onChange: (value: string[]) => void
    validate?: (entry: string) => string | null
    error?: ReactNode
    placeholder?: string
    maxEntries?: number
  }
  ```
- **Anatomy**: input · token list (renders `Tag onDismiss`) · error slot.
- **Keyboard map**: `Enter` / `,` commit · `Backspace` on empty input removes the last token · `←` / `→` traverse tokens · `Escape` clears the draft entry.
- **A11y contract**: the token list is a `listbox`-free live region; each removal announces "`<email>` removed"; the input keeps a persistent accessible name; errors are wired via `aria-describedby`. This is the reason it belongs in the DS rather than the app.
- **Open questions**: is it email-specific or a generic `TokenField` with a validator (recommend generic, name it `TokenField`); does it subsume the `apps/admin` filter-bar hand-roll (recommend yes, as a follow-up plan).
- **Tokens**: consumes existing semantic tokens only; no gaps found.

### [NEW-02] Contract for an inline alert — `ds.net-new.primitive`

- **Repo**: ds · **Blocks**: E-15 · **Effort**: M · **Confidence**: MED · **Priority**: P2 — it blocks E-15, but E-15 is deferred out of v1 by decision, so nothing in the release waits on it. Priority here is schedule position, not importance.
- **Gap**: `Toast` is transient by definition; the system has no persistent, in-flow message component. Three surfaces already fake one with a `Card` plus manual coloring (`apps/billing/src/LegacyPlanBanner.tsx:9` is the override-fighting instance review 003 flagged).
- **Contract**: `variant: 'info' | 'success' | 'warning' | 'danger'`, `title`, `children`, optional `onDismiss`, optional action slot.
- **A11y contract**: `role="status"` for info/success, `role="alert"` for warning/danger; never steals focus.
- **Open questions**: does this subsume `Toast`'s non-transient misuse, and should `Toast` gain a lint rule pointing at it once it exists.

## Token and manifest requests

Route to `/ds-doctor` — this is not component work:

- **Role-color token**: E-07 wants a hue distinction between Owner and Admin that no semantic token provides. If design confirms the distinction is load-bearing, this is a token request, not a literal.

## Not classified

- **Page shell, typography, and grid** — provided by `apps/team/src/layouts/SettingsLayout.tsx`, which every settings surface already uses. Out of scope for this map by convention, not by omission.
- **The invite email template** — `apps/team/emails/**` is a manifest exclusion (inline styles are load-bearing in email clients). Not planned here.

## Assumptions and open questions

- Icon sizes and spacing were **inferred from images**, not measured. E-02's 20px icon is the only place that inference changes a classification.
- Assumed invitations are never bulk-imported (no CSV path in the ticket). If bulk import is in scope, E-10's contract changes materially — ask before building NEW-01.
- Decision owner for E-07: @design-owner. Decision owner for NEW-01 naming and scope: @acme/design-system.

## Verification

After this feature lands, `/ds-drift` on the branch should return **PASS** for every Covered and Composable element — E-01 through E-06, E-08, E-09, E-12, E-13, E-16, and E-17 (the Wave 1 set exactly). A conformance finding against any of them means this map was wrong — record it under "Map corrections" in `plans/README.md` so the next map does not repeat the error.
