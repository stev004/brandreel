# FRONTIER - brandreel

Updated 2026-09-04T19:43.

## Where the project is
- Frontier: feature/phase2-machine @ 722f888 (worktree /private/tmp/fm-brandreel-state). Chain: main <- m1-engine <- howclose-trial <- regulate-kit <- phase2-machine; one merge of phase2-machine gets everything. No remote.
- Phase 2 engineering landed this run: karaoke captions (43c1ee4), review + reel (0f1f1fb), script stage, audit fixes (fe75208). Gates: typecheck 0, engine 19/19, bin 14/14, demo and smoke-3am renders lint ok.
- Full chain proven with a real model: topic -> script.json -> render -> lint -> review.md (workspace/smoke-3am).
- Phase 1 (fusion video) still parked on Steven's taste gate.

## Next predicate (obvious)
Stage 5 emits a layout manifest (bboxes per text/logo element per frame range) and stage 7 asserts safe zones, text fit (no clipping/ellipsis), hook <= 3s, pacing, CTA in final 20%; smoke-3am must FAIL the new lints, then pass after template fixes. Plus: script.mjs must not invent modules.

## Doc authority
SPEC.md > .claude/DEVTEAM.md > .claude/DIRECTOR.md (foreman rules) > STATE.md > ROADMAP.md.

## Branch index
- feature/regulate-kit: last human-driven state; worktree /private/tmp/brandreel-reg-wt (not ours).
- feature/phase2-machine @ 722f888: this run's integration + state branch.
- fm/u1-captions, fm/u2-bin, fm/u3-script, fm/u4-fixes: merged, disposable.
