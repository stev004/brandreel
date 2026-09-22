import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FPS } from "../config";
import { resolveFonts } from "../fonts";
import {
  EXHALE_LAYOUT,
  EXHALE_TIMING,
  CSS_EASE_BEZIER,
  easeProgressAtMs,
  exhaleCountdownIndexAtMs,
  exhaleDotYAtMs,
  exhaleThoughtDissolveStartMs,
  resolveExhaleColor,
} from "../layout";
import type { BrandKit, ExhaleBeatData } from "../schema";

export type ExhaleProps = {
  brand: BrandKit;
  beat: ExhaleBeatData;
};

const hexToRgba = (color: string, alpha: number): string => {
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export const Exhale = ({ brand, beat }: ExhaleProps) => {
  const frame = useCurrentFrame();
  const timeMs = frame * 1000 / FPS;
  const fonts = resolveFonts(brand);
  const stateColor = resolveExhaleColor(brand, beat);
  const trackColor = hexToRgba(brand.palette.fg, 0.1);
  const phaseEntry = easeProgressAtMs(
    timeMs,
    EXHALE_TIMING.phaseStartMs,
    EXHALE_TIMING.entranceDurationMs,
    brand.motion.bezier,
  );
  const exit = easeProgressAtMs(
    timeMs,
    EXHALE_TIMING.exitStartMs,
    EXHALE_TIMING.exitDurationMs,
    brand.motion.bezier,
  );
  const trackEntry = easeProgressAtMs(
    timeMs,
    EXHALE_TIMING.trackStartMs,
    EXHALE_TIMING.trackFadeMs,
    brand.motion.bezier,
  );
  const travel = easeProgressAtMs(
    timeMs,
    EXHALE_TIMING.travelStartMs,
    EXHALE_TIMING.travelDurationMs,
    EXHALE_TIMING.travelCurve,
  );
  const fillHeight = EXHALE_LAYOUT.innerHeight * (1 - travel);
  const dotY = exhaleDotYAtMs(timeMs);
  const dotEntry = easeProgressAtMs(
    timeMs,
    EXHALE_TIMING.dotFadeStartMs,
    EXHALE_TIMING.dotFadeMs,
    brand.motion.bezier,
  );
  const countdownIndex = exhaleCountdownIndexAtMs(timeMs);
  const colLocalExitStyle = {
    opacity: 1 - exit,
    transform: `translateY(${EXHALE_LAYOUT.exitDrift * exit}px)`,
    filter: `blur(${EXHALE_LAYOUT.exitBlurPx * exit}px)`,
  };

  const inhaleFractions = [0, 1 / 3, 2 / 3, 1];
  const exhaleFractions = Array.from({ length: 8 }, (_, index) => index / 7);

  return (
    <AbsoluteFill style={{ backgroundColor: beat.bg ?? brand.palette.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: EXHALE_LAYOUT.columnX,
          top: EXHALE_LAYOUT.columnTop,
          width: EXHALE_LAYOUT.columnWidth,
          height: EXHALE_LAYOUT.columnHeight,
          ...colLocalExitStyle,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: EXHALE_LAYOUT.columnWidth / 2,
            top: EXHALE_LAYOUT.innerInset,
            width: EXHALE_LAYOUT.trackWidth,
            height: EXHALE_LAYOUT.innerHeight,
            backgroundColor: trackColor,
            borderRadius: EXHALE_LAYOUT.trackWidth / 2,
            opacity: trackEntry,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: EXHALE_LAYOUT.columnWidth / 2 - EXHALE_LAYOUT.trackWidth / 2,
            bottom: EXHALE_LAYOUT.innerInset,
            width: EXHALE_LAYOUT.trackWidth,
            height: fillHeight,
            backgroundColor: stateColor,
            borderRadius: EXHALE_LAYOUT.trackWidth / 2,
            opacity: trackEntry,
          }}
        />
        {inhaleFractions.map((fraction, index) => {
          const startMs = EXHALE_TIMING.tickStartMs + index * EXHALE_TIMING.tickStaggerMs;
          const opacity = easeProgressAtMs(timeMs, startMs, EXHALE_TIMING.tickFadeMs, brand.motion.bezier);
          return (
            <div
              key={`in-${index}`}
              style={{
                position: "absolute",
                left: EXHALE_LAYOUT.columnWidth / 2 - EXHALE_LAYOUT.tickOffsetFromCenter - EXHALE_LAYOUT.tickWidth,
                top: EXHALE_LAYOUT.innerInset + EXHALE_LAYOUT.innerHeight * fraction - EXHALE_LAYOUT.tickHeight / 2,
                width: EXHALE_LAYOUT.tickWidth,
                height: EXHALE_LAYOUT.tickHeight,
                backgroundColor: stateColor,
                opacity,
              }}
            />
          );
        })}
        {exhaleFractions.map((fraction, index) => {
          const startMs = EXHALE_TIMING.tickStartMs + (inhaleFractions.length + index) * EXHALE_TIMING.tickStaggerMs;
          const opacity = easeProgressAtMs(timeMs, startMs, EXHALE_TIMING.tickFadeMs, brand.motion.bezier);
          return (
            <div
              key={`out-${index}`}
              style={{
                position: "absolute",
                left: EXHALE_LAYOUT.columnWidth / 2 + EXHALE_LAYOUT.tickOffsetFromCenter,
                top: EXHALE_LAYOUT.innerInset + EXHALE_LAYOUT.innerHeight * fraction - EXHALE_LAYOUT.tickHeight / 2,
                width: EXHALE_LAYOUT.tickWidth,
                height: EXHALE_LAYOUT.tickHeight,
                backgroundColor: stateColor,
                opacity,
              }}
            />
          );
        })}
        <div
          style={{
            position: "absolute",
            left: EXHALE_LAYOUT.columnWidth / 2 + EXHALE_LAYOUT.labelInsetX,
            top: -EXHALE_LAYOUT.labelInsetY,
            color: brand.palette.muted,
            fontFamily: fonts.mono,
            fontSize: EXHALE_LAYOUT.labelFontSize,
            lineHeight: EXHALE_LAYOUT.labelLineHeight,
            letterSpacing: `${EXHALE_LAYOUT.labelLetterSpacingEm}em`,
            whiteSpace: "nowrap",
            opacity: phaseEntry,
            transform: `translateY(${(1 - phaseEntry) * EXHALE_LAYOUT.entranceDrift}px)`,
          }}
        >
          {beat.inLabel}
        </div>
        <div
          style={{
            position: "absolute",
            left: EXHALE_LAYOUT.columnWidth / 2 + EXHALE_LAYOUT.labelInsetX,
            bottom: -EXHALE_LAYOUT.labelInsetY,
            color: brand.palette.muted,
            fontFamily: fonts.mono,
            fontSize: EXHALE_LAYOUT.labelFontSize,
            lineHeight: EXHALE_LAYOUT.labelLineHeight,
            letterSpacing: `${EXHALE_LAYOUT.labelLetterSpacingEm}em`,
            whiteSpace: "nowrap",
            opacity: phaseEntry,
            transform: `translateY(${(1 - phaseEntry) * EXHALE_LAYOUT.entranceDrift}px)`,
          }}
        >
          {beat.outLabel}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: EXHALE_LAYOUT.columnX + EXHALE_LAYOUT.columnWidth / 2 - EXHALE_LAYOUT.dotSize / 2,
          top: dotY - EXHALE_LAYOUT.dotSize / 2,
          width: EXHALE_LAYOUT.dotSize,
          height: EXHALE_LAYOUT.dotSize,
          borderRadius: "50%",
          backgroundColor: stateColor,
          boxShadow: `0 0 ${EXHALE_LAYOUT.dotGlow}px ${hexToRgba(stateColor, EXHALE_LAYOUT.dotGlowAlpha)}`,
          opacity: dotEntry * (1 - exit),
          transform: `translateY(${EXHALE_LAYOUT.exitDrift * exit}px)`,
          filter: `blur(${EXHALE_LAYOUT.exitBlurPx * exit}px)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: EXHALE_LAYOUT.phaseX,
          top: EXHALE_LAYOUT.phaseTop,
          color: brand.palette.fg,
          fontFamily: fonts.displayUpright,
          fontSize: EXHALE_LAYOUT.phaseFontSize,
          fontWeight: 400,
          lineHeight: EXHALE_LAYOUT.phaseLineHeight,
          opacity: phaseEntry * (1 - exit),
          transform: `translateY(${(1 - phaseEntry) * EXHALE_LAYOUT.entranceDrift + EXHALE_LAYOUT.exitDrift * exit}px)`,
          filter: `blur(${EXHALE_LAYOUT.exitBlurPx * exit}px)`,
        }}
      >
        {beat.phaseLabel}
        <div
          style={{
            position: "relative",
            height: EXHALE_LAYOUT.countContainerHeight,
            marginTop: EXHALE_LAYOUT.phaseCountGap,
            color: brand.palette.muted,
            fontFamily: fonts.mono,
            fontSize: EXHALE_LAYOUT.countFontSize,
            letterSpacing: `${EXHALE_LAYOUT.labelLetterSpacingEm}em`,
            lineHeight: EXHALE_LAYOUT.countLineHeight,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {countdownIndex >= 0 ? beat.countdown[countdownIndex] : null}
        </div>
      </div>

      {beat.thoughts.map((thought, index) => {
        const position = beat.thoughtPositions[index]!;
        const dissolveStart = exhaleThoughtDissolveStartMs(index);
        const dissolve = easeProgressAtMs(
          timeMs,
          dissolveStart,
          EXHALE_LAYOUT.thoughtDissolveDurationMs,
          CSS_EASE_BEZIER,
        );
        return (
          <div
            key={`thought-${index}`}
            style={{
              position: "absolute",
              left: position.x,
              top: position.y,
              width: "max-content",
              maxWidth: EXHALE_LAYOUT.thoughtMaxWidth,
              color: brand.palette.muted,
              fontFamily: fonts.body,
              fontSize: EXHALE_LAYOUT.thoughtFontSize,
              lineHeight: EXHALE_LAYOUT.thoughtLineHeight,
              whiteSpace: "nowrap",
              opacity: 0.75 * (1 - dissolve),
              filter: `blur(${EXHALE_LAYOUT.thoughtDissolveBlurPx * dissolve}px)`,
              transform: `translateY(${-EXHALE_LAYOUT.thoughtDissolveDrift * dissolve}px)`,
            }}
          >
            {thought}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
