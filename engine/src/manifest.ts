import { HEIGHT, FPS, SAFE_BOTTOM, SAFE_LEFT, SAFE_RIGHT, SAFE_TOP, WIDTH } from "./config";
import { computeGeometry, computeTextBoxes, computeTimeline, GLYPH_EM } from "./layout";
import type { GeometryElement, LayoutTextBox, TextRole } from "./layout";
import type { BrandKit, Script, Words } from "./schema";

export type Element = LayoutTextBox & {
  estimatedLines: number;
  fontFamily: string;
  fontStyle: "normal" | "italic";
  fontWeight: number;
  whiteSpace: "normal" | "nowrap" | "pre-line";
  textTransform: "none" | "uppercase";
  fontVariantNumeric: "normal" | "tabular-nums";
  measuredLines?: number;
  measuredWidthPx?: number;
};

export type LayoutManifest = {
  width: number;
  height: number;
  fps: number;
  totalDurationMs: number;
  firstOnScreenTextMs: number | null;
  visualChangeMs: number[];
  closeStartMs: number;
  footageIntervals: Array<{ fromMs: number; toMs: number }>;
  safe: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  elements: Element[];
  geometry: GeometryElement[];
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

type TypographyMetadata = Pick<
  Element,
  "fontFamily" | "fontStyle" | "fontWeight" | "whiteSpace" | "textTransform" | "fontVariantNumeric"
>;

const typographyFor = (box: LayoutTextBox, script: Script, brand: BrandKit): TypographyMetadata => {
  const beat = box.beatIndex === null ? undefined : script.beats[box.beatIndex];
  const beatPart = /^beat-\d+-(.+)$/.exec(box.id)?.[1];
  const isMoment = beat?.kind === "moment";
  const isPlacedMoment = isMoment && Boolean(beat.thoughtPositions);
  const isMomentEyebrow = isMoment && beatPart === "eyebrow";
  const isMomentLine = isMoment && beatPart === "line";
  const isQuestionDek = beat?.kind === "question" && beatPart === "dek";
  const isVerdictLine = beat?.kind === "verdict" && beatPart?.startsWith("verdict-line-");
  const isCloseLine = box.id === "close-line";
  const isCloseWordmark = box.id === "close-wordmark";
  const isCloseTagline = box.id === "close-tagline";
  const isCaptionLine = box.id.startsWith("caption-line-") || box.id.startsWith("broll-caption-line-");
  const isFigureCounter = beat?.kind === "figure" && beatPart === "counter";
  const isFigureAchievedTick = beat?.kind === "figure" && beatPart === "achieved-tick";
  const isBrollOverlay = beat?.kind === "broll" && beatPart === "overlay";
  const isBrollWatermark = beat?.kind === "broll" && beatPart === "watermark";
  const isExhaleCountdown = beat?.kind === "exhale" && beatPart?.startsWith("countdown-");
  const isMomentPlacedThought = isPlacedMoment && beatPart?.startsWith("thought-");
  const isExhaleText = beat?.kind === "exhale";
  const isExhaleLabel = isExhaleText && (beatPart === "in-label" || beatPart === "out-label");
  const isExhaleThought = isExhaleText && beatPart?.startsWith("thought-");

  let fontStyle: TypographyMetadata["fontStyle"] = "normal";
  if (isMomentLine) {
    // The placed Moment explicitly uses the display italic face. Legacy Moment follows the kit setting.
    fontStyle = isPlacedMoment ? "italic" : (brand.fonts.display.italic ? "italic" : "normal");
  } else if (isCloseLine) {
    fontStyle = brand.fonts.display.italic ? "italic" : "normal";
  } else if (isBrollWatermark) {
    fontStyle = brand.fonts.body.italic ? "italic" : "normal";
  } else if (isQuestionDek || isVerdictLine || (isBrollOverlay && brand.fonts.display.italic)) {
    fontStyle = "italic";
  }

  let fontWeight = 400;
  if (isFigureCounter || isFigureAchievedTick || isCaptionLine) fontWeight = 600;
  if (isBrollOverlay || isBrollWatermark) fontWeight = 500;
  if (beat?.kind === "question" && beatPart?.startsWith("question-line-")) fontWeight = 700;
  if (isCloseWordmark) fontWeight = 500;
  if (isCloseTagline) fontWeight = 700;

  const whiteSpace = isBrollOverlay
    ? "pre-line"
    : isBrollWatermark || isExhaleLabel || isExhaleThought || isMomentPlacedThought
      ? "nowrap"
      : "normal";
  const textTransform = isMomentEyebrow ? "uppercase" : "none";
  const fontVariantNumeric = isFigureCounter || isExhaleCountdown ? "tabular-nums" : "normal";

  return {
    fontFamily: brand.fonts[box.role].family,
    fontStyle,
    fontWeight,
    whiteSpace,
    textTransform,
    fontVariantNumeric,
  };
};

export const buildManifest = (script: Script, brand: BrandKit, words?: Words): LayoutManifest => {
  const elements = computeTextBoxes(script, brand, words).map((box: LayoutTextBox) => ({
    ...box,
    ...typographyFor(box, script, brand),
    estimatedLines: estimateLines(box.text, box.fontSize, box.w, box.role, box.letterSpacingEm),
  }));
  const closeStartMs = script.beats.reduce((total, beat) => total + beat.durationMs, 0);
  const computedTimeline = computeTimeline(script, brand, words);

  return {
    width: WIDTH,
    height: HEIGHT,
    fps: FPS,
    totalDurationMs: computedTimeline.totalDurationMs,
    firstOnScreenTextMs: computedTimeline.firstOnScreenTextMs,
    visualChangeMs: computedTimeline.visualChangeMs,
    closeStartMs,
    footageIntervals: computedTimeline.beats.flatMap((span) =>
      script.beats[span.index]?.kind === "broll"
        ? [{ fromMs: span.startMs, toMs: span.endMs }]
        : [],
    ),
    safe: { top: SAFE_TOP, bottom: SAFE_BOTTOM, left: SAFE_LEFT, right: SAFE_RIGHT },
    elements,
    geometry: computeGeometry(script, brand),
  };
};
