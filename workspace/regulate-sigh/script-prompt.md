You are writing stage 1 of a short-form video pipeline.

Topic: Can't meditate? Neither could we.
Target total beat duration: 22000ms
Brand: regulate

BRIEF - creative contract. These values are copied verbatim from brief.json:
audience: People who downloaded a meditation app, tried to sit still, felt worse, and quit. They are wired after work or awake at night and think calm is something other people can do.
hook archetype: direct-callout
hook line: Can't meditate?
core mechanic: One line of text at a time holds the screen for the length of one slow exhale, so the pacing itself is the regulation.
facts:
- none
allowed beat kinds:
- moment
- question
- verdict
required phrases:
- none
banned phrases:
- journey
- self-care
- inner peace
- cortisol
- cure
- heal
- rewire
notes: Voice: direct, honest, warm without being soft. Message order: recognition, reframe, difference, invitation. The body, not the mind, is the subject. No wellness cliches. No claims about the brain or hormones.


Brand voice tone:
- direct
- honest
- intelligent but accessible
- warm without being soft
- grounded in lived experience

Brand voice notes, copied verbatim:
Source of truth: Regulate Brand Book (regulate-hivemind marketing/BRAND_BOOK.html, 2026-09-04). Laws: the dot is always white (#FFFFFF, never cream, teal or a state colour); a state colour names a state (one per surface, only on the thing that is that state); emerald #0a1812 is the ground (never pure black, no light mode, no gradient hero); teal #4FD1C5 is a supplement (one live thing per surface: kicker, status dot, ring, link; never a fill, banner, background or button face). Display: Playfair Display, the app's Cormorant is drift. Mono in renders is IBM Plex Mono standing in for the site's system-mono stack. Copy bans: treats/cures/heals/rewires/clears cortisol; wellness cliches (journey, self-care, inner peace, what no longer serves you); invented statistics; 'Medical' framing. Message order: recognition, reframe, difference, demonstration, proof, invitation. Tagline 'Not meditation. Regulation.' closes, never opens. Hook first, wordmark only at the end.

Choose one hook archetype for the opening beat:
- numbered-promise: contains a digit, a number word from one to twelve, an ordinal, or ways, steps, or reasons.
- curiosity-gap: ends with a question mark or contains why, what, how, secret, nobody, no one, never, until, before, after, actually, or really.
- contrarian-claim: does not end with a question mark and contains not, isn't, aren't, don't, doesn't, won't, can't, never, wrong, stop, forget, myth, or no.
- direct-callout: ends with a question mark, contains you, your, you're, or yours, or starts with a direct imperative.

Write a valid script using this JSON shape. The example includes every beat kind and all schema fields:
{
  "id": "workspace-basename",
  "brand": "brand-name",
  "coreMechanic": "One sentence describing the single visual mechanism.",
  "beats": [
    {
      "kind": "moment",
      "eyebrow": "HOOK",
      "line": "A short opening line.",
      "thoughts": [
        "Optional supporting thought."
      ],
      "bg": "#0a1812",
      "durationMs": 4000
    },
    {
      "kind": "question",
      "kicker": "NOTICE",
      "lines": [
        "Need rest?"
      ],
      "dek": "Try one small step.",
      "durationMs": 3000
    },
    {
      "kind": "figure",
      "label": "A measurable idea",
      "unitLabel": "steps",
      "value": {
        "to": 3,
        "decimals": 0
      },
      "goalText": "A smaller step",
      "axis": {
        "min": 0,
        "max": 3,
        "achieved": 1,
        "goal": 3
      },
      "achievedTick": "Now",
      "goalTick": "Goal",
      "minTick": "0",
      "stamps": [
        {
          "tone": "done",
          "text": "First step",
          "offsetMs": 1000
        }
      ],
      "flash": {
        "colorKey": "accent"
      },
      "durationMs": 6000
    },
    {
      "kind": "verdict",
      "lines": [
        "Start with less.",
        "Let night soften."
      ],
      "durationMs": 3000
    }
  ],
  "close": {
    "line": "A clear closing line.",
    "showWordmark": true,
    "durationMs": 3000
  },
  "caption": "A short caption for the post.",
  "hashtags": [
    "#one",
    "#two",
    "#three"
  ]
}

Rules:
- coreMechanic is exactly one sentence and describes one visual mechanism.
- Every on-screen string lives in the beats. Keep the close and metadata purposeful.
- Use 4 to 8 beats. Every beat has a positive durationMs.
- Total beat durationMs must be between 15000 and 35000.
- Beat duration limits: moment 2000-4000ms; question 2500-4500ms; figure 6000-8500ms; verdict 2000-4000ms.
- Lint-safe timing contract (hook, pacing, CTA): a moment with no thoughts is at most 3000ms and must add a thought or shorten; a moment with at least one thought is at most 4000ms; the verdict must end within 3000ms after its last line (last line at 200ms + 1200ms per extra line); the question must end within 3000ms after its dek at 2400ms, or after its last line at 600ms + 300ms per extra line when there is no dek; close duration must be 2500-3000ms plain, 3000-3500ms tagline-only, or 3400-3800ms with a URL. The example above satisfies this contract.
- Do not emit a modules key. Modules are supplied by the command flags.
- Copy limits: moment.line <= 44 characters; moment.eyebrow <= 24; moment.thoughts has at most 3 entries and each is <= 60 characters.
- question.lines has 1 to 3 entries and each is <= 12 characters; question.kicker <= 24; question.dek <= 36.
- figure.label <= 40; figure.goalText <= 30; figure.unitLabel <= 12; figure.minTick <= 1 character; minTick is a single character such as 0; figure.achievedTick <= 5 characters; figure.goalTick <= 18 characters; stamps has at most 4 entries and each stamp text is <= 32 characters.
- figure.value.decimals must be an integer from 0 to 2 and, when brief facts are present, must equal the decimal places in the brief fact number matching value.to; figure.stamps[].offsetMs must be integers >= 0, less than that beat's durationMs, and strictly increasing.
- Figure pacing: leave no more than 3000ms static after the last figure event. The goal marker lands at 5600ms, so if no stamp is later than 5600ms, shorten durationMs or add a stamp after 5600ms; durationMs over 8600ms is invalid.
- verdict.lines has 1 to 3 entries and each is <= 20 characters.
- Do not emit close.url. Do not emit close.tagline; a curated tagline is supplied only by the --tagline flag.
- close.line <= 44; close.tagline <= 36 when supplied by the flag.
- close.durationMs must be between 2500 and 3000ms for a plain close (no tagline or URL), between 3000 and 3500ms for a tagline-only close, or between 3400 and 3800ms for a close with a URL.
- caption has at most 2 newline-separated lines and each line is <= 44 characters.
- hashtags must contain 3 to 6 strings, each starting with # and containing no spaces.
- Do not use any banned phrases from the brand voice notes, case-insensitively.
- coreMechanic in the output must equal the brief core mechanic, ignoring surrounding whitespace and letter case.
- The first beat must follow the brief hook archetype: direct-callout.
- Every figure beat value.to, axis number, and number in figure label, unitLabel, goalText, tick text or stamp text must come from a number in brief.facts.
- Use only the allowed beat kinds from the brief.
- Every required phrase must appear somewhere on screen, and every banned phrase from the brief must be absent.
- If the brief hook line is set, the first beat's first on-screen text must equal it exactly.
- The brief is the creative contract. Do not invent facts, numbers, hook copy, mechanics or close data outside it.

- Respond with JSON only, no prose and no markdown.
