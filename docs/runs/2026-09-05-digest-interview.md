# Foreman run digest - 2026-09-05 - interview stage

Predicate: bin/interview.mjs writes brief.json from a fixed question set; bin/script.mjs enforces the brief (mechanic, hook line, facts-only numbers, allowed beat kinds, required/banned phrases, modules and close data); reel runs interview and script only when their outputs are missing; CloseD tagline wraps to two rows (G6); one video generated from a filled brief passes reel end to end. **MET.** Codex runs: 6 of 6.

Landed (merged --no-ff into feature/interview, pushed, CI green):
- I1 interview stage + brief-constrained script + reel wiring (--model-cmd on reel)
- I2 two-row CloseD tagline with derived url top (G6)
- I3 thought rows two lines, step derived from box height, pairwise clearance tests (found by CI overlap lint on the demo)
- I4 entrance drift modelled as driftPx: overlap uses resting boxes, safe-zone adds drift (unblocked stacked question lines)
- I5 structural limits in script.mjs now imply the hook, pacing and cta lints (thought-less moment max 3000, verdict/question tails, close minimum per variant)
- Director: ffmpeg + bin tests + artifacts in CI; demo close 3000ms; tagline limit 36; public remote created (G1); G3 = CC0 tracks by path

Proof: workspace/regulate-sigh, brief written by the director from the approved "Can't meditate? Neither could we." concept; the script stage exited 0 without writing script-rejected.json (the stage does not record attempt counts, so "first attempt" is not evidenced); render passes all 11 lint rules; CTA on screen 3100ms. Frames in docs/runs/frames/2026-09-05-regulate-sigh-*.png. This is still a pipeline proof: the copy has not been through Steven's KEEP/TWEAK/KILL.

Modularity (Steven's concern): audio only runs when the brief or flags set voice/music; reel plans stages from script.json modules; --skip/--from/--to/--dry-run; every stage runs alone.

Open gates: none new. Next candidates: real glyph measurement; M3 assets + Broll; a CC0 music fetcher; Steven's first KEEP/TWEAK/KILL pass on regulate-sigh.

## Addendum after the trail audit (gpt-5.6-terra)
Attention list (docs/runs/2026-09-05-trail-audit-terra-interview.md), all accepted: hook archetype is prompt-only, never validated (high; next run); figure value.decimals and stamps[].offsetMs are not facts-checked (medium; next run); "first attempt" was not evidenced (wording corrected; script.mjs should print the attempt count); stale remote/branch lines in STATE, DIRECTOR, ROADMAP (fixed); "12 rules" was 11 (fixed). Codex budget was spent, so the two validation gaps are the next run's predicate.
