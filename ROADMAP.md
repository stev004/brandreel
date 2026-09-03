# brandreel roadmap

Where the pipeline goes from here. STATE.md = now; this = the arc. Updated 2026-09-03.

## Phase 1 - finish the first real video (fusion, howclose)
- [ ] Iterate the animatic past Steven's gate (rev6 parked "still not great"; working copy `animatics/howclose-fusion-v2.html`, parked copy in howclose.to repo `marketing/animatics/`). Next levers: scene 1/2 typography energy, statement copy voice pass against the brand book, maybe motion on the bars' entrances, test with the VO played alongside.
- [ ] v2 port (Codex brief ready in spirit: `bars` beat kind, rev-N geometry 1:1, scene durations derived from `vo-timing.json`).
- [ ] Pick/produce a music track (nothing chosen; needs a free source decision - CC0 library vs generated).
- [ ] Assemble: compose -> polish -> lint -> first finished video with VO + music.

## Phase 2 - make it a weekly machine
- [ ] `bin/reel.mjs` orchestrator chaining the stages per script.json modules.
- [ ] `bin/script` LLM stage (topic + brand.json -> script.json with required coreMechanic, hook-archetype constraints, banned phrases).
- [ ] `bin/review` - review sheet with KEEP/TWEAK/KILL boxes per video.
- [ ] Karaoke word-timed captions in the engine (words.json exists; Caption component consumes it).
- [ ] GitHub remote + CI renders on push (workflow already written).

## Phase 3 - footage + more brands
- [ ] `bin/assets`: Pexels/Pixabay fetcher + Veo free-tier prompt manifests; `bin/conform` RIFE 60fps.
- [ ] `Broll` template (clip + captions + safe-zone overlays).
- [ ] `bin/extract-brand` + onboard photography (Matson Studios) and regulate content kits.
- [ ] Optional paid plug-ins behind the same interfaces when earned: ElevenLabs VO, fal.ai clips, Higgsfield cinema.

## Phase 4 - distribution (post first posts, per sequence doctrine)
- [ ] Handoff folder -> rented scheduler; first-party APIs only if renting fails.
- [ ] Measurement loop after ~4 weeks of real posting.

## Standing quality laws (SPEC.md ruling 9 - every video)
coreMechanic first · copy list is the contract · style as constraints ·
motion semantics (records ratchet, events snap, struggles crawl; narrated
figure over information graphic; absence rendered as failing effort, never
stillness) · mockup gated before any port · human KEEP/TWEAK/KILL always.
