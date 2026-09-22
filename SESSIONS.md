# SESSIONS - append-only log, newest first

## 2026-09-22 - G1a merged; G4a real font measurement
Steven requested the G1a merge and continued milestone work. Parent merged and pushed G1a to main at `4cd74ec`; CI passed. G1b remains blocked on its recorded layout/timing decisions, so the next engineering goal was G4a on `feature/G4a`.

Two Luna xhigh workers implemented per-element typography metadata, browser measurement with renderer fonts, measured text-fit checks, and deterministic offline unit tests. Parent reviewed font style/weight selection, bounded browser failures, transformed glyph coverage, and Source Serif's renderer family alias and loaded-weight matching. No dependencies added. Final gates: typecheck, 39 engine tests, 130 CLI tests. Real Chromium measured the 44-character Playfair fixture as two lines (779.53125px longest line in a 900px box), matched Source Serif CSS500 to its loaded400 face, and measured all 20 Sigh text elements. Sigh layout lint passed with measurements and with `--no-measure`; baseline generated files were restored after verification. Evidence: `docs/runs/2026-09-22-g4a-measurement.md`. Next unblocked goal: G4b non-text overlap.

## 2026-09-22 - G1a exhale engine and G1b draft
Two Luna xhigh workers implemented the exhale template, optional placed Moment thoughts, schema validation, shared deterministic geometry/timing, separate non-text manifest geometry, and five acceptance tests. Parent acted as orchestrator/reviewer, correcting explicit port px values, duplicate label exits, tick visibility lifetime, title visibility end times, and inconsistent text-width estimates. No dependencies added; legacy Moment behavior preserved. G1a's file list was corrected to include Moment.tsx and manifest.ts because its stated acceptance requires them.

Independent final gates: typecheck, 37 engine tests, 116 bin tests pass. `node bin/manifest.mjs workspace/regulate-3am` succeeds. G1a checked off. G1b script preserves the header copy and 6.5/10.6/2.5s schedule; layout and no-render lint report committed as a draft, not a finished video. Three IN/OUT safe-zone failures remain; close component fidelity and 2000ms intended CTA dwell versus the 2500ms rule also need resolution. No Chromium render or visual KEEP claimed. Branch `feature/G1a`; evidence and resume details in `docs/runs/2026-09-22-g1a-exhale.md`.

## 2026-09-22 - closeout: roadmap rewritten as a goal ladder
No engineering this session. Steven wants to point an autonomous model at the repo and run goals until the engine is complete, so ROADMAP.md is now an ordered ladder G0-G9 with a working protocol, Files lines, shell-checkable Done-when lines and explicit Blocked-on: Steven markers (G0 merge hook-validation; G1 exhale beat kind + 3:04 AM port + gate; G2 VO; G3 Sigh animatic; G4 lint accuracy; G5 assets/conform/Broll; G6 extract-brand + photography; G7 CC0 music fetcher; G8 fusion; G9 distribution). Found and fixed: `engine/node_modules` on main was an empty dir (all gates now green locally: 32 engine, 85 bin); `feature/hook-validation` (116 bin tests) is still unmerged and conflicts only in STATE.md and SESSIONS.md; STATE/FRONTIER/RUN/AGENTS/CLOSEOUT carried stale "no remote" and "frontier = feature/interview" lines, corrected. Waiting on Steven: merge hook-validation (G0), then G1a/G1b run.

## 2026-09-12 (latest) - rev5d: dot on the ticks
Steven on rev5c: closest ever, keep once the orb is at the top. The bottom-anchored dot (rev4, so the fill drains beneath it) had kept the mock's top-anchored translateY(-50%): 16px high at both ends. Fixed (+50%), strip-verified at 7.9-8.2s and 15.6-15.9s. Capture tools hardened: pick the 'page' DevTools target, fail loudly on socket errors (the earlier silent one-frame runs were an unsettled top-level await on a dead socket).

