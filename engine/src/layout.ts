import { Easing, interpolate } from "remotion";
import {
  HEIGHT,
  MAX_DURATION_MS,
  MAX_HOOK_MS,
  MAX_STATIC_INTERVAL_MS,
  MIN_DURATION_MS,
  SAFE_BOTTOM,
  SAFE_LEFT,
  SAFE_RIGHT,
  SAFE_TOP,
  WIDTH,
} from "./config";
import type { Beat, BrandKit, ExhaleBeatData, Script } from "./schema";

export const CAPTION_LAYOUT = {
  contentX: SAFE_LEFT,
  contentWidth: WIDTH - SAFE_LEFT - SAFE_RIGHT,
  fontSize: 36,
  lineHeight: 1.25,
  maxWordsPerLine: 5,
  maxLines: 2,
  bottomOffset: 42,
} as const;

const lineBoxHeight = (fontSize: number, lineHeight: number, maxLines: number): number =>
  fontSize * lineHeight * maxLines;

const MOMENT_MAX_THOUGHTS = 3;
const MOMENT_THOUGHT_CAPTION_GAP = 40;
const MOMENT_THOUGHT_LINE_GAP = 40;
const MOMENT_THOUGHT_ROW_GAP = 8;

export const MOMENT_LAYOUT = {
  contentX: SAFE_LEFT,
  contentWidth: WIDTH - SAFE_LEFT - SAFE_RIGHT,
  eyebrowTop: SAFE_TOP + 24,
  eyebrowFontSize: 26,
  eyebrowLineHeight: 1.2,
  momentLineTop: 550,
  momentLineFontSize: 112,
  momentLineHeight: 1.02,
  momentLineMaxLines: 4,
  momentLineEntranceDrift: 32,
  thoughtsTop: 1150,
  thoughtFontSize: 30,
  thoughtLineHeight: 1.3,
  thoughtMaxLines: 2,
  thoughtStep: 0,
  thoughtEntranceDrift: 24,
};

const PORT_SCALE_X = WIDTH / 300;
const PORT_SCALE_Y = HEIGHT / 640;
export const CSS_EASE_BEZIER = [0.25, 0.1, 0.25, 1] as const;

export const MOMENT_PLACED_LAYOUT = {
  contentX: 26 * PORT_SCALE_X,
  contentWidth: WIDTH - 2 * 26 * PORT_SCALE_X,
  eyebrowFontSize: 58,
  eyebrowLineHeight: 1.55,
  eyebrowLetterSpacingEm: 0.4,
  lineFontSize: 94,
  lineLineHeight: 1.55,
  lineGap: 54,
  thoughtFontSize: 47,
  thoughtLineHeight: 1.55,
  thoughtMaxWidth: WIDTH * 0.62,
  sceneFadeMs: 450,
  eyebrowStartMs: 150,
  lineStartMs: 500,
  entranceDurationMs: 700,
  textExitStartMs: 5700,
  textExitDurationMs: 700,
  thoughtStartsMs: [1600, 2600, 3600, 4000, 4500] as readonly number[],
  thoughtDurationMs: 1200,
  entranceDrift: 50,
  exitDrift: -10 * PORT_SCALE_Y,
  exitBlurPx: 2 * PORT_SCALE_X,
  thoughtDissolveDrift: 50,
  thoughtDissolveBlurPx: 18,
} as const;

const placedMomentTextHeight =
  MOMENT_PLACED_LAYOUT.eyebrowFontSize * MOMENT_PLACED_LAYOUT.eyebrowLineHeight +
  MOMENT_PLACED_LAYOUT.lineGap +
  MOMENT_PLACED_LAYOUT.lineFontSize * MOMENT_PLACED_LAYOUT.lineLineHeight;

export const MOMENT_PLACED_TEXT_TOP = (HEIGHT - placedMomentTextHeight) / 2;
export const MOMENT_PLACED_LINE_TOP = MOMENT_PLACED_TEXT_TOP +
  MOMENT_PLACED_LAYOUT.eyebrowFontSize * MOMENT_PLACED_LAYOUT.eyebrowLineHeight +
  MOMENT_PLACED_LAYOUT.lineGap;

export const EXHALE_LAYOUT = {
  columnRight: 58 * PORT_SCALE_X,
  columnTop: 96 * PORT_SCALE_Y,
  columnBottom: 96 * PORT_SCALE_Y,
  columnWidth: 40 * PORT_SCALE_X,
  columnX: WIDTH - 58 * PORT_SCALE_X - 40 * PORT_SCALE_X,
  columnHeight: HEIGHT - 2 * 96 * PORT_SCALE_Y,
  innerInset: 18 * PORT_SCALE_Y,
  innerTop: 96 * PORT_SCALE_Y + 18 * PORT_SCALE_Y,
  innerHeight: HEIGHT - 2 * (96 * PORT_SCALE_Y + 18 * PORT_SCALE_Y),
  trackWidth: 7,
  tickWidth: 8 * PORT_SCALE_X,
  tickHeight: 1 * PORT_SCALE_Y,
  tickOffsetFromCenter: 6 * PORT_SCALE_X,
  dotSize: 58,
  dotGlow: 79,
  dotGlowAlpha: 0.8,
  labelX: WIDTH - 58 * PORT_SCALE_X - 40 * PORT_SCALE_X / 2 + 22 * PORT_SCALE_X,
  labelFontSize: 10 * PORT_SCALE_X,
  labelLineHeight: 1.55,
  labelLetterSpacingEm: 0.22,
  labelInsetX: 22 * PORT_SCALE_X,
  labelInsetY: 2 * PORT_SCALE_Y,
  labelTop: 96 * PORT_SCALE_Y - 2 * PORT_SCALE_Y,
  labelBottom: 96 * PORT_SCALE_Y + HEIGHT - 2 * 96 * PORT_SCALE_Y + 2 * PORT_SCALE_Y,
  phaseX: 30 * PORT_SCALE_X,
  phaseTop: 0.44 * HEIGHT,
  phaseFontSize: 137,
  phaseLineHeight: 1.55,
  countFontSize: 10 * PORT_SCALE_X,
  countLineHeight: 1.55,
  phaseCountGap: 24,
  countContainerHeight: 12 * PORT_SCALE_Y,
  entranceDrift: 50,
  exitDrift: -30,
  exitBlurPx: 6,
  thoughtFontSize: 47,
  thoughtLineHeight: 1.55,
  thoughtMaxWidth: WIDTH * 0.62,
  thoughtDissolveDrift: 50,
  thoughtDissolveBlurPx: 18,
  thoughtDissolveStartMs: 1400,
  thoughtDissolveStaggerMs: 900,
  thoughtDissolveDurationMs: 4600,
} as const;

export const EXHALE_TIMING = {
  trackStartMs: 500,
  trackFadeMs: 450,
  tickStartMs: 500,
  tickStaggerMs: 30,
  tickFadeMs: 300,
  dotFadeStartMs: 950,
  dotFadeMs: 300,
  travelStartMs: 1400,
  travelDurationMs: 8000,
  travelCurve: [0.42, 0, 1, 1] as const,
  phaseStartMs: 650,
  entranceDurationMs: 700,
  exitStartMs: 9900,
  exitDurationMs: 700,
  countdownStartMs: 1400,
  countdownStepMs: 1000,
  countdownDurationMs: 8000,
} as const;

