# G4c exact Remotion versions - 2026-09-22

Luna xhigh pinned the four direct Remotion dependencies to 4.0.520. All 28 locked Remotion packages already had that version. Root lockfile declarations were regenerated from the package declarations without replacing package records.

The reviewer found that Remotion 4.0.520 also requires Zod 4.4.3 for its version check. Pinning Remotion alone still printed a mismatch for the old direct Zod 3.25.76 package. The existing lockfile already contained Zod 4.4.3 transitively. Luna updated the direct Zod declaration and reused that exact tarball/integrity for the top-level record; both engine schema imports now use `zod/v3`. This preserves the v3 schema API, which Remotion explicitly supports, while meeting its package version check. No new dependency was added. Nested duplicate Zod records were retained to avoid unrelated lockfile churn.

## Reviewer verification

```text
cd engine && npm ci --offline --no-audit --no-fund
added 293 packages in 6s
exit 0

npm run typecheck && npm test
Typecheck: exit 0
Test Files 8 passed (8)
Tests 42 passed (42)

node node_modules/@remotion/cli/remotion-cli.js versions
On version: 4.0.520
Extra packages: zod@4.4.3
All packages have the correct version.
exit 0

node --test bin/tests/
tests 137
pass 137
fail 0
```

The offline clean install was reviewer-run outside the executor sandbox using cached packages. CI at implementation commit `44f3ad7` passed: https://github.com/stev004/brandreel/actions/runs/35677647641. The reviewer retrieved the full log, asserted it contains `node bin/compose.mjs workspace/demo`, and asserted case-insensitive `version mismatch` is absent. Render, lint, review and upload all succeeded.
