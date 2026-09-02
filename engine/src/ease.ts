import { Easing, interpolate, type EasingFunction } from "remotion";

export type Bezier = readonly [number, number, number, number];

export const makeEase = (bezier: Bezier): EasingFunction =>
  Easing.bezier(bezier[0], bezier[1], bezier[2], bezier[3]);

const progress = (
  frame: number,
  startFrame: number,
  durationFrames: number,
  bezier: Bezier,
): number => {
  const endFrame = Math.max(startFrame + 1, startFrame + durationFrames);
  return interpolate(frame, [startFrame, endFrame], [0, 1], {
    easing: makeEase(bezier),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

export const phaseIn = (
  frame: number,
  startFrame: number,
  durationFrames: number,
  bezier: Bezier,
): number => progress(frame, startFrame, durationFrames, bezier);

export type DissolveStyle = {
  opacity: number;
  blurPx: number;
  translateY: number;
};

export const dissolve = (
  frame: number,
  startFrame: number,
  durationFrames: number,
  bezier: Bezier,
): DissolveStyle => {
  const amount = progress(frame, startFrame, durationFrames, bezier);
  return {
    opacity: 1 - amount,
    blurPx: 5 * amount,
    translateY: -50 * amount,
  };
};
