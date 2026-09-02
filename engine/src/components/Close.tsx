import { AbsoluteFill, useCurrentFrame } from "remotion";
import { phaseIn } from "../ease";
import { resolveFonts } from "../fonts";
import { CLOSE_LAYOUT } from "../layout";
import { msToFrames } from "../config";
import type { BrandKit } from "../schema";

export type CloseProps = {
  brand: BrandKit;
  close: {
    line: string;
    showWordmark: boolean;
  };
};

export const Close = ({ brand, close }: CloseProps) => {
  const frame = useCurrentFrame();
  const fonts = resolveFonts(brand);
  const entrance = phaseIn(frame, 0, msToFrames(brand.motion.entranceMs), brand.motion.bezier);
  const wordmark = brand.wordmark.text;
  const hasFinalDot = wordmark.endsWith(".");
  const wordmarkBody = hasFinalDot ? wordmark.slice(0, -1) : wordmark;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.palette.bg, overflow: "hidden" }}>
      {close.line.trim() ? (
        <div
          style={{
            position: "absolute",
            left: CLOSE_LAYOUT.contentX,
            top: CLOSE_LAYOUT.lineTop,
            width: CLOSE_LAYOUT.contentWidth,
            height: CLOSE_LAYOUT.lineFontSize * CLOSE_LAYOUT.lineHeight * CLOSE_LAYOUT.lineMaxLines,
            color: brand.palette.fg,
            fontFamily: fonts.display,
            fontSize: CLOSE_LAYOUT.lineFontSize,
            fontStyle: brand.fonts.display.italic ? "italic" : "normal",
            lineHeight: CLOSE_LAYOUT.lineHeight,
            opacity: entrance,
            overflow: "hidden",
            transform: `translateY(${(1 - entrance) * CLOSE_LAYOUT.lineEntranceDrift}px)`,
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: CLOSE_LAYOUT.lineMaxLines,
            display: "-webkit-box",
          }}
        >
          {close.line}
        </div>
      ) : null}

      {close.showWordmark && wordmark.trim() ? (
        <div
          style={{
            position: "absolute",
            left: CLOSE_LAYOUT.contentX,
            top: CLOSE_LAYOUT.wordmarkTop,
            width: CLOSE_LAYOUT.contentWidth,
            height: CLOSE_LAYOUT.wordmarkFontSize * CLOSE_LAYOUT.wordmarkLineHeight,
            color: brand.palette.fg,
            fontFamily: fonts.body,
            fontSize: CLOSE_LAYOUT.wordmarkFontSize,
            lineHeight: CLOSE_LAYOUT.wordmarkLineHeight,
            opacity: entrance,
            overflow: "hidden",
          }}
        >
          {wordmarkBody}
          {hasFinalDot ? <span style={{ color: brand.wordmark.dotColor }}>.</span> : null}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
