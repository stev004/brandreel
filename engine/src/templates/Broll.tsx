import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { Caption } from "../components/Caption";
import { FPS } from "../config";
import { resolveFonts } from "../fonts";
import { BROLL_LAYOUT, BROLL_TIMING, easeProgressAtMs, textWidthPx } from "../layout";
import type { BrandKit, BrollBeatData, Words } from "../schema";

export type BrollProps = {
  brand: BrandKit;
  beat: BrollBeatData;
  words?: Words;
  beatStartMs: number;
};

export const requireBrollClipPath = (clip?: string): string => {
  if (!clip) {
    throw new Error("Broll beat is missing its clip path; expected a conformed workspace-relative clip.");
  }
  return clip;
};

export const Broll = ({ brand, beat, words, beatStartMs }: BrollProps) => {
  const frame = useCurrentFrame();
  const timeMs = frame * 1000 / FPS;
  const fonts = resolveFonts(brand);
  const watermarkWidth = textWidthPx(brand.wordmark.text, BROLL_LAYOUT.watermarkFontSize, "body");

  const clipPath = requireBrollClipPath(beat.clip);
  if (beat.captionSource === "words" && !words) {
    throw new Error("Broll beat with captionSource 'words' requires a valid words.json input.");
  }

  const overlayProgress = easeProgressAtMs(
    timeMs,
    BROLL_TIMING.overlayStartMs,
    brand.motion.entranceMs,
    brand.motion.bezier,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: brand.palette.bg, overflow: "hidden" }}>
      <OffthreadVideo
        src={staticFile(clipPath)}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      {beat.overlayText?.trim() ? (
        <div
          style={{
            position: "absolute",
            left: BROLL_LAYOUT.overlayX,
            top: BROLL_LAYOUT.overlayTop,
            width: BROLL_LAYOUT.overlayWidth,
            height: BROLL_LAYOUT.overlayFontSize * BROLL_LAYOUT.overlayLineHeight * BROLL_LAYOUT.overlayMaxLines,
            color: brand.palette.fg,
            fontFamily: fonts.display,
            fontSize: BROLL_LAYOUT.overlayFontSize,
            fontStyle: brand.fonts.display.italic ? "italic" : "normal",
            fontWeight: 500,
            lineHeight: BROLL_LAYOUT.overlayLineHeight,
            textAlign: "center",
            whiteSpace: "pre-line",
            overflow: "hidden",
            textShadow: `0 3px 18px ${brand.palette.bg}`,
            opacity: overlayProgress,
            transform: `translateY(${(1 - overlayProgress) * BROLL_LAYOUT.overlayEntranceDrift}px)`,
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: BROLL_LAYOUT.overlayMaxLines,
            display: "-webkit-box",
          }}
        >
          {beat.overlayText}
        </div>
      ) : null}

      {brand.wordmark.text.trim() ? (
        <div
          style={{
            position: "absolute",
            left: BROLL_LAYOUT.watermarkX,
            top: BROLL_LAYOUT.watermarkTop,
            color: brand.palette.muted,
            fontFamily: fonts.body,
            fontSize: BROLL_LAYOUT.watermarkFontSize,
            fontStyle: brand.fonts.body.italic ? "italic" : "normal",
            fontWeight: 500,
            lineHeight: BROLL_LAYOUT.watermarkLineHeight,
            width: watermarkWidth,
            height: BROLL_LAYOUT.watermarkFontSize * BROLL_LAYOUT.watermarkLineHeight,
            whiteSpace: "nowrap",
            opacity: BROLL_LAYOUT.watermarkOpacity,
          }}
        >
          {brand.wordmark.text}
        </div>
      ) : null}

      {beat.captionSource === "words" && words ? (
        <Caption
          brand={brand}
          text=""
          words={words}
          timeOffsetMs={beatStartMs}
        />
      ) : null}
    </AbsoluteFill>
  );
};