export const easeProgressAtMs = (
  timeMs: number,
  startMs: number,
  durationMs: number,
  bezier: readonly [number, number, number, number],
): number => {
  if (durationMs <= 0) return timeMs < startMs ? 0 : 1;
  return interpolate(timeMs, [startMs, startMs + durationMs], [0, 1], {
    easing: Easing.bezier(bezier[0], bezier[1], bezier[2], bezier[3]),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

export const exhaleDotYAtMs = (timeMs: number): number => {
  const progress = easeProgressAtMs(
    timeMs,
    EXHALE_TIMING.travelStartMs,
    EXHALE_TIMING.travelDurationMs,
    EXHALE_TIMING.travelCurve,
  );
  return EXHALE_LAYOUT.innerTop + EXHALE_LAYOUT.innerHeight * progress;
};

export const exhaleCountdownIndexAtMs = (timeMs: number): number => {
  if (timeMs < EXHALE_TIMING.countdownStartMs) return -1;
  return Math.min(
    7,
    Math.floor((timeMs - EXHALE_TIMING.countdownStartMs) / EXHALE_TIMING.countdownStepMs),
  );
};

export const exhaleThoughtDissolveStartMs = (thoughtIndex: number): number =>
  EXHALE_LAYOUT.thoughtDissolveStartMs + thoughtIndex * EXHALE_LAYOUT.thoughtDissolveStaggerMs;

export const resolveExhaleColor = (brand: BrandKit, beat: ExhaleBeatData): string => {
  const color = brand.palette.extras[beat.colorKey];
  if (!color) {
    throw new Error(`Exhale colorKey "${beat.colorKey}" was not found in brand.palette.extras.`);
  }
  return color;
};

export const momentThoughtBoxHeight = (): number => lineBoxHeight(
  MOMENT_LAYOUT.thoughtFontSize,
  MOMENT_LAYOUT.thoughtLineHeight,
  MOMENT_LAYOUT.thoughtMaxLines,
);

const deriveMomentThoughtGeometry = (): Pick<typeof MOMENT_LAYOUT, "thoughtsTop" | "thoughtStep"> => {
  const captionTop = HEIGHT - SAFE_BOTTOM - CAPTION_LAYOUT.bottomOffset -
    lineBoxHeight(CAPTION_LAYOUT.fontSize, CAPTION_LAYOUT.lineHeight, CAPTION_LAYOUT.maxLines);
  const thoughtHeight = momentThoughtBoxHeight() + MOMENT_LAYOUT.thoughtEntranceDrift;
  const thoughtStep = thoughtHeight + MOMENT_THOUGHT_ROW_GAP;
  const minimumThoughtsTop = MOMENT_LAYOUT.momentLineTop +
    lineBoxHeight(
      MOMENT_LAYOUT.momentLineFontSize,
      MOMENT_LAYOUT.momentLineHeight,
      MOMENT_LAYOUT.momentLineMaxLines,
    ) + MOMENT_LAYOUT.momentLineEntranceDrift + MOMENT_THOUGHT_LINE_GAP;
  const thoughtsTop = captionTop - MOMENT_THOUGHT_CAPTION_GAP - thoughtHeight -
    (MOMENT_MAX_THOUGHTS - 1) * thoughtStep;

  if (thoughtsTop < minimumThoughtsTop) {
    throw new Error("Moment thoughts do not clear the moment line.");
  }

  return {
    thoughtStep,
    thoughtsTop,
  };
};

Object.assign(MOMENT_LAYOUT, deriveMomentThoughtGeometry());

export const QUESTION_LAYOUT = {
  contentX: SAFE_LEFT,
  contentWidth: WIDTH - SAFE_LEFT - SAFE_RIGHT,
  linesWidth: 860,
  kickerTop: 470,
  kickerFontSize: 30,
  kickerLetterSpacing: "0.32em",
  kickerLineHeight: 1.2,
  linesTop: 560,
  lineFontSize: 128,
  lineLineHeight: 1.04,
  lineStep: 128 * 1.04,
  lineLetterSpacing: "-0.02em",
  lineMaxLines: 3,
  lineEntranceDrift: 34,
  dekTop: 986,
  dekFontSize: 44,
  dekLineHeight: 1.2,
  dekEntranceDrift: 34,
} as const;

export const QUESTION_TIMING = {
  kickerMs: 200,
  lineStartMs: 600,
  lineStaggerMs: 300,
  dekMs: 2400,
} as const;

const FIGURE_AXIS_END = 860;
const FIGURE_GOAL_X = 420;
const FIGURE_GOAL_RING_SIZE = 46;
const FIGURE_COUNTER_GOAL_GAP = 24;
const FIGURE_GOAL_UNIT_LABEL_GAP = 16;
const FIGURE_GOAL_TOP = 590;
const FIGURE_GOAL_FONT_SIZE = 60;
const FIGURE_GOAL_LINE_HEIGHT = 1.2;
const FIGURE_GOAL_MAX_LINES = 2;

export const FIGURE_LAYOUT = {
  contentX: SAFE_LEFT,
  contentWidth: WIDTH - SAFE_LEFT - SAFE_RIGHT,
  labelTop: 380,
  labelFontSize: 30,
  labelLetterSpacing: "0.24em",
  labelLineHeight: 1.2,
  counterTop: 470,
  counterFontSize: 190,
  counterLineHeight: 1.2,
  // A counter longer than this column clips in Figure.tsx; text-fit flags it.
  counterWidth: FIGURE_GOAL_X - SAFE_LEFT - FIGURE_COUNTER_GOAL_GAP,
  goalX: FIGURE_GOAL_X,
  goalWidth: WIDTH - SAFE_RIGHT - FIGURE_GOAL_X,
  goalTop: FIGURE_GOAL_TOP,
  goalFontSize: FIGURE_GOAL_FONT_SIZE,
  goalLineHeight: FIGURE_GOAL_LINE_HEIGHT,
  goalMaxLines: FIGURE_GOAL_MAX_LINES,
  unitLabelTop: FIGURE_GOAL_TOP +
    FIGURE_GOAL_MAX_LINES * FIGURE_GOAL_FONT_SIZE * FIGURE_GOAL_LINE_HEIGHT +
    FIGURE_GOAL_UNIT_LABEL_GAP,
  unitLabelFontSize: 28,
  unitLabelLetterSpacing: "0.18em",
  unitLabelLineHeight: 1.2,
  axisX: 60,
  axisWidth: FIGURE_AXIS_END - SAFE_LEFT,
  axisEnd: FIGURE_AXIS_END,
  axisY: 1100,
  axisHeight: 2,
  solidTop: 1096,
  solidHeight: 10,
  solidRadius: 5,
  dashedTop: 1100,
  dashedHeight: 6,
  dashedOpacity: 0.55,
  flashDotTop: 1071,
  flashDotSize: 30,
  flashInitialScale: 0.4,
  flashPeakScale: 1.5,
  flashRingSpread: 48,
  flashRingOpacity: 0.55,
  goalRingLeft: FIGURE_AXIS_END - FIGURE_GOAL_RING_SIZE / 2,
  goalRingTop: 1078,
  goalRingSize: FIGURE_GOAL_RING_SIZE,
  goalRingBorder: 6,
  tickTop: 1140,
  tickFontSize: 24,
  tickLineHeight: 1.2,
  achievedTickX: 110,
  goalTickX: 700,
  goalTickLetterSpacing: "0.1em",
  stampTop: 1250,
  stampStep: 80,
  stampFontSize: 28,
  stampLetterSpacing: "0.06em",
  stampLineHeight: 1.2,
  stampEntranceDrift: 34,
} as const;

export const FIGURE_TIMING = {
  axisMs: 0,
  introMs: 200,
  solidStartMs: 800,
  drawDurationMs: 1600,
  achievedTickMs: 2200,
  flashMs: 2400,
  flashDurationMs: 1100,
  flashPeakMs: 385,
  dashedStartMs: 4000,
  dashedDurationMs: 1600,
  goalMs: 5600,
  counterStepFractions: [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84, 1] as readonly number[],
  counterValueFractions: [0, 1 / 6, 1 / 3, 1 / 2, 2 / 3, 5 / 6, 11 / 12, 1] as readonly number[],
} as const;

export const VERDICT_LAYOUT = {
  contentX: SAFE_LEFT,
  linesWidth: 860,
  linesTop: 700,
  lineFontSize: 76,
  lineLineHeight: 1.15,
  lineStep: 130,
  lineMaxLines: 3,
  lineEntranceDrift: 34,
} as const;

export const VERDICT_TIMING = {
  lineStartMs: 200,
  lineStaggerMs: 1200,
} as const;

export const CLOSE_LAYOUT = {
  contentX: SAFE_LEFT,
  contentWidth: WIDTH - SAFE_LEFT - SAFE_RIGHT,
  lineTop: 620,
  lineFontSize: 108,
  lineHeight: 1.02,
  lineMaxLines: 4,
  lineEntranceDrift: 28,
  wordmarkTop: 1275,
  wordmarkFontSize: 46,
  wordmarkLineHeight: 1.2,
} as const;

const CLOSE_D_TAGLINE_URL_GAP = 24;

const CLOSE_D_LAYOUT_BASE = {
  contentX: SAFE_LEFT,
  logoTop: 620,
  logoSize: 150,
  taglineTop: 830,
  taglineFontSize: 96,
  taglineLineHeight: 1.2,
  taglineMaxLines: 2,
  taglineLetterSpacing: "-0.02em",
  urlFontSize: 34,
  urlLineHeight: 1.2,
  urlLetterSpacing: "0.08em",
  entranceDrift: 34,
  sceneFadeDurationMs: 400,
} as const;

export const CLOSE_D_LAYOUT = {
  ...CLOSE_D_LAYOUT_BASE,
  urlTop:
    CLOSE_D_LAYOUT_BASE.taglineTop +
    CLOSE_D_LAYOUT_BASE.taglineMaxLines *
      CLOSE_D_LAYOUT_BASE.taglineFontSize *
      CLOSE_D_LAYOUT_BASE.taglineLineHeight +
    CLOSE_D_TAGLINE_URL_GAP +
    CLOSE_D_LAYOUT_BASE.entranceDrift,
} as const;

export const CLOSE_D_TIMING = {
  logoMs: 200,
  taglineMs: 500,
  urlMs: 900,
} as const;

export const GLYPH_EM = {
  display: 0.52,
  body: 0.55,
  mono: 0.6,
} as const;

const textWidthPx = (text: string, fontSize: number, role: TextRole, letterSpacingEm = 0): number => {
  const length = Array.from(text).length;
  return length === 0 ? 0 : Math.ceil(length * fontSize * (GLYPH_EM[role] + letterSpacingEm));
};

export const thoughtPhaseInStartMs = (brand: BrandKit, beat: Beat): number =>
  Math.min(brand.motion.entranceMs, Math.round(beat.durationMs * 0.12));

export const thoughtStaggerMs = (brand: BrandKit): number =>
  Math.max(1, Math.round(brand.motion.entranceMs * 1.75));

export const thoughtDissolveStartMs = (
  brand: BrandKit,
  beat: Beat,
  thoughtCount: number,
  thoughtIndex: number,
): number => {
  const stagger = thoughtStaggerMs(brand);
  const phaseEndMs = thoughtPhaseInStartMs(brand, beat) + brand.motion.entranceMs;
  const dissolveWindowMs = brand.motion.entranceMs + Math.max(0, thoughtCount - 1) * stagger;
  const firstDissolveMs = Math.max(
    phaseEndMs,
    beat.durationMs - brand.motion.holdMsDefault - dissolveWindowMs,
  );
  return firstDissolveMs + thoughtIndex * stagger;
};

export const closeDurationMs = (
  brand: BrandKit,
  close?: Pick<Script["close"], "durationMs">,
): number => close?.durationMs ?? brand.motion.entranceMs + brand.motion.holdMsDefault;

export type TimelineBeat = {
  index: number;
  startMs: number;
  endMs: number;
};

export type Timeline = {
  beats: TimelineBeat[];
  firstOnScreenTextMs: number | null;
  visualChangeMs: number[];
  totalDurationMs: number;
};

const hasText = (value: string | undefined): boolean => Boolean(value?.trim());

export const computeTimeline = (script: Script, brand: BrandKit): Timeline => {
  let cursorMs = 0;
  let firstOnScreenTextMs: number | null = null;
  const beats: TimelineBeat[] = [];
  const visualChangeMs = [0];

  const addVisualChange = (timeMs: number, endMs: number) => {
    if (timeMs < endMs) {
      visualChangeMs.push(timeMs);
    }
  };

  const addTextTime = (timeMs: number, endMs: number, hasVisibleText: boolean) => {
    if (hasVisibleText && timeMs < endMs) {
      visualChangeMs.push(timeMs);
      if (firstOnScreenTextMs === null || timeMs < firstOnScreenTextMs) {
        firstOnScreenTextMs = timeMs;
      }
    }
  };

  script.beats.forEach((beat, index) => {
    const startMs = cursorMs;
    const endMs = startMs + beat.durationMs;
    beats.push({ index, startMs, endMs });

    if (index > 0) {
      visualChangeMs.push(startMs);
    }

    if (beat.kind === "moment") {
      const thoughts = (beat.thoughts ?? []).filter(hasText);
      if (beat.thoughtPositions) {
        addTextTime(startMs + MOMENT_PLACED_LAYOUT.eyebrowStartMs, endMs, hasText(beat.eyebrow));
        addTextTime(startMs + MOMENT_PLACED_LAYOUT.lineStartMs, endMs, hasText(beat.line));
        if (hasText(beat.eyebrow) || hasText(beat.line)) {
          addVisualChange(startMs + MOMENT_PLACED_LAYOUT.sceneFadeMs, endMs);
        }
        thoughts.forEach((thought, thoughtIndex) => {
          addTextTime(
            startMs + MOMENT_PLACED_LAYOUT.thoughtStartsMs[thoughtIndex]!,
            endMs,
            hasText(thought),
          );
        });
        addVisualChange(startMs + MOMENT_PLACED_LAYOUT.textExitStartMs, endMs);
        addVisualChange(startMs + MOMENT_PLACED_LAYOUT.textExitStartMs + MOMENT_PLACED_LAYOUT.textExitDurationMs, endMs);
      } else {
        const textTimes = [
          ...(hasText(beat.eyebrow) || hasText(beat.line) ? [startMs] : []),
          ...thoughts.map(
            (_, thoughtIndex) =>
              startMs + thoughtPhaseInStartMs(brand, beat) + thoughtIndex * thoughtStaggerMs(brand),
          ),
        ].filter((time) => time < endMs);
        if (firstOnScreenTextMs === null && textTimes.length > 0) {
          firstOnScreenTextMs = Math.min(...textTimes);
        }

        if (hasText(beat.eyebrow) || hasText(beat.line)) {
          addVisualChange(startMs, endMs);
        }

        thoughts.forEach((_, thoughtIndex) => {
          const phaseInMs =
            startMs + thoughtPhaseInStartMs(brand, beat) + thoughtIndex * thoughtStaggerMs(brand);
          addVisualChange(phaseInMs, endMs);
          addVisualChange(
            startMs + thoughtDissolveStartMs(brand, beat, thoughts.length, thoughtIndex),
            endMs,
          );
        });
      }
    }

    if (beat.kind === "exhale") {
      resolveExhaleColor(brand, beat);
      // The thought layer remains at its held opacity as it hands off from Moment,
      // then each line dissolves at the animatic's staggered start time.
      beat.thoughts.forEach((thought, thoughtIndex) => {
        addTextTime(startMs, endMs, hasText(thought));
        const dissolveStart = startMs + exhaleThoughtDissolveStartMs(thoughtIndex);
        addVisualChange(dissolveStart, endMs);
        addVisualChange(dissolveStart + EXHALE_LAYOUT.thoughtDissolveDurationMs, endMs);
      });
      addTextTime(startMs + EXHALE_TIMING.phaseStartMs, endMs, hasText(beat.inLabel) || hasText(beat.outLabel) || hasText(beat.phaseLabel));
      beat.countdown.forEach((value, countIndex) => {
        addTextTime(
          startMs + EXHALE_TIMING.countdownStartMs + countIndex * EXHALE_TIMING.countdownStepMs,
          endMs,
          hasText(value),
        );
      });
      addVisualChange(startMs + EXHALE_TIMING.trackStartMs, endMs);
      addVisualChange(startMs + EXHALE_TIMING.trackStartMs + EXHALE_TIMING.trackFadeMs, endMs);
      const tickCount = 12;
      for (let tickIndex = 0; tickIndex < tickCount; tickIndex += 1) {
        const tickStart = startMs + EXHALE_TIMING.tickStartMs + tickIndex * EXHALE_TIMING.tickStaggerMs;
        addVisualChange(tickStart, endMs);
        addVisualChange(tickStart + EXHALE_TIMING.tickFadeMs, endMs);
      }
      addVisualChange(startMs + EXHALE_TIMING.dotFadeStartMs, endMs);
      addVisualChange(startMs + EXHALE_TIMING.dotFadeStartMs + EXHALE_TIMING.dotFadeMs, endMs);
      addVisualChange(startMs + EXHALE_TIMING.travelStartMs, endMs);
      addVisualChange(startMs + EXHALE_TIMING.travelStartMs + EXHALE_TIMING.travelDurationMs, endMs);
      addVisualChange(startMs + EXHALE_TIMING.exitStartMs, endMs);
      addVisualChange(startMs + EXHALE_TIMING.exitStartMs + EXHALE_TIMING.exitDurationMs, endMs);
    }

    if (beat.kind === "question") {
      addTextTime(
        startMs + QUESTION_TIMING.kickerMs,
        endMs,
        hasText(beat.kicker),
      );
      beat.lines.filter(hasText).forEach((line, lineIndex) => {
        addTextTime(
          startMs + QUESTION_TIMING.lineStartMs + lineIndex * QUESTION_TIMING.lineStaggerMs,
          endMs,
          hasText(line),
        );
      });
      addTextTime(startMs + QUESTION_TIMING.dekMs, endMs, hasText(beat.dek));
    }

    if (beat.kind === "figure") {
      const hasIntroText =
        hasText(beat.label) || hasText(beat.goalText) || hasText(beat.unitLabel) || hasText(beat.minTick);
      addTextTime(startMs + FIGURE_TIMING.introMs, endMs, hasIntroText);
      addVisualChange(startMs + FIGURE_TIMING.solidStartMs, endMs);
      addVisualChange(
        startMs + FIGURE_TIMING.solidStartMs + FIGURE_TIMING.drawDurationMs,
        endMs,
      );
      addTextTime(startMs + FIGURE_TIMING.achievedTickMs, endMs, hasText(beat.achievedTick));
      if (beat.flash) {
        addVisualChange(startMs + FIGURE_TIMING.flashMs, endMs);
        addVisualChange(
          startMs + FIGURE_TIMING.flashMs + FIGURE_TIMING.flashDurationMs,
          endMs,
        );
      }
      beat.stamps.forEach((stamp) => {
        addTextTime(startMs + stamp.offsetMs, endMs, hasText(stamp.text));
      });
      addVisualChange(startMs + FIGURE_TIMING.dashedStartMs, endMs);
      addVisualChange(
        startMs + FIGURE_TIMING.dashedStartMs + FIGURE_TIMING.dashedDurationMs,
        endMs,
      );
      addTextTime(startMs + FIGURE_TIMING.goalMs, endMs, hasText(beat.goalTick));
    }

    if (beat.kind === "verdict") {
      beat.lines.filter(hasText).forEach((line, lineIndex) => {
        addTextTime(
          startMs + VERDICT_TIMING.lineStartMs + lineIndex * VERDICT_TIMING.lineStaggerMs,
          endMs,
          hasText(line),
        );
      });
    }

    cursorMs = endMs;
  });

  const closeDuration = closeDurationMs(brand, script.close);
  const totalDurationMs = cursorMs + closeDuration;
  const hasCloseD = Boolean(
    script.close.tagline?.trim() || script.close.url?.trim() || brand.wordmark.logoSvg?.trim(),
  );

  if (hasCloseD) {
    addTextTime(cursorMs + CLOSE_D_TIMING.logoMs, totalDurationMs, Boolean(brand.wordmark.logoSvg?.trim()));
    addTextTime(cursorMs + CLOSE_D_TIMING.taglineMs, totalDurationMs, hasText(script.close.tagline));
    addTextTime(cursorMs + CLOSE_D_TIMING.urlMs, totalDurationMs, hasText(script.close.url));
  } else {
    addTextTime(cursorMs, totalDurationMs, hasText(script.close.line) || (script.close.showWordmark && hasText(brand.wordmark.text)));
  }

  visualChangeMs.push(cursorMs);

  return {
    beats,
    firstOnScreenTextMs,
    visualChangeMs: [...new Set(visualChangeMs)].sort((a, b) => a - b),
    totalDurationMs,
  };
};

export type TextBox = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  driftPx: number;
};

export type TextRole = keyof typeof GLYPH_EM;

export type LayoutTextBox = TextBox & {
  beatIndex: number | null;
  role: TextRole;
  text: string;
  fontSize: number;
  lineHeight: number;
  maxLines: number;
  letterSpacingEm: number;
  fromMs: number;
  toMs: number;
};

type TextBoxMetadata = Omit<LayoutTextBox, keyof TextBox>;

const beatMetadata = (
  timeline: Timeline,
  beatIndex: number,
  brand: BrandKit,
  text: string,
  role: TextRole,
  fontSize: number,
  lineHeight: number,
  maxLines: number,
  letterSpacingEm: number,
  fromOffsetMs = 0,
): TextBoxMetadata => {
  const span = timeline.beats[beatIndex];
  const offsetMs = Math.max(0, Math.min(fromOffsetMs, span.endMs - span.startMs));
  return {
    beatIndex,
    role,
    text,
    fontSize,
    lineHeight,
    maxLines,
    letterSpacingEm,
    fromMs: span.startMs + offsetMs,
    toMs: span.endMs,
  };
};

const metadataForTextBox = (
  box: TextBox,
  script: Script,
  brand: BrandKit,
  timeline: Timeline,
): TextBoxMetadata => {
  const beatMatch = /^beat-(\d+)-(.+)$/.exec(box.id);
  if (beatMatch) {
    const beatIndex = Number(beatMatch[1]);
    const part = beatMatch[2];
    const beat = script.beats[beatIndex];

    if (beat.kind === "moment") {
      if (part === "eyebrow") {
        const placed = Boolean(beat.thoughtPositions);
        const metadata = beatMetadata(
          timeline,
          beatIndex,
          brand,
          beat.eyebrow ?? "",
          "mono",
          placed ? MOMENT_PLACED_LAYOUT.eyebrowFontSize : MOMENT_LAYOUT.eyebrowFontSize,
          placed ? MOMENT_PLACED_LAYOUT.eyebrowLineHeight : MOMENT_LAYOUT.eyebrowLineHeight,
          1,
          placed ? MOMENT_PLACED_LAYOUT.eyebrowLetterSpacingEm : 0.4,
          placed ? MOMENT_PLACED_LAYOUT.eyebrowStartMs : 0,
        );
        return placed
          ? { ...metadata, toMs: Math.min(timeline.beats[beatIndex]!.endMs, timeline.beats[beatIndex]!.startMs + MOMENT_PLACED_LAYOUT.textExitStartMs + MOMENT_PLACED_LAYOUT.textExitDurationMs) }
          : metadata;
      }
      if (part === "line") {
        const placed = Boolean(beat.thoughtPositions);
        const metadata = beatMetadata(
          timeline,
          beatIndex,
          brand,
          beat.line,
          "display",
          placed ? MOMENT_PLACED_LAYOUT.lineFontSize : MOMENT_LAYOUT.momentLineFontSize,
          placed ? MOMENT_PLACED_LAYOUT.lineLineHeight : MOMENT_LAYOUT.momentLineHeight,
          placed ? 1 : MOMENT_LAYOUT.momentLineMaxLines,
          0,
          placed ? MOMENT_PLACED_LAYOUT.lineStartMs : 0,
        );
        return placed
          ? { ...metadata, toMs: Math.min(timeline.beats[beatIndex]!.endMs, timeline.beats[beatIndex]!.startMs + MOMENT_PLACED_LAYOUT.textExitStartMs + MOMENT_PLACED_LAYOUT.textExitDurationMs) }
          : metadata;
      }
      const thoughtMatch = /^thought-(\d+)$/.exec(part);
      if (thoughtMatch) {
        const thoughtIndex = Number(thoughtMatch[1]);
        const placed = Boolean(beat.thoughtPositions);
        const metadata = beatMetadata(
          timeline,
          beatIndex,
          brand,
          beat.thoughts?.filter(hasText)[thoughtIndex] ?? "",
          "body",
          placed ? MOMENT_PLACED_LAYOUT.thoughtFontSize : MOMENT_LAYOUT.thoughtFontSize,
          placed ? MOMENT_PLACED_LAYOUT.thoughtLineHeight : MOMENT_LAYOUT.thoughtLineHeight,
          placed ? 1 : MOMENT_LAYOUT.thoughtMaxLines,
          0,
          placed
            ? MOMENT_PLACED_LAYOUT.thoughtStartsMs[thoughtIndex] ?? MOMENT_PLACED_LAYOUT.thoughtStartsMs.at(-1)!
            : thoughtPhaseInStartMs(brand, beat) + thoughtIndex * thoughtStaggerMs(brand),
        );
        return metadata;
      }
    }

    if (beat.kind === "exhale") {
      const thoughtMatch = /^thought-(\d+)$/.exec(part);
      if (thoughtMatch) {
        const thoughtIndex = Number(thoughtMatch[1]);
        const dissolveEndMs = exhaleThoughtDissolveStartMs(thoughtIndex) + EXHALE_LAYOUT.thoughtDissolveDurationMs;
        return {
          ...beatMetadata(
            timeline,
            beatIndex,
            brand,
            beat.thoughts[thoughtIndex] ?? "",
            "body",
            EXHALE_LAYOUT.thoughtFontSize,
            EXHALE_LAYOUT.thoughtLineHeight,
            1,
            0,
          ),
          toMs: Math.min(timeline.beats[beatIndex]!.endMs, timeline.beats[beatIndex]!.startMs + dissolveEndMs),
        };
      }

      const labelMetadata: Record<string, TextBoxMetadata> = {
        "in-label": beatMetadata(timeline, beatIndex, brand, beat.inLabel, "mono", EXHALE_LAYOUT.labelFontSize, EXHALE_LAYOUT.labelLineHeight, 1, EXHALE_LAYOUT.labelLetterSpacingEm, EXHALE_TIMING.phaseStartMs),
        "out-label": beatMetadata(timeline, beatIndex, brand, beat.outLabel, "mono", EXHALE_LAYOUT.labelFontSize, EXHALE_LAYOUT.labelLineHeight, 1, EXHALE_LAYOUT.labelLetterSpacingEm, EXHALE_TIMING.phaseStartMs),
        "phase-label": beatMetadata(timeline, beatIndex, brand, beat.phaseLabel, "display", EXHALE_LAYOUT.phaseFontSize, EXHALE_LAYOUT.phaseLineHeight, 1, 0, EXHALE_TIMING.phaseStartMs),
      };
      if (labelMetadata[part]) return labelMetadata[part];

      const countdownMatch = /^countdown-(\d+)$/.exec(part);
      if (countdownMatch) {
        const countIndex = Number(countdownMatch[1]);
        const fromOffsetMs = EXHALE_TIMING.countdownStartMs + countIndex * EXHALE_TIMING.countdownStepMs;
        return {
          ...beatMetadata(
            timeline,
            beatIndex,
            brand,
            beat.countdown[countIndex] ?? "",
            "mono",
            EXHALE_LAYOUT.countFontSize,
            EXHALE_LAYOUT.countLineHeight,
            1,
            EXHALE_LAYOUT.labelLetterSpacingEm,
            fromOffsetMs,
          ),
          toMs: countIndex === beat.countdown.length - 1
            ? timeline.beats[beatIndex]!.endMs
            : Math.min(
              timeline.beats[beatIndex]!.endMs,
              timeline.beats[beatIndex]!.startMs + fromOffsetMs + EXHALE_TIMING.countdownStepMs,
            ),
        };
      }
    }

    if (beat.kind === "question") {
      if (part === "kicker") {
        return beatMetadata(timeline, beatIndex, brand, beat.kicker ?? "", "mono", QUESTION_LAYOUT.kickerFontSize, QUESTION_LAYOUT.kickerLineHeight, 1, 0.32, QUESTION_TIMING.kickerMs);
      }
      const lineMatch = /^question-line-(\d+)$/.exec(part);
      if (lineMatch) {
        const lineIndex = Number(lineMatch[1]);
        return beatMetadata(timeline, beatIndex, brand, beat.lines.filter(hasText)[lineIndex] ?? "", "display", QUESTION_LAYOUT.lineFontSize, QUESTION_LAYOUT.lineLineHeight, 1, -0.02, QUESTION_TIMING.lineStartMs + lineIndex * QUESTION_TIMING.lineStaggerMs);
      }
      if (part === "dek") {
        return beatMetadata(timeline, beatIndex, brand, beat.dek ?? "", "display", QUESTION_LAYOUT.dekFontSize, QUESTION_LAYOUT.dekLineHeight, 1, 0, QUESTION_TIMING.dekMs);
      }
    }

    if (beat.kind === "figure") {
      const figureMetadata: Record<string, TextBoxMetadata> = {
        "figure-label": beatMetadata(timeline, beatIndex, brand, beat.label, "mono", FIGURE_LAYOUT.labelFontSize, FIGURE_LAYOUT.labelLineHeight, 1, 0.24, FIGURE_TIMING.introMs),
        counter: beatMetadata(timeline, beatIndex, brand, beat.value.to.toFixed(beat.value.decimals), "mono", FIGURE_LAYOUT.counterFontSize, FIGURE_LAYOUT.counterLineHeight, 1, 0, FIGURE_TIMING.introMs),
        goal: beatMetadata(timeline, beatIndex, brand, beat.goalText ?? "", "mono", FIGURE_LAYOUT.goalFontSize, FIGURE_LAYOUT.goalLineHeight, FIGURE_LAYOUT.goalMaxLines, 0, FIGURE_TIMING.introMs),
        "unit-label": beatMetadata(timeline, beatIndex, brand, beat.unitLabel ?? "", "mono", FIGURE_LAYOUT.unitLabelFontSize, FIGURE_LAYOUT.unitLabelLineHeight, 1, 0.18, FIGURE_TIMING.introMs),
        "min-tick": beatMetadata(timeline, beatIndex, brand, beat.minTick ?? "", "mono", FIGURE_LAYOUT.tickFontSize, FIGURE_LAYOUT.tickLineHeight, 1, 0, FIGURE_TIMING.introMs),
        "achieved-tick": beatMetadata(timeline, beatIndex, brand, beat.achievedTick ?? "", "mono", FIGURE_LAYOUT.tickFontSize, FIGURE_LAYOUT.tickLineHeight, 1, 0, FIGURE_TIMING.achievedTickMs),
        "goal-tick": beatMetadata(timeline, beatIndex, brand, beat.goalTick ?? "", "mono", FIGURE_LAYOUT.tickFontSize, FIGURE_LAYOUT.tickLineHeight, 1, 0.1, FIGURE_TIMING.goalMs),
      };
      if (figureMetadata[part]) {
        return figureMetadata[part];
      }
      const stampMatch = /^stamp-(\d+)$/.exec(part);
      if (stampMatch) {
        const stampIndex = Number(stampMatch[1]);
        const stamp = beat.stamps[stampIndex];
        return beatMetadata(timeline, beatIndex, brand, stamp.text, "mono", FIGURE_LAYOUT.stampFontSize, FIGURE_LAYOUT.stampLineHeight, 1, 0.06, stamp.offsetMs);
      }
    }

    if (beat.kind === "verdict") {
      const lineMatch = /^verdict-line-(\d+)$/.exec(part);
      if (lineMatch) {
        const lineIndex = Number(lineMatch[1]);
        return beatMetadata(timeline, beatIndex, brand, beat.lines.filter(hasText)[lineIndex] ?? "", "display", VERDICT_LAYOUT.lineFontSize, VERDICT_LAYOUT.lineLineHeight, 1, 0, VERDICT_TIMING.lineStartMs + lineIndex * VERDICT_TIMING.lineStaggerMs);
      }
    }
  }

  const closeStartMs = timeline.beats.at(-1)?.endMs ?? 0;
  const closeDuration = timeline.totalDurationMs - closeStartMs;
  const closeOffset = (offsetMs: number): TextBoxMetadata => ({
    beatIndex: null,
    role: "display",
    text: "",
    fontSize: 0,
    lineHeight: 1,
    maxLines: 1,
    letterSpacingEm: 0,
    fromMs: closeStartMs + Math.max(0, Math.min(offsetMs, closeDuration)),
    toMs: timeline.totalDurationMs,
  });

  if (box.id === "close-line") {
    return {
      ...closeOffset(0),
      text: script.close.line,
      fontSize: CLOSE_LAYOUT.lineFontSize,
      lineHeight: CLOSE_LAYOUT.lineHeight,
      maxLines: CLOSE_LAYOUT.lineMaxLines,
    };
  }
  if (box.id === "close-wordmark") {
    return {
      ...closeOffset(0),
      text: brand.wordmark.text,
      fontSize: CLOSE_LAYOUT.wordmarkFontSize,
      lineHeight: CLOSE_LAYOUT.wordmarkLineHeight,
    };
  }
  if (box.id === "close-logo") {
    return { ...closeOffset(CLOSE_D_TIMING.logoMs), text: "", fontSize: CLOSE_D_LAYOUT.logoSize };
  }
  if (box.id === "close-tagline") {
    return { ...closeOffset(CLOSE_D_TIMING.taglineMs), text: script.close.tagline ?? "", fontSize: CLOSE_D_LAYOUT.taglineFontSize, lineHeight: CLOSE_D_LAYOUT.taglineLineHeight, maxLines: CLOSE_D_LAYOUT.taglineMaxLines, letterSpacingEm: -0.02 };
  }
  if (box.id === "close-url") {
    return { ...closeOffset(CLOSE_D_TIMING.urlMs), role: "mono", text: script.close.url ?? "", fontSize: CLOSE_D_LAYOUT.urlFontSize, lineHeight: CLOSE_D_LAYOUT.urlLineHeight, letterSpacingEm: 0.08 };
  }

  const captionMatch = /^caption-line-(\d+)$/.exec(box.id);
  if (captionMatch) {
    const lineIndex = Number(captionMatch[1]);
    const lines = script.caption.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, CAPTION_LAYOUT.maxLines);
    return {
      beatIndex: null,
      role: "body",
      text: lines[lineIndex] ?? "",
      fontSize: CAPTION_LAYOUT.fontSize,
      lineHeight: CAPTION_LAYOUT.lineHeight,
      maxLines: CAPTION_LAYOUT.maxLines,
      letterSpacingEm: 0,
      fromMs: 0,
      toMs: closeStartMs,
    };
  }

  throw new Error(`No manifest metadata for text box ${box.id}`);
};

export const computeTextBoxes = (script: Script, brand: BrandKit): LayoutTextBox[] => {
  const boxes: TextBox[] = [];

  script.beats.forEach((beat, index) => {
    if (beat.kind === "moment") {
      const placed = Boolean(beat.thoughtPositions);
      if (hasText(beat.eyebrow)) {
        const eyebrowWidth = placed
          ? Math.min(MOMENT_PLACED_LAYOUT.contentWidth, textWidthPx(
            beat.eyebrow ?? "",
            MOMENT_PLACED_LAYOUT.eyebrowFontSize,
            "mono",
            MOMENT_PLACED_LAYOUT.eyebrowLetterSpacingEm,
          ))
          : MOMENT_LAYOUT.contentWidth;
        boxes.push({
          id: `beat-${index}-eyebrow`,
          x: placed ? (WIDTH - eyebrowWidth) / 2 : MOMENT_LAYOUT.contentX,
          y: placed ? MOMENT_PLACED_TEXT_TOP : MOMENT_LAYOUT.eyebrowTop,
          w: eyebrowWidth,
          h: placed
            ? lineBoxHeight(MOMENT_PLACED_LAYOUT.eyebrowFontSize, MOMENT_PLACED_LAYOUT.eyebrowLineHeight, 1)
            : lineBoxHeight(MOMENT_LAYOUT.eyebrowFontSize, MOMENT_LAYOUT.eyebrowLineHeight, 1),
          driftPx: placed ? MOMENT_PLACED_LAYOUT.entranceDrift : 0,
        });
      }

      if (hasText(beat.line)) {
        const lineWidth = placed
          ? Math.min(MOMENT_PLACED_LAYOUT.contentWidth, textWidthPx(beat.line, MOMENT_PLACED_LAYOUT.lineFontSize, "display"))
          : MOMENT_LAYOUT.contentWidth;
        boxes.push({
          id: `beat-${index}-line`,
          x: placed ? (WIDTH - lineWidth) / 2 : MOMENT_LAYOUT.contentX,
          y: placed ? MOMENT_PLACED_LINE_TOP : MOMENT_LAYOUT.momentLineTop,
          w: lineWidth,
          h: placed
            ? lineBoxHeight(MOMENT_PLACED_LAYOUT.lineFontSize, MOMENT_PLACED_LAYOUT.lineLineHeight, 1)
            : lineBoxHeight(MOMENT_LAYOUT.momentLineFontSize, MOMENT_LAYOUT.momentLineHeight, MOMENT_LAYOUT.momentLineMaxLines),
          driftPx: placed ? MOMENT_PLACED_LAYOUT.entranceDrift : MOMENT_LAYOUT.momentLineEntranceDrift,
        });
      }

      (beat.thoughts ?? []).filter(hasText).forEach((thought, thoughtIndex) => {
        const position = beat.thoughtPositions?.[thoughtIndex];
        boxes.push({
          id: `beat-${index}-thought-${thoughtIndex}`,
          x: position?.x ?? MOMENT_LAYOUT.contentX,
          y: position?.y ?? MOMENT_LAYOUT.thoughtsTop + thoughtIndex * MOMENT_LAYOUT.thoughtStep,
          w: placed ? MOMENT_PLACED_LAYOUT.thoughtMaxWidth : MOMENT_LAYOUT.contentWidth,
          h: placed
            ? lineBoxHeight(MOMENT_PLACED_LAYOUT.thoughtFontSize, MOMENT_PLACED_LAYOUT.thoughtLineHeight, 1)
            : momentThoughtBoxHeight(),
          driftPx: placed ? 0 : MOMENT_LAYOUT.thoughtEntranceDrift,
        });
      });
    }

    if (beat.kind === "exhale") {
      beat.thoughts.forEach((thought, thoughtIndex) => {
        const position = beat.thoughtPositions[thoughtIndex]!;
        boxes.push({
          id: `beat-${index}-thought-${thoughtIndex}`,
          x: position.x,
          y: position.y,
          w: EXHALE_LAYOUT.thoughtMaxWidth,
          h: lineBoxHeight(EXHALE_LAYOUT.thoughtFontSize, EXHALE_LAYOUT.thoughtLineHeight, 1),
          driftPx: 0,
        });
      });

      boxes.push({
        id: `beat-${index}-in-label`,
        x: EXHALE_LAYOUT.labelX,
        y: EXHALE_LAYOUT.labelTop,
        w: textWidthPx(beat.inLabel, EXHALE_LAYOUT.labelFontSize, "mono", EXHALE_LAYOUT.labelLetterSpacingEm),
        h: lineBoxHeight(EXHALE_LAYOUT.labelFontSize, EXHALE_LAYOUT.labelLineHeight, 1),
        driftPx: EXHALE_LAYOUT.entranceDrift,
      });
      boxes.push({
        id: `beat-${index}-out-label`,
        x: EXHALE_LAYOUT.labelX,
        y: EXHALE_LAYOUT.labelBottom - lineBoxHeight(EXHALE_LAYOUT.labelFontSize, EXHALE_LAYOUT.labelLineHeight, 1),
        w: textWidthPx(beat.outLabel, EXHALE_LAYOUT.labelFontSize, "mono", EXHALE_LAYOUT.labelLetterSpacingEm),
        h: lineBoxHeight(EXHALE_LAYOUT.labelFontSize, EXHALE_LAYOUT.labelLineHeight, 1),
        driftPx: EXHALE_LAYOUT.entranceDrift,
      });
      boxes.push({
        id: `beat-${index}-phase-label`,
        x: EXHALE_LAYOUT.phaseX,
        y: EXHALE_LAYOUT.phaseTop,
        w: textWidthPx(beat.phaseLabel, EXHALE_LAYOUT.phaseFontSize, "display"),
        h: lineBoxHeight(EXHALE_LAYOUT.phaseFontSize, EXHALE_LAYOUT.phaseLineHeight, 1),
        driftPx: EXHALE_LAYOUT.entranceDrift,
      });
      beat.countdown.forEach((count, countIndex) => {
        boxes.push({
          id: `beat-${index}-countdown-${countIndex}`,
          x: EXHALE_LAYOUT.phaseX,
          y: EXHALE_LAYOUT.phaseTop + lineBoxHeight(EXHALE_LAYOUT.phaseFontSize, EXHALE_LAYOUT.phaseLineHeight, 1) + EXHALE_LAYOUT.phaseCountGap,
          w: textWidthPx(count, EXHALE_LAYOUT.countFontSize, "mono", EXHALE_LAYOUT.labelLetterSpacingEm),
          h: lineBoxHeight(EXHALE_LAYOUT.countFontSize, EXHALE_LAYOUT.countLineHeight, 1),
          driftPx: 0,
        });
      });
    }

    if (beat.kind === "question") {
      if (hasText(beat.kicker)) {
        boxes.push({
          id: `beat-${index}-kicker`,
          x: QUESTION_LAYOUT.contentX,
          y: QUESTION_LAYOUT.kickerTop,
          w: QUESTION_LAYOUT.contentWidth,
          h: lineBoxHeight(QUESTION_LAYOUT.kickerFontSize, QUESTION_LAYOUT.kickerLineHeight, 1),
          driftPx: QUESTION_LAYOUT.lineEntranceDrift,
        });
      }

      beat.lines.filter(hasText).forEach((line, lineIndex) => {
        boxes.push({
          id: `beat-${index}-question-line-${lineIndex}`,
          x: QUESTION_LAYOUT.contentX,
          y: QUESTION_LAYOUT.linesTop + lineIndex * QUESTION_LAYOUT.lineStep,
          w: QUESTION_LAYOUT.linesWidth,
          h: lineBoxHeight(QUESTION_LAYOUT.lineFontSize, QUESTION_LAYOUT.lineLineHeight, 1),
          driftPx: QUESTION_LAYOUT.lineEntranceDrift,
        });
      });

      if (hasText(beat.dek)) {
        boxes.push({
          id: `beat-${index}-dek`,
          x: QUESTION_LAYOUT.contentX,
          y: QUESTION_LAYOUT.dekTop,
          w: QUESTION_LAYOUT.contentWidth,
          h: lineBoxHeight(QUESTION_LAYOUT.dekFontSize, QUESTION_LAYOUT.dekLineHeight, 1),
          driftPx: QUESTION_LAYOUT.dekEntranceDrift,
        });
      }
    }

    if (beat.kind === "figure") {
      if (hasText(beat.label)) {
        boxes.push({
          id: `beat-${index}-figure-label`,
          x: FIGURE_LAYOUT.contentX,
          y: FIGURE_LAYOUT.labelTop,
          w: FIGURE_LAYOUT.contentWidth,
          h: lineBoxHeight(FIGURE_LAYOUT.labelFontSize, FIGURE_LAYOUT.labelLineHeight, 1),
          driftPx: 0,
        });
      }

      boxes.push({
        id: `beat-${index}-counter`,
        x: FIGURE_LAYOUT.contentX,
        y: FIGURE_LAYOUT.counterTop,
        w: FIGURE_LAYOUT.counterWidth,
        h: lineBoxHeight(FIGURE_LAYOUT.counterFontSize, FIGURE_LAYOUT.counterLineHeight, 1),
        driftPx: 0,
      });

      if (hasText(beat.goalText)) {
        boxes.push({
          id: `beat-${index}-goal`,
          x: FIGURE_LAYOUT.goalX,
          y: FIGURE_LAYOUT.goalTop,
          w: FIGURE_LAYOUT.goalWidth,
          h: lineBoxHeight(FIGURE_LAYOUT.goalFontSize, FIGURE_LAYOUT.goalLineHeight, FIGURE_LAYOUT.goalMaxLines),
          driftPx: 0,
        });
      }

      if (hasText(beat.unitLabel)) {
        boxes.push({
          id: `beat-${index}-unit-label`,
          x: FIGURE_LAYOUT.contentX,
          y: FIGURE_LAYOUT.unitLabelTop,
          w: FIGURE_LAYOUT.contentWidth,
          h: lineBoxHeight(FIGURE_LAYOUT.unitLabelFontSize, FIGURE_LAYOUT.unitLabelLineHeight, 1),
          driftPx: 0,
        });
      }

      if (hasText(beat.minTick)) {
        boxes.push({
          id: `beat-${index}-min-tick`,
          x: FIGURE_LAYOUT.axisX,
          y: FIGURE_LAYOUT.tickTop,
          w: FIGURE_LAYOUT.tickFontSize,
          h: lineBoxHeight(FIGURE_LAYOUT.tickFontSize, FIGURE_LAYOUT.tickLineHeight, 1),
          driftPx: 0,
        });
      }

      if (hasText(beat.achievedTick)) {
        boxes.push({
          id: `beat-${index}-achieved-tick`,
          x: FIGURE_LAYOUT.achievedTickX,
          y: FIGURE_LAYOUT.tickTop,
          w: FIGURE_LAYOUT.tickFontSize * 3,
          h: lineBoxHeight(FIGURE_LAYOUT.tickFontSize, FIGURE_LAYOUT.tickLineHeight, 1),
          driftPx: 0,
        });
      }

      if (hasText(beat.goalTick)) {
        boxes.push({
          id: `beat-${index}-goal-tick`,
          x: FIGURE_LAYOUT.goalTickX,
          y: FIGURE_LAYOUT.tickTop,
          w: WIDTH - SAFE_RIGHT - FIGURE_LAYOUT.goalTickX,
          h: lineBoxHeight(FIGURE_LAYOUT.tickFontSize, FIGURE_LAYOUT.tickLineHeight, 1),
          driftPx: 0,
        });
      }

      beat.stamps.forEach((stamp, stampIndex) => {
        if (hasText(stamp.text)) {
          boxes.push({
            id: `beat-${index}-stamp-${stampIndex}`,
            x: FIGURE_LAYOUT.contentX,
            y: FIGURE_LAYOUT.stampTop + stampIndex * FIGURE_LAYOUT.stampStep,
            w: FIGURE_LAYOUT.contentWidth,
            h: lineBoxHeight(FIGURE_LAYOUT.stampFontSize, FIGURE_LAYOUT.stampLineHeight, 1),
            driftPx: FIGURE_LAYOUT.stampEntranceDrift,
          });
        }
      });
    }

    if (beat.kind === "verdict") {
      beat.lines.filter(hasText).forEach((line, lineIndex) => {
        boxes.push({
          id: `beat-${index}-verdict-line-${lineIndex}`,
          x: VERDICT_LAYOUT.contentX,
          y: VERDICT_LAYOUT.linesTop + lineIndex * VERDICT_LAYOUT.lineStep,
          w: VERDICT_LAYOUT.linesWidth,
          h: lineBoxHeight(VERDICT_LAYOUT.lineFontSize, VERDICT_LAYOUT.lineLineHeight, 1),
          driftPx: VERDICT_LAYOUT.lineEntranceDrift,
        });
      });
    }
  });

  const hasCloseD = Boolean(
    script.close.tagline?.trim() || script.close.url?.trim() || brand.wordmark.logoSvg?.trim(),
  );

  if (!hasCloseD && hasText(script.close.line)) {
    boxes.push({
      id: "close-line",
      x: CLOSE_LAYOUT.contentX,
      y: CLOSE_LAYOUT.lineTop,
      w: CLOSE_LAYOUT.contentWidth,
      h: lineBoxHeight(CLOSE_LAYOUT.lineFontSize, CLOSE_LAYOUT.lineHeight, CLOSE_LAYOUT.lineMaxLines),
      driftPx: CLOSE_LAYOUT.lineEntranceDrift,
    });
  }

  if (!hasCloseD && script.close.showWordmark && hasText(brand.wordmark.text)) {
    boxes.push({
      id: "close-wordmark",
      x: CLOSE_LAYOUT.contentX,
      y: CLOSE_LAYOUT.wordmarkTop,
      w: CLOSE_LAYOUT.contentWidth,
      h: lineBoxHeight(CLOSE_LAYOUT.wordmarkFontSize, CLOSE_LAYOUT.wordmarkLineHeight, 1),
      driftPx: 0,
    });
  }

  if (hasCloseD) {
    if (hasText(brand.wordmark.logoSvg)) {
      boxes.push({
        id: "close-logo",
        x: CLOSE_D_LAYOUT.contentX,
        y: CLOSE_D_LAYOUT.logoTop,
        w: CLOSE_D_LAYOUT.logoSize,
        h: CLOSE_D_LAYOUT.logoSize,
        driftPx: CLOSE_D_LAYOUT.entranceDrift,
      });
    }

    if (hasText(script.close.tagline)) {
      boxes.push({
        id: "close-tagline",
        x: CLOSE_D_LAYOUT.contentX,
        y: CLOSE_D_LAYOUT.taglineTop,
        w: CLOSE_LAYOUT.contentWidth,
        h: lineBoxHeight(CLOSE_D_LAYOUT.taglineFontSize, CLOSE_D_LAYOUT.taglineLineHeight, CLOSE_D_LAYOUT.taglineMaxLines),
        driftPx: CLOSE_D_LAYOUT.entranceDrift,
      });
    }

    if (hasText(script.close.url)) {
      boxes.push({
        id: "close-url",
        x: CLOSE_D_LAYOUT.contentX,
        y: CLOSE_D_LAYOUT.urlTop,
        w: CLOSE_LAYOUT.contentWidth,
        h: lineBoxHeight(CLOSE_D_LAYOUT.urlFontSize, CLOSE_D_LAYOUT.urlLineHeight, 1),
        driftPx: CLOSE_D_LAYOUT.entranceDrift,
      });
    }
  }

  if (hasText(script.caption)) {
    const lines = script.caption
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, CAPTION_LAYOUT.maxLines);
    const lineHeight = lineBoxHeight(CAPTION_LAYOUT.fontSize, CAPTION_LAYOUT.lineHeight, 1);
    lines.forEach((_, lineIndex) => {
      boxes.push({
        id: `caption-line-${lineIndex}`,
        x: CAPTION_LAYOUT.contentX,
        y: HEIGHT - SAFE_BOTTOM - CAPTION_LAYOUT.bottomOffset - lineHeight * CAPTION_LAYOUT.maxLines + lineHeight * lineIndex,
        w: CAPTION_LAYOUT.contentWidth,
        h: lineHeight,
        driftPx: 0,
      });
    });
  }

  const timeline = computeTimeline(script, brand);
  return boxes.map((box) => ({
    ...box,
    ...metadataForTextBox(box, script, brand, timeline),
  }));
};

