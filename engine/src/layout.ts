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

export const CAPTION_LAYOUT = {
  contentX: SAFE_LEFT,
  contentWidth: WIDTH - SAFE_LEFT - SAFE_RIGHT,
  fontSize: 36,
  lineHeight: 1.25,
  maxLines: 2,
  bottomOffset: 42,
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

export const closeDurationMs = (brand: BrandKit): number =>
  brand.motion.entranceMs + brand.motion.holdMsDefault;

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

  script.beats.forEach((beat, index) => {
    const startMs = cursorMs;
    const endMs = startMs + beat.durationMs;
    beats.push({ index, startMs, endMs });

    if (index > 0) {
      visualChangeMs.push(startMs);
    }

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

    thoughts.forEach((thought, thoughtIndex) => {
      const phaseInMs = startMs + thoughtPhaseInStartMs(brand, beat) + thoughtIndex * thoughtStaggerMs(brand);
      if (phaseInMs < endMs) {
        visualChangeMs.push(phaseInMs);
      }
    });

    cursorMs = endMs;
  });

  const totalDurationMs = cursorMs + closeDurationMs(brand);
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

const lineBoxHeight = (fontSize: number, lineHeight: number, maxLines: number): number =>
  fontSize * lineHeight * maxLines;

export const computeTextBoxes = (script: Script, _brand: BrandKit): TextBox[] => {
  const boxes: TextBox[] = [];

  script.beats.forEach((beat, index) => {
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
  });

  if (hasText(script.close.line)) {
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

  if (script.close.showWordmark && hasText(_brand.wordmark.text)) {
    boxes.push({
      id: "close-wordmark",
      x: CLOSE_LAYOUT.contentX,
      y: CLOSE_LAYOUT.wordmarkTop,
      w: CLOSE_LAYOUT.contentWidth,
      h: lineBoxHeight(CLOSE_LAYOUT.wordmarkFontSize, CLOSE_LAYOUT.wordmarkLineHeight, 1),
    });
  }

  if (hasText(script.caption)) {
    const height = lineBoxHeight(
      CAPTION_LAYOUT.fontSize,
      CAPTION_LAYOUT.lineHeight,
      CAPTION_LAYOUT.maxLines,
    );
    boxes.push({
      id: "caption",
      x: CAPTION_LAYOUT.contentX,
      y: HEIGHT - SAFE_BOTTOM - CAPTION_LAYOUT.bottomOffset - height,
      w: CAPTION_LAYOUT.contentWidth,
      h: height,
    });
  }

  return boxes;
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
