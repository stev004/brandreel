# SESSIONS - append-only log, newest first

## 2026-09-05 - foreman run 4: interview stage + remote
Steven merged cta-lint (fb3f599), resolved G1 (public remote, created), G3 (CC0 by path), G6 (two rows). Run landed on feature/interview: bin/interview.mjs + brief-enforced script.mjs, two-row tagline, thought/drift geometry model, lint-implying duration limits, CI with ffmpeg. First brief-driven video workspace/regulate-sigh passes all lints on the model's first attempt. Digest docs/runs/2026-09-05-digest-interview.md. Waiting on Steven: merge feature/interview, KEEP/TWEAK/KILL on regulate-sigh.

## 2026-09-04 (latest) - foreman run 3: CTA lint
Steven merged layout-lints to main (2fd01a5) and started the CTA run. Landed on feature/cta-lint: cta lint from rendered close elements with 2500ms dwell, overlap lint (found two Figure template collisions, fixed), thought geometry derived from the caption box, script.mjs --url and close duration limits. smoke-3am-v3 passes all 11 rules. Digest docs/runs/2026-09-04-digest-cta-lint.md. Waiting on Steven: merge cta-lint, G1 remote.

## 2026-09-04 (late) - foreman run 2: layout lints
Steven merged phase2-machine to main (fce5a38) and started the layout-lints run. Landed on feature/layout-lints: bin/manifest.mjs (stage 5 layout.json), lint rules safe-zone/text-fit/hook/pacing/cta/pixel-bands, engine geometry fixes (figure ring, goalText box, dissolve events), script.mjs lint-and-retry with geometry-derived limits. smoke-3am: 25 violations before, smoke-3am-v2: 0 after. Digest docs/runs/2026-09-04-digest-layout-lints.md. Waiting on Steven: merge layout-lints, G5 close dwell, G1 remote.

## 2026-09-04 (evening) - foreman run: Phase 2 engineering
Director Fable 5.1, executor Codex gpt-5.6-luna, auditors sol + terra. Landed on feature/phase2-machine: karaoke captions, bin/review.mjs, bin/reel.mjs, bin/script.mjs, audit fixes; full chain proven with a real model (workspace/smoke-3am). State tower in .claude/ (DIRECTOR/FRONTIER/GATES/RUN/decisions.tsv), evidence in docs/runs/. Digest: docs/runs/2026-09-04-digest.md. Waiting on Steven: merge (G2), remote (G1). Next predicate: layout manifest + safe-zone/text-fit lints.

## 2026-09-04 - Regulate kit refreshed from the Brand Book

**Summary:** The Regulate Brand Book was published the same day (hivemind `marketing/BRAND_BOOK.html`, artifact 2c016ffe). The taste pass against it found the kit shipping a cream wordmark dot (#F2F0E9) - a violation of law 1 - plus an invented `extras.sage` and a placeholder voice. Kit refreshed: dot #FFFFFF (also `extras.dot`), sage dropped, voice filled with the book's tone, four laws, copy bans and message order. Steven's rulings carried in: Playfair Display canonical, #4FD1C5 accent as a supplement only, wordmark only (no symbol).

**Template fix:** `Close.tsx` set the wordmark in the body face; a wordmark takes its brand's display face, upright, 500. Because a kit may load its display face as italic, `resolveFonts` now also returns `displayUpright` (normal-style load of the same family). Brand-agnostic, applies to howclose too.

**Tests:** `schema.test.ts` asserted the cream dot - it had encoded the violation. Now asserts the white-dot law on both `wordmark.dotColor` and `extras.dot`.

**Verified:** typecheck clean · 12/12 tests · demo compose + lint green (1080x1920 @ 60, 15.9s) · frames checked: Playfair wordmark, white dot.

**Not done (by design):** no new animatic - Phase 1 is howclose and parked on Steven; the first real Regulate video is queued in STATE.md next steps and needs a breath-pacing beat kind.

## 2026-09-03 (later) - graph iteration to rev6 via design agent + Steven's critiques

**Summary:** the fusion animatic went rev4 -> rev6 in one sitting, each rev driven by a Steven critique. rev4: Fable design-agent spec (zoned layout, right rail, reused y1000 slot) - superseded same day. rev5: pollar.news-style rebuild (one swapping 60px serif statement replaces ledger+rail; bars tripled, 1x=400px; zoom to 0.08 makes the 30x need-bar land at exactly the 2.4x bar's former 960px height). rev6: total 34.8s, S3 17.5s, statements dwell 2-3s; the 2012-2021 beat now animates four red shot-bars rising to 0.93-0.98x and collapsing (effort visibly failing); statements rewritten explicit; dek moved under the S1 title. All browser-verified; artifact republished (commits 37594ec, f6f45b7, f1e8877).

**Steven's verdicts on the way:** rev4 "still looks fucked... compacted and squashed" -> think pollar.news. rev5 "best version i've seen" but too quick + decade beat weak. rev6 awaiting gate.

**Design lesson for SPEC (candidate):** short-form data video wants a narrated figure (one swapping statement + one big chart), not an information graphic; and absence must be rendered as failing effort, never as stillness.

**Resume:** Steven gates rev6 -> v2 port brief (rev6 geometry + VO-timing-driven durations) -> assemble with VO + music.

## 2026-09-02/03 - repo born: spec, M1 engine, howclose trial, audio modules

**Summary:** brandreel created from scratch (spec 382a675) and built through M1 + the howclose.to trial in one long session. Two rendered videos exist (Regulate demo 15.9s, howclose v1 18s), animatic v2 rev3 awaits Steven's gate, audio pipeline verified end to end.

**Decisions (Steven's rulings):**
- Standalone brand-agnostic repo, not hivemind-coupled; brands: regulate, howclose, photography (later).
- Mockup-first flow: HTML animatic -> KEEP/TWEAK/KILL gate -> 1:1 Remotion port (SPEC ruling 7).
- Modules per script, built only when needed (ruling 8): fusion v2 uses vo+music, no assets.
- Craft laws adopted (ruling 9): coreMechanic required per script · copy list is a contract · style as constraints · motion semantics (record ratchets, event snaps, struggle crawls; bars beat time-series for lay viewers) · 9:16 recomposed never cropped.
- Fusion video: full 30s arc, music + Kokoro VO, timeline chart REPLACED by two bars (ENERGY IN vs OUT) after Steven's "simple and visually clear" ruling.
- Higgsfield: paid, shelved; its prompt-discipline doc audited and the craft absorbed into ruling 9. Not for Regulate content.

**Changes:** SPEC.md rulings 7-9 · engine M1 (schemas, config, Moment/Close/Caption, layout lint core, bin/compose, bin/lint, CI workflow) · v1 port (Question/Figure/Verdict templates, close-D, coreMechanic + modules schema) · brands/regulate + brands/howclose kits · animatics/howclose-fusion.html (v1) + howclose-fusion-v2.html (rev3) + plan file · audio modules (bin/vo.py, bin/align.py, bin/polish.mjs, audio/README.md) with reviewer fixes (Kokoro Result API, .mp4 temp extension).

**Verified:** all gates green (see STATE.md); v1 port frame-compared to its animatic; VO 73 words aligned; polish mastered to -13.75 LUFS.

**Open threads with resume points:** see STATE.md "Waiting on Steven" and "Next build steps" - gate rev3 -> merge chain -> v2 port (VO-timing-driven durations) -> assemble finished video.

**Pipeline lessons exported:** dev-delegate LESSONS.md got the caption-metadata-vs-burned-in spec-ambiguity rule.
