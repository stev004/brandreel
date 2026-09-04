# Foreman run digest - 2026-09-04 (second run) - layout lints

Predicate: on feature/layout-lints, stage 5 emits layout.json and stage 7 asserts safe zones, text fit, hook, pacing, CTA and pixel bands; smoke-3am fails the new lints at run start and a regenerated script passes after template and copy fixes; script.mjs sets modules only from flags. **MET** at f5db438 (plus this write-back commit).

Iterations: 3. Codex runs: 6 of 6 (luna@high), plus the terra trail audit below.

Landed (each merged --no-ff):
- L1 687ec80 engine layout manifest (manifest.ts + tsc-built CLI), compose emits layout.json
- L2 7dbf976 lint rules + pixel band sampling via ffmpeg rawvideo, 15 fixtures
- L3 ad5c787 script.mjs: modules only via --vo/--music, first copy limits
- L4 77f00f8 engine: figure ring inside the right safe zone, goalText wrapping box (2 rows), thought dissolves as timeline events
- L5 a22f617 bin: bin/manifest.mjs stage, lint --no-render, CTA rule literal, geometry-derived copy/duration limits, script lint-and-retry
- L6 3f1ffff script: per-tick limits (minTick is one character), figure static-tail rule, script-rejected.json

Evidence: before docs/runs/2026-09-04-smoke-3am-lint-before-fixes.json (25 violations) vs after docs/runs/2026-09-04-smoke-3am-v2-lint-after-fixes.json (0, 52 pixel samples); frames in docs/runs/frames/.

Discarded: nothing. Director errors caught and turned into rules (DIRECTOR.md): the CTA rule misread SPEC; copy limits were guessed instead of derived from layout constants.

Trail audit (gpt-5.6-terra) attention list, all accepted: the CTA lint is trivial and can pass on hidden text (high; next run predicate, G5); text-fit is an estimate; pixel-bands ignores uniform blocks; the retry loop is render-free; FRONTIER was stale (rewritten); provenance of the real-model run is partial (raw reply not kept). Full list: docs/runs/2026-09-04-trail-audit-terra-layout-lints.md.

Open gates: G1 remote (default not yet); G3 music (taste); G5 minimum close dwell (default: no rule, closeDwellMs reported). G2 and G4 resolved by Steven this session.

Next run's obvious predicate: Phase 1 or M3. Engineering candidates: (a) caption-vs-thought overlap rule and a real glyph measurement path (render-time DOM measurement in a Manifest composition, or a font-metrics table); (b) M3 bin/assets (Pexels/Pixabay + Veo manifest) + Broll template; (c) pin Remotion versions (warning on every render) and create the remote so CI renders run. Taste-gated: fusion animatic iteration, first Regulate video from the six approved concepts.
