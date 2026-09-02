import { AbsoluteFill, useCurrentFrame } from "remotion";
import { phaseIn } from "../ease";
import { resolveFonts } from "../fonts";
import { CLOSE_D_LAYOUT, CLOSE_D_TIMING, CLOSE_LAYOUT } from "../layout";
import { msToFrames } from "../config";
import type { BrandKit } from "../schema";

export type CloseProps = {
  brand: BrandKit;
  close: {
    line: string;
    showWordmark: boolean;
    tagline?: string;
    url?: string;
    durationMs?: number;
  };
};

export const Close = ({ brand, close }: CloseProps) => {
  const frame = useCurrentFrame();
  const fonts = resolveFonts(brand);
  const entrance = phaseIn(frame, 0, msToFrames(brand.motion.entranceMs), brand.motion.bezier);
  const hasCloseD = Boolean(
    close.tagline?.trim() || close.url?.trim() || brand.wordmark.logoSvg?.trim(),
  );
  const sceneFade = phaseIn(
    frame,
    0,
    msToFrames(CLOSE_D_LAYOUT.sceneFadeDurationMs),
    brand.motion.bezier,
  );
  const rise = (startMs: number): number =>
    phaseIn(frame, msToFrames(startMs), msToFrames(brand.motion.entranceMs), brand.motion.bezier);
  const wordmark = brand.wordmark.text;
  const hasFinalDot = wordmark.endsWith(".");
  const wordmarkBody = hasFinalDot ? wordmark.slice(0, -1) : wordmark;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.palette.bg, overflow: "hidden" }}>
      {!hasCloseD && close.line.trim() ? (
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

      {!hasCloseD && close.showWordmark && wordmark.trim() ? (
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

      {hasCloseD ? (
        <>
          {brand.wordmark.logoSvg?.trim() ? (
            <div
              style={{
                position: "absolute",
                left: CLOSE_D_LAYOUT.contentX,
                top: CLOSE_D_LAYOUT.logoTop,
                width: CLOSE_D_LAYOUT.logoSize,
                height: CLOSE_D_LAYOUT.logoSize,
                opacity: sceneFade * rise(CLOSE_D_TIMING.logoMs),
                transform: `translateY(${(1 - rise(CLOSE_D_TIMING.logoMs)) * CLOSE_D_LAYOUT.entranceDrift}px)`,
              }}
              dangerouslySetInnerHTML={{ __html: brand.wordmark.logoSvg }}
            />
          ) : null}

          {close.tagline?.trim() ? (
            <div
              style={{
                position: "absolute",
                left: CLOSE_D_LAYOUT.contentX,
                top: CLOSE_D_LAYOUT.taglineTop,
                color: brand.palette.fg,
                fontFamily: fonts.display,
                fontSize: CLOSE_D_LAYOUT.taglineFontSize,
                fontWeight: 700,
                letterSpacing: CLOSE_D_LAYOUT.taglineLetterSpacing,
                opacity: sceneFade * rise(CLOSE_D_TIMING.taglineMs),
                transform: `translateY(${(1 - rise(CLOSE_D_TIMING.taglineMs)) * CLOSE_D_LAYOUT.entranceDrift}px)`,
              }}
            >
              {close.tagline}
            </div>
          ) : null}

          {close.url?.trim() ? (
            <div
              style={{
                position: "absolute",
                left: CLOSE_D_LAYOUT.contentX,
                top: CLOSE_D_LAYOUT.urlTop,
                color: brand.palette.accent,
                fontFamily: fonts.mono,
                fontSize: CLOSE_D_LAYOUT.urlFontSize,
                letterSpacing: CLOSE_D_LAYOUT.urlLetterSpacing,
                opacity: sceneFade * rise(CLOSE_D_TIMING.urlMs),
                transform: `translateY(${(1 - rise(CLOSE_D_TIMING.urlMs)) * CLOSE_D_LAYOUT.entranceDrift}px)`,
              }}
            >
              {close.url}
            </div>
          ) : null}
        </>
      ) : null}
    </AbsoluteFill>
  );
};
