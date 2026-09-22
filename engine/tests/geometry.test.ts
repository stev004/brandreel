import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeGeometry, FIGURE_LAYOUT, FIGURE_TIMING } from "../src/layout";
import { BrandKit, Script } from "../src/schema";

const readJson = (relativePath: string): unknown =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));

const howclose = BrandKit.parse(readJson("../../brands/howclose/brand.json"));

describe("non-text layout geometry", () => {
  it("emits the rendered figure shapes with their motion envelopes and visibility times", () => {
    const script = Script.parse({
      id: "figure-geometry",
      brand: "howclose",
      coreMechanic: "A figure marks the distance to its goal.",
      beats: [{
        kind: "figure",
        label: "THE FIGURE",
        value: { to: 2, decimals: 0 },
        axis: { min: 0, max: 4, achieved: 2, goal: 4 },
        stamps: [],
        flash: { colorKey: "accent" },
        durationMs: 6000,
      }],
      close: { line: "", showWordmark: false, durationMs: 400 },
      caption: "",
      hashtags: [],
    });
    const geometry = computeGeometry(script, howclose);
    const byId = (id: string) => geometry.find((element) => element.id === id);
    const centerX = FIGURE_LAYOUT.axisX + FIGURE_LAYOUT.axisWidth / 2;
    const dotSizeAtPeak = FIGURE_LAYOUT.flashDotSize * FIGURE_LAYOUT.flashPeakScale;
    const ringSpreadAtPeak = FIGURE_LAYOUT.flashRingSpread * FIGURE_LAYOUT.flashPeakScale;
    const flashStartMs = FIGURE_TIMING.flashMs;
    const flashPeakMs = flashStartMs + FIGURE_TIMING.flashPeakMs;

    expect(byId("beat-0-figure-axis")).toMatchObject({
      beatIndex: 0,
      x: FIGURE_LAYOUT.axisX,
      y: FIGURE_LAYOUT.axisY,
      w: FIGURE_LAYOUT.axisWidth,
      h: FIGURE_LAYOUT.axisHeight,
      fromMs: 0,
      toMs: 6000,
    });
    expect(byId("beat-0-figure-solid-bar")).toMatchObject({
      x: FIGURE_LAYOUT.axisX,
      y: FIGURE_LAYOUT.solidTop,
      w: FIGURE_LAYOUT.axisWidth / 2,
      h: FIGURE_LAYOUT.solidHeight,
      fromMs: FIGURE_TIMING.solidStartMs,
      motion: {
        startMs: FIGURE_TIMING.solidStartMs,
        endMs: FIGURE_TIMING.solidStartMs + FIGURE_TIMING.drawDurationMs,
        from: { x: FIGURE_LAYOUT.axisX, y: FIGURE_LAYOUT.solidTop, w: 0, h: FIGURE_LAYOUT.solidHeight },
        to: { x: FIGURE_LAYOUT.axisX, y: FIGURE_LAYOUT.solidTop, w: FIGURE_LAYOUT.axisWidth / 2, h: FIGURE_LAYOUT.solidHeight },
        bezier: howclose.motion.bezier,
      },
    });
    expect(byId("beat-0-figure-dashed-bar")).toMatchObject({
      x: centerX,
      y: FIGURE_LAYOUT.dashedTop,
      w: FIGURE_LAYOUT.axisWidth / 2,
      h: FIGURE_LAYOUT.dashedHeight,
      fromMs: FIGURE_TIMING.dashedStartMs,
      motion: {
        startMs: FIGURE_TIMING.dashedStartMs,
        endMs: FIGURE_TIMING.dashedStartMs + FIGURE_TIMING.dashedDurationMs,
        from: { x: centerX, y: FIGURE_LAYOUT.dashedTop, w: 0, h: FIGURE_LAYOUT.dashedHeight },
        to: { x: centerX, y: FIGURE_LAYOUT.dashedTop, w: FIGURE_LAYOUT.axisWidth / 2, h: FIGURE_LAYOUT.dashedHeight },
      },
    });
    expect(byId("beat-0-figure-goal-ring")).toMatchObject({
      x: FIGURE_LAYOUT.goalRingLeft,
      y: FIGURE_LAYOUT.goalRingTop,
      w: FIGURE_LAYOUT.goalRingSize,
      h: FIGURE_LAYOUT.goalRingSize,
      fromMs: FIGURE_TIMING.goalMs,
      toMs: 6000,
    });
    expect(byId("beat-0-figure-goal-ring")?.motion).toBeUndefined();
    expect(byId("beat-0-figure-flash-dot")).toMatchObject({
      x: centerX - dotSizeAtPeak / 2,
      y: FIGURE_LAYOUT.flashDotTop + FIGURE_LAYOUT.flashDotSize / 2 - dotSizeAtPeak / 2,
      w: dotSizeAtPeak,
      h: dotSizeAtPeak,
      fromMs: flashStartMs,
      toMs: 6000,
    });
    expect(byId("beat-0-figure-flash-ring")).toMatchObject({
      x: centerX - dotSizeAtPeak / 2 - ringSpreadAtPeak,
      y: FIGURE_LAYOUT.flashDotTop + FIGURE_LAYOUT.flashDotSize / 2 - dotSizeAtPeak / 2 - ringSpreadAtPeak,
      w: dotSizeAtPeak + ringSpreadAtPeak * 2,
      h: dotSizeAtPeak + ringSpreadAtPeak * 2,
      fromMs: flashStartMs,
      toMs: flashPeakMs,
      motion: {
        startMs: flashStartMs,
        endMs: flashPeakMs,
        to: {
          x: centerX - dotSizeAtPeak / 2 - ringSpreadAtPeak,
          y: FIGURE_LAYOUT.flashDotTop + FIGURE_LAYOUT.flashDotSize / 2 - dotSizeAtPeak / 2 - ringSpreadAtPeak,
          w: dotSizeAtPeak + ringSpreadAtPeak * 2,
          h: dotSizeAtPeak + ringSpreadAtPeak * 2,
        },
        bezier: howclose.motion.bezier,
      },
    });
  });

  it("emits the CloseD logo independently of the text layout and preserves its entrance travel", () => {
    const script = Script.parse({
      id: "close-logo-geometry",
      brand: "howclose",
      coreMechanic: "The logo closes the story.",
      beats: [],
      close: { line: "", showWordmark: false, durationMs: 100 },
      caption: "",
      hashtags: [],
    });
    const logo = computeGeometry(script, howclose).find((element) => element.id === "close-logo");

    expect(logo).toMatchObject({
      beatIndex: null,
      x: 60,
      y: 620,
      w: 150,
      h: 150,
      fromMs: 100,
      toMs: 100,
      motion: {
        startMs: 200,
        endMs: 200 + howclose.motion.entranceMs,
        from: { x: 60, y: 654, w: 150, h: 150 },
        to: { x: 60, y: 620, w: 150, h: 150 },
        bezier: howclose.motion.bezier,
      },
    });
  });

  it("omits the optional flash geometry when a figure has no flash", () => {
    const script = Script.parse({
      id: "figure-without-flash",
      brand: "howclose",
      coreMechanic: "A figure marks the distance to its goal.",
      beats: [{
        kind: "figure",
        label: "THE FIGURE",
        value: { to: 2, decimals: 0 },
        axis: { min: 0, max: 4, achieved: 2, goal: 4 },
        stamps: [],
        durationMs: 6000,
      }],
      close: { line: "", showWordmark: false },
      caption: "",
      hashtags: [],
    });
    const ids = computeGeometry(script, howclose).map((element) => element.id);

    expect(ids).not.toContain("beat-0-figure-flash-dot");
    expect(ids).not.toContain("beat-0-figure-flash-ring");
  });
});
