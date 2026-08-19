# Conformance Manifest Spec

The manifest is the single contract between three parties, each of whom gets it as a cold read: **generating agents** (read it to produce conforming work), **ds-drift** (reads it as recon cache and rulebook), and **humans** (review policy changes in PRs like any other code). It is two files because its consumers differ: prose and tables for agents and humans, resolved JSON for scripts.

ds-doctor owns this spec and is the only writer of generated zones. Hand-maintained zones belong to the DS owners.

**This is manifest schema 2.** The header stamps the schema number; consumers check it before parsing. A manifest with no schema line is schema 1 (flat-string `tokens.json`, a single `policy` hand zone, no API hash) — consumers still read it, degraded to those semantics. A schema number a consumer doesn't know → stop and report; never parse by guesswork.

**One manifest per package.** A monorepo shipping `@acme/ui` and `@acme/charts` publishes one manifest in each package; consumers judge each component and token against the manifest of the package that owns it. There is no repo-level merged manifest — the package is the unit of policy.

**Publish it with the package.** Add `ds/` to the DS package's `files` array so every consuming repo gets the manifest via `node_modules/<pkg>/ds/` — that is how ds-drift finds it in split-repo setups without any shared configuration.

---

## `ds/MANIFEST.md`

Zone markers are load-bearing: regeneration rewrites `generated` zones and must preserve `hand-maintained` zones verbatim. **One marker per section**, so a regeneration conflict can name exactly which section conflicts, and a hand edit touches exactly one merge surface.

```markdown
# <package> Conformance Manifest

<!-- generated: header -->
- **Manifest schema**: 2
- **Package**: @scope/ds@4.2.0        ← the version stamp consumers check
- **API hash**: sha256:<hex>          ← over the published .d.ts files; recipe below
- **Generated**: 2026-07-23, commit `abc1234`, by ds-doctor vX.Y.Z
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

*Synonyms are the names app teams and models reach for; ds-drift's adoption
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
<!-- /hand-maintained -->

<!-- hand-maintained: severity-map -->
## Severity map (overrides ds-drift defaults)

| Class | Severity | Why |
|---|---|---|
| token.palette.raw | blocking | Semantic-only policy above; raw palette is the top drift source here |
| usage.wrong-variant | should-fix | Variant guidance is new — enforcing softly through Q4 (see ADR-012) |

The Why column is provenance: one line, or a pointer to the decision (ADR, PR,
issue). An override nobody can explain in a year is an override nobody trusts.
<!-- /hand-maintained -->

<!-- hand-maintained: waivers -->
## Waivers

| Id | Scope (glob) | Class | Rationale | Owner | Expires |
|---|---|---|---|---|---|
| W-001 | apps/marketing/** | token.* | Brand campaign styles are intentionally off-system | @igloude | 2026-12-31 |
<!-- /hand-maintained -->

<!-- hand-maintained: exclusions -->
## Exclusions

| Scope (glob) | Reason | Owner | Expires |
|---|---|---|---|
| apps/*/emails/** | Inline styles are load-bearing in email clients | @igloude | 2027-06-30 |

Excluded paths are not audited at all — unlike waivers, whose findings are
still detected and listed. Every review names the exclusions it matched under
"Not audited", so the skips stay visible. Owner and Expires make the hole
auditable: an expired exclusion stops excluding, and `reconcile` flags it —
by construction nobody else will ever notice, because the paths are never scanned.
<!-- /hand-maintained -->

<!-- generated: notes-for-generators -->
## Notes for generators

Read this section before writing any UI in a consuming repo.

- Components: use the inventory above; the Synonyms column lists the names you
  might reach for — the component in column one is what exists here.
- Active deprecations: Chip → Tag.        ← derived from the inventory table
- Colors come from semantic tokens only (see ds/tokens.json); the Policy
  section above governs raw palette use. Never invent a token name.
- If the DS lacks what you need, follow the contribution path in Policy —
  do not hand-roll a parallel component.
<!-- /generated -->

<!-- hand-maintained: house-rules -->
## House rules

Additions the DS owners want every generator to carry — anything true here that
the generated digest can't derive (naming conventions, layout idioms, "always
wrap forms in <Form>"). Keep it under ~15 lines; it rides along with the digest.
<!-- /hand-maintained -->
```

