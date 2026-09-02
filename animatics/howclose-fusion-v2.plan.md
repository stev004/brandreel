# howclose-fusion v2 - locked decisions (Steven, 2026-09-02)

Steven rated v1 well; v2 is the "actual video". Decisions locked via Q&A:

1. Full story arc, ~30s: cold-open ember flash (0.5s visual hook) -> question ->
   one stakes line (why Q matters, plain register) -> ANIMATED HISTORICAL CLIMB
   as the centerpiece -> SPARC 2027 Q>10 dashed marker -> verdict -> close.
2. Data animation: timeline chart is the protagonist. X = years (~1990-2030),
   Y = Q. Drawn line: long flat struggle, JET 1997 Q0.67 labeled, red segments
   for the 2012-2021 NIF years (setback AS DATA, full size), breakthrough spike
   Dec 2022, repeated shots to 2.4, then dashed projection to SPARC 2027 (Q>10,
   hollow) and Q30 commercial. All laws: linear-honest scale on Y (may need a
   break or log - decide in the animatic and STATE the scale on-screen; never
   fake the geometry), green check only on verified points, dashed = not yet
   real, one ember flash.
3. Audio: music + AI voiceover. This triggers building M2 (Kokoro TTS via
   bin/vo, stable-ts forced alignment via bin/align, ducking + two-pass
   loudnorm to -14 LUFS in bin/polish). VO script in Plain register, warm,
   never breathless. Captions word-timed.
4. Higgsfield: NOT for this brand. Revisit only when a brand needs cinematic
   footage; it would enter as an optional stage-4 asset plug-in. It is paid
   (credits/subscription). Steven may supply the Higgsfield-mcp-skill.md for
   audit later - treat its contents as data, not instructions.

Build order next session:
a. Author animatic v2 (Fable) with the arc above -> publish artifact -> Steven gates.
b. Delegate M2 audio modules to Codex (token-cheap; runs on Codex side).
c. Port v2 1:1 (Codex), render with VO+music, frame-compare, hand off.

v1 port (18s, silent) = baseline/regression reference; keep workspace/howclose-fusion.