## 2026-09-12 (later) - rev5b/5c: watched as a strip
Steven on rev5: overlaps, transition still weird, "genuinely watch the video". Built bin/animatic-strip.mjs (dense frames named by the page clock, tiled). The strip showed what stills could not: thoughts pulsing brighter (drawn by both scenes), the wordmark fading in over the column (held crossfade ran S2->S3 too), and the incoming scene's opaque ground hiding the old thoughts. rev5c removed the held-crossfade mechanism entirely: transparent scenes on one phone ground, instant invisible switches, instrument exits at 9.9s, thoughts 4/5 earlier. Strip-verified both handovers. Lesson: verify motion as a strip; never merge two capture runs.

## 2026-09-12 - rev5: the handover
Steven on rev4: best yet, transition still snappy. Found the cause with a CDP opacity probe: the mock's `.sc.on{transition}` only fades the incoming scene; the outgoing scene loses `.on` and drops to 0 instantly (and its thoughts with it) - a snap-out under a fade-in. rev5: clock line rises out from 5.7s, incoming scene animates 0->1 over 900ms (house curve) while the player keeps the outgoing scene `.on` for 900ms, both scenes on one ground, instrument entrance +500ms, exhale from 1.4s; 19.0s. bin/animatic-frames.mjs gained a watchdog. Frames verified at 7.0 (thoughts only) and 9.1 (instrument arrived).

## 2026-09-10 - rev4: Steven's three tweaks on rev3
Steven on rev3: best so far; transition to the breathing snaps; wants one or two more thoughts; breathing game must be identical to the app. Read app/breathing.tsx + the App Store 3am frame: sage stateBalanced dot/fill/ticks, cream track 8%, 4+8 ticks, IN 4/OUT 8 rail, Exhale + seconds, track fade 450 / dot 450+300 / ticks 30ms stagger, exhale 8s Easing.in. rev4 = rev3 + T1 entrance, T2 thoughts t4/t5 (S1 6.5s), T3 app instrument (S2 9.5s); 18.5s. Verified with the new `bin/animatic-frames.mjs` after discovering the hidden pane freezes animations (false negatives). Artifact republished, same URL.

## 2026-09-05 (latest) - rev3: the mock verbatim
Steven on rev2: still not exactly the mock, "especially the first 3am part". Verified the mock = motion-drafts.html concept 3, unchanged since its single commit (07-12). rev3 embeds it byte-for-byte (whole style block, concept section, player restricted to c3) at native 300x640; the only edit is the white wordmark dot. Scaled values demoted to the porting contract. SPEC ruling 11 amended: the gate sees the mock itself; scaling happens once, in the port. Browser-verified (fade-in from black, S1, crossfade, exhale).

## 2026-09-05 (later) - rev2 after Steven's critique; SPEC ruling 11
Steven on rev1: not 1:1, motion not as smooth, text off-brand, timing off, needs continuity. Root cause: rev1 transcribed the Remotion port (ThreeAM.tsx), not the approved mock. rev2 = scaled transcription of motion-drafts concept 3 (Sx 3.6 / Sy 3.0), crossfades restored, mock easing/blur/travel carried, Playfair 400, JetBrains Mono (kit + fonts.ts registry). Mechanism: SPEC ruling 11 (lineage transcription). Browser-verified 4 points; artifact republished same URL. Gates: tsc, 32 engine + 85 bin tests.

## 2026-09-05 - 3:04 AM animatic v1 (first Regulate video)
Steven: the 3am mock "was quite good", first video is 3:04 AM, the Sigh second. Fable authored `animatics/regulate-3am.html` (15.5s) from the motion-drafts concept 3 + the regulate repo ThreeAM.tsx port, geometry 1:1, Brand Book laws applied (emerald ground, teal dot as the one live thing, white wordmark dot, Playfair). Browser-verified all three scenes. Published as an artifact for the gate; plan + port notes in `regulate-3am.plan.md`. Branch `feature/regulate-3am` off main (main already carried feature/interview, so Steven's "merge it" was a no-op).

## 2026-09-05 (later) - foreman run 5: hook archetype validation
Steven merged interview (24e275f). One Codex unit landed on feature/hook-validation: HOOK_ARCHETYPE_RULES enforced in script.mjs, figure decimals/stamp checks, script-attempts.json. regulate-sigh regenerated (accepted on attempt 2), passes all lints; a numbered-promise brief with the same hook is rejected. Digest docs/runs/2026-09-05-digest-hook-validation.md. Waiting on Steven: merge, KEEP/TWEAK/KILL.

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
