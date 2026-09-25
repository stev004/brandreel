# STATE - brandreel snapshot

Updated 2026-09-22. Current implementation is merged to `main` at `298e60d`. ROADMAP.md owns goal order and acceptance; SESSIONS.md and docs/runs/ preserve history.

## Implemented architecture and features

- **Brand boundary and renderer:** curated Regulate/howclose kits, Zod validation, 60fps Remotion, deterministic bezier motion. Templates include Moment, Question, Figure, Verdict, Exhale and Broll. Exhale and placed Moment thoughts are implemented; the first Regulate video is not yet fidelity-approved.
- **File-based pipeline:** interview/script authoring, optional voice/alignment, conditional assets/conform, manifest, compose, optional polish, lint and review. Stages exchange workspace files; assets/conform activate when a beat declares `visual`, including after script authoring. Existing voice/polish modules predate this thread.
- **Footage acquisition:** template directives need no fetch; stock directives use Pexels with Pixabay fallback; generation directives produce pending prompts for manual supply. Versioned manifests map directives and source files to conformed clips. No automated video generation is implemented.
- **Conform:** regular clips become square-pixel 1080x1920 at exact 60/1 fps, with crop/pad, optional RIFE and explicit ffmpeg interpolation fallback. The fallback is proven with real media. Actual RIFE model execution is not verified locally.
- **Broll composition:** conformed footage, script-owned overlay, brand watermark and word-timed karaoke captions. Captions use global timings, are not doubled during footage, and have matching manifest geometry. Compose validates clips and stages only selected media in a temporary public directory, then cleans up.
- **Validation:** browser glyph measurements with explicit estimate fallback; text/non-text overlap with conservative motion bounds; safe zones, hook, pacing, CTA dwell and media checks. Full-bleed footage is explicitly excluded from flat-background pixel-band checks; text and geometry checks still apply. This is reported as coverage, not pixel proof for footage.
- **Dependency stability:** Remotion packages pinned to 4.0.520; Zod 4.4.3 with the existing v3 schema API retained.

## Verified state

