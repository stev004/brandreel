import { readFileSync } from "node:fs";
import { BrandKit, Script } from "../src/schema";
import {
  FIGURE_LAYOUT,
  lintScript,
  MOMENT_LAYOUT,
  computeTimeline,
  thoughtDissolveStartMs,
  thoughtPhaseInStartMs,
} from "../src/layout";
import { describe, expect, it } from "vitest";

const readJson = (relativePath: string): unknown =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));

const regulate = BrandKit.parse(readJson("../../brands/regulate/brand.json"));
const demo = Script.parse(readJson("../../workspace/demo/script.json"));
const howcloseBrand = BrandKit.parse(readJson("../../brands/howclose/brand.json"));
const howclose = Script.parse(readJson("../../workspace/howclose-fusion/script.json"));

describe("script lint core", () => {
  it("keeps the figure goal marker inside the right safe edge at the axis maximum", () => {
    const figure: Script["beats"][number] = {
      kind: "figure",
      label: "TEST FIGURE",
      value: { to: 9, decimals: 0 },
      goalText: "the goal",
      axis: { min: 0, max: 9, achieved: 9, goal: 9 },
      stamps: [],
      durationMs: 6000,
    };
    const markerCenter = FIGURE_LAYOUT.axisX +
      FIGURE_LAYOUT.axisWidth * ((figure.axis.goal - figure.axis.min) / (figure.axis.max - figure.axis.min));

    expect(FIGURE_LAYOUT.goalRingLeft).toBe(markerCenter - FIGURE_LAYOUT.goalRingSize / 2);
    expect(FIGURE_LAYOUT.goalRingLeft + FIGURE_LAYOUT.goalRingSize).toBeLessThanOrEqual(1080 - 120);
  });

  it("counts a thought dissolve as a visual change during a long moment", () => {
    const beat: Script["beats"][number] = {
      kind: "moment",
      line: "",
      thoughts: ["a thought fades"],
      durationMs: 4000,
    };
    const script: Script = {
      id: "thought-dissolve",
      brand: "regulate",
      coreMechanic: "A thought changes over time.",
      beats: [beat],
      close: { line: "", showWordmark: false },
      caption: "",
      hashtags: [],
    };
    const phaseInMs = thoughtPhaseInStartMs(regulate, beat);
    const dissolveMs = thoughtDissolveStartMs(regulate, beat, 1, 0);
    const timeline = computeTimeline(script, regulate);

    expect(dissolveMs).toBeGreaterThan(phaseInMs);
    expect(dissolveMs).toBeLessThan(beat.durationMs);
    expect(timeline.visualChangeMs).toContain(dissolveMs);
  });

  it("accepts the demo", () => {
    expect(lintScript(demo, regulate)).toEqual({ ok: true, violations: [] });
  });

  it("accepts the howclose fusion demo", () => {
    expect(lintScript(howclose, howcloseBrand)).toEqual({ ok: true, violations: [] });
  });

  it("reports a figure stamp below the bottom safe zone", () => {
    const script: Script = {
      id: "unsafe-stamp",
      brand: "howclose",
      coreMechanic: "The result is measured against the target.",
      beats: [
        {
          kind: "figure",
          label: "TEST FIGURE",
          value: { to: 2.4, decimals: 1 },
          axis: { min: 0, max: 30, achieved: 2.4, goal: 30 },
          stamps: [
            { tone: "done", text: "stamp one", offsetMs: 200 },
            { tone: "done", text: "stamp two", offsetMs: 500 },
            { tone: "done", text: "stamp three", offsetMs: 800 },
            { tone: "done", text: "stamp four", offsetMs: 1100 },
            { tone: "done", text: "stamp five", offsetMs: 1400 },
            { tone: "done", text: "stamp six", offsetMs: 1700 },
          ],
          durationMs: 15000,
        },
      ],
      close: { line: "", showWordmark: false },
      caption: "",
      hashtags: [],
    };
    const result = lintScript(script, howcloseBrand);
    expect(result.ok).toBe(false);
    expect(result.violations.some((violation) => violation.includes("stamp-5") && violation.includes("safe zone"))).toBe(true);
  });

  it("reports a question hook whose first text is after three seconds", () => {
    const script: Script = {
      id: "late-question-hook",
      brand: "howclose",
      coreMechanic: "The question arrives after the silence.",
      beats: [
        { kind: "moment", line: "", durationMs: 3500 },
        { kind: "question", lines: ["too late"], durationMs: 12000 },
      ],
      close: { line: "", showWordmark: false },
      caption: "",
      hashtags: [],
    };
    const result = lintScript(script, howcloseBrand);
    expect(result.ok).toBe(false);
    expect(result.violations.some((violation) => violation.includes("First on-screen text"))).toBe(true);
  });

  it("reports text that crosses the top safe zone", () => {
    const originalTop = MOMENT_LAYOUT.momentLineTop;
    MOMENT_LAYOUT.momentLineTop = 100;
    try {
      const script: Script = {
        id: "unsafe-top",
        brand: "regulate",
        coreMechanic: "A line finds a calmer place.",
        beats: [{ kind: "moment", line: "too high", durationMs: 15000 }],
        close: { line: "", showWordmark: false },
        caption: "",
        hashtags: [],
      };
      const result = lintScript(script, regulate);
      expect(result.ok).toBe(false);
      expect(result.violations.some((violation) => violation.includes("safe zone"))).toBe(true);
    } finally {
      MOMENT_LAYOUT.momentLineTop = originalTop;
    }
  });

  it("reports a first text hook that lands after three seconds", () => {
      const script: Script = {
        id: "late-hook",
        brand: "regulate",
        coreMechanic: "A thought arrives after the quiet.",
        beats: [
        { kind: "moment", line: "", durationMs: 3500 },
        { kind: "moment", line: "too late", durationMs: 1000 },
      ],
      close: { line: "", showWordmark: false },
      caption: "",
      hashtags: [],
    };
    const result = lintScript(script, regulate);
    expect(result.ok).toBe(false);
    expect(result.violations.some((violation) => violation.includes("First on-screen text"))).toBe(true);
  });
});
