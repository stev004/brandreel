import { AbsoluteFill, useCurrentFrame } from "remotion";
import { dissolve, phaseIn } from "../ease";
import { resolveFonts } from "../fonts";
import {
  MOMENT_LAYOUT,
  MOMENT_PLACED_LAYOUT,
  MOMENT_PLACED_LINE_TOP,
  MOMENT_PLACED_TEXT_TOP,
  CSS_EASE_BEZIER,
  easeProgressAtMs,
  thoughtDissolveStartMs,
  thoughtPhaseInStartMs,
  thoughtStaggerMs,
} from "../layout";
import { FPS, msToFrames } from "../config";
import type { BrandKit, MomentBeatData } from "../schema";

export type MomentProps = {
  brand: BrandKit;
  beat: MomentBeatData;
};

const PlacedMoment = ({ brand, beat }: MomentProps) => {
  const frame = useCurrentFrame();
  const timeMs = frame * 1000 / FPS;
  const fonts = resolveFonts(brand);
  const sceneFade = easeProgressAtMs(timeMs, 0, MOMENT_PLACED_LAYOUT.sceneFadeMs, CSS_EASE_BEZIER);
  const exit = easeProgressAtMs(
    timeMs,
    MOMENT_PLACED_LAYOUT.textExitStartMs,
    MOMENT_PLACED_LAYOUT.textExitDurationMs,
    brand.motion.bezier,
  );
  const eyebrowProgress = easeProgressAtMs(
    timeMs,
    MOMENT_PLACED_LAYOUT.eyebrowStartMs,
    MOMENT_PLACED_LAYOUT.entranceDurationMs,
    brand.motion.bezier,
  );
  const lineProgress = easeProgressAtMs(
    timeMs,
    MOMENT_PLACED_LAYOUT.lineStartMs,
    MOMENT_PLACED_LAYOUT.entranceDurationMs,
    brand.motion.bezier,
  );
  const thoughts = (beat.thoughts ?? []).filter((thought) => thought.trim());

  return (
    <AbsoluteFill style={{ backgroundColor: beat.bg ?? brand.palette.bg, overflow: "hidden" }}>
      {beat.eyebrow?.trim() ? (
        <div
          style={{
            position: "absolute",
            left: MOMENT_PLACED_LAYOUT.contentX,
            top: MOMENT_PLACED_TEXT_TOP,
            width: MOMENT_PLACED_LAYOUT.contentWidth,
            height: MOMENT_PLACED_LAYOUT.eyebrowFontSize * MOMENT_PLACED_LAYOUT.eyebrowLineHeight,
            color: brand.palette.muted,
            fontFamily: fonts.mono,
            fontSize: MOMENT_PLACED_LAYOUT.eyebrowFontSize,
            lineHeight: MOMENT_PLACED_LAYOUT.eyebrowLineHeight,
            letterSpacing: "0.4em",
            textAlign: "center",
            textTransform: "uppercase",
            opacity: sceneFade * eyebrowProgress * (1 - exit),
            transform: `translateY(${(1 - eyebrowProgress) * MOMENT_PLACED_LAYOUT.entranceDrift + MOMENT_PLACED_LAYOUT.exitDrift * exit}px)`,
            filter: `blur(${MOMENT_PLACED_LAYOUT.exitBlurPx * exit}px)`,
          }}
        >
          {beat.eyebrow}
        </div>
      ) : null}

      {beat.line.trim() ? (
        <div
          style={{
            position: "absolute",
            left: MOMENT_PLACED_LAYOUT.contentX,
            top: MOMENT_PLACED_LINE_TOP,
            width: MOMENT_PLACED_LAYOUT.contentWidth,
            height: MOMENT_PLACED_LAYOUT.lineFontSize * MOMENT_PLACED_LAYOUT.lineLineHeight,
            color: brand.palette.fg,
            fontFamily: fonts.displayItalic,
            fontSize: MOMENT_PLACED_LAYOUT.lineFontSize,
            fontStyle: "italic",
            fontWeight: 400,
            lineHeight: MOMENT_PLACED_LAYOUT.lineLineHeight,
            textAlign: "center",
            opacity: sceneFade * lineProgress * (1 - exit),
            transform: `translateY(${(1 - lineProgress) * MOMENT_PLACED_LAYOUT.entranceDrift + MOMENT_PLACED_LAYOUT.exitDrift * exit}px)`,
            filter: `blur(${MOMENT_PLACED_LAYOUT.exitBlurPx * exit}px)`,
            overflow: "hidden",
          }}
        >
          {beat.line}
        </div>
      ) : null}

      {thoughts.map((thought, index) => {
        const startMs = MOMENT_PLACED_LAYOUT.thoughtStartsMs[index] ?? MOMENT_PLACED_LAYOUT.thoughtStartsMs.at(-1)!;
        const progress = easeProgressAtMs(
          timeMs,
          startMs,
          MOMENT_PLACED_LAYOUT.thoughtDurationMs,
          CSS_EASE_BEZIER,
        );
        const position = beat.thoughtPositions?.[index];
        if (!position) return null;

        return (
          <div
            key={`${thought}-${index}`}
            style={{
              position: "absolute",
              left: position.x,
              top: position.y,
              width: "max-content",
              maxWidth: MOMENT_PLACED_LAYOUT.thoughtMaxWidth,
              color: brand.palette.muted,
              fontFamily: fonts.body,
              fontSize: MOMENT_PLACED_LAYOUT.thoughtFontSize,
              lineHeight: MOMENT_PLACED_LAYOUT.thoughtLineHeight,
              whiteSpace: "nowrap",
              opacity: 0.75 * progress,
            }}
          >
            {thought}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const LegacyMoment = ({ brand, beat }: MomentProps) => {
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

export const Moment = (props: MomentProps) => props.beat.thoughtPositions
  ? <PlacedMoment {...props} />
  : <LegacyMoment {...props} />;
