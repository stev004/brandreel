# FRONTIER - brandreel

Updated 2026-09-22 (closeout).

## Where the project is
- Frontier: `main` (ff24466 + this closeout). Remote https://github.com/stev004/brandreel, CI green. One unmerged branch: `feature/hook-validation` (ROADMAP G0, Steven merges; docs-only conflicts).
- Gates on main: typecheck 0, engine 32 tests, bin 85 tests.
- The 3:04 AM animatic is KEPT (2026-09-13, rev5d, 19.6 s). The next engineering unit is the `exhale` beat kind and the 1:1 port (ROADMAP G1a, G1b).
- The ordered goal ladder with shell-checkable done-conditions is ROADMAP.md; any model works it top down.

## Known weaknesses
- text-fit is a glyph-width estimate (G4a); overlap covers text elements only (G4b); pixel-bands ignores uniform blocks; CTA dwell counts the fade-in frame; Remotion caret ranges warn on every render (G4c); no music fetcher (G7).

## Next predicate (for a foreman run)
G1a + G1b: exhale beat kind landed with manifest tests, workspace/regulate-3am renders and passes every lint rule, frame strip matches the animatic at four clock times.

## Doc authority
SPEC.md > .claude/DEVTEAM.md > .claude/DIRECTOR.md > STATE.md > ROADMAP.md.

## Branch index
- main: everything through regulate-3am.
- feature/hook-validation: unmerged (G0).
- fm/*: merged unit branches, disposable.
