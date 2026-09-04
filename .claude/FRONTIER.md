# FRONTIER - brandreel

Updated 2026-09-04 (after the CTA-lint run; branch names only, no SHAs).

## Where the project is
- Frontier: feature/cta-lint (HEAD of the branch), worktree /private/tmp/fm-brandreel-state, forked from main 2fd01a5 (which carries phase2 + layout-lints). One merge of cta-lint gets everything. No remote.
- Gates on the frontier: typecheck 0, engine 29 tests, bin 54 tests. workspace/smoke-3am-v3 (real-model script) passes all 11 lint rules incl. cta (dwell 2500ms) and overlap; smoke-3am (25 violations) and smoke-3am-v2 (cta dwell) are kept failing baselines.
- Three foreman runs today; digests docs/runs/2026-09-04-digest*.md.
- Phase 1 (fusion video) still parked on Steven's taste gate.

## Known weaknesses
- text-fit is a glyph-width estimate; pixel-bands ignores uniform blocks in a band by design; script.mjs retries validate render-free; the overlap lint covers text elements only (axis, rings, logo are not manifest boxes); CTA dwell counts the fade-in start frame (about one frame optimistic).
- Remotion caret ranges cause a version-mismatch warning on every render.

## Next predicate (candidates)
First: close.tagline from brand.json (model truncated "Not meditation. Regulation." to fit a limit). Then M3 assets + Broll template; or pin Remotion + remote + CI; or real glyph measurement. Taste-gated work needs Steven first.

## Doc authority
SPEC.md > .claude/DEVTEAM.md > .claude/DIRECTOR.md > STATE.md > ROADMAP.md.

## Branch index
- main: through layout-lints (2fd01a5).
- feature/cta-lint: this frontier; Steven merges.
- feature/regulate-kit: worktree /private/tmp/brandreel-reg-wt (not ours; provides engine/node_modules).
- fm/*: merged unit branches, disposable.
