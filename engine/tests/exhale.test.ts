import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildManifest } from "../src/manifest";
import {
  CSS_EASE_BEZIER,
  easeProgressAtMs,
  EXHALE_LAYOUT,
  EXHALE_TIMING,
  exhaleCountdownIndexAtMs,
  exhaleDotYAtMs,
  exhaleThoughtDissolveStartMs,
  resolveExhaleColor,
} from "../src/layout";
import { BrandKit, ExhaleBeat, Script } from "../src/schema";

const readJson = (relativePath: string): unknown =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));

const brand = BrandKit.parse(readJson("../../brands/regulate/brand.json"));
const fixture = readJson("../../workspace/regulate-3am/script.json") as {
  beats: Array<Record<string, unknown>>;
  [key: string]: unknown;
};
const script = Script.parse(fixture);

const withBeat = (
  beatIndex: number,
  update: (beat: Record<string, unknown>) => Record<string, unknown>,
): Record<string, unknown> => {
  const beats = [...fixture.beats];
  const current = beats[beatIndex];
  if (!current) throw new Error(`Missing fixture beat ${beatIndex}`);
  beats[beatIndex] = update(current);
  return { ...fixture, beats };
};

describe("the 3:04 AM placed exhale contract", () => {
  it("builds the animatic column, travel endpoints, and shared thought boxes", () => {
    const manifest = buildManifest(script, brand);
    const momentThoughts = manifest.elements.filter((element) => /^beat-0-thought-\d+$/.test(element.id));
    const exhaleThoughts = manifest.elements.filter((element) => /^beat-1-thought-\d+$/.test(element.id));
    const openingText = manifest.elements.filter((element) => element.id === "beat-0-eyebrow" || element.id === "beat-0-line");
    const breathLabelsAndCounts = manifest.elements.filter((element) =>
      element.id === "beat-1-in-label" || element.id === "beat-1-out-label" || /^beat-1-countdown-\d+$/.test(element.id),
    );
    const column = manifest.geometry.find((element) => element.id === "beat-1-exhale-column");
    const dot = manifest.geometry.find((element) => element.id === "beat-1-exhale-dot");
    const firstTick = manifest.geometry.find((element) => element.id === "beat-1-exhale-tick-in-0");
    const lastTick = manifest.geometry.find((element) => element.id === "beat-1-exhale-tick-out-7");

    expect(manifest.totalDurationMs).toBe(19600);
    expect(manifest.closeStartMs).toBe(17100);
    expect(manifest.firstOnScreenTextMs).toBe(150);
    expect(EXHALE_LAYOUT.columnX).toBe(727.2);
    expect(EXHALE_LAYOUT.columnTop).toBe(288);
    expect(EXHALE_LAYOUT.columnWidth).toBe(144);
    expect(EXHALE_LAYOUT.columnHeight).toBe(1344);
    expect(column).toMatchObject({
      kind: "shape",
      beatIndex: 1,
      x: 727.2,
      y: 288,
      w: 144,
      h: 1344,
      fromMs: 6500,
      toMs: 17100,
    });
    expect(EXHALE_LAYOUT.innerTop).toBe(342);
    expect(EXHALE_LAYOUT.innerHeight).toBe(1236);
    expect(exhaleDotYAtMs(1400)).toBe(342);
    expect(exhaleDotYAtMs(9400)).toBe(1578);
    expect(dot).toMatchObject({
      kind: "shape",
      beatIndex: 1,
      x: 770.2,
      y: 313,
      w: 58,
      h: 58,
      fromMs: 7450,
      toMs: 17100,
      motion: {
        startMs: 7900,
        endMs: 15900,
        from: { x: 770.2, y: 313, w: 58, h: 58 },
        to: { x: 770.2, y: 1549, w: 58, h: 58 },
        bezier: [0.42, 0, 1, 1],
      },
    });
    expect(firstTick).toMatchObject({ fromMs: 7000, toMs: 17100 });
    expect(lastTick).toMatchObject({ fromMs: 7330, toMs: 17100 });
    expect(easeProgressAtMs(5400, 1400, 8000, EXHALE_TIMING.travelCurve)).toBeCloseTo(0.31536, 4);

    const expectedPositions = [
      { x: 97.2, y: 364.8 },
      { x: 216, y: 576 },
      { x: 129.6, y: 1367.15 },
      { x: 86.4, y: 1152 },
      { x: 259.2, y: 192 },
    ];
    expect(momentThoughts.map(({ x, y }) => ({ x, y }))).toEqual(expectedPositions);
    expect(exhaleThoughts.map(({ x, y }) => ({ x, y }))).toEqual(expectedPositions);
    expect(momentThoughts.map(({ x, y, w, h }) => ({ x, y, w, h }))).toEqual(
      exhaleThoughts.map(({ x, y, w, h }) => ({ x, y, w, h })),
    );
    expect(openingText).toHaveLength(2);
    expect(openingText.every((element) => element.x >= 60 && element.x + element.w <= 960)).toBe(true);
    openingText.forEach((element) => expect(element.x + element.w / 2).toBeCloseTo(540, 5));
    expect(breathLabelsAndCounts).toHaveLength(10);
    expect(breathLabelsAndCounts.every((element) => element.estimatedLines === 1)).toBe(true);
  });

  it("uses the authored 8-second ease and holds the countdown on 1s", () => {
    expect(EXHALE_TIMING.travelStartMs).toBe(1400);
    expect(EXHALE_TIMING.travelDurationMs).toBe(8000);
    expect(easeProgressAtMs(1400, 1400, 8000, EXHALE_TIMING.travelCurve)).toBe(0);
    expect(easeProgressAtMs(9400, 1400, 8000, EXHALE_TIMING.travelCurve)).toBe(1);
    expect(easeProgressAtMs(150, 150, 1200, CSS_EASE_BEZIER)).toBe(0);
    expect(exhaleCountdownIndexAtMs(1399)).toBe(-1);
    expect(exhaleCountdownIndexAtMs(1400)).toBe(0);
    expect(exhaleCountdownIndexAtMs(2399)).toBe(0);
    expect(exhaleCountdownIndexAtMs(2400)).toBe(1);
    expect([3400, 4400, 5400, 6400, 7400, 8400, 9400, 20000].map(exhaleCountdownIndexAtMs))
      .toEqual([2, 3, 4, 5, 6, 7, 7, 7]);
    expect(Array.from({ length: 5 }, (_, index) => exhaleThoughtDissolveStartMs(index)))
      .toEqual([1400, 2300, 3200, 4100, 5000]);
    expect(resolveExhaleColor(brand, ExhaleBeat.parse(script.beats[1]))).toBe("#7FA77F");
  });

  it("rejects mismatched placements and more than five placed thoughts", () => {
    expect(Script.safeParse(withBeat(0, (beat) => ({ ...beat, thoughtPositions: [] }))).success).toBe(false);
    expect(Script.safeParse(withBeat(1, (beat) => ({ ...beat, thoughtPositions: [] }))).success).toBe(false);

    const moment = fixture.beats[0];
    if (!moment) throw new Error("Missing placed Moment fixture beat");
    const thoughts = [...(moment.thoughts as string[]), "one more thought"];
    const thoughtPositions = [...(moment.thoughtPositions as Array<{ x: number; y: number }>), { x: 0, y: 0 }];
    expect(Script.safeParse(withBeat(0, (beat) => ({ ...beat, thoughts, thoughtPositions }))).success).toBe(false);

    const exhale = fixture.beats[1];
    if (!exhale) throw new Error("Missing Exhale fixture beat");
    const exhaleThoughts = [...(exhale.thoughts as string[]), "one more thought"];
    const exhalePositions = [
      ...(exhale.thoughtPositions as Array<{ x: number; y: number }>),
      { x: 0, y: 0 },
    ];
    expect(Script.safeParse(withBeat(1, (beat) => ({
      ...beat,
      thoughts: exhaleThoughts,
      thoughtPositions: exhalePositions,
    }))).success).toBe(false);
  });

  it("rejects blank Exhale labels and countdown copy", () => {
    for (const key of ["inLabel", "outLabel", "phaseLabel", "colorKey"]) {
      for (const value of ["", "   "]) {
        expect(Script.safeParse(withBeat(1, (beat) => ({ ...beat, [key]: value }))).success).toBe(false);
      }
    }

    const emptyCountdown = ["8s", "7s", "6s", "5s", "", "3s", "2s", "1s"];
    expect(Script.safeParse(withBeat(1, (beat) => ({ ...beat, countdown: emptyCountdown }))).success).toBe(false);
    expect(Script.safeParse(withBeat(1, (beat) => ({ ...beat, countdown: ["8s"] }))).success).toBe(false);
  });

  it("fails manifest construction when the Exhale color key is absent from the brand", () => {
    const invalidColorScript = Script.parse(withBeat(1, (beat) => ({ ...beat, colorKey: "missingState" })));
    expect(() => buildManifest(invalidColorScript, brand)).toThrow(/palette\.extras/);
  });
});
