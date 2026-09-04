import { AbsoluteFill, useCurrentFrame } from "remotion";
import { phaseIn } from "../ease";
import { resolveFonts } from "../fonts";
import { FIGURE_LAYOUT, FIGURE_TIMING } from "../layout";
import { msToFrames } from "../config";
import type { BrandKit, FigureBeatData } from "../schema";

export type FigureProps = {
  brand: BrandKit;
  beat: FigureBeatData;
};

const hexToRgba = (color: string, alpha: number): string => {
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const flashStyle = (
  frame: number,
  brand: BrandKit,
  color: string,
): { opacity: number; transform: string; boxShadow: string } => {
  const startFrame = msToFrames(FIGURE_TIMING.flashMs);
  const peakFrame = msToFrames(FIGURE_TIMING.flashMs + FIGURE_TIMING.flashPeakMs);
  const endFrame = msToFrames(FIGURE_TIMING.flashMs + FIGURE_TIMING.flashDurationMs);
  const transparent = hexToRgba(color, 0);

  if (frame < startFrame) {
    return {
      opacity: 0,
      transform: `scale(${FIGURE_LAYOUT.flashInitialScale})`,
      boxShadow: `0 0 0 0 ${hexToRgba(color, FIGURE_LAYOUT.flashRingOpacity)}`,
    };
  }

  if (frame <= peakFrame) {
    const progress = phaseIn(
      frame,
      startFrame,
      Math.max(1, peakFrame - startFrame),
      brand.motion.bezier,
    );
    const scale =
      FIGURE_LAYOUT.flashInitialScale +
      (FIGURE_LAYOUT.flashPeakScale - FIGURE_LAYOUT.flashInitialScale) * progress;
    const spread = FIGURE_LAYOUT.flashRingSpread * progress;
    return {
      opacity: progress,
      transform: `scale(${scale})`,
      boxShadow: `0 0 0 ${spread}px ${hexToRgba(color, FIGURE_LAYOUT.flashRingOpacity * (1 - progress))}`,
    };
  }

  const progress = phaseIn(frame, peakFrame, Math.max(1, endFrame - peakFrame), brand.motion.bezier);
  const scale = FIGURE_LAYOUT.flashPeakScale + (1 - FIGURE_LAYOUT.flashPeakScale) * progress;
  return {
    opacity: 1,
    transform: `scale(${scale})`,
    boxShadow: `0 0 0 0 ${transparent}`,
  };
};

const counterText = (frame: number, to: number, decimals: number): string => {
  const startFrame = msToFrames(FIGURE_TIMING.solidStartMs);
  const stepIndex = FIGURE_TIMING.counterStepFractions.reduce(
    (currentIndex, fraction, index) =>
      frame >= startFrame + msToFrames(FIGURE_TIMING.drawDurationMs * fraction)
        ? index
        : currentIndex,
    0,
  );
  return (to * FIGURE_TIMING.counterValueFractions[stepIndex]).toFixed(decimals);
};

export const Figure = ({ brand, beat }: FigureProps) => {
  const frame = useCurrentFrame();
  const fonts = resolveFonts(brand);
  const intro = phaseIn(
    frame,
    msToFrames(FIGURE_TIMING.introMs),
    msToFrames(brand.motion.entranceMs),
    brand.motion.bezier,
  );
  const achievedRatio = (beat.axis.achieved - beat.axis.min) / (beat.axis.max - beat.axis.min);
  const achievedX = FIGURE_LAYOUT.axisX + FIGURE_LAYOUT.axisWidth * achievedRatio;
  const solid = phaseIn(
    frame,
    msToFrames(FIGURE_TIMING.solidStartMs),
    msToFrames(FIGURE_TIMING.drawDurationMs),
    brand.motion.bezier,
  );
  const dashed = phaseIn(
    frame,
    msToFrames(FIGURE_TIMING.dashedStartMs),
    msToFrames(FIGURE_TIMING.dashedDurationMs),
    brand.motion.bezier,
  );
  const goal = phaseIn(
    frame,
    msToFrames(FIGURE_TIMING.goalMs),
    msToFrames(brand.motion.entranceMs),
    brand.motion.bezier,
  );
  const flashColor = brand.palette.extras[beat.flash?.colorKey ?? ""] ?? brand.palette.accent;
  const flash = flashStyle(frame, brand, flashColor);
  const rule = brand.palette.extras.rule ?? brand.palette.muted;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.palette.bg, overflow: "hidden" }}>
      {beat.label.trim() ? (
        <div
          style={{
            position: "absolute",
            left: FIGURE_LAYOUT.contentX,
            top: FIGURE_LAYOUT.labelTop,
            color: brand.palette.accent,
            fontFamily: fonts.mono,
            fontSize: FIGURE_LAYOUT.labelFontSize,
            letterSpacing: FIGURE_LAYOUT.labelLetterSpacing,
            opacity: intro,
          }}
        >
          {beat.label}
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          left: FIGURE_LAYOUT.contentX,
          top: FIGURE_LAYOUT.counterTop,
          color: brand.palette.fg,
          fontFamily: fonts.mono,
          fontSize: FIGURE_LAYOUT.counterFontSize,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          opacity: intro,
        }}
      >
        {counterText(frame, beat.value.to, beat.value.decimals)}
      </div>

      {beat.goalText?.trim() ? (
        <div
          style={{
            position: "absolute",
            left: FIGURE_LAYOUT.goalX,
            top: FIGURE_LAYOUT.goalTop,
            width: FIGURE_LAYOUT.goalWidth,
            height:
              FIGURE_LAYOUT.goalFontSize *
              FIGURE_LAYOUT.goalLineHeight *
              FIGURE_LAYOUT.goalMaxLines,
            color: brand.palette.muted,
            fontFamily: fonts.mono,
            fontSize: FIGURE_LAYOUT.goalFontSize,
            lineHeight: FIGURE_LAYOUT.goalLineHeight,
            opacity: intro,
            overflow: "hidden",
            whiteSpace: "normal",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: FIGURE_LAYOUT.goalMaxLines,
            display: "-webkit-box",
          }}
        >
          {beat.goalText}
        </div>
      ) : null}

      {beat.unitLabel?.trim() ? (
        <div
          style={{
            position: "absolute",
            left: FIGURE_LAYOUT.contentX,
            top: FIGURE_LAYOUT.unitLabelTop,
            color: brand.palette.muted,
            fontFamily: fonts.mono,
            fontSize: FIGURE_LAYOUT.unitLabelFontSize,
            letterSpacing: FIGURE_LAYOUT.unitLabelLetterSpacing,
            opacity: intro,
          }}
        >
          {beat.unitLabel}
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          left: FIGURE_LAYOUT.axisX,
          top: FIGURE_LAYOUT.axisY,
          width: FIGURE_LAYOUT.axisWidth,
          height: FIGURE_LAYOUT.axisHeight,
          backgroundColor: rule,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: FIGURE_LAYOUT.axisX,
          top: FIGURE_LAYOUT.solidTop,
          width: achievedX - FIGURE_LAYOUT.axisX,
          height: FIGURE_LAYOUT.solidHeight,
          borderRadius: FIGURE_LAYOUT.solidRadius,
          backgroundColor: brand.palette.accent,
          transform: `scaleX(${solid})`,
          transformOrigin: "left center",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: achievedX,
          top: FIGURE_LAYOUT.dashedTop,
          width: FIGURE_LAYOUT.axisX + FIGURE_LAYOUT.axisWidth - achievedX,
          height: 0,
          borderTop: `${FIGURE_LAYOUT.dashedHeight}px dashed ${brand.palette.accent}`,
          opacity: FIGURE_LAYOUT.dashedOpacity,
          clipPath: `inset(0 ${100 - dashed * 100}% 0 0)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: FIGURE_LAYOUT.goalRingLeft,
          top: FIGURE_LAYOUT.goalRingTop,
          width: FIGURE_LAYOUT.goalRingSize,
          height: FIGURE_LAYOUT.goalRingSize,
          boxSizing: "border-box",
          border: `${FIGURE_LAYOUT.goalRingBorder}px solid ${brand.palette.accent}`,
          borderRadius: "50%",
          backgroundColor: brand.palette.bg,
          opacity: goal,
        }}
      />

      {beat.minTick?.trim() ? (
        <div
          style={{
            position: "absolute",
            left: FIGURE_LAYOUT.axisX,
            top: FIGURE_LAYOUT.tickTop,
            color: brand.palette.muted,
            fontFamily: fonts.mono,
            fontSize: FIGURE_LAYOUT.tickFontSize,
            opacity: intro,
          }}
        >
          {beat.minTick}
        </div>
      ) : null}

      {beat.achievedTick?.trim() ? (
        <div
          style={{
            position: "absolute",
            left: FIGURE_LAYOUT.achievedTickX,
            top: FIGURE_LAYOUT.tickTop,
            color: brand.palette.fg,
            fontFamily: fonts.mono,
            fontSize: FIGURE_LAYOUT.tickFontSize,
            fontWeight: 600,
            opacity: phaseIn(
              frame,
              msToFrames(FIGURE_TIMING.achievedTickMs),
              msToFrames(brand.motion.entranceMs),
              brand.motion.bezier,
            ),
          }}
        >
          {beat.achievedTick}
        </div>
      ) : null}

      {beat.goalTick?.trim() ? (
        <div
          style={{
            position: "absolute",
            left: FIGURE_LAYOUT.goalTickX,
            top: FIGURE_LAYOUT.tickTop,
            color: brand.palette.muted,
            fontFamily: fonts.mono,
            fontSize: FIGURE_LAYOUT.tickFontSize,
            letterSpacing: FIGURE_LAYOUT.goalTickLetterSpacing,
            opacity: goal,
          }}
        >
          {beat.goalTick}
        </div>
      ) : null}

      {beat.flash ? (
        <div
          style={{
            position: "absolute",
            left: achievedX - FIGURE_LAYOUT.flashDotSize / 2,
            top: FIGURE_LAYOUT.flashDotTop,
            width: FIGURE_LAYOUT.flashDotSize,
            height: FIGURE_LAYOUT.flashDotSize,
            borderRadius: "50%",
            backgroundColor: flashColor,
            ...flash,
          }}
        />
      ) : null}

      {beat.stamps.map((stamp, index) => {
        const stampProgress = phaseIn(
          frame,
          msToFrames(stamp.offsetMs),
          msToFrames(brand.motion.entranceMs),
          brand.motion.bezier,
        );
        return (
          <div
            key={`${stamp.tone}-${stamp.text}-${index}`}
            style={{
              position: "absolute",
              left: FIGURE_LAYOUT.contentX,
              top: FIGURE_LAYOUT.stampTop + index * FIGURE_LAYOUT.stampStep,
              color: brand.palette.extras[stamp.tone],
              fontFamily: fonts.mono,
              fontSize: FIGURE_LAYOUT.stampFontSize,
              letterSpacing: FIGURE_LAYOUT.stampLetterSpacing,
              opacity: stampProgress,
              transform: `translateY(${(1 - stampProgress) * FIGURE_LAYOUT.stampEntranceDrift}px)`,
            }}
          >
            {stamp.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
