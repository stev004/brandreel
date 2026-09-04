# Foreman run digest - 2026-09-04 (third run) - CTA lint

Predicate: on feature/cta-lint, the CTA lint asserts a rendered close text element on screen >= 2500ms, an overlap lint rejects intersecting visible text boxes, script.mjs never writes a model-invented close.url and requires close.durationMs in range, Moment thoughts clear the caption box by construction; smoke-3am-v2 fails the new CTA lint and a regenerated script passes reel end to end. **MET.**

Iterations: 2. Codex runs: 3 of 6 (luna@high) plus the terra trail audit.

Landed (merged --no-ff into feature/cta-lint):
- C1 bin: cta rule reads manifest close-line/close-tagline/close-url elements, MIN_CTA_DWELL_MS 2500, ctaDwellMs in the report; overlap rule; script.mjs --url, model close.url dropped, DURATION_LIMITS.close
- C2 engine: thought geometry derived from the caption box (thoughtsTop 1079, thoughtStep 104, 40px clearance)
- C3 engine: figure counter column width (336px) and derived unit-label top (750px) remove two overlap-lint hits the new rule found inside the Figure template
- Director one-liner: close max 3800ms (a 4000ms CloseD close is static for 3100ms after its url; the cta-dwell and pacing windows must intersect)

Evidence: v2 before docs/runs/2026-09-04-smoke-3am-v2-lint-cta-before.json ([cta] 1000ms) vs v3 after docs/runs/2026-09-04-smoke-3am-v3-lint-after-cta.json (0 violations, ctaDwellMs 2500, 56 pixel samples); frames in docs/runs/frames/.

Discarded: nothing. The overlap lint immediately paid for itself by finding two template collisions nobody had seen.

Open gates: G1 remote (default not yet); G3 music (taste). G5 resolved by default (any rendered close text element, 2500ms).

Next run candidates: M3 assets (Pexels/Pixabay + Veo manifest) + Broll template; pin Remotion versions + remote + CI renders; real glyph measurement to replace the estimate. Taste-gated: fusion animatic, first Regulate video from the six approved concepts (the smoke scripts are pipeline proofs, not copy Steven has approved).

## Addendum after the trail audit (gpt-5.6-terra)
Attention list (docs/runs/2026-09-04-trail-audit-terra-cta-lint.md), all accepted: the director's close max 3800ms was variant-blind (fixed in C4: plain 3000 / tagline 3500 / url 3800); the cta rule failed open on malformed timing (fixed in C4); CTA dwell counts the fade-in frame (known, about one frame); overlap covers text elements only (known); ROADMAP header date (fixed). Also from the close frame: the model had truncated the brand tagline, so C4 drops model taglines and adds --tagline; the real Regulate tagline does not fit the CloseD row, parked as gate G6. Codex runs used: 4 of 6.
