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
