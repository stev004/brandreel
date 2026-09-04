export const FPS = 60;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const SAFE_TOP = 150;
export const SAFE_BOTTOM = 320;
export const SAFE_RIGHT = 120;
export const SAFE_LEFT = 60;

export const MS_PER_SECOND = 1000;
export const MAX_HOOK_MS = 3000;
export const MAX_STATIC_INTERVAL_MS = 3000;
export const MIN_DURATION_MS = 15000;
export const MAX_DURATION_MS = 35000;

export const msToFrames = (milliseconds: number): number =>
  Math.max(0, Math.round((milliseconds / MS_PER_SECOND) * FPS));
