import { HEIGHT, FPS, SAFE_BOTTOM, SAFE_LEFT, SAFE_RIGHT, SAFE_TOP, WIDTH } from "./config";
import { computeTextBoxes, computeTimeline, GLYPH_EM } from "./layout";
import type { LayoutTextBox, TextRole } from "./layout";
import type { BrandKit, Script } from "./schema";

export type Element = LayoutTextBox & {
  estimatedLines: number;
};

export type LayoutManifest = {
  width: number;
  height: number;
  fps: number;
  totalDurationMs: number;
  firstOnScreenTextMs: number | null;
  visualChangeMs: number[];
  closeStartMs: number;
  safe: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  elements: Element[];
};

const lineWidthPx = (line: string, fontSize: number, role: TextRole, letterSpacingEm: number): number =>
  Array.from(line).length * fontSize * (GLYPH_EM[role] + letterSpacingEm);

export const estimateLines = (text: string, fontSize: number, width: number, role: TextRole, letterSpacingEm: number): number => {
  if (text.length === 0 || fontSize <= 0 || width <= 0) {
    return 0;
  }

  return text.split(/\r?\n/).reduce(
    (total, line) => total + Math.max(1, Math.ceil(lineWidthPx(line, fontSize, role, letterSpacingEm) / width)),
    0,
  );
};

export const buildManifest = (script: Script, brand: BrandKit): LayoutManifest => {
  const elements = computeTextBoxes(script, brand).map((box: LayoutTextBox) => ({
    ...box,
    estimatedLines: estimateLines(box.text, box.fontSize, box.w, box.role, box.letterSpacingEm),
  }));
  const closeStartMs = script.beats.reduce((total, beat) => total + beat.durationMs, 0);
  const computedTimeline = computeTimeline(script, brand);

  return {
    width: WIDTH,
    height: HEIGHT,
    fps: FPS,
    totalDurationMs: computedTimeline.totalDurationMs,
    firstOnScreenTextMs: computedTimeline.firstOnScreenTextMs,
    visualChangeMs: computedTimeline.visualChangeMs,
    closeStartMs,
    safe: { top: SAFE_TOP, bottom: SAFE_BOTTOM, left: SAFE_LEFT, right: SAFE_RIGHT },
    elements,
  };
};
