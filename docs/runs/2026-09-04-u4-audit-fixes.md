Implemented all four fixes within scope.

- F1: Explicit music now activates polish and forwards `--music <file>`. Before: regression failed and dry-run omitted polish. After: bin tests pass 14/14; both flag and `=` forms work.
- F2: Added `## CTA` rendering line, tagline, and URL. Before: CTA regression failed. After: passes.
- F3: Reworked deterministic half-open caption window selection and overlap handling. Before: 2 caption tests failed. After: engine tests pass 19/19.
- F4: `bin/tests/index.js` now imports script tests. Directory run increased from 7 to 14 tests.

Acceptance:

- `node --test bin/tests/`: 14 passed
- Dry-run includes:
  `polish: node bin/polish.mjs workspace/demo --music audio/custom.wav`
- `npm run typecheck`: passed
- `npm test`: 19 passed
- `git diff --stat`: 6 allowed files only, 68 insertions, 24 deletions
- `git diff --check`: clean