# FRONTIER - brandreel

Updated 2026-09-04 (after the layout-lints run; SHAs deliberately omitted, see DIRECTOR lessons).

## Where the project is
- Frontier: feature/layout-lints (HEAD of the branch), worktree /private/tmp/fm-brandreel-state, forked from main fce5a38 which already carries phase2-machine. One merge of layout-lints gets everything. No remote.
- Gates on the frontier: typecheck 0, engine 27 tests, bin 46 tests. workspace/smoke-3am-v2 (real-model script) passes all lint rules; workspace/smoke-3am is the kept failing baseline (25 violations).
- Two foreman runs today: phase2 (captions, review, reel, script stages; merged to main) and layout-lints (manifest stage, lint rules, engine geometry fixes, script lint-and-retry). Digests: docs/runs/2026-09-04-digest.md, docs/runs/2026-09-04-digest-layout-lints.md.
- Phase 1 (fusion video) still parked on Steven's taste gate.

## Known weaknesses (from the terra trail audit, accepted)
- CTA lint is effectively "close.line non-empty"; when close has a tagline or url the CloseD path does not render close.line at all, so the lint can pass on hidden text. Needs a real definition (gate G5).
- text-fit is a glyph-width estimate, not measurement; pixel-bands ignores uniform blocks in a band by design.
- script.mjs retries validate against the render-free lint only; render-only defects surface at reel time.

## Next predicate (obvious)
Also: script.mjs must not let the model invent close.url (take it from brand.json or a flag). CTA lint that asserts a rendered CTA element (close line or tagline or url, whichever CloseD shows) is on screen for at least the dwell Steven picks in G5, and the manifest carries what CloseD actually renders; plus caption-vs-thought overlap rule. After that: M3 assets + Broll, pin Remotion versions, remote + CI.

## Doc authority
SPEC.md > .claude/DEVTEAM.md > .claude/DIRECTOR.md (foreman rules) > STATE.md > ROADMAP.md.

## Branch index
- main: carries everything through phase2-machine (fce5a38).
- feature/layout-lints: this frontier; Steven merges.
- feature/regulate-kit: worktree /private/tmp/brandreel-reg-wt (not ours; provides engine/node_modules).
- fm/* branches: merged unit branches, disposable.
