# SESSIONS - append-only log, newest first

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
