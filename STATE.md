# STATE - brandreel snapshot

*Updated 2026-09-04 (evening, foreman run). Snapshot of current truth; history in SESSIONS.md and git.*

## Where things stand
- **Branch chain (all local, no remote):** `main` <- `feature/m1-engine` <- `feature/howclose-trial` <- `feature/regulate-kit` <- **`feature/phase2-machine`** (HEAD of the branch; 09-04 foreman run: karaoke captions, bin/review.mjs, bin/reel.mjs, bin/script.mjs; foreman state tower in `.claude/`, executor reports in `docs/runs/`). **One merge gets everything:** `git -C ~/Documents/brandreel merge --no-ff feature/phase2-machine`. Live worktrees: /tmp/brandreel-reg-wt (reg-kit), /private/tmp/fm-brandreel-state (phase2-machine); fm/u1..u4 worktrees under /private/tmp/br-* are merged and disposable.
- **Gates all green on phase2-machine:** typecheck, 20 engine tests, 14 bin tests (`node --test bin/tests/`), demo + smoke-3am renders lint ok. Full chain proven: `node bin/script.mjs workspace/<id> --brand regulate --topic "..."` (claude -p) -> `node bin/reel.mjs workspace/<id> --skip vo,align,polish` -> render, lint-report, review.md. Audio venv not present in these worktrees (rebuild per audio/README.md).
- **Known lint gaps (next foreman predicate):** no layout manifest, so safe-zone overflow (smoke-3am Figure goalText clips the right edge), caption truncation, and Moment thoughts sitting on the caption block all pass lint. script.mjs also lets the model invent modules.vo/music.

## Waiting on Steven
0. **Regulate demo re-render for a look** (optional): `workspace/demo/render.mp4` in the reg worktree now shows Playfair wordmark + pure white dot. The demo's copy ("let the night be enough", "a softer landing") is placeholder and softer than the Brand Book voice - the first real Regulate script replaces it, not a copy edit.
1. **Fusion animatic PARKED at rev6** (Steven 09-03: "still not great - save it, iterate later"). Saved into the howclose.to repo at `marketing/animatics/fusion-can-we-bottle-a-star.html` (commit 62abe3f there); working copy stays here. Iteration levers + full arc: ROADMAP.md Phase 1.
2. **Merge** the chain (command above).
3. Optional: create a private GitHub remote so the CI render workflow runs.

## Next build steps (in order)
1. v2 port after gate: new `bars` beat kind (statement zone + IN/OUT bars + shot attempts + zoom + need-bar), 1:1 from `animatics/howclose-fusion-v2.html` rev6. **Scene durations must derive from `vo-timing.json` when modules.vo is on** - measured VO is 33s vs 29s picture; VO timing is authoritative.
2. Assemble the finished v2 video: compose -> polish (real music track needed - none chosen yet) -> lint -> review sheet.
3. **First real Regulate video (mockup-first):** script.json from one of the six approved motion concepts (hivemind marketing/motion-drafts.html; "The Sigh" hook "Can't meditate? Neither could we." is the natural first) -> Fable animatic against the Brand Book laws -> KEEP/TWEAK/KILL -> port. Needs a breath-pacing beat kind the engine does not have yet (IN 4 / OUT 8 orb-free pacing per ART_DIRECTION: no floating orb, full-bleed type).
4. M3 assets (Veo free tier + Pexels + RIFE) when a script needs footage; M4 (script LLM stage, brand extractor, orchestrator, photography kit) after.

## Brand sources (taste step reads these first)
- **regulate:** Brand Book = source of truth (`~/Documents/regulate-hivemind/marketing/BRAND_BOOK.html`, artifact 2c016ffe-80f4-4378-ab52-18db5187d841). Laws: dot always white · a state colour names a state · emerald is the ground, white is theirs · teal is a supplement. Display Playfair (app's Cormorant is drift). `brands/regulate/brand.json` voice.notes carries the laws + bans.
- **howclose:** brand book artifact a9221676-6c46-4d8d-9edf-2a2af0df1c1e + repo docs.

## Environment facts (hard-won)
- Audio venv MUST be Python 3.12 (`python3.12 -m venv audio/.venv`) - kokoro has no 3.14 wheels. Setup in `audio/README.md`.
- Codex sandbox: no Chromium, no network - renders and installs are reviewer-run.
- Kokoro new API yields Result objects (.audio), not tuples - handled in bin/vo.py.
