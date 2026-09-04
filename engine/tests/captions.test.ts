import { captionWindow } from "../src/captions";
import { describe, expect, it } from "vitest";

const words = [
  { text: "one", startMs: 0, endMs: 400 },
  { text: "two", startMs: 450, endMs: 800 },
  { text: "three", startMs: 900, endMs: 1300 },
  { text: "four", startMs: 3000, endMs: 3400 },
  { text: "five", startMs: 3450, endMs: 3800 },
];

const opts = { maxWordsPerLine: 2, maxLines: 2 };

describe("captionWindow", () => {
  it("groups words into fixed lines and windows", () => {
    expect(captionWindow(words, 100, opts)).toEqual({
      lines: [["one", "two"], ["three", "four"]],
      activeIndex: 0,
    });
  });

  it("marks the active word inside a window", () => {
    expect(captionWindow(words, 500, opts).activeIndex).toBe(1);
  });

  it("keeps the current window during a gap between words", () => {
    expect(captionWindow(words, 825, opts)).toEqual({
      lines: [["one", "two"], ["three", "four"]],
      activeIndex: null,
    });
  });

  it("shows the first upcoming window before the first word", () => {
    expect(captionWindow(words, -100, opts)).toEqual({
      lines: [["one", "two"], ["three", "four"]],
      activeIndex: null,
    });
  });

  it("shows the next upcoming window in a gap between windows", () => {
    expect(captionWindow(words, 3425, opts)).toEqual({
      lines: [["five"]],
      activeIndex: null,
    });
  });

  it("returns empty lines after the final grace period", () => {
    expect(captionWindow(words, 4301, opts)).toEqual({ lines: [], activeIndex: null });
  });
});
