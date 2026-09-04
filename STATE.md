# STATE - brandreel snapshot

*Updated 2026-09-04 (evening, foreman run). Snapshot of current truth; history in SESSIONS.md and git.*

## Where things stand
- **Branch chain (all local, no remote):** `main` <- `feature/m1-engine` <- `feature/howclose-trial` <- `feature/regulate-kit` <- `feature/phase2-machine` (merged to main fce5a38) <- **`feature/layout-lints`** (09-04 second foreman run: layout manifest stage, safe-zone/text-fit/hook/pacing/cta/pixel-band lints, script.mjs lint-and-retry loop with geometry-derived copy limits). **One merge gets everything:** `git -C ~/Documents/brandreel merge --no-ff feature/layout-lints`. Live worktrees: /tmp/brandreel-reg-wt (reg-kit, provides engine/node_modules), /private/tmp/fm-brandreel-state (layout-lints). fm/* branches are merged and disposable.
- **Gates all green on layout-lints:** typecheck, 27 engine tests, 46 bin tests (`node --test bin/tests/`). Chain: `node bin/script.mjs workspace/<id> --brand regulate --topic "..."` (claude -p; retries against the manifest lints) -> `node bin/reel.mjs workspace/<id> --skip vo,align,polish` (manifest -> compose -> lint -> review). workspace/smoke-3am-v2 passes all 10 lint rules; the older workspace/smoke-3am is kept as the failing baseline (25 violations). Audio venv not present in these worktrees (rebuild per audio/README.md).
- **Lint coverage now:** ffprobe facts, safe zones + text fit from layout.json (glyph-width estimate), hook, pacing (static > 3s), CTA (WEAK: only close.line non-empty, and CloseD hides close.line when tagline/url exist; real rule is gate G5), pixel bands on sampled frames. Not covered: caption vs Moment-thought overlap (same lower zone), real glyph measurement (estimate only).vo/music.

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
