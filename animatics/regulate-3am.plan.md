# regulate-3am - plan and decisions

**Status:** rev4 at Steven's KEEP/TWEAK/KILL gate (2026-09-10). rev3 verdict: "best version so far, still needs tweaking" - three tweaks applied (see the animatic header REV4 CHANGES): T1 app-style entrance into the breathing scene; T2 two more thoughts (S1 6.5s); T3 the breathing game rebuilt as the app's Regulate Breath instrument (app/breathing.tsx: sage #7FA77F dot/fill/ticks, cream track 10%, 4 inhale + 8 exhale ticks, live 8s->1s count, Easing.in 8s exhale). Total 18.5s. The sage-vs-teal question is settled by the app: sage. rev3 = motion-drafts.html concept 3 embedded verbatim (style block, section, player) at native 300x640; rev2's scaled values are now only the porting contract in the header. Brand-law deviations are NOT applied in rev3 - listed as TWEAK questions for Steven (ground, dot colour, serif). One change: wordmark dot #FFFFFF (the mock's own stated rule). rev1 was rejected as not 1:1 with the mock (it had transcribed the Remotion port, not the mock) - see SPEC ruling 11, born from that critique. First real Regulate video by Steven's call ("the 3am mock was quite good; that's what the first video needs to be on"). The Sigh is second.

## Lineage
- Concept: hivemind `marketing/motion-drafts.html` concept 3 (v4 per Steven 07-12: pulse-ring scene cut, thoughts keep positions across the cut).
- Port that Steven judged "quite good" 09-01: regulate repo `marketing/remotion/src/ThreeAM.tsx` (PR #58, 14.5s, 60fps).
- The animatic carries that geometry and timing 1:1 and applies the Brand Book (2026-09-04).

## rev2 - scaled transcription of the mock
Stage 300x640 -> 1080x1920: sizes and x by 3.6, y offsets by 3.0, percents unchanged. Every CSS value carried times scale (rise 14->50px, crossfade 450ms both ways, thought blur 5->18px, column 44/96/40 -> 158/288/144, track inset 18->54, dot 16->58, glow 22->79). Fonts: Playfair 400 upright / italic (mock: Bodoni 72 on Steven's Mac with Playfair as its own fallback), JetBrains Mono (in the site's declared mono stack and on Google Fonts; kit + engine registry updated). Six deviations, each with its law, listed in the animatic header.

## What the Brand Book changed (vs the mock)
| Port | Animatic | Law |
|---|---|---|
| Scene A ground #050b08 | #0a1812 | emerald is the ground, no exception |
| Column + dot sage #A9C99E (invented) | dot teal #4FD1C5, track sage #8F9E8B -> 25% | teal is a supplement: one live thing per surface |
| Mono dim #64806f (invented) | muted #8F9E8B | palette is theme.ts only |
| Wordmark dot cream | #FFFFFF | the dot is always white |
| 14.5s | 15.5s (close holds 3.5s) | lint floor is 15s |

## Decisions
- No pulse-ring scene (Steven, v4). Cut from "awake again." straight to the exhale.
- "awake again." is italic (a felt line); "Exhale" and the wordmark are upright (an instruction, a name).
- The dot glows; nothing else glows.
- VO optional. If recorded, Steven's own voice; vo-timing.json then owns scene durations in the port.

## Port notes (after KEEP)
- Needs a new beat kind, `exhale`: column geometry + dot travel + phase word/sub + thought dissolve. Thought positions are shared with the preceding `moment` beat and must be absolute stage coordinates, not the Moment template's stacked layout.
- Thoughts in S1 are placed, not stacked: extend `moment` with optional per-thought `{x,y}` or make S1 part of the `exhale` beat's own pre-roll.
- Lints to expect: hook (first text at 150ms), pacing (dot moves continuously; S3 static 2.5s under the 3s cap), CTA (close line present >= 2500ms), safe zones (verified in the header).

## Gate
Artifact published from `animatics/regulate-3am.html`; repo copy also at hivemind `marketing/animatics/regulate-3am.html`. TWEAK notes: phase-in pace, the three thought lines, closing line (the mock's own "direct me" list).
