# AGENTS.md - brandreel

Read `SPEC.md` first; its rulings are settled (Remotion, eight file-contract stages, `brand.json` Zod boundary, 60fps, deterministic bezier only). Do not relitigate them.

## Verify
From `engine/`: `npm run typecheck` and `npm test`. For `bin/`: `node --test bin/tests/` and check the total test count, not just exit 0. Renders need Chromium and are director-run; sandboxed executors stop at typecheck + tests.

## Rules that bite here
- Stages talk through files in `workspace/<id>/` only. No cross-stage imports.
- No brand literals (hex, font family, brand words) in `engine/src/templates` or components; guard tests scan those paths.
- No new dependencies, no npm install, no network in the sandbox.
- Plain hyphens in docs and copy; no em/en dashes, no U+2212. No absolute user paths.
- Executors never commit; the director commits. Taste calls (copy, animatic quality, music) go to Steven.

If you are directing (a `$foreman` run): `.claude/RUN.md` -> `FRONTIER.md` -> `GATES.md` -> `DIRECTOR.md` in full. State branch and the missing-remote caveat are in DIRECTOR.md.
