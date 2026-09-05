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
- State branch: whatever git config foreman.branch says (a fresh feature branch per run, forked from main). Remote: https://github.com/stev004/brandreel (public; CI renders + lints on every push). Trail rows and state commits are done with plain git in the state worktree and pushed at every write-back.
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
- 2026-09-04: director "recalibrated" the CTA lint to a non-empty check and called it literal; auditor showed CloseD never renders close.line when tagline/url exist -> RULE: a lint must assert what the template renders (read the component before writing the rule), and a rule weakened mid-run is logged as a gate, never as a pass.
- 2026-09-04: FRONTIER.md edits via string replace silently missed and left stale claims -> RULE: FRONTIER.md is rewritten whole at every write-back, never patched.
- 2026-09-04: director's one-line "close max 3800ms" fix only held for the CloseD variant; a plain close at 3800ms is static for 3800ms -> RULE: a limit that depends on which template branch renders is not a one-liner; brief it with the branch table, or leave it to the executor.
- 2026-09-05: C2 derived thoughtStep from the caption box but never checked step >= box height; CI overlap lint caught thoughts stacking on each other -> RULE: a geometry brief lists every pairwise constraint (element vs element, element vs zone) and the test asserts all of them; one constraint per test is not enough.
- 2026-09-05: the director wrote "passed on the first attempt" from the absence of script-rejected.json -> RULE: claim only what an artifact shows; stages that retry must print and record the attempt count.
- 2026-09-05: a brief field (hookArchetype) reached the prompt but not validation, and the digest claimed enforcement -> RULE: for every brief field the brief lists "prompt-only" or "validated", and the acceptance criteria name a rejecting test per validated field.
- 2026-09-05: the first archetype predicates were keyword lists and the auditor broke them with "No." -> RULE: a text-shape rule needs a minimum size and a positive structure (number + payoff noun, negation + claim), not a keyword hit; briefs for text rules include three adversarial strings that must fail.