export type GeometryBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type GeometryMotion = {
  startMs: number;
  endMs: number;
  from: GeometryBox;
  to: GeometryBox;
  bezier: readonly [number, number, number, number];
};

export type GeometryElement = GeometryBox & {
  id: string;
  beatIndex: number | null;
  kind: "shape";
  fromMs: number;
  toMs: number;
  motion?: GeometryMotion;
};

export const computeGeometry = (script: Script, brand: BrandKit): GeometryElement[] => {
  const timeline = computeTimeline(script, brand);
  const geometry: GeometryElement[] = [];

  const addShape = (
    id: string,
    beatIndex: number | null,
    box: GeometryBox,
    fromMs: number,
    toMs: number,
    motion?: GeometryMotion,
  ) => geometry.push({ id, beatIndex, kind: "shape", ...box, fromMs, toMs, motion });

  script.beats.forEach((beat, beatIndex) => {
    const span = timeline.beats[beatIndex]!;

    if (beat.kind === "figure") {
      const figureStartMs = span.startMs;
      const figureEndMs = span.endMs;
      const pointX = FIGURE_LAYOUT.axisX + FIGURE_LAYOUT.axisWidth *
        ((beat.axis.achieved - beat.axis.min) / (beat.axis.max - beat.axis.min));
      const axis = {
        x: FIGURE_LAYOUT.axisX,
        y: FIGURE_LAYOUT.axisY,
        w: FIGURE_LAYOUT.axisWidth,
        h: FIGURE_LAYOUT.axisHeight,
      };
      const solidStartMs = figureStartMs + FIGURE_TIMING.solidStartMs;
      const solidEndMs = solidStartMs + FIGURE_TIMING.drawDurationMs;
      const solid = {
        x: FIGURE_LAYOUT.axisX,
        y: FIGURE_LAYOUT.solidTop,
        w: pointX - FIGURE_LAYOUT.axisX,
        h: FIGURE_LAYOUT.solidHeight,
      };
      const solidFrom = { ...solid, w: 0 };
      const dashedStartMs = figureStartMs + FIGURE_TIMING.dashedStartMs;
      const dashedEndMs = dashedStartMs + FIGURE_TIMING.dashedDurationMs;
      const dashed = {
        x: pointX,
        y: FIGURE_LAYOUT.dashedTop,
        w: FIGURE_LAYOUT.axisX + FIGURE_LAYOUT.axisWidth - pointX,
        h: FIGURE_LAYOUT.dashedHeight,
      };
      const dashedFrom = { ...dashed, w: 0 };
      const goalStartMs = figureStartMs + FIGURE_TIMING.goalMs;
      const goalRing = {
        x: FIGURE_LAYOUT.goalRingLeft,
        y: FIGURE_LAYOUT.goalRingTop,
        w: FIGURE_LAYOUT.goalRingSize,
        h: FIGURE_LAYOUT.goalRingSize,
      };

      addShape(`beat-${beatIndex}-figure-axis`, beatIndex, axis, figureStartMs, figureEndMs);
      addShape(`beat-${beatIndex}-figure-solid-bar`, beatIndex, solid, solidStartMs, figureEndMs, {
        startMs: solidStartMs,
        endMs: solidEndMs,
        from: solidFrom,
        to: solid,
        bezier: brand.motion.bezier,
      });
      addShape(`beat-${beatIndex}-figure-dashed-bar`, beatIndex, dashed, dashedStartMs, figureEndMs, {
        startMs: dashedStartMs,
        endMs: dashedEndMs,
        from: dashedFrom,
        to: dashed,
        bezier: brand.motion.bezier,
      });
      // The ring fades in at a fixed size; only its visibility time belongs here.
      addShape(`beat-${beatIndex}-figure-goal-ring`, beatIndex, goalRing, goalStartMs, figureEndMs);

      if (beat.flash) {
        const flashStartMs = figureStartMs + FIGURE_TIMING.flashMs;
        const flashPeakMs = flashStartMs + FIGURE_TIMING.flashPeakMs;
        const dotSizeAtPeak = FIGURE_LAYOUT.flashDotSize * FIGURE_LAYOUT.flashPeakScale;
        const dot = {
          x: pointX - dotSizeAtPeak / 2,
          y: FIGURE_LAYOUT.flashDotTop + FIGURE_LAYOUT.flashDotSize / 2 - dotSizeAtPeak / 2,
          w: dotSizeAtPeak,
          h: dotSizeAtPeak,
        };
        const dotAtStartSize = FIGURE_LAYOUT.flashDotSize * FIGURE_LAYOUT.flashInitialScale;
        const dotFrom = {
          x: pointX - dotAtStartSize / 2,
          y: FIGURE_LAYOUT.flashDotTop + FIGURE_LAYOUT.flashDotSize / 2 - dotAtStartSize / 2,
          w: dotAtStartSize,
          h: dotAtStartSize,
        };
        // The colored shadow expands as it fades during the 385ms rise. Keep its
        // outer envelope separate from the filled dot so the conservative box
        // ends when the shadow has fully faded at peak.
        // CSS transform scales the box shadow too: the maximum radius is the
        // scaled dot radius plus the scaled 48px spread. The envelope's linear
        // motion overestimates the quadratic intermediate sizes conservatively.
        const flashRingSpread = FIGURE_LAYOUT.flashRingSpread * FIGURE_LAYOUT.flashPeakScale;
        const flashRing = {
          x: pointX - (dotSizeAtPeak / 2 + flashRingSpread),
          y: FIGURE_LAYOUT.flashDotTop + FIGURE_LAYOUT.flashDotSize / 2 - dotSizeAtPeak / 2 - flashRingSpread,
          w: dotSizeAtPeak + flashRingSpread * 2,
          h: dotSizeAtPeak + flashRingSpread * 2,
        };
        const flashRingFrom = {
          x: pointX - dotAtStartSize / 2,
          y: FIGURE_LAYOUT.flashDotTop + FIGURE_LAYOUT.flashDotSize / 2 - dotAtStartSize / 2,
          w: dotAtStartSize,
          h: dotAtStartSize,
        };

        addShape(`beat-${beatIndex}-figure-flash-dot`, beatIndex, dot, flashStartMs, figureEndMs, {
          startMs: flashStartMs,
          endMs: flashPeakMs,
          from: dotFrom,
          to: dot,
          bezier: brand.motion.bezier,
        });
        addShape(`beat-${beatIndex}-figure-flash-ring`, beatIndex, flashRing, flashStartMs, flashPeakMs, {
          startMs: flashStartMs,
          endMs: flashPeakMs,
          from: flashRingFrom,
          to: flashRing,
          bezier: brand.motion.bezier,
        });
      }
      return;
    }

    if (beat.kind !== "exhale") return;
    resolveExhaleColor(brand, beat);
    const column = {
      x: EXHALE_LAYOUT.columnX,
      y: EXHALE_LAYOUT.columnTop,
      w: EXHALE_LAYOUT.columnWidth,
      h: EXHALE_LAYOUT.columnHeight,
    };
    const track = {
      x: EXHALE_LAYOUT.columnX + EXHALE_LAYOUT.columnWidth / 2,
      y: EXHALE_LAYOUT.innerTop,
      w: EXHALE_LAYOUT.trackWidth,
      h: EXHALE_LAYOUT.innerHeight,
    };
    const fill = {
      ...track,
      x: track.x - EXHALE_LAYOUT.trackWidth / 2,
    };
    const dotSize = EXHALE_LAYOUT.dotSize;
    const dotX = EXHALE_LAYOUT.columnX + EXHALE_LAYOUT.columnWidth / 2 - dotSize / 2;
    const dotFrom = {
      x: dotX,
      y: EXHALE_LAYOUT.innerTop - dotSize / 2,
      w: dotSize,
      h: dotSize,
    };
    const dotTo = {
      x: dotX,
      y: EXHALE_LAYOUT.innerTop + EXHALE_LAYOUT.innerHeight - dotSize / 2,
      w: dotSize,
      h: dotSize,
    };
    const add = (
      id: string,
      box: GeometryBox,
      fromMs = span.startMs,
      toMs = span.endMs,
      motion?: GeometryMotion,
    ) => addShape(`beat-${beatIndex}-exhale-${id}`, beatIndex, box, fromMs, toMs, motion);

    add("column", column);
    add("track", track, span.startMs + EXHALE_TIMING.trackStartMs);
    add("fill", fill, span.startMs + EXHALE_TIMING.trackStartMs, span.endMs, {
      startMs: span.startMs + EXHALE_TIMING.travelStartMs,
      endMs: span.startMs + EXHALE_TIMING.travelStartMs + EXHALE_TIMING.travelDurationMs,
      from: { ...fill },
      to: { ...fill, y: EXHALE_LAYOUT.innerTop + EXHALE_LAYOUT.innerHeight, h: 0 },
      bezier: EXHALE_TIMING.travelCurve,
    });
    add("dot", dotFrom, span.startMs + EXHALE_TIMING.dotFadeStartMs, span.endMs, {
      startMs: span.startMs + EXHALE_TIMING.travelStartMs,
      endMs: span.startMs + EXHALE_TIMING.travelStartMs + EXHALE_TIMING.travelDurationMs,
      from: dotFrom,
      to: dotTo,
      bezier: EXHALE_TIMING.travelCurve,
    });

    const tickBox = (fraction: number, x: number): GeometryBox => ({
      x,
      y: EXHALE_LAYOUT.innerTop + EXHALE_LAYOUT.innerHeight * fraction - EXHALE_LAYOUT.tickHeight / 2,
      w: EXHALE_LAYOUT.tickWidth,
      h: EXHALE_LAYOUT.tickHeight,
    });
    [0, 1 / 3, 2 / 3, 1].forEach((fraction, tickIndex) => {
      const tickStartMs = span.startMs + EXHALE_TIMING.tickStartMs + tickIndex * EXHALE_TIMING.tickStaggerMs;
      add(`tick-in-${tickIndex}`, tickBox(
        fraction,
        EXHALE_LAYOUT.columnX + EXHALE_LAYOUT.columnWidth / 2 - EXHALE_LAYOUT.tickOffsetFromCenter - EXHALE_LAYOUT.tickWidth,
      ), tickStartMs, span.endMs);
    });
    Array.from({ length: 8 }, (_, tickIndex) => tickIndex / 7).forEach((fraction, tickIndex) => {
      const tickStartMs = span.startMs + EXHALE_TIMING.tickStartMs + (4 + tickIndex) * EXHALE_TIMING.tickStaggerMs;
      add(`tick-out-${tickIndex}`, tickBox(
        fraction,
        EXHALE_LAYOUT.columnX + EXHALE_LAYOUT.columnWidth / 2 + EXHALE_LAYOUT.tickOffsetFromCenter,
      ), tickStartMs, span.endMs);
    });
  });

  const closeStartMs = timeline.beats.at(-1)?.endMs ?? 0;
  const closeLogoMotionStartMs = closeStartMs + CLOSE_D_TIMING.logoMs;
  const closeLogoVisibleStartMs = Math.min(timeline.totalDurationMs, closeLogoMotionStartMs);
  const hasCloseD = Boolean(
    script.close.tagline?.trim() || script.close.url?.trim() || brand.wordmark.logoSvg?.trim(),
  );
  if (hasCloseD && brand.wordmark.logoSvg?.trim()) {
    const logo = {
      x: CLOSE_D_LAYOUT.contentX,
      y: CLOSE_D_LAYOUT.logoTop,
      w: CLOSE_D_LAYOUT.logoSize,
      h: CLOSE_D_LAYOUT.logoSize,
    };
    addShape("close-logo", null, logo, closeLogoVisibleStartMs, timeline.totalDurationMs, {
      startMs: closeLogoMotionStartMs,
      endMs: closeLogoMotionStartMs + brand.motion.entranceMs,
      from: { ...logo, y: logo.y + CLOSE_D_LAYOUT.entranceDrift },
      to: logo,
      bezier: brand.motion.bezier,
    });
  }

  return geometry;
};

