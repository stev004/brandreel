import { AbsoluteFill, useCurrentFrame } from "remotion";
import { dissolve, phaseIn } from "../ease";
import { resolveFonts } from "../fonts";
import {
  MOMENT_LAYOUT,
  thoughtDissolveStartMs,
  thoughtPhaseInStartMs,
  thoughtStaggerMs,
} from "../layout";
import { msToFrames } from "../config";
import type { Beat, BrandKit } from "../schema";

export type MomentProps = {
  brand: BrandKit;
  beat: Beat;
};

export const Moment = ({ brand, beat }: MomentProps) => {
  const frame = useCurrentFrame();
  const fonts = resolveFonts(brand);
  const lineProgress = phaseIn(frame, 0, msToFrames(brand.motion.entranceMs), brand.motion.bezier);
  const thoughts = (beat.thoughts ?? []).filter((thought) => thought.trim());

  return (
    <AbsoluteFill style={{ backgroundColor: beat.bg ?? brand.palette.bg, overflow: "hidden" }}>
      {beat.eyebrow?.trim() ? (
        <div
          style={{
            position: "absolute",
            left: MOMENT_LAYOUT.contentX,
            top: MOMENT_LAYOUT.eyebrowTop,
            width: MOMENT_LAYOUT.contentWidth,
            color: brand.palette.muted,
            fontFamily: fonts.mono,
            fontSize: MOMENT_LAYOUT.eyebrowFontSize,
            lineHeight: MOMENT_LAYOUT.eyebrowLineHeight,
            height: MOMENT_LAYOUT.eyebrowFontSize * MOMENT_LAYOUT.eyebrowLineHeight,
            letterSpacing: "0.4em",
            overflow: "hidden",
            textTransform: "uppercase",
            opacity: lineProgress,
          }}
        >
          {beat.eyebrow}
        </div>
      ) : null}

      {beat.line.trim() ? (
        <div
          style={{
            position: "absolute",
            left: MOMENT_LAYOUT.contentX,
            top: MOMENT_LAYOUT.momentLineTop,
            width: MOMENT_LAYOUT.contentWidth,
            height:
              MOMENT_LAYOUT.momentLineFontSize *
              MOMENT_LAYOUT.momentLineHeight *
              MOMENT_LAYOUT.momentLineMaxLines,
            color: brand.palette.fg,
            fontFamily: fonts.display,
            fontSize: MOMENT_LAYOUT.momentLineFontSize,
            fontStyle: brand.fonts.display.italic ? "italic" : "normal",
            fontWeight: 400,
            lineHeight: MOMENT_LAYOUT.momentLineHeight,
            opacity: lineProgress,
            overflow: "hidden",
            transform: `translateY(${(1 - lineProgress) * MOMENT_LAYOUT.momentLineEntranceDrift}px)`,
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: MOMENT_LAYOUT.momentLineMaxLines,
            display: "-webkit-box",
          }}
        >
          {beat.line}
        </div>
      ) : null}

      {thoughts.map((thought, index) => {
        const thoughtStartMs = thoughtPhaseInStartMs(brand, beat) + index * thoughtStaggerMs(brand);
        const thoughtDissolveMs = thoughtDissolveStartMs(brand, beat, thoughts.length, index);
        const entrance = phaseIn(
          frame,
          msToFrames(thoughtStartMs),
          msToFrames(brand.motion.entranceMs),
          brand.motion.bezier,
        );
        const fade = dissolve(
          frame,
          msToFrames(thoughtDissolveMs),
          msToFrames(brand.motion.entranceMs),
          brand.motion.bezier,
        );

        return (
          <div
            key={`${thought}-${index}`}
            style={{
              position: "absolute",
              left: MOMENT_LAYOUT.contentX,
              top: MOMENT_LAYOUT.thoughtsTop + index * MOMENT_LAYOUT.thoughtStep,
              width: MOMENT_LAYOUT.contentWidth,
              height:
                MOMENT_LAYOUT.thoughtFontSize *
                MOMENT_LAYOUT.thoughtLineHeight *
                MOMENT_LAYOUT.thoughtMaxLines,
              color: brand.palette.fg,
              fontFamily: fonts.body,
              fontSize: MOMENT_LAYOUT.thoughtFontSize,
              lineHeight: MOMENT_LAYOUT.thoughtLineHeight,
              opacity: 0.75 * entrance * fade.opacity,
              overflow: "hidden",
              transform: `translateY(${(1 - entrance) * MOMENT_LAYOUT.thoughtEntranceDrift + fade.translateY}px)`,
              filter: `blur(${fade.blurPx}px)`,
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: MOMENT_LAYOUT.thoughtMaxLines,
              display: "-webkit-box",
            }}
          >
            {thought}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
