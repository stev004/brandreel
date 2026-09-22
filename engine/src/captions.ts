import type { Words } from "./schema";

type TimedWord = Words["words"][number];

export type CaptionWindowOptions = {
  maxWordsPerLine: number;
  maxLines: number;
};

export type CaptionWindow = {
  lines: string[][];
  activeIndex: number | null;
};

const GAP_GRACE_MS = 500;

export type CaptionSlice = {
  fromMs: number;
  toMs: number;
  lines: string[][];
};

export const captionWindow = (
  words: readonly TimedWord[] | Words,
  timeMs: number,
  opts: CaptionWindowOptions,
): CaptionWindow => {
  const timedWords: readonly TimedWord[] = "words" in words ? words.words : words;
  const windowSize = opts.maxWordsPerLine * opts.maxLines;
  if (timedWords.length === 0 || windowSize <= 0) {
    return { lines: [], activeIndex: null };
  }

  let lastStartedIndex = -1;
  let activeIndex = -1;
  for (let index = 0; index < timedWords.length; index += 1) {
    const word = timedWords[index];
    if (word.startMs <= timeMs) lastStartedIndex = index;
    if (word.startMs <= timeMs && timeMs < word.endMs) activeIndex = index;
  }

  const lastWord = timedWords[timedWords.length - 1];
  if (activeIndex === -1 && timeMs >= lastWord.endMs + GAP_GRACE_MS) {
    return { lines: [], activeIndex: null };
  }

  const shownIndex = activeIndex === -1
    ? (lastStartedIndex === -1 ? 0 : lastStartedIndex)
    : activeIndex;
  const windowStart = Math.floor(shownIndex / windowSize) * windowSize;

  const windowEnd = Math.min(windowStart + windowSize, timedWords.length);
  const windowWords = timedWords.slice(windowStart, windowEnd);
  const lines: string[][] = [];
  for (let index = 0; index < windowWords.length; index += opts.maxWordsPerLine) {
    lines.push(windowWords.slice(index, index + opts.maxWordsPerLine).map((word) => word.text));
  }

  return {
    lines,
    activeIndex: activeIndex === -1 ? null : activeIndex - windowStart,
  };
};

/**
 * Describes the visible caption text over a time range using the same window
 * rules as captionWindow. The active-word color can change within a slice;
 * these slices track text geometry and visibility only.
 */
export const captionSlices = (
  words: readonly TimedWord[] | Words,
  fromMs: number,
  toMs: number,
  opts: CaptionWindowOptions,
): CaptionSlice[] => {
  const timedWords: readonly TimedWord[] = "words" in words ? words.words : words;
  if (timedWords.length === 0 || toMs <= fromMs) return [];

  if (opts.maxWordsPerLine * opts.maxLines <= 0) return [];
  const slices: CaptionSlice[] = [];
  const finalWord = timedWords[timedWords.length - 1]!;
  const boundaries = new Set<number>([fromMs, toMs]);
  for (const word of timedWords) {
    if (word.startMs > fromMs && word.startMs < toMs) boundaries.add(word.startMs);
    if (word.endMs > fromMs && word.endMs < toMs) boundaries.add(word.endMs);
  }
  const finalCaptionEndMs = finalWord.endMs + GAP_GRACE_MS;
  if (finalCaptionEndMs > fromMs && finalCaptionEndMs < toMs) boundaries.add(finalCaptionEndMs);

  const orderedBoundaries = [...boundaries].sort((first, second) => first - second);
  for (let index = 0; index < orderedBoundaries.length - 1; index += 1) {
    const sliceFromMs = orderedBoundaries[index]!;
    const sliceToMs = orderedBoundaries[index + 1]!;
    if (sliceToMs <= sliceFromMs) continue;

    const lines = captionWindow(timedWords, sliceFromMs, opts).lines;
    if (lines.length === 0) continue;
    const previous = slices.at(-1);
    const sameLines = previous && JSON.stringify(previous.lines) === JSON.stringify(lines);
    if (sameLines && previous.toMs === sliceFromMs) {
      previous.toMs = sliceToMs;
    } else {
      slices.push({ fromMs: sliceFromMs, toMs: sliceToMs, lines });
    }
  }

  return slices;
};

/** Returns boundaries where caption text or its active word visibly changes. */
export const captionChangeTimes = (
  words: readonly TimedWord[] | Words,
  fromMs: number,
  toMs: number,
  opts: CaptionWindowOptions,
): number[] => {
  const timedWords: readonly TimedWord[] = "words" in words ? words.words : words;
  if (timedWords.length === 0 || toMs <= fromMs) return [];

  const boundaries = new Set<number>([fromMs]);
  for (const word of timedWords) {
    if (word.startMs > fromMs && word.startMs < toMs) boundaries.add(word.startMs);
    if (word.endMs > fromMs && word.endMs < toMs) boundaries.add(word.endMs);
  }
  const finalWord = timedWords[timedWords.length - 1]!;
  if (finalWord.endMs + GAP_GRACE_MS > fromMs && finalWord.endMs + GAP_GRACE_MS < toMs) {
    boundaries.add(finalWord.endMs + GAP_GRACE_MS);
  }

  const ordered = [...boundaries].sort((first, second) => first - second);
  const stateAt = (timeMs: number): string => {
    const window = captionWindow(timedWords, timeMs, opts);
    return JSON.stringify({ lines: window.lines, activeIndex: window.activeIndex });
  };

  const changes: number[] = [];
  let previousState = stateAt(fromMs - 0.001);
  for (const timeMs of ordered) {
    const state = stateAt(timeMs);
    if (state !== previousState) changes.push(timeMs);
    previousState = state;
  }
  return changes;
};
