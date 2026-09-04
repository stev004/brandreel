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

  const windowCount = Math.ceil(timedWords.length / windowSize);
  const lastWord = timedWords[timedWords.length - 1];
  if (timeMs >= lastWord.endMs + GAP_GRACE_MS) {
    return { lines: [], activeIndex: null };
  }

  let windowStart = 0;
  for (let index = 0; index < windowCount; index += 1) {
    const start = index * windowSize;
    const end = Math.min(start + windowSize, timedWords.length);
    const firstWord = timedWords[start];
    const lastWindowWord = timedWords[end - 1];

    if (timeMs < firstWord.startMs) {
      windowStart = start;
      break;
    }

    if (timeMs < lastWindowWord.endMs || index === windowCount - 1) {
      windowStart = start;
      break;
    }
  }

  const windowEnd = Math.min(windowStart + windowSize, timedWords.length);
  const windowWords = timedWords.slice(windowStart, windowEnd);
  const lines: string[][] = [];
  for (let index = 0; index < windowWords.length; index += opts.maxWordsPerLine) {
    lines.push(windowWords.slice(index, index + opts.maxWordsPerLine).map((word) => word.text));
  }

  const activeOffset = windowWords.findIndex(
    (word) => word.startMs <= timeMs && timeMs < word.endMs,
  );

  return {
    lines,
    activeIndex: activeOffset === -1 ? null : activeOffset,
  };
};
