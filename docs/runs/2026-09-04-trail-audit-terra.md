Attention list

- **High** — Claimed: U4 fixed the overlapping-caption-window defect. Found: it persists across a window boundary. `captionWindow()` chooses the window of the latest-starting word, even if an earlier word is still active; the U4 test uses a four-word window, masking the reported two-word-window case. [captions.ts](/private/tmp/fm-brandreel-state/engine/src/captions.ts:33), [captions.test.ts](/private/tmp/fm-brandreel-state/engine/tests/captions.test.ts:47), `fe75208`.

- **Medium** — Claimed: the smoke-3am “end-to-end proof” established the full chain. Found: its committed model output invents `modules.vo.voice: "regulate-narrator"` and `modules.music.file: "audio/music.wav"`; the recorded successful reel invocation skips `vo,align,polish`. Those configured stages were not proven usable. [script.json](/private/tmp/fm-brandreel-state/workspace/smoke-3am/script.json), [decisions.tsv](/private/tmp/fm-brandreel-state/.claude/decisions.tsv).

- **Medium** — Claimed: demo and smoke renders were linted/visually checked. Found: the current files exist, but both MP4s and both `review.md` files are gitignored, so the render, frame-check, and review claims have no committed artifact. The committed lint reports only attest ffprobe width/height/fps/duration, not visual safe-zone or text-fit checks. [.gitignore](/private/tmp/fm-brandreel-state/.gitignore), [lint.mjs](/private/tmp/fm-brandreel-state/bin/lint.mjs:57), [smoke lint report](/private/tmp/fm-brandreel-state/workspace/smoke-3am/lint-report.json).

- **Medium** — Claimed: STATE/FRONTIER identify `feature/phase2-machine @ 722f888` as current. Found: `722f888` is an ancestor; branch HEAD is `6919bc5` (with `2fd2e4d` also after it). The documents were stale immediately after their own state-sync commit. [STATE.md](/private/tmp/fm-brandreel-state/STATE.md:6), [FRONTIER.md](/private/tmp/fm-brandreel-state/.claude/FRONTIER.md:6).

- **Medium** — Claimed: the run digest exists and the run “has digested.” Found: `docs/runs/2026-09-04-digest.md` is absent. [RUN.md](/private/tmp/fm-brandreel-state/.claude/RUN.md:2), [GATES.md](/private/tmp/fm-brandreel-state/.claude/GATES.md:6).

- **Low** — Claimed: scratchpad briefs and the karaoke visual check were evidence. Found: `scratchpad/u1.md`, `u2.md`, `u3.md`, and `kar2.png` are absent, so these trail rows are not independently resolvable. The later unit commits and five run reports do exist. [.claude/decisions.tsv](/private/tmp/fm-brandreel-state/.claude/decisions.tsv).

Reproduced current gates: bin 14/14, engine 19/19, and typecheck pass. All cited unit commits exist and are ancestors of HEAD. No flag on the literal-hex override: [DIRECTOR.md](/private/tmp/fm-brandreel-state/.claude/DIRECTOR.md:22) explicitly scopes the rule to templates/components, and `Root.tsx` is a neutral preview default while `fonts.ts` is a loader registry.

AUDITOR: gpt-5.6-terra.