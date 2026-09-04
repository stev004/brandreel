# DIRECTOR.md - brandreel foreman constitution

Bootstrapped unattended 2026-09-04 from CLAUDE.md, SPEC.md, .claude/DEVTEAM.md. Steven: sanity-check.

## Hard rules (pasted into every brief as STANDING)
- SPEC.md rulings are settled: Remotion, eight file-contract stages, brand.json Zod boundary, 60fps global (one constant, engine/src/config.ts), deterministic bezier only, no springs. Deviations need Steven.
- Stages talk through files in workspace/<id>/ only. No cross-stage imports.
- Zero brand literals (hex, font names, brand words) in engine templates; guard tests enforce. Brand facts only in brands/<name>/brand.json, curated never invented.
- No absolute user paths. Plain hyphens in docs and copy; no em/en dashes or U+2212.
- Codex sandbox: no Chromium, no network, no npm install, no new dependencies. Stop at `npm run typecheck` + `npm test` from engine/ (and `node --test` for bin). Renders are director-run.
- Never commit from the executor; the director commits. main is protected; Steven merges.
- No secrets, no .env.

## How we operate here
- State branch: feature/phase2-machine (git config foreman.branch). No remote exists, so fm.sh log/sync push steps fail: trail rows and state commits are done with plain git in the state worktree. Flag the missing remote in every digest.
- Implementation units: fresh worktree off the state branch HEAD, node_modules symlinked from a provisioned worktree, gpt-5.6-luna@high. Merge kept units back into the state branch with --no-ff.
- Director verifies: typecheck, tests, guard greps, and a real render + lint of workspace/demo (Chromium available to the director).
- Taste decisions (copy, animatic quality, music choice) are gates for Steven, never executor judgment.

## Lessons
(symptom -> root cause -> RULE; append only)
- 2026-09-04: auditor flagged Root.tsx neutralBrand hexes and fonts.ts family names as brand literals -> they are Studio preview defaults and the font loader registry -> RULE: the no-literal rule covers engine/src/templates and components (what the guard test scans); Root.tsx defaults must stay neutral greys, fonts.ts may name families it can load.
- 2026-09-04: U2 created bin/tests/index.js as the only file node --test loads from the directory; U3's new test file was silently skipped -> RULE: bin briefs must state "node --test bin/tests/ must report the total test count" and the director checks the count, not just exit 0.
- 2026-09-04: director wrote the caption-window selection rule into the U4 brief and it was wrong for overlapping words; auditor caught it -> RULE: for pure functions, briefs state the invariant to hold (never leave an active word) and the adversarial inputs, not the algorithm.
- 2026-09-04: STATE/FRONTIER carried a SHA computed before the commit that wrote them -> RULE: state files reference the branch name; a SHA in a state file is written by a second, amend-free commit after the fact, or omitted.
- 2026-09-04: render, frame and review evidence were only in the scratchpad -> RULE: every director verification that produces a file copies it into docs/runs/ (frames/, briefs/) in the same iteration.
- 2026-09-04: the director wrote the CTA lint as "close must start before 80%" and copy limits far wider than the template rows (question lines are 12-char rows at 128px) -> RULE: lint rules quote the SPEC line verbatim in the brief and copy limits are derived from layout constants (font size x glyph em / row width), never guessed.
