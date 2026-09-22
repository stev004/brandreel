# brandreel roadmap - the goal ladder

Updated 2026-09-22. STATE.md = now; this file = the ordered list of goals until the engine is complete. It is written so an autonomous model can take the next goal cold, with no chat context, and know exactly when it is done.

## How to work this file (any model, any session)

1. Read `AGENTS.md`, `SPEC.md` (rulings are settled), `STATE.md` (current truth), then this file.
2. Take the **first goal whose box is unchecked and whose Blocked-on line is empty**. Goals are ordered; do not skip ahead unless the earlier goal is blocked on Steven.
3. Branch from `main`: `git checkout -b feature/<goal-id>`. Never commit to `main`; Steven merges.
4. Do only what the goal says. If you find you need more than its Files line allows, stop, write what you found in STATE.md under "Open threads", and pick the next unblocked goal.
5. A goal is done only when every line of its Done-when passes as a shell command you actually ran. Paste the outputs in your commit message or in `docs/runs/`.
6. Before you stop: tick the box here, update STATE.md (delete finished items, add the resume point for anything half done), add a dated entry to SESSIONS.md (newest first), commit, push the branch, and tell Steven the exact merge command.
7. Goals marked **Blocked-on: Steven** need a human answer. Leave them, do not guess, do not fake the answer.

Gates that must stay green on every branch (CI runs them on push):

```bash
cd engine && npm run typecheck && npm test && cd .. && node --test bin/tests/
```

Local setup if `engine/node_modules` is missing: `cd engine && npm ci`. Renders need Chromium and ffmpeg (both present in CI; locally `node bin/compose.mjs <workspace>`). Audio needs a Python 3.12 venv per `audio/README.md`.

## Goal 0 - merge the last foreman branch

- [x] **G0** Merge `feature/hook-validation` into `main` (done 2026-09-22).
  Blocked-on: **Steven** (protected branch).
  Command: `git -C ~/Documents/brandreel merge --no-ff feature/hook-validation`. Expect conflicts in `STATE.md` and `SESSIONS.md` only (docs; keep both sides, main's animatic history plus the branch's hook-validation entry). Code merges clean.
  Done-when: `node --test bin/tests/` reports 116 pass on main; `git branch --merged main | grep hook-validation`.

## Goal 1 - the first real Regulate video (3:04 AM), animatic already KEPT

- [x] **G1a** Add the `exhale` beat kind to the engine, 1:1 with `animatics/regulate-3am.html` (its header comment is the porting contract; `animatics/regulate-3am.plan.md` has the decisions). Engineering acceptance passed 2026-09-22; rendered fidelity remains G1b. Evidence: `docs/runs/2026-09-22-g1a-exhale.md`.
  Files: `engine/src/schema.ts` (new beat kind), `engine/src/templates/Exhale.tsx` (new), `engine/src/templates/Moment.tsx` (consume placed thoughts), `engine/src/layout.ts` (constants + computeTextBoxes + computeTimeline for the new kind), `engine/src/manifest.ts` (serialize non-text column and dot geometry), `engine/src/Stack.tsx` (dispatch), `engine/tests/*`. The `moment` beat gets optional per-thought `{x, y}` placement so S1 thoughts sit where the animatic puts them (absolute stage coordinates), because the exhale scene shares those positions. Scope corrections 2026-09-22: Moment.tsx is required by the stated placement deliverable; manifest.ts is required by the column/dot geometry acceptance check. Non-text geometry is separate from text elements; non-text overlap remains G4b.
  Done-when: gates green; `engine/tests/` has a test that builds the manifest for a script with an `exhale` beat and asserts the column, dot travel and thought boxes at the header's px values; `node bin/manifest.mjs workspace/regulate-3am` writes layout.json with an `exhale` beat's elements.
- [ ] **G1b** Author `workspace/regulate-3am/script.json` from the animatic header (copy list verbatim, scene durations 6.5 / 10.6 / 2.5 s, close per the plan; total 19.6 s), render, lint, review.
  Blocked-on: **Steven** (approved label positions exceed safe zones; approved close timing conflicts with CTA dwell). Script/layout/lint draft exists. Close rendering also needs an engine extension beyond this goal's original file list; see STATE.md Open threads and the G1a run note.
  Files: `workspace/regulate-3am/script.json` only (plus the committed `layout.json` and `lint-report.json` it produces).
  Done-when: `node bin/reel.mjs workspace/regulate-3am --skip vo,align,polish` exits 0 with every rule `pass` in `lint-report.json`; a frame strip (`bin/animatic-strip.mjs` on the animatic vs ffmpeg frames from `render.mp4` at the same clock times) shows the same geometry at 0.15 s, 7.0 s, 9.1 s, 17.0 s; frames filed under `docs/runs/frames/`.