export type LintResult = {
  ok: boolean;
  violations: string[];
};

export const lintScript = (script: Script, brand: BrandKit): LintResult => {
  const timeline = computeTimeline(script, brand);
  const boxes = computeTextBoxes(script, brand);
  const violations: string[] = [];

  if (
    timeline.firstOnScreenTextMs === null ||
    timeline.firstOnScreenTextMs > MAX_HOOK_MS
  ) {
    const firstText = timeline.firstOnScreenTextMs === null ? "never" : `${timeline.firstOnScreenTextMs}ms`;
    violations.push(`First on-screen text must land by ${MAX_HOOK_MS}ms; got ${firstText}.`);
  }

  const safeRightEdge = WIDTH - SAFE_RIGHT;
  const safeBottomEdge = HEIGHT - SAFE_BOTTOM;
  boxes.forEach((box) => {
    if (
      box.x < SAFE_LEFT ||
      box.y < SAFE_TOP ||
      box.x + box.w > safeRightEdge ||
      box.y + box.h + box.driftPx > safeBottomEdge
    ) {
      violations.push(
        `Text box ${box.id} is outside the safe zone: (${box.x}, ${box.y}, ${box.w}, ${box.h}).`,
      );
    }
  });

  const visualChanges = [...timeline.visualChangeMs, timeline.totalDurationMs];
  for (let index = 1; index < visualChanges.length; index += 1) {
    const interval = visualChanges[index] - visualChanges[index - 1];
    if (interval > MAX_STATIC_INTERVAL_MS) {
      violations.push(
        `Static interval from ${visualChanges[index - 1]}ms to ${visualChanges[index]}ms exceeds ${MAX_STATIC_INTERVAL_MS}ms.`,
      );
    }
  }

  if (timeline.totalDurationMs < MIN_DURATION_MS || timeline.totalDurationMs > MAX_DURATION_MS) {
    violations.push(
      `Total duration must be between ${MIN_DURATION_MS}ms and ${MAX_DURATION_MS}ms; got ${timeline.totalDurationMs}ms.`,
    );
  }

  return { ok: violations.length === 0, violations };
};
