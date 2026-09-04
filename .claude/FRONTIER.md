# FRONTIER - brandreel

Updated 2026-09-04T19:43.

## Where the project is
- Frontier: feature/layout-lints (HEAD of the branch, worktree /private/tmp/fm-brandreel-state), forked from main fce5a38 which already carries phase2-machine. One merge of layout-lints gets everything. No remote.
- Phase 2 engineering landed this run: karaoke captions (43c1ee4), review + reel (0f1f1fb), script stage, audit fixes (fe75208). Gates: typecheck 0, engine 20/20, bin 14/14, demo and smoke-3am renders lint ok.
- Full chain proven with a real model: topic -> script.json -> render -> lint -> review.md (workspace/smoke-3am).
- Phase 1 (fusion video) still parked on Steven's taste gate.

## Landed this run
Layout manifest + lints + script lint-and-retry (digest docs/runs/2026-09-04-digest-layout-lints.md).

## Next predicate (candidates, see digest)
Caption/thought overlap rule + real glyph measurement; or M3 assets + Broll; or pin Remotion + remote/CI.

## Doc authority
SPEC.md > .claude/DEVTEAM.md > .claude/DIRECTOR.md (foreman rules) > STATE.md > ROADMAP.md.

## Branch index
- feature/regulate-kit: last human-driven state; worktree /private/tmp/brandreel-reg-wt (not ours).
- feature/phase2-machine (HEAD of the branch): this run's integration + state branch.
- fm/u1-captions, fm/u2-bin, fm/u3-script, fm/u4-fixes: merged, disposable.
