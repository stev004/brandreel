## Attention list

1. **Medium — “close max 3800ms always keeps pacing valid.”**  
   **Finding:** Sound for CloseD with a URL: last change at +900ms, static tail ≤2900ms. Unsound for a plain close: last change is +0ms, so an accepted 3800ms close leaves 3800ms static and fails pacing.  
   **Reference:** [layout.ts](/private/tmp/fm-brandreel-state/engine/src/layout.ts:407), [script.mjs](/private/tmp/fm-brandreel-state/bin/script.mjs:34), [lint-rules.mjs](/private/tmp/fm-brandreel-state/bin/lint-rules.mjs:81).

2. **Medium — “CTA on screen >=2500ms.”**  
   **Finding:** v3’s qualifying tagline is scheduled at +500ms and the report computes 28000−25500=2500ms. But the rendered `phaseIn` opacity is exactly zero at its start frame; at 60fps it first becomes nonzero one frame later, leaving roughly 2483ms of actually visible frames.  
   **Reference:** [v3 layout](/private/tmp/fm-brandreel-state/workspace/smoke-3am-v3/layout.json:405), [Close.tsx](/private/tmp/fm-brandreel-state/engine/src/components/Close.tsx:106), [ease.ts](/private/tmp/fm-brandreel-state/engine/src/ease.ts:8).

3. **Medium — CTA lint fails open on malformed timing.**  
   **Finding:** A qualifying close text element with missing/non-numeric `fromMs`, or a missing `totalDurationMs`, yields `ctaDwellMs: null` and no CTA violation. The generated manifests have valid timing, but the assertion itself does not prove dwell unless it fails closed.  
   **Reference:** [lint-rules.mjs](/private/tmp/fm-brandreel-state/bin/lint-rules.mjs:106).

4. **Medium — “overlap rejects intersecting visible text boxes.”**  
   **Finding:** It covers only non-empty-text manifest elements. It cannot detect collisions involving the Figure axis, solid/dashed bars, goal ring, flash dot, or CloseD SVG logo; the logo is represented with empty text and filtered out. Plain-close wordmark is covered, contrary to the suggested blind-spot example.  
   **Reference:** [lint-rules.mjs](/private/tmp/fm-brandreel-state/bin/lint-rules.mjs:134), [layout.ts](/private/tmp/fm-brandreel-state/engine/src/layout.ts:826), [Figure.tsx](/private/tmp/fm-brandreel-state/engine/src/templates/Figure.tsx:191).

5. **Low — roadmap freshness.**  
   **Finding:** `ROADMAP.md` contains the third-run update but its header still says “Updated 2026-09-03.” `STATE.md`, `FRONTIER.md`, `GATES.md`, and `RUN.md` otherwise reflect the third run.  
   **Reference:** [ROADMAP.md](/private/tmp/fm-brandreel-state/ROADMAP.md:3).

Verified: C1/C2/C3 are ancestors of `HEAD`; 54 bin and 29 engine tests pass; v3 manifest regenerates cleanly; no-render lint passes with `ctaDwellMs: 2500`; archived v3 evidence exactly matches the tracked report and referenced evidence files exist. A logo-only close correctly fails CTA.

AUDITOR: gpt-5.6-terra