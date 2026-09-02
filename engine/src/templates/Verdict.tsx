import { AbsoluteFill, useCurrentFrame } from "remotion";
import { phaseIn } from "../ease";
import { resolveFonts } from "../fonts";
import { VERDICT_LAYOUT, VERDICT_TIMING } from "../layout";
import { msToFrames } from "../config";
import type { BrandKit, VerdictBeatData } from "../schema";

export type VerdictProps = {
  brand: BrandKit;
  beat: VerdictBeatData;
};

export const Verdict = ({ brand, beat }: VerdictProps) => {
  const frame = useCurrentFrame();
  const fonts = resolveFonts(brand);
  const lines = beat.lines.filter((line) => line.trim());

  return (
    <AbsoluteFill style={{ backgroundColor: brand.palette.bg, overflow: "hidden" }}>
      {lines.map((line, index) => {
        const progress = phaseIn(
          frame,
          msToFrames(VERDICT_TIMING.lineStartMs + index * VERDICT_TIMING.lineStaggerMs),
          msToFrames(brand.motion.entranceMs),
          brand.motion.bezier,
        );
        return (
          <div
            key={`${line}-${index}`}
            style={{
              position: "absolute",
              left: VERDICT_LAYOUT.contentX,
              top: VERDICT_LAYOUT.linesTop + index * VERDICT_LAYOUT.lineStep,
              width: VERDICT_LAYOUT.linesWidth,
              color: brand.palette.fg,
              fontFamily: fonts.displayItalic,
              fontSize: VERDICT_LAYOUT.lineFontSize,
              fontStyle: "italic",
              lineHeight: VERDICT_LAYOUT.lineLineHeight,
              opacity: progress,
              transform: `translateY(${(1 - progress) * VERDICT_LAYOUT.lineEntranceDrift}px)`,
            }}
          >
            {line}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
