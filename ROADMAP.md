# brandreel roadmap

Where the pipeline goes from here. STATE.md = now; this = the arc. Updated 2026-09-04.

## Phase 1 - finish the first real video (fusion, howclose)
- [ ] Iterate the animatic past Steven's gate (rev6 parked "still not great"; working copy `animatics/howclose-fusion-v2.html`, parked copy in howclose.to repo `marketing/animatics/`). Next levers: scene 1/2 typography energy, statement copy voice pass against the brand book, maybe motion on the bars' entrances, test with the VO played alongside.
- [ ] v2 port (Codex brief ready in spirit: `bars` beat kind, rev-N geometry 1:1, scene durations derived from `vo-timing.json`).
- [ ] Pick/produce a music track (nothing chosen; needs a free source decision - CC0 library vs generated).
- [ ] Assemble: compose -> polish -> lint -> first finished video with VO + music.

## Phase 2 - make it a weekly machine
- [x] `bin/reel.mjs` orchestrator (09-04, feature/phase2-machine).
- [x] `bin/script.mjs` LLM stage (09-04). Open: stop the model inventing modules.vo/music; voice id should come from brand.json.
- [x] `bin/review.mjs` review sheet (09-04).
- [x] Karaoke captions (09-04).
- [x] Layout manifest (stage 5, `bin/manifest.mjs`) + stage 7 lints: safe zones, text fit, hook, pacing, CTA, pixel bands (09-04, `feature/layout-lints`). CTA dwell + overlap lints landed 09-04 (`feature/cta-lint`). Open: real glyph measurement.
- [x] GitHub remote + CI renders on push (09-05, public repo).
- [x] Interview stage -> brief.json, script enforces the brief (09-05).

## Phase 3 - footage + more brands
- [ ] `bin/assets`: Pexels/Pixabay fetcher + Veo free-tier prompt manifests; `bin/conform` RIFE 60fps.
- [ ] `Broll` template (clip + captions + safe-zone overlays).
- [x] ~~regulate content kit~~ refreshed from the Brand Book 2026-09-04 (`feature/regulate-kit`). Still open: `bin/extract-brand` + photography (Matson Studios) kit.
- [ ] Optional paid plug-ins behind the same interfaces when earned: ElevenLabs VO, fal.ai clips, Higgsfield cinema.

## Phase 4 - distribution (post first posts, per sequence doctrine)
- [ ] Handoff folder -> rented scheduler; first-party APIs only if renting fails.
- [ ] Measurement loop after ~4 weeks of real posting.

## Standing quality laws (SPEC.md ruling 9 - every video)
coreMechanic first · copy list is the contract · style as constraints ·
motion semantics (records ratchet, events snap, struggles crawl; narrated
figure over information graphic; absence rendered as failing effort, never
stillness) · mockup gated before any port · human KEEP/TWEAK/KILL always.
