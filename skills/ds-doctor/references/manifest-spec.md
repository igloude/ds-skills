# Conformance Manifest Spec

The manifest is the single contract between three parties who never share a session: **generating agents** (read it to produce conforming work), **ds-align** (reads it as recon cache and rulebook), and **humans** (review policy changes in PRs like any other code). It is two files because its consumers differ: prose and tables for agents and humans, resolved JSON for scripts.

ds-doctor owns this spec and is the only writer of generated zones. Hand-maintained zones belong to the DS owners.

**Publish it with the package.** Add `ds/` to the DS package's `files` array so every consuming repo gets the manifest via `node_modules/<pkg>/ds/` — that is how ds-align finds it in split-repo setups without any shared configuration.

---

## `ds/MANIFEST.md`

Zone markers are load-bearing: regeneration rewrites `generated` zones and must preserve `hand-maintained` zones verbatim (Hard Rule 2).

```markdown
# <package> Conformance Manifest

<!-- generated: header -->
- **Package**: @scope/ds@4.2.0        ← the staleness stamp ds-align checks
- **Generated**: 2026-07-23, commit `abc1234`, by ds-doctor v0.1.0
- **Token source**: src/tokens/*.css → ds/tokens.json (resolved)
<!-- /generated -->

<!-- generated: inventory -->
## Component inventory

| Component | Status | Variants | Use when | Synonyms |
|---|---|---|---|---|
| Dialog | stable | default, danger | Modal interruptions requiring a decision | Modal |
| Drawer | stable | left, right | Supplementary panels; navigation on mobile | Sidebar, Panel |
| Tag | stable | neutral, accent | Static labels and metadata | Chip*, Badge* |
| Chip | deprecated → Tag | — | — | — |

*Synonyms are the names app teams and models reach for; ds-align's adoption
category greps them. Deprecated rows always name the replacement.
<!-- /generated -->

<!-- generated: token-policy-facts -->
## Token layer

- Semantic tokens: 62 (see ds/tokens.json). Themes: light, dark (full parity).
- Reference depth resolved; no unresolvable references as of generation.
<!-- /generated -->

<!-- hand-maintained: policy -->
## Policy

- **Raw palette utilities** (`bg-blue-500`): forbidden in app code; permitted
  inside `packages/ds/**` only.
- **Overrides**: className passthrough is sanctioned on every component;
  descendant selectors and !important against DS internals are not.
- **Contribution path**: gaps become issues labeled `ds-request`; interim
  hand-rolls require a waiver below.

## Severity map (overrides ds-align defaults)

| Class | Severity |
|---|---|
| token.palette.raw | blocking |
| usage.wrong-variant | should-fix |

## Waivers

| Id | Scope (glob) | Class | Rationale | Owner | Expires |
|---|---|---|---|---|---|
| W-001 | apps/marketing/** | token.* | Brand campaign styles are intentionally off-system | @igloude | 2026-12-31 |

## Notes for generators

The ≤40-line digest a generating agent should carry in context: the inventory
table above, the palette policy, active deprecations with replacements, and
"when the DS lacks something, file ds-request — do not hand-roll." Reference
this section from the app repos' CLAUDE.md:

    Design system rules: read node_modules/@scope/ds/ds/MANIFEST.md
    ("Notes for generators" section) before writing any UI.
<!-- /hand-maintained -->
```

## `ds/tokens.json`

Flat, fully resolved — literals only, because its consumer is a script, not a person:

```json
{
  "color-text": "#161616",
  "color-text@dark": "#f4f4f4",
  "color-surface": "#ffffff",
  "color-interactive-hover": "#0353e9"
}
```

- Keys are token names; `@<theme>` suffixes carry non-default themes as distinct entries (nearest-token matching treats them independently, which is correct).
- Every value is a resolved literal — token-to-token references are flattened at generation. An unresolvable reference fails generation loudly and is a blocking readiness finding; never emit a partial map silently.
- Regenerated wholesale every time; never hand-edited (hand edits belong in the token source).

---

## Consumption contract

What ds-align is entitled to rely on (and therefore what regeneration must never break):

1. **Discovery order**: `--manifest <path>` → `./ds/` → `node_modules/<pkg>/ds/`.
2. **Staleness**: the header's `Package` stamp vs. the installed version. Mismatch → `manifest.stale` finding + degraded-confidence note; never silent.
3. **Stable zone semantics**: inventory table columns, severity-map shape, waiver-table shape as above. Additive changes are fine; renames are breaking and require a version note in the header.
4. Waiver matching is `glob × class`; expired waivers are dead (and reconcile flags them).

## Update discipline

- `/ds-doctor manifest` after every DS release — cheap, mechanical, keeps the stamp current.
- Policy, severity, and waiver changes are hand edits, PR-reviewed like code — that is the point of them living in a markdown file in the repo.
- If regeneration would collide with a hand zone (e.g. a hand-added inventory row), stop and report the conflict; resolving it is the DS owner's call.