- [ ] **G1c** Steven watches `workspace/regulate-3am/render.mp4` and marks `review.md`.
  Blocked-on: **Steven** (KEEP / TWEAK / KILL). A port that looks worse than its animatic goes back to G1a.

## Goal 2 - voice on the first video (only if Steven wants VO)

- [ ] **G2** Record or synthesise VO for 3:04 AM and let `vo-timing.json` drive scene durations.
  Blocked-on: **Steven** (his own voice vs Kokoro; the plan says his voice if any). If Kokoro: brief `voice: "af_heart"` (or the id Steven picks), then `audio/.venv/bin/python bin/vo.py workspace/regulate-3am`, `bin/align.py`, `node bin/polish.mjs workspace/regulate-3am --music <cc0 file>`.
  Done-when: `final/reels.mp4` exists, `lint-report.json` loudness rule passes (-14 LUFS +/-1, TP <= -1.0), karaoke captions visible in a frame under `docs/runs/frames/`.

## Goal 3 - the second Regulate video (The Sigh)

- [ ] **G3a** Author `animatics/regulate-sigh.html`: orb-free, breath-paced (IN 4 / OUT 8), full-bleed type, from the brief in `workspace/regulate-sigh/brief.json` and the Brand Book laws in `brands/regulate/brand.json` voice.notes. SPEC ruling 7 applies: animatic first, header carries the scene table and px/ms values.
  Blocked-on: **taste seat** (Fable authors animatics per SPEC ruling 7; another model may draft, but it goes to Steven's gate either way).
- [ ] **G3b** Steven gates the animatic. Blocked-on: **Steven**.
- [ ] **G3c** Port 1:1 (new beat kind only if the header needs one), render, lint, review; Steven gates the render.

## Goal 4 - lint accuracy (engineering, no gate needed)

- [x] **G4a** Real glyph measurement replaces the 0.52 / 0.55 / 0.60 em estimate in `engine/src/manifest.ts`: a `Measure` composition (or a headless script under `bin/`) renders each manifest element's text in its real font and writes `measuredLines` and `measuredWidthPx` into `layout.json`; `bin/lint-rules.mjs` text-fit prefers measured values when present. Done 2026-09-22 on `feature/G4a`; real Chromium fixture and both Sigh measurement/fallback paths verified. Evidence: `docs/runs/2026-09-22-g4a-measurement.md`.
  Files: `engine/src/manifest.ts`, `engine/src/layout.ts` (GLYPH_EM stays as the fallback), `bin/manifest.mjs`, `bin/measure-text.mjs` (same-stage headless helper), `bin/lint-rules.mjs`, tests, fixtures. The helper is the headless-script option named in this goal; it is not a new pipeline stage.
  Done-when: gates green; a fixture with a 44-char Playfair line in a 900 px box reports measuredLines from real metrics; `node bin/lint.mjs workspace/regulate-sigh --no-render` still passes; the estimate path still works when Chromium is absent (`--no-measure`).
- [x] **G4b** Overlap lint covers non-text elements: the manifest emits boxes for the figure axis, bars, rings, flash dot, the CloseD logo and the exhale column; `overlap()` treats them as opaque.
  Evidence: `docs/runs/2026-09-22-g4b-overlap.md` (42 engine tests, 137 CLI tests, both fresh baseline manifests pass).
  Done-when: a fixture with a text box crossing a bar box fails `[overlap]`; `workspace/regulate-sigh` and `workspace/smoke-3am-v3` still pass.
- [ ] **G4c** Pin Remotion: replace caret ranges in `engine/package.json` with exact versions (all `@remotion/*` and `remotion` identical), regenerate the lockfile.
  Done-when: `node bin/compose.mjs workspace/demo` prints no "version mismatch" warning; CI green.

## Goal 5 - footage (M3): assets, conform, Broll

- [ ] **G5a** `bin/assets.mjs <workspace>`: resolves each beat's `visual` directive. `template:` needs nothing; `stock:` queries Pexels then Pixabay (free keys from env `PEXELS_API_KEY` / `PIXABAY_API_KEY`, never committed) and downloads the best vertical match; `gen:` writes `assets/veo-manifest.json` (prompt per beat) for manual or later automated fetch. Writes `assets/manifest.json` mapping beat index to file.
  Files: `bin/assets.mjs`, `engine/src/schema.ts` (optional `visual` on beats and a new `broll` beat kind: clip path, overlay text, caption source), `bin/tests/`, README.
  Done-when: `node --test bin/tests/` covers a stubbed fetcher (no network in tests); `node bin/assets.mjs <ws> --dry-run` lists what it would fetch; missing keys produce a clear exit 1, not a crash.
- [ ] **G5b** `bin/conform.mjs <workspace>`: every clip in `assets/` becomes 1080x1920 @ 60 fps mezzanine (ffmpeg scale/crop/pad; clips under 60 fps go through Practical-RIFE 4.25 when `audio/.venv` has it, else ffmpeg minterpolate with a warning). Writes `assets/conformed/`.
  Done-when: ffprobe on every conformed file shows 1080x1920, 60/1; a test uses a generated 2 s colour clip at 30 fps.
- [ ] **G5c** `Broll` template in the engine: mezzanine clip + karaoke captions (from `words.json`) + safe-zone text overlay + brand watermark; manifest boxes for the overlay and captions; `bin/reel.mjs` gains `assets` and `conform` stages that run only when a beat has a `visual` directive.
  Done-when: gates green; a demo workspace with one `broll` beat over a generated colour clip renders, and lint passes; the `stock:` path is proven once by hand with a real key (evidence frame under `docs/runs/frames/`, key never in the repo).

## Goal 6 - more brands (M4 remainder)

- [ ] **G6a** `bin/extract-brand.mjs <source-folder> <out brand.json>`: scans CSS custom properties, tailwind config, TS token files, font files, logo SVGs, and prose docs; emits a schema-valid `brand.json` with `voice` filled by a model call (`--model-cmd`, default `claude -p`) and every colour/font traceable to a source file (write a `provenance` sidecar). Never invents values: anything not found is left for a human with a `TODO` marker that the schema rejects until filled.
  Done-when: pointed at `~/Documents/howclose.to`, the output validates against `engine/src/schema.ts` and its palette matches `brands/howclose/brand.json` (the curated kit) except where the sidecar names a newer source.
- [ ] **G6b** `brands/photography/brand.json` (Matson Studios) curated by Steven or extracted with G6a, then one silent music-only video through the pipeline (no VO module).
  Blocked-on: **Steven** (brand facts are curated, never invented).

## Goal 7 - music

- [ ] **G7** `bin/music.mjs <workspace> --query "<mood>"`: fetches a CC0 track (Free Music Archive or Pixabay Music, free keys via env), writes `music.wav` and a `music.json` with licence, source URL and attribution; `bin/polish.mjs` reads `music.json` and puts the attribution into `review.md`. Steven's ruling (G3, 2026-09-05): CC0 only, "whatever works".
  Done-when: a stubbed fetch is tested; one real fetch proven by hand with the attribution visible in a `review.md` under `docs/runs/`.

## Goal 8 - howclose.to fusion video (parked on taste)

- [ ] **G8a** Iterate `animatics/howclose-fusion-v2.html` past Steven's gate (parked at rev6, "still not great"; levers in `animatics/howclose-fusion-v2.plan.md`). Blocked-on: **Steven** and the taste seat.
- [ ] **G8b** Port: new `bars` beat kind (statement zone, IN/OUT bars, shot attempts, zoom, need-bar), scene durations from `vo-timing.json` (measured VO 33 s vs 29 s picture; VO timing wins). Then compose, polish with music, lint, review.

## Goal 9 - distribution (after the first KEEP on a rendered video)

- [ ] **G9a** Handoff folder per platform (`final/<platform>.mp4`, caption, first comment, alt text, hashtags from `review.md`) and a documented manual posting routine. Publishing stays human (SPEC ruling 6).
- [ ] **G9b** After about four weeks of real posting: a measurement note per video in `docs/runs/`, and any lint or limit the numbers argue for.
  Blocked-on: real posts existing.

## Standing quality laws (SPEC.md ruling 9 - every video)

coreMechanic first · copy list is the contract · style as constraints · motion semantics (records ratchet, events snap, struggles crawl; narrated figure over information graphic; absence rendered as failing effort, never stillness) · mockup gated before any port · human KEEP/TWEAK/KILL always.

## Done so far (for orientation; details in SESSIONS.md and docs/runs/)

Engine at 60 fps with Moment, Question, Figure, Verdict templates and a two-row close; brand kits regulate and howclose; stages interview, script (brief-enforced, lint-and-retry), manifest, compose, lint (eleven rules), review, reel orchestrator; VO (Kokoro), alignment (stable-ts), polish (loudnorm) verified once; karaoke captions; CI on GitHub renders and lints every push; the 3:04 AM animatic KEPT 2026-09-13.
