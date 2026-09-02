import { AbsoluteFill, useCurrentFrame } from "remotion";
import { phaseIn } from "../ease";
import { resolveFonts } from "../fonts";
import { QUESTION_LAYOUT, QUESTION_TIMING } from "../layout";
import { msToFrames } from "../config";
import type { BrandKit, QuestionBeatData } from "../schema";

export type QuestionProps = {
  brand: BrandKit;
  beat: QuestionBeatData;
};

export const Question = ({ brand, beat }: QuestionProps) => {
  const frame = useCurrentFrame();
  const fonts = resolveFonts(brand);
  const entrance = (startMs: number): number =>
    phaseIn(frame, msToFrames(startMs), msToFrames(brand.motion.entranceMs), brand.motion.bezier);
  const lines = beat.lines.filter((line) => line.trim());

  return (
    <AbsoluteFill style={{ backgroundColor: brand.palette.bg, overflow: "hidden" }}>
      {beat.kicker?.trim() ? (
        <div
          style={{
            position: "absolute",
            left: QUESTION_LAYOUT.contentX,
            top: QUESTION_LAYOUT.kickerTop,
            color: brand.palette.muted,
            fontFamily: fonts.mono,
            fontSize: QUESTION_LAYOUT.kickerFontSize,
            letterSpacing: QUESTION_LAYOUT.kickerLetterSpacing,
            opacity: entrance(QUESTION_TIMING.kickerMs),
            transform: `translateY(${(1 - entrance(QUESTION_TIMING.kickerMs)) * QUESTION_LAYOUT.lineEntranceDrift}px)`,
          }}
        >
          {beat.kicker}
        </div>
      ) : null}

      {lines.map((line, index) => {
        const progress = entrance(QUESTION_TIMING.lineStartMs + index * QUESTION_TIMING.lineStaggerMs);
        return (
          <div
            key={`${line}-${index}`}
            style={{
              position: "absolute",
              left: QUESTION_LAYOUT.contentX,
              top: QUESTION_LAYOUT.linesTop + index * QUESTION_LAYOUT.lineStep,
              width: QUESTION_LAYOUT.linesWidth,
              color: brand.palette.fg,
              fontFamily: fonts.display,
              fontSize: QUESTION_LAYOUT.lineFontSize,
              fontWeight: 700,
              lineHeight: QUESTION_LAYOUT.lineLineHeight,
              letterSpacing: QUESTION_LAYOUT.lineLetterSpacing,
              opacity: progress,
              transform: `translateY(${(1 - progress) * QUESTION_LAYOUT.lineEntranceDrift}px)`,
            }}
          >
            {line}
          </div>
        );
      })}

      {beat.dek?.trim() ? (
        <div
          style={{
            position: "absolute",
            left: QUESTION_LAYOUT.contentX,
            top: QUESTION_LAYOUT.dekTop,
            color: brand.palette.accent,
            fontFamily: fonts.displayItalic,
            fontSize: QUESTION_LAYOUT.dekFontSize,
            fontStyle: "italic",
            opacity: entrance(QUESTION_TIMING.dekMs),
            transform: `translateY(${(1 - entrance(QUESTION_TIMING.dekMs)) * QUESTION_LAYOUT.dekEntranceDrift}px)`,
          }}
        >
          {beat.dek}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
