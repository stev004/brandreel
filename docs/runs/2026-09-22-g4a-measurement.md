# G4a real font measurement - 2026-09-22

G1a was merged and pushed to main at `4cd74ec` at Steven's request. Its main CI run passed: https://github.com/stev004/brandreel/actions/runs/35674978997.

G4a is complete on `feature/G4a`. Two Luna xhigh workers implemented; the parent orchestrated, reviewed, and ran actual Chromium acceptance. No dependency or font installation was performed.

## Behavior

The manifest now carries the renderer's text family, style, weight, whitespace, casing, and numeric-variant metadata. The manifest CLI attempts DOM measurement using installed Chromium and the font variants specified by the existing Remotion Google Fonts package. Text is inserted with textContent, measured without clipping or line clamps, and recorded as optional measuredLines and measuredWidthPx.

Text-fit uses a valid measurement pair in preference to estimatedLines, detecting both excess lines and horizontal overflow. Partial or invalid measurement data fails lint. Unknown fonts, unsupported glyph coverage, failed font loads, and unavailable browsers retain estimates with explicit warnings. The helper does not download Chromium.

Offline invocation:

```bash
node bin/manifest.mjs workspace/regulate-sigh --no-measure
```

`BRANDREEL_NO_MEASURE=1` provides the same behavior for callers such as script/reel. `BRANDREEL_CHROME_EXECUTABLE` selects an installed browser. The CLI test runner sets the offline flag before importing suites; its measurement tests use injected browsers and never require network access.

Review caught and corrected font matching details: Question headlines remain normal even if the brand display face is italic; Moment casing applies only to its eyebrow; Source Serif 4 registers as Source Serif Four; requested CSS500 resolves to the renderer's loaded400 face rather than loading an extra weight. Browser launch/page/evaluation/cleanup waits are bounded, and uppercase-transformed text is checked against font glyph coverage.

## Verification actually run

```text
engine/: npm run typecheck
exit 0

engine/: npm test
Test Files 7 passed (7)
Tests 39 passed (39)
exit 0

node --test bin/tests/
tests 130
pass 130
fail 0
cancelled 0
skipped 0
todo 0
exit 0

git diff --check
exit 0
```

Reviewer-only actual browser checks used installed HeadlessChrome 153, outside the executor sandbox. The fixture is `bin/tests/fixtures/manifest-measure.json`: 44 characters in Playfair Display at 64px, a 900px box, and 1.2 line height. `measureLayoutElements` returned:

```json
{"measuredLines":2,"measuredWidthPx":779.53125}
```

There were no warnings. Raw output is in `2026-09-22-g4a-playfair.json`. A follow-up actual browser check of the same text at Source Serif CSS500 and CSS400 returned two lines and 822.21875px for each, with no warnings, confirming the loaded-weight matching. Inputs/results are in `2026-09-22-g4a-font-variants.json`.

The reviewer also ran, sequentially:

```text
node bin/manifest.mjs workspace/regulate-sigh
exit 0; 20 text elements, all 20 measured

node bin/lint.mjs workspace/regulate-sigh --no-render
exit 0; no violations

node bin/manifest.mjs workspace/regulate-sigh --no-measure
exit 0; disabled notice; no measured fields remained

node bin/lint.mjs workspace/regulate-sigh --no-render
exit 0; no violations
```

Both lint runs passed safe-zone, text-fit, hook, pacing, CTA, and overlap. Width, height, fps, duration, and pixel-bands were skipped because no new video render was requested for this milestone. The workspace's original generated files were restored after the checks.

## Limits and next step

Measurement currently follows the renderer's supported Google Fonts families and Latin subset. Other glyphs retain estimates rather than claiming exact measurements from fallback fonts. Typography metadata and the helper's loaded-weight list must track renderer font changes. Measured text-fit does not alter safe-zone geometry or implement non-text overlap.

Next unblocked goal is G4b. G1b's approved-layout and close-timing decisions remain with Steven; this milestone does not resolve or override them.
