## Attention list

- **High - Claim:** Archetype predicates validate meaningful hook types.  
  **Finding:** They accept trivial or cross-category text: `"No."` passes contrarian; `"Why you can't sleep"` passes curiosity-gap, contrarian, and direct-callout; `"Three reasons why you can't sleep"` passes all four. The negation and question heuristics do not establish a contrarian claim or distinguish archetypes.  
  **Reference:** [script.mjs](/private/tmp/fm-brandreel-state/bin/script.mjs:43)

- **Medium - Claim:** Validation checks the hook text that is first on screen.  
  **Finding:** For a question beat, validation reads `lines[0]`, but the manifest renders `kicker` first at 200ms, before that line at 600ms. A generic kicker can therefore be the real opening text while the validated hook appears later.  
  **Reference:** [script.mjs](/private/tmp/fm-brandreel-state/bin/script.mjs:560), [layout.ts](/private/tmp/fm-brandreel-state/engine/src/layout.ts:367)

- **Medium - Claim:** Figure decimals match the matching brief fact.  
  **Finding:** Matching uses the first fact with the same numeric value. Facts such as `3.5` and `3.50` are indistinguishable numerically, so a valid decimal representation may be rejected or the arbitrary first fact chosen.  
  **Reference:** [script.mjs](/private/tmp/fm-brandreel-state/bin/script.mjs:552), [script.mjs](/private/tmp/fm-brandreel-state/bin/script.mjs:619)

- **Low - Claim:** `script-attempts.json` unambiguously records retries.  
  **Finding:** The evidence says `attempts: 2, retries: 2`, but the console wording is “attempt 2 of 3”; only one retry was actually consumed. `retries` stores the configured retry limit, not retries performed, and should be named accordingly or accompanied by both values.  
  **Reference:** [script.mjs](/private/tmp/fm-brandreel-state/bin/script.mjs:837), [script.mjs](/private/tmp/fm-brandreel-state/bin/script.mjs:880), [attempt evidence](/private/tmp/fm-brandreel-state/docs/runs/evidence/2026-09-05-regulate-sigh-attempts.json:1)

- **Low - Claim:** Run-status docs are synced.  
  **Finding:** The digest calls this the “second run” although it is the fifth; STATE is dated 2026-09-04 and still places the already-built script stage in future M4 work; FRONTIER says it was updated after the interview run. RUN and GATES are current.  
  **Reference:** [digest](/private/tmp/fm-brandreel-state/docs/runs/2026-09-05-digest-hook-validation.md:1), [STATE.md](/private/tmp/fm-brandreel-state/STATE.md:3), [STATE.md](/private/tmp/fm-brandreel-state/STATE.md:20), [FRONTIER.md](/private/tmp/fm-brandreel-state/.claude/FRONTIER.md:3)

Verified: H1 and digest commits are ancestors of HEAD; bin tests pass 102/102; engine typecheck passes and tests pass 32/32; the committed workspace attempt and lint evidence exactly match their cited files, and the cited frame and negative-archetype evidence exist.

AUDITOR: gpt-5.6-terra