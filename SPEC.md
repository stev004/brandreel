# brandreel - spec v1

Standalone, brand-agnostic pipeline that turns any repo's brand folder into high-quality 60fps 9:16 short-form video for social media. Fully automatable (CLI per stage, CI-renderable), modular (every stage swappable), free-first (no paid API required for the core loop).

Not coupled to any product. First three brand kits: Regulate, howclose.to, Matson Studios photography. The Regulate hivemind consumes this as a tool; nothing here imports from or writes into any brand's repo.

## Design rulings (settled 2026-09-02, do not relitigate)

1. **Engine: Remotion** (v4, TypeScript, React 19). Alternatives assessed and rejected: Revideo (OSS repo abandoned by its commercial fork), Motion Canvas (weak headless story), Diffusion Studio (v2 closed). Remotion license is free for individuals / <=3-person entities - fine for Steven; the compose stage stays behind a CLI boundary so the engine is swappable if licensing ever bites.
2. **Portability boundary: `brand.json`**, validated by a Zod schema. Every template consumes only the schema. Point the extractor at a repo's brand sources; nothing downstream knows which brand it is rendering.
3. **60fps everywhere.** One global FPS constant = 60. No per-composition overrides.
4. **Deterministic easing, no springs.** House curve per brand kit (default `cubic-bezier(0.2, 0.7, 0.2, 1)`). Spring wobble reads "chucked together" - proven in the Regulate motion iterations.
5. **Quality is lints, not vibes.** Render-time and post-render assertions fail the build (section: Lints).
6. **Human gate stays human.** The pipeline emits a review sheet; a person marks KEEP/TWEAK/KILL. Publishing is never automatic in v1.
7. **Mockup-first (added 2026-09-02, Steven's ruling after the M1 demo):** every new video concept starts life as a self-contained HTML animatic in `animatics/` - authored by the taste seat (Fable), viewable in a browser, with a scene table and exact px/ms values in its header comment. The animatic is gated (KEEP/TWEAK/KILL) before any Remotion work, and then ported 1:1: the animatic is the quality bar, and a port that looks worse than its animatic goes back. This is the flow that produced Regulate's only KEEP-grade motion work; blind template iteration is the named anti-pattern.
8. **Modules activate per script, not per pipeline.** A script declares what it needs (`modules: { vo?, music?, assets? }` in script.json); absent means skipped. A pure motion-graphics video touches no TTS, no stock, no generation. Voice and asset stages get built when the first script actually needs them, not before.
9. **Free-first asset mix:** Remotion motion graphics (brand-locked, always available) + stock APIs (Pexels/Pixabay, free) + Google AI Studio Veo free tier for hero image-to-video shots. Local model gen (MLX LTX/Wan) and paid APIs (fal.ai, ElevenLabs) are optional plug-ins behind the same asset interface - never required.

## Architecture

Eight stages. Each is an independent CLI (`bin/<stage>.mjs` or `.py`) reading/writing files in a per-video workspace directory; a thin orchestrator (`bin/reel.mjs`) chains them. Any stage can be run alone, skipped, or replaced.

```
workspace/<video-id>/
  brand.json      <- stage 0 output (or copied from brands/<name>/brand.json)
  script.json     <- stage 1
  vo.wav          <- stage 2
  words.json      <- stage 3
  assets/         <- stage 4 (+4b conform)
  render.mp4      <- stage 5
  final/<platform>.mp4  <- stage 6
  lint-report.json      <- stage 7
  review.md       <- stage 8 (review sheet with KEEP/TWEAK/KILL boxes)
```

### Stage 0 - brand-kit extractor (`bin/extract-brand`)
Input: a path to a brand source folder or repo. Scans for colors (CSS custom properties, TS token files, tailwind config), fonts (woff2/ttf, google-font names), logo/wordmark files, voice/tone prose docs, example posts. Emits `brand.json` conforming to `schema/brand.ts` (Zod):

- `name`, `palette` (bg, fg, accent, muted, plus named extras), `fonts` (display/body/mono: family + source), `logo` (path, clear-space rule, dot/accent color rule), `motion` (easeBezier, entranceMs, holdMs), `voice` (tone descriptors, banned phrases, example lines), `pillars` (content themes), `cta` (levels/ladder), `handles` (per-platform).

Extraction is agent-assisted (an LLM reads prose docs into `voice`), but the output is always schema-validated. Curated kits live in `brands/<name>/brand.json` in this repo and are the normal entry point; extraction is for onboarding a new brand.

### Stage 1 - script (`bin/script`)
LLM drafts `script.json` from a topic + `brand.json`: beats array (each: start hint, VO line, on-screen text, visual directive - template scene OR b-roll prompt OR stock query), CTA, caption, hashtags, platform targets. Prompt is constrained to hook archetypes (curiosity gap, contrarian claim, direct callout, numbered promise) and the brand's banned-phrase list. Runs via `claude -p` or any configured model CLI; the stage contract is just "valid script.json appears".

### Stage 2 - voiceover (`bin/vo`)
Kokoro-82M (Apache 2.0, runs on Apple Silicon CPU) renders VO per beat -> `vo.wav` + per-beat timing. Voice id comes from `brand.json`. Optional plug-in: ElevenLabs behind the same interface. Silent/music-only videos skip this stage (photography kit will often do this).

### Stage 3 - alignment (`bin/align`)
stable-ts force-aligns `vo.wav` against the known script text -> `words.json` (word-level timestamps). Forced alignment, not transcription - we own the script. Skipped when stage 2 is skipped.

### Stage 4 - assets (`bin/assets`)
Resolves each beat's visual directive:
- `template:` scenes need nothing - stage 5 renders them.
- `stock:` queries Pexels/Pixabay APIs (free keys), downloads best vertical match.
- `gen:` writes a prompt manifest for Google AI Studio Veo (free tier, manual or browser-automated fetch in v1) and/or optional local MLX batch / fal.ai plug-in.
All clips land in `assets/` with a manifest mapping beat -> file.

### Stage 4b - conform (`bin/conform`)
Any clip below 60fps goes through Practical-RIFE (v4.25) interpolation; everything is transcoded to a mezzanine format (ProRes or high-bitrate H.264, 1080x1920, 60fps) so stage 5 composits uniformly.

### Stage 5 - compose (Remotion project in `engine/`)
One Remotion project, 1080x1920 @ 60. Core deliverables:
- `engine/src/schema.ts` - Zod schemas for brand.json + script.json + words.json; compositions take them as input props (`--props`).
- **`Moment` template** - the flagship: a beat-driven narrative grammar generalised from Regulate's proven "3:04 AM" style: timecode/eyebrow open (mono), display-serif moment line, phased text elements (phase-in, hold, dissolve with blur+drift), full-bleed color fields, quiet close with wordmark. All copy, colors, fonts, timings from props. No inline literals.
- **`Broll` template** - video beats: mezzanine clip + karaoke word-timed captions (from words.json) + safe-zone-constrained text overlays + subtle brand watermark.
- **`Stack` composition** - sequences Moment/Broll scenes per script.json beats, handles music track + ducking envelope under VO.
- Caption component: 1-2 short lines, high contrast, active-word highlight, positioned inside safe zones.
Headless render: `npx remotion render` wrapped by `bin/compose`; must work in GitHub Actions (Chromium available there - solves the local-sandbox-can't-launch-Chromium constraint structurally).

### Stage 6 - polish (`bin/polish`)
ffmpeg: optional film grain + LUT (per brand kit), two-pass loudnorm to -14 LUFS integrated / true peak <= -1.0 dBTP, per-platform encodes (TikTok/Reels/Shorts H.264 profiles).

### Stage 7 - lints (`bin/lint`)
Fails non-zero on violation; emits `lint-report.json`:
- hook: first VO word + first visual change + first on-screen text all <= 3.0s
- captions present for 100% of VO duration (when VO exists)
- safe zones: no text/logo bbox inside top 150px, bottom 320px, right 120px (asserted from a layout manifest stage 5 emits)
- pacing: no static interval > 3.0s; visual change cadence 1.5-3s; duration 15-35s unless script.json overrides with a reason
- output is 1080x1920 @ 60fps exactly (ffprobe)
- loudness: -14 LUFS +/-1, TP <= -1.0 (ffmpeg loudnorm print_format json)
- CTA present in final 20% of timeline

### Stage 8 - review + handoff (`bin/review`)
Emits `review.md`: embedded caption/first-comment/alt-text/CTA level, per-post KEEP/TWEAK/KILL checkboxes, lint summary, file paths. Publishing in v1 = human posts from the handoff folder (or a rented scheduler). First-party posting APIs are a documented v2 option, not built.

## Milestones

- **M1 (delegate first):** repo scaffold, `schema/` (brand + script + words Zod), `brands/regulate/brand.json` hand-curated from known tokens, `engine/` Remotion project at 60fps with `Moment` template + `Stack` + caption component, `bin/compose`, `bin/lint` (fps/duration/safe-zone/hook checks), GitHub Actions render workflow, a demo `script.json` that renders a complete Regulate-styled video end to end.
- **M2:** `bin/vo` (Kokoro) + `bin/align` (stable-ts) + karaoke captions wired into `Broll`; audio lints.
- **M3:** `bin/assets` (Pexels/Pixabay + Veo prompt manifest) + `bin/conform` (RIFE); `Broll` template complete.
- **M4:** `bin/script` (LLM stage), `bin/extract-brand`, `bin/reel` orchestrator, `bin/polish`, `bin/review`; onboard howclose.to + photography kits.

## Constraints for implementers

- Node >= 20 for JS stages; Python 3.11+ venv for Kokoro/stable-ts/RIFE stages; each stage documents its own install.
- No absolute user paths anywhere (a named failure mode in prior art). Everything relative to repo root or the workspace dir.
- No stage imports another stage's internals - file contracts only.
- Codex sandbox cannot launch Chromium: implementers stop at `tsc --noEmit` + unit tests; renders are verified by the reviewer or CI, never counted against the implementer.
- Plain hyphens in all user-facing copy and docs - no em/en dashes.

## Provenance

Design synthesised 2026-09-02 from (a) an audit of the Regulate estate (Remotion project on `regulate` `development`/`feature/remotion-3am`, ART_DIRECTION.md, CADENCE.md build order, the 3:04 AM port and its review lessons) and (b) a landscape survey (Remotion vs Revideo/Motion Canvas/Diffusion Studio; MoneyPrinterTurbo and Vanta as reference architectures; Kokoro/stable-ts/RIFE/loudnorm as the free supporting stack; hook/caption/safe-zone/pacing consensus as lintable rules). The Regulate hivemind's `render-post.mjs` batch contract and launch-pack review-sheet schema informed stages 5 and 8.
