import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FPS, MS_PER_SECOND, SAFE_BOTTOM } from "../config";
import { captionWindow } from "../captions";
import { resolveFonts } from "../fonts";
import { CAPTION_LAYOUT } from "../layout";
import type { BrandKit, Words } from "../schema";

export type CaptionProps = {
  brand: BrandKit;
  text: string;
  words?: Words;
};

export const Caption = ({ brand, text, words }: CaptionProps) => {
  const frame = useCurrentFrame();
  const fonts = resolveFonts(brand);
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, CAPTION_LAYOUT.maxLines);
  const height = CAPTION_LAYOUT.fontSize * CAPTION_LAYOUT.lineHeight * CAPTION_LAYOUT.maxLines;

  if (words) {
    const timedCaption = captionWindow(words.words, (frame / FPS) * MS_PER_SECOND, {
      maxWordsPerLine: CAPTION_LAYOUT.maxWordsPerLine,
      maxLines: CAPTION_LAYOUT.maxLines,
    });

    if (timedCaption.lines.length === 0) {
      return null;
    }

    let wordIndex = 0;
    return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            left: CAPTION_LAYOUT.contentX,
            bottom: SAFE_BOTTOM + CAPTION_LAYOUT.bottomOffset,
            width: CAPTION_LAYOUT.contentWidth,
            height,
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
          {timedCaption.lines.map((line, lineIndex) => (
            <div key={`caption-line-${lineIndex}`}>
              {line.map((word, lineWordIndex) => {
                const currentIndex = wordIndex;
                wordIndex += 1;
                const isActive = currentIndex === timedCaption.activeIndex;
                return (
                  <span
                    key={`caption-word-${currentIndex}`}
                    style={{ color: isActive ? brand.palette.accent : brand.palette.fg }}
                  >
                    {word}
                    {lineWordIndex < line.length - 1 ? " " : null}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    );
  }

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
