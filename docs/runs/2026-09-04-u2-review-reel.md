Implemented:

- [bin/review.mjs](/private/tmp/br-u2-bin/bin/review.mjs): generates review sheets with metadata, checkboxes, caption, hashtags, TODO fallbacks, lint summary, and output files.
- [bin/reel.mjs](/private/tmp/br-u2-bin/bin/reel.mjs): module-aware stage orchestrator with range, skip, music, and dry-run support.
- [bin/tests/](/private/tmp/br-u2-bin/bin/tests/): 7 node:test cases.
- [README.md](/private/tmp/br-u2-bin/README.md): usage examples.

Acceptance results:

- `node --test bin/tests/`: 7 passed, 0 failed.
- Dry run output:

```text
compose: node bin/compose.mjs workspace/demo
lint: node bin/lint.mjs workspace/demo
review: node bin/review.mjs workspace/demo
```

- `node bin/review.mjs workspace/demo`: succeeded; generated all three required checkboxes.
- `grep -rn "/Users/" bin/`: no `/Users/` paths.
- `git diff --check`: passed.
- No real rendering or audio stages were run.

`workspace/demo/review.md` was removed after verification to preserve the no-touch workspace scope.

Git diff stat:

```text
 README.md | 12 ++++++++++++
 1 file changed, 12 insertions(+)
```

New untracked files are limited to the scoped `bin/` files. Pre-existing `engine/node_modules` remains untouched.