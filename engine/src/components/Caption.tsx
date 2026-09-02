import { AbsoluteFill } from "remotion";
import { SAFE_BOTTOM } from "../config";
import { resolveFonts } from "../fonts";
import { CAPTION_LAYOUT } from "../layout";
import type { BrandKit, Words } from "../schema";

export type CaptionProps = {
  brand: BrandKit;
  text: string;
  words?: Words;
};

export const Caption = ({ brand, text, words: _words }: CaptionProps) => {
  const fonts = resolveFonts(brand);
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, CAPTION_LAYOUT.maxLines);
  const height = CAPTION_LAYOUT.fontSize * CAPTION_LAYOUT.lineHeight * CAPTION_LAYOUT.maxLines;

  if (lines.length === 0) {
    return null;
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: CAPTION_LAYOUT.contentX,
          bottom: SAFE_BOTTOM + CAPTION_LAYOUT.bottomOffset,
          width: CAPTION_LAYOUT.contentWidth,
          height,
          color: brand.palette.fg,
          fontFamily: fonts.body,
          fontSize: CAPTION_LAYOUT.fontSize,
          fontWeight: 600,
          lineHeight: CAPTION_LAYOUT.lineHeight,
          overflow: "hidden",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: CAPTION_LAYOUT.maxLines,
          display: "-webkit-box",
        }}
      >
        {lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