- Typecheck passes; 51 engine tests and 169 CLI tests pass.
- Main [CI run 35680905872](https://github.com/stev004/brandreel/actions/runs/35680905872) passed at `298e60d`, including the legacy demo render, lint and review artifacts.
- Generated Broll fixture: 1140 frames, 19 seconds, 1080x1920 at 60/1; all 11 lint rules pass. All 20 text elements were browser-measured. Pixel coverage: 38 samples, 34 checked, 4 footage samples excluded. Frame evidence and reproduction commands: [G5c run note](docs/runs/2026-09-22-g5c-broll.md).
- G0, G1a, G4a-c and G5a-b are complete and merged. G5c implementation is merged, but its real-stock acceptance requirement is still open. No rendered creative KEEP is implied by engineering fixtures.
- Implementation used Luna xhigh subagents; the parent orchestrated, reviewed, verified and committed. Steven authorized verified merges and continued work. No pending merge of the old branch chain remains.

## Waiting on Steven and open acceptance

1. **G1b label positions:** IN right edge is estimated at 997.4px, OUT at 1026.4px (limit 960px); OUT bottom including drift is 1688px (limit 1600px). Moving them changes the approved animatic. The draft preserves positions; do not weaken lint or silently change the design.
2. **G1b close timing:** the approved 2500ms close reveals its line at 500ms, leaving 2000ms against the 2500ms CTA minimum. Choose whether to extend the close by 500ms or preserve the timing and leave the conflict unresolved.
3. **G5c real stock proof:** neither `PEXELS_API_KEY` nor `PIXABAY_API_KEY` was configured during acceptance. Supply one through the environment or a local credentials-file path, never chat or the repo. Fetch, conform, render, lint and inspect one real stock clip before checking G5c complete.
4. **G6a extraction policy:** source audit found palette/font/identity/voice evidence, but not all required house motion fields (`bezier`, `entranceMs`, `holdMsDefault`). Choose an explicit provenance-backed curated-kit fallback or manual TODO completion. The extractor is not implemented. Current app category colors differ from the brand book and need recorded source precedence.
5. **Creative and brand gates:** the 3:04 AM animatic is KEPT at rev5d (2026-09-13), but its render still needs G1b fidelity work and G1c review. Optional VO needs a voice choice. The Sigh needs an animatic and human gate. Matson Studios needs curated brand facts. Fusion remains parked at rev6. **Regulate showreel** (2026-09-25, branch `feature/regulate-showreel`): animatic rev1 rendered with synthesized sound (`workspace/regulate-showreel/final/`, gitignored; hivemind copy `marketing/assets/showreel-2026-09/`), KEPT by Steven 09-25. **Reels batch 1** (01 3:04 AM scored, 02 The Sigh, 03 11:47 AM) rendered via `bin/render-reel.sh`, awaiting per-reel gate; handoff in the hivemind at `marketing/reels-2026-09/`. `--virtual` capture renders CSS-animated mocks frame-exact. Next batch: 9:58 AM, 6:12 PM, IN 4 OUT 8.

## Remaining implementation and resume order

Follow ROADMAP.md; skip human-blocked work without inventing answers.

- **G1b after decisions:** implement faithful close support (wordmark above smaller line and approved ground), render the draft and compare frames with the frozen animatic, then seek the rendered KEEP. Current Close rendering is not proof of fidelity. Use final rev5d CSS for the column's 58px right offset; the historical header says 44px. Copy follows the header as required by G1b. Kit fonts/ink differ from the frozen mock and have not been globally changed.
- **G5c:** finish the real-provider proof; renderer and generated-clip engineering are complete.
- **G6:** implement source extraction plus provenance after resolving missing facts; then onboard photography and make its first silent music-only video.
- **G7:** CC0 music fetcher and license/attribution sidecar are unimplemented. This is the first unblocked engineering goal in the current ladder. Verify a provider and each track's CC0 evidence; the named providers are roadmap candidates, not verified CC0 integrations. Do not equate royalty-free with CC0.
- **G8:** fusion animatic gate before a bars port. If voiced, scene durations must follow `vo-timing.json` (measured 33s VO versus 29s picture).
- **G9:** platform handoff and manual posting after a rendered KEEP; measurement after real posts. Publishing remains human.

## Brand sources (taste step reads these first)
- **regulate:** Brand Book = source of truth (`marketing/BRAND_BOOK.html` in the Regulate hivemind repo, artifact 2c016ffe-80f4-4378-ab52-18db5187d841). Laws: dot always white · a state colour names a state · emerald is the ground, white is theirs · teal is a supplement. Display Playfair (app's Cormorant is drift). `brands/regulate/brand.json` voice.notes carries the laws + bans.
- **howclose:** brand book artifact a9221676-6c46-4d8d-9edf-2a2af0df1c1e + repo docs.

## Environment facts (hard-won)
- **Animatic verification (strip):** `node bin/animatic-strip.mjs <file> <out> <from-ms> <to-ms>` gives ~80ms frames named by the page clock; tile with ffmpeg and READ THE STRIP, not single frames - rev5's pulse and overlap were invisible in stills. One run per strip.
- **Animatic verification (frames):** the in-app Browser pane freezes CSS animations while hidden (document.visibilityState = hidden, every animation at currentTime 0) and Chrome's --virtual-time-budget stalls rAF players. Use `node bin/animatic-frames.mjs <file> <out-dir> <ms...>` - real-time headless Chrome via DevTools protocol; frames are named by actual capture time (~2s per frame).
- Audio venv MUST be Python 3.12 (`python3.12 -m venv audio/.venv`) - kokoro has no 3.14 wheels. Setup in `audio/README.md`.
- Codex sandbox: no Chromium, no network - renders and installs are reviewer-run.
- Kokoro new API yields Result objects (.audio), not tuples - handled in bin/vo.py.
