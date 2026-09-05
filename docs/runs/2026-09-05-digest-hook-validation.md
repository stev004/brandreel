# Foreman run digest - 2026-09-05 (fifth run overall) - hook archetype validation

Predicate: script.mjs validates brief.hookArchetype with structural predicates, checks figure value.decimals against the matching fact and stamp offsets, records script-attempts.json; a brief-driven regen of regulate-sigh passes reel end to end and a mismatched archetype is rejected. **MET.** Codex runs: 1 of 6.

Landed: H1 (bin/script.mjs): HOOK_ARCHETYPE_RULES (numbered-promise, curiosity-gap, contrarian-claim, direct-callout as checkable predicates, also in the prompt), incompatible brief hookLine rejected at load, figure decimals must match the fact and stamps must be ordered inside the beat, script-attempts.json with per-attempt violations and an "accepted on attempt N of M" line. 102 bin tests.

Evidence: docs/runs/evidence/2026-09-05-regulate-sigh-attempts.json (attempt 1 rejected on close duration, attempt 2 accepted), -lint-v2.json (all rules pass, cta 3100ms), negative-archetype.txt (rejection message). Frame docs/runs/frames/2026-09-05-regulate-sigh-v2-1.5s.png.

Discarded: nothing. Note: the model's first attempt still misses the close minimum for the url variant despite the prompt block; the retry loop absorbs it.

Open gates: none. Next candidates: Steven's KEEP/TWEAK/KILL on regulate-sigh; real glyph measurement; M3 assets + Broll; CC0 music fetcher; pin Remotion.

## Addendum after the trail audit (gpt-5.6-terra)
Attention list (docs/runs/2026-09-05-trail-audit-terra-hook-validation.md), all accepted and fixed in H2: predicates are now shape checks (number + payoff noun, negation + claim, minimum word counts) and the auditor's three adversarial hooks behave as intended (docs/runs/evidence/2026-09-05-adversarial-hooks.txt); the validated hook is the first rendered text (kicker or eyebrow when present); decimals match the fact's written form; script-attempts.json reports retriesUsed and retryLimit. Stale digest/STATE/FRONTIER lines corrected. Codex runs used: 2 of 6. The fix round was director-verified against the audit's own strings rather than re-audited.
