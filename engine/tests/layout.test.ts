import { readFileSync } from "node:fs";
import { BrandKit, Script } from "../src/schema";
import { lintScript, MOMENT_LAYOUT } from "../src/layout";
import { describe, expect, it } from "vitest";

const readJson = (relativePath: string): unknown =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));

const regulate = BrandKit.parse(readJson("../../brands/regulate/brand.json"));
const demo = Script.parse(readJson("../../workspace/demo/script.json"));

describe("script lint core", () => {
  it("accepts the demo", () => {
    expect(lintScript(demo, regulate)).toEqual({ ok: true, violations: [] });
  });

  it("reports text that crosses the top safe zone", () => {
    const originalTop = MOMENT_LAYOUT.momentLineTop;
    MOMENT_LAYOUT.momentLineTop = 100;
    try {
      const script: Script = {
        id: "unsafe-top",
        brand: "regulate",
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
