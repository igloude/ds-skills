# Readiness Playbook

What to audit, per category. The organizing question everywhere: **could an agent that has never seen this codebase use — or police — this correctly from what's written down?** Every finding cites `file:line` (or the absence of a file that should exist, named precisely). "Docs could be better" is not a finding; "`Select` has 4 variants in code, 1 documented — `ghost`, `inline`, `compact` are undiscoverable" is.

Severity here means enforceability: **blocking** = a whole conformance category cannot be policed until this is fixed; **should-fix** = policeable with degraded precision; **advisory** = polish.

---

## 1. Component contracts

Per exported public component:

- **Props typed and documented** — every public prop has a type and a description; no `any` in the public surface. Loose types don't just hurt docs: they are what lets a generating model's hallucinated props pass silently (blocking for `usage` enforcement).
- **Variants enumerated** — everything the component can look like is in the types and the docs, with when-to-use one-liners. Undocumented variants are what override-fighting is made of.
- **Disambiguation** — components with overlapping jobs (`Chip`/`Tag`, `Dialog`/`Drawer`/`Popover`) have explicit "use X when / use Y when" guidance. Without it, `usage.wrong-variant` findings are unadjudicable — advisory forever.
- **A11y contract stated** — what the component guarantees (focus, keyboard, roles) so parity gaps can be measured against something written.
- **Examples compile** — doc snippets and stories against the current API. A stale example is worse than none: it is training data for the wrong pattern, for humans and models alike.

## 2. Token layer

- **Semantic coverage** — every UI intent has a token: text hierarchy, surfaces, borders, interactive states (hover/active/focus/disabled), feedback (success/warning/danger/info). Gaps here are why literals exist; each coverage gap is a `token.literal.none` generator.
- **References resolve** — every token-to-token reference terminates in a literal; unresolvable references are blocking (the manifest's tokens.json cannot be generated, so mechanical token policing is impossible).
- **Theme parity** — every token defined in every theme; missing dark-mode entries are silent fallbacks in production.
- **Palette policy stated** — are raw palette utilities (`bg-blue-500`) permitted, and where? This single unstated policy is the largest source of both violations and false positives downstream. If it isn't written, that is a blocking finding for the `tokens` category, and the fix is a one-paragraph policy decision — flag it as the cheapest high-leverage item in the whole audit.
- **Naming consistency** — one convention, no synonym tokens with drifted values (`--gray-500` and `--grey-500` both existing is a finding with a deprecation path).
- **Enforcement scope stated** — ds-drift's mechanical enforcement covers color tokens only today; spacing, typography, radius, and shadow tokens are policed by docs and review, not the gate. Say so in the manifest's token-layer facts so a conformance PASS is read correctly.

## 3. Guidelines & policy

The rulebook the gate enforces:

- **Severity policy** — which violation classes are blocking/should-fix/advisory for this org. Absent, ds-drift falls back to generic defaults; present, the gate reflects actual team judgment. Lives in the manifest's hand-maintained zone.
- **Override policy** — when is styling a DS component acceptable, and how (sanctioned seams vs. fighting it)?
- **Composition rules** — required subcomponent structures, layout contracts, controlled/uncontrolled expectations.
- **Contribution path** — what a team does when the DS lacks something. Without a stated path, every gap becomes a hand-rolled component; with one, it becomes an extraction request. This is the difference between the `adoption` category shrinking and growing over time.

## 4. Machine surface

Can an agent consume the DS without reading its source?

- **Manifest exists and is fresh** — `ds/MANIFEST.md` + `ds/tokens.json`, stamped with the current package version *and* API hash (per the manifest spec), published with the package (so consuming repos get it via node_modules). Absent or stale is the first finding, and `manifest` mode is its fix.
- **Agent-facing docs** — `CLAUDE.md`/`AGENTS.md` in the DS repo and a generator digest in the manifest: the ~40 lines a generating agent needs in context (inventory, synonyms, palette policy, deprecations). If generators can't see the rules, the gate is a mop.
- **Types as the API of record** — the published `.d.ts` is complete and strict; it is the one surface every tool already reads.
- **Structured component metadata** — stories/docs organized so per-component guidance is mechanically locatable (one component ↔ one doc unit), rather than prose scattered across pages.

## 5. Deprecation hygiene

- Every deprecated export marked in types (`@deprecated`) **with a named replacement** — a deprecation without a replacement is a dead end that generates hand-rolled workarounds.
- Announced removal timelines recorded somewhere machine-locatable (changelog with versions, not Slack).
- Dead exports (shipped, imported nowhere, documented nowhere) — flag for removal or documentation, either way out of limbo.
- Migration notes or codemods for past breaking changes still referenced by living code.

---

## Finding format

```markdown
### [READY-NN] Short imperative title

- **Evidence**: `path:line` or "absent: <the file/section that should exist>" — one sentence.
- **Category**: contracts | tokens | guidelines | machine-surface | deprecation
- **Downstream effect**: which conformance class this degrades and how
  (e.g. "usage.wrong-variant unadjudicable for Chip/Tag until disambiguated").
- **Severity**: blocking | should-fix | advisory (enforceability meaning, above).
- **Effort**: S / M / L for the documentation or policy fix.
- **Confidence**: HIGH / MED / LOW.
- **Fix sketch**: 1–3 sentences.
```

## Readiness summary format

Lead the report with it — per category: **ready / partial / absent** plus one line. This is the quotable artifact; the findings table is its evidence.

## Ordering

By downstream leverage: blockers that unlock whole conformance categories first (unresolvable tokens, unstated palette policy, missing manifest), then the items that sharpen precision, then polish. The cheapest blocking fix in most systems is writing down a policy that already exists in people's heads — surface those explicitly.
