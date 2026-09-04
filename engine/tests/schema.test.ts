import { readFileSync } from "node:fs";
import { BrandKit, Script } from "../src/schema";
import { describe, expect, it } from "vitest";

const readJson = (relativePath: string): unknown =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));

describe("M1 JSON contracts", () => {
  it("parses the curated Regulate brand", () => {
    const brand = BrandKit.parse(readJson("../../brands/regulate/brand.json"));
    expect(brand.name).toBe("regulate");
    // Brand Book law 1 (2026-09-04): the dot is always pure white, never cream, teal or a state colour.
    expect(brand.wordmark.dotColor).toBe("#FFFFFF");
    expect(brand.palette.extras.dot).toBe("#FFFFFF");
  });

  it("parses the complete demo script", () => {
    const script = Script.parse(readJson("../../workspace/demo/script.json"));
    expect(script.beats).toHaveLength(3);
    expect(script.beats[1].kind).toBe("moment");
  });

  it("parses the howclose brand and fusion script", () => {
    const brand = BrandKit.parse(readJson("../../brands/howclose/brand.json"));
    const script = Script.parse(readJson("../../workspace/howclose-fusion/script.json"));
    expect(brand.wordmark.logoSvg).toContain('viewBox="0 0 32 32"');
    expect(script.coreMechanic).toBe("The honest short line against the long dashed road to Q30.");
    expect(script.beats.map((beat) => beat.kind)).toEqual(["question", "figure", "verdict"]);
  });

  it("rejects a script without a core mechanic", () => {
    const script = readJson("../../workspace/demo/script.json") as Record<string, unknown>;
    const { coreMechanic: _coreMechanic, ...withoutCoreMechanic } = script;
    expect(() => Script.parse(withoutCoreMechanic)).toThrow();
  });

  it("rejects a bad hex and a missing font", () => {
    expect(() => BrandKit.parse(readJson("./fixtures/broken-brand.json"))).toThrow();
  });
});