The notes-for-generators digest is **generated**, so the deprecation list and inventory pointers can never silently disagree with the tables above — regeneration derives them. Hand-written guidance goes in `house-rules`, which regeneration preserves verbatim. Reference both from the app repos' CLAUDE.md:

    Design system rules: read node_modules/@scope/ds/ds/MANIFEST.md
    ("Notes for generators" + "House rules") before writing any UI.

### The API hash

Staleness by version compare alone misses the case where the package content moved without a version bump (or the manifest was generated against a different build than the one that shipped). The hash closes it:

```sh
cd node_modules/@scope/ds   # or the package root, at generation time
find . -name '*.d.ts' -not -path './node_modules/*' | LC_ALL=C sort | xargs cat | sha256sum
```

sha256 over the concatenation of the package's published `.d.ts` files in sorted path order. ds-doctor computes it at generation; consumers recompute it against the installed package. Version match + hash mismatch is exactly the silent-staleness case, and it reports the same as a version mismatch: `manifest.stale`, degraded confidence.

## `ds/tokens.json`

Flat map of token name → typed entry, fully resolved — its consumer is a script, not a person:

```json
{
  "color-text":    { "value": "#161616", "type": "color" },
  "color-text@dark": { "value": "#f4f4f4", "type": "color" },
  "space-4":       { "value": "16px", "type": "dimension" }
}
```

- **Every entry carries a `type` discriminator** (`color`, `dimension`, `duration`, `shadow`, …). Only color entries exist today, but the shape is fixed now so the first spacing token doesn't land in a map that `nearest_token.mjs` would cheerfully ΔE-match; the script filters on `type` and reports what it excluded. (Schema-1 manifests used bare string values; the script still accepts them, as colors.)
- Keys are token names; `@<theme>` suffixes carry non-default themes as distinct entries (nearest-token matching treats them independently, which is correct).
- Every value is a resolved literal — token-to-token references are flattened at generation. An unresolvable reference fails generation loudly and is a blocking readiness finding; never emit a partial map silently.
- Regenerated wholesale every time; never hand-edited (hand edits belong in the token source).

---

## Consumption contract

What ds-drift and ds-plan are entitled to rely on (and therefore what regeneration must never break):

1. **Schema check first**: read the header's `Manifest schema` before anything else. Missing line → schema 1 semantics. Unknown number → stop and report.
2. **Discovery order**: `--manifest <path>` → `./ds/` → `node_modules/<pkg>/ds/`, found mechanically by globbing `node_modules/{*,@*/*}/ds/MANIFEST.md`. Manifests are per-package, so **multiple hits are valid**: each component and token is judged against the manifest of the package that owns it (the package it is imported from, or whose token namespace matches). A component name claimed by two manifests is a conflict to report, never a guess. Zero hits → the no-manifest path.
3. **Staleness**: the `Package` version stamp *and* the `API hash`, both against the installed package. Either mismatched → `manifest.stale` finding + degraded-confidence note; never silent.
4. **Stable zone semantics**: zone marker names, inventory table columns, severity-map shape, waiver and exclusion table shapes as above. Additive changes are fine within a schema; renames and shape changes bump the schema number.
5. Waiver matching is `glob × class`; expired waivers are dead (and reconcile flags them).
6. Exclusion matching is `glob` only: matched paths are skipped entirely and listed under "Not audited". **An expired exclusion no longer excludes** — its paths are audited again, and reconcile flags the expiry.
7. **The inventory, synonym map, and deprecation records are deliberately markdown** — human PR review of policy is the point, and today their only consumers read prose. The moment a script consumer materializes (a lint rule generated from the synonym map), the planned move is `ds/manifest.json` as the source of truth with `MANIFEST.md` rendered from it — a schema-number bump, never an ad-hoc parse of the markdown.

## Update discipline

- `/ds-doctor manifest` after every DS release — cheap, mechanical, keeps the stamps current.
- Policy, severity, waiver, exclusion, and house-rules changes are hand edits, PR-reviewed like code — that is the point of them living in a markdown file in the repo.
- If regeneration would collide with a hand zone (e.g. a hand-added inventory row), stop and report **which section's marker** conflicts; resolving it is the DS owner's call.
- A manifest with no zone markers at all (hand-written before ds-doctor) is treated as entirely hand-maintained: write nothing, report it, and propose the marker retrofit as a doc-fix plan.
- Migrating a schema-1 manifest: regeneration rewrites the generated zones to schema 2 and re-emits `tokens.json` in the typed shape mechanically; the old single `policy` hand zone cannot be split mechanically — propose the per-section split as a doc-fix plan and leave the zone intact until the owner applies it.
