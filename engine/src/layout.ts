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
import type { Beat, BrandKit, Script } from "./schema";

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
  thoughtMaxLines: 3,
  thoughtStep: 140,
  thoughtEntranceDrift: 24,
};

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
  goalX: FIGURE_GOAL_X,
  goalWidth: WIDTH - SAFE_RIGHT - FIGURE_GOAL_X,
  goalTop: 590,
  goalFontSize: 60,
  goalLineHeight: 1.2,
  goalMaxLines: 2,
  unitLabelTop: 730,
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

export const CLOSE_D_LAYOUT = {
  contentX: SAFE_LEFT,
  logoTop: 620,
  logoSize: 150,
  taglineTop: 830,
  taglineFontSize: 96,
  taglineLineHeight: 1.2,
  taglineLetterSpacing: "-0.02em",
  urlTop: 986,
  urlFontSize: 34,
  urlLineHeight: 1.2,
  urlLetterSpacing: "0.08em",
  entranceDrift: 34,
  sceneFadeDurationMs: 400,
} as const;

export const CLOSE_D_TIMING = {
  logoMs: 200,
  taglineMs: 500,
  urlMs: 900,
} as const;

export const CAPTION_LAYOUT = {
  contentX: SAFE_LEFT,
  contentWidth: WIDTH - SAFE_LEFT - SAFE_RIGHT,
  fontSize: 36,
  lineHeight: 1.25,
  maxWordsPerLine: 5,
  maxLines: 2,
  bottomOffset: 42,
} as const;

