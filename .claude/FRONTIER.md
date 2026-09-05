# FRONTIER - brandreel

Updated 2026-09-05 (after the interview run; branch names only).

## Where the project is
- Frontier: feature/hook-validation (HEAD), worktree /private/tmp/fm-brandreel-state, from main 24e275f (carries everything through the interview stage). One merge gets everything. Remote: https://github.com/stev004/brandreel, CI renders + lints on every push (green).
- Gates: typecheck 0, engine 32 tests, bin 102 tests, CI green. workspace/regulate-sigh is the first brief-driven video: passes all 11 lint rules.
- Flow now: interview -> script (brief-enforced, lint-and-retry) -> manifest -> compose -> lint -> review; vo/align/polish only when the brief sets voice/music.
- Phase 1 (fusion video) still parked on Steven's taste gate.

## Known weaknesses
- text-fit is a glyph-width estimate; pixel-bands ignores uniform blocks; overlap covers text elements only; CTA dwell counts the fade-in frame.
- Remotion caret ranges warn on every render.
- No music fetcher; CC0 track must be supplied by path.

## Next predicate (candidates)
Steven's KEEP/TWEAK/KILL on regulate-sigh first. Engineering next: real glyph measurement; M3 assets + Broll; CC0 music fetcher; pin Remotion.

## Doc authority
SPEC.md > .claude/DEVTEAM.md > .claude/DIRECTOR.md > STATE.md > ROADMAP.md.

## Branch index
- main: through interview (24e275f).
- feature/hook-validation: this frontier; Steven merges.
- feature/regulate-kit: worktree /private/tmp/brandreel-reg-wt (provides engine/node_modules).
- fm/*: merged unit branches, disposable.