export const GLYPH_EM = {
  display: 0.52,
  body: 0.55,
  mono: 0.6,
} as const;

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
        return beatMetadata(timeline, beatIndex, brand, beat.eyebrow ?? "", "mono", MOMENT_LAYOUT.eyebrowFontSize, MOMENT_LAYOUT.eyebrowLineHeight, 1, 0.4);
      }
      if (part === "line") {
        return beatMetadata(timeline, beatIndex, brand, beat.line, "display", MOMENT_LAYOUT.momentLineFontSize, MOMENT_LAYOUT.momentLineHeight, MOMENT_LAYOUT.momentLineMaxLines, 0);
      }
      const thoughtMatch = /^thought-(\d+)$/.exec(part);
      if (thoughtMatch) {
        const thoughtIndex = Number(thoughtMatch[1]);
        return beatMetadata(
          timeline,
          beatIndex,
          brand,
          beat.thoughts?.filter(hasText)[thoughtIndex] ?? "",
          "body",
          MOMENT_LAYOUT.thoughtFontSize,
          MOMENT_LAYOUT.thoughtLineHeight,
          MOMENT_LAYOUT.thoughtMaxLines,
          0,
          thoughtPhaseInStartMs(brand, beat) + thoughtIndex * thoughtStaggerMs(brand),
        );
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
    return { ...closeOffset(CLOSE_D_TIMING.taglineMs), text: script.close.tagline ?? "", fontSize: CLOSE_D_LAYOUT.taglineFontSize, lineHeight: CLOSE_D_LAYOUT.taglineLineHeight, letterSpacingEm: -0.02 };
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

const lineBoxHeight = (fontSize: number, lineHeight: number, maxLines: number): number =>
  fontSize * lineHeight * maxLines;

export const computeTextBoxes = (script: Script, brand: BrandKit): LayoutTextBox[] => {
  const boxes: TextBox[] = [];

  script.beats.forEach((beat, index) => {
    if (beat.kind === "moment") {
      if (hasText(beat.eyebrow)) {
        boxes.push({
          id: `beat-${index}-eyebrow`,
          x: MOMENT_LAYOUT.contentX,
          y: MOMENT_LAYOUT.eyebrowTop,
          w: MOMENT_LAYOUT.contentWidth,
          h: lineBoxHeight(MOMENT_LAYOUT.eyebrowFontSize, MOMENT_LAYOUT.eyebrowLineHeight, 1),
        });
      }

      if (hasText(beat.line)) {
        boxes.push({
          id: `beat-${index}-line`,
          x: MOMENT_LAYOUT.contentX,
          y: MOMENT_LAYOUT.momentLineTop,
          w: MOMENT_LAYOUT.contentWidth,
          h: lineBoxHeight(
            MOMENT_LAYOUT.momentLineFontSize,
            MOMENT_LAYOUT.momentLineHeight,
            MOMENT_LAYOUT.momentLineMaxLines,
          ) + MOMENT_LAYOUT.momentLineEntranceDrift,
        });
      }

      (beat.thoughts ?? []).filter(hasText).forEach((thought, thoughtIndex) => {
        boxes.push({
          id: `beat-${index}-thought-${thoughtIndex}`,
          x: MOMENT_LAYOUT.contentX,
          y: MOMENT_LAYOUT.thoughtsTop + thoughtIndex * MOMENT_LAYOUT.thoughtStep,
          w: MOMENT_LAYOUT.contentWidth,
          h: lineBoxHeight(
            MOMENT_LAYOUT.thoughtFontSize,
            MOMENT_LAYOUT.thoughtLineHeight,
            MOMENT_LAYOUT.thoughtMaxLines,
          ) + MOMENT_LAYOUT.thoughtEntranceDrift,
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
          h: lineBoxHeight(QUESTION_LAYOUT.kickerFontSize, QUESTION_LAYOUT.kickerLineHeight, 1) +
            QUESTION_LAYOUT.lineEntranceDrift,
        });
      }

      beat.lines.filter(hasText).forEach((line, lineIndex) => {
        boxes.push({
          id: `beat-${index}-question-line-${lineIndex}`,
          x: QUESTION_LAYOUT.contentX,
          y: QUESTION_LAYOUT.linesTop + lineIndex * QUESTION_LAYOUT.lineStep,
          w: QUESTION_LAYOUT.linesWidth,
          h: lineBoxHeight(QUESTION_LAYOUT.lineFontSize, QUESTION_LAYOUT.lineLineHeight, 1) +
            QUESTION_LAYOUT.lineEntranceDrift,
        });
      });

      if (hasText(beat.dek)) {
        boxes.push({
          id: `beat-${index}-dek`,
          x: QUESTION_LAYOUT.contentX,
          y: QUESTION_LAYOUT.dekTop,
          w: QUESTION_LAYOUT.contentWidth,
          h: lineBoxHeight(QUESTION_LAYOUT.dekFontSize, QUESTION_LAYOUT.dekLineHeight, 1) +
            QUESTION_LAYOUT.dekEntranceDrift,
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
        });
      }

      boxes.push({
        id: `beat-${index}-counter`,
        x: FIGURE_LAYOUT.contentX,
        y: FIGURE_LAYOUT.counterTop,
        w: FIGURE_LAYOUT.contentWidth,
        h: lineBoxHeight(FIGURE_LAYOUT.counterFontSize, FIGURE_LAYOUT.counterLineHeight, 1),
      });

      if (hasText(beat.goalText)) {
        boxes.push({
          id: `beat-${index}-goal`,
          x: FIGURE_LAYOUT.goalX,
          y: FIGURE_LAYOUT.goalTop,
          w: FIGURE_LAYOUT.goalWidth,
          h: lineBoxHeight(FIGURE_LAYOUT.goalFontSize, FIGURE_LAYOUT.goalLineHeight, FIGURE_LAYOUT.goalMaxLines),
        });
      }

      if (hasText(beat.unitLabel)) {
        boxes.push({
          id: `beat-${index}-unit-label`,
          x: FIGURE_LAYOUT.contentX,
          y: FIGURE_LAYOUT.unitLabelTop,
          w: FIGURE_LAYOUT.contentWidth,
          h: lineBoxHeight(FIGURE_LAYOUT.unitLabelFontSize, FIGURE_LAYOUT.unitLabelLineHeight, 1),
        });
      }

      if (hasText(beat.minTick)) {
        boxes.push({
          id: `beat-${index}-min-tick`,
          x: FIGURE_LAYOUT.axisX,
          y: FIGURE_LAYOUT.tickTop,
          w: FIGURE_LAYOUT.tickFontSize,
          h: lineBoxHeight(FIGURE_LAYOUT.tickFontSize, FIGURE_LAYOUT.tickLineHeight, 1),
        });
      }

      if (hasText(beat.achievedTick)) {
        boxes.push({
          id: `beat-${index}-achieved-tick`,
          x: FIGURE_LAYOUT.achievedTickX,
          y: FIGURE_LAYOUT.tickTop,
          w: FIGURE_LAYOUT.tickFontSize * 3,
          h: lineBoxHeight(FIGURE_LAYOUT.tickFontSize, FIGURE_LAYOUT.tickLineHeight, 1),
        });
      }

      if (hasText(beat.goalTick)) {
        boxes.push({
          id: `beat-${index}-goal-tick`,
          x: FIGURE_LAYOUT.goalTickX,
          y: FIGURE_LAYOUT.tickTop,
          w: WIDTH - SAFE_RIGHT - FIGURE_LAYOUT.goalTickX,
          h: lineBoxHeight(FIGURE_LAYOUT.tickFontSize, FIGURE_LAYOUT.tickLineHeight, 1),
        });
      }

      beat.stamps.forEach((stamp, stampIndex) => {
        if (hasText(stamp.text)) {
          boxes.push({
            id: `beat-${index}-stamp-${stampIndex}`,
            x: FIGURE_LAYOUT.contentX,
            y: FIGURE_LAYOUT.stampTop + stampIndex * FIGURE_LAYOUT.stampStep,
            w: FIGURE_LAYOUT.contentWidth,
            h: lineBoxHeight(FIGURE_LAYOUT.stampFontSize, FIGURE_LAYOUT.stampLineHeight, 1) +
              FIGURE_LAYOUT.stampEntranceDrift,
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
          h: lineBoxHeight(VERDICT_LAYOUT.lineFontSize, VERDICT_LAYOUT.lineLineHeight, 1) +
            VERDICT_LAYOUT.lineEntranceDrift,
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
      h:
        lineBoxHeight(CLOSE_LAYOUT.lineFontSize, CLOSE_LAYOUT.lineHeight, CLOSE_LAYOUT.lineMaxLines) +
        CLOSE_LAYOUT.lineEntranceDrift,
    });
  }

  if (!hasCloseD && script.close.showWordmark && hasText(brand.wordmark.text)) {
    boxes.push({
      id: "close-wordmark",
      x: CLOSE_LAYOUT.contentX,
      y: CLOSE_LAYOUT.wordmarkTop,
      w: CLOSE_LAYOUT.contentWidth,
      h: lineBoxHeight(CLOSE_LAYOUT.wordmarkFontSize, CLOSE_LAYOUT.wordmarkLineHeight, 1),
    });
  }

  if (hasCloseD) {
    if (hasText(brand.wordmark.logoSvg)) {
      boxes.push({
        id: "close-logo",
        x: CLOSE_D_LAYOUT.contentX,
        y: CLOSE_D_LAYOUT.logoTop,
        w: CLOSE_D_LAYOUT.logoSize,
        h: CLOSE_D_LAYOUT.logoSize + CLOSE_D_LAYOUT.entranceDrift,
      });
    }

    if (hasText(script.close.tagline)) {
      boxes.push({
        id: "close-tagline",
        x: CLOSE_D_LAYOUT.contentX,
        y: CLOSE_D_LAYOUT.taglineTop,
        w: CLOSE_LAYOUT.contentWidth,
        h: lineBoxHeight(CLOSE_D_LAYOUT.taglineFontSize, CLOSE_D_LAYOUT.taglineLineHeight, 1) +
          CLOSE_D_LAYOUT.entranceDrift,
      });
    }

    if (hasText(script.close.url)) {
      boxes.push({
        id: "close-url",
        x: CLOSE_D_LAYOUT.contentX,
        y: CLOSE_D_LAYOUT.urlTop,
        w: CLOSE_LAYOUT.contentWidth,
        h: lineBoxHeight(CLOSE_D_LAYOUT.urlFontSize, CLOSE_D_LAYOUT.urlLineHeight, 1) +
          CLOSE_D_LAYOUT.entranceDrift,
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
      });
    });
  }

  const timeline = computeTimeline(script, brand);
  return boxes.map((box) => ({
    ...box,
    ...metadataForTextBox(box, script, brand, timeline),
  }));
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
      box.y + box.h > safeBottomEdge
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
