import { readFileSync } from "node:fs";
import { Beat, BrandKit, Script } from "../src/schema";
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

  it("accepts visual directives on the existing beat kinds", () => {
    const script = readJson("../../workspace/howclose-fusion/script.json") as Record<string, unknown>;
    const beats = script.beats as Record<string, unknown>[];
    const withVisuals = {
      ...script,
      beats: beats.map((beat) => ({ ...beat, visual: "stock:quiet morning light" })),
    };

    expect(Script.parse(withVisuals).beats.map((beat) => beat.visual)).toEqual([
      "stock:quiet morning light",
      "stock:quiet morning light",
      "stock:quiet morning light",
    ]);
    expect(Beat.parse({
      kind: "exhale",
      visual: "template:breath",
      thoughts: ["Pause"],
      thoughtPositions: [{ x: 100, y: 100 }],
      inLabel: "In",
      outLabel: "Out",
      phaseLabel: "Breathe",
      countdown: ["1", "2", "3", "4", "5", "6", "7", "8"],
      colorKey: "accent",
      durationMs: 4000,
    }).visual).toBe("template:breath");
  });

  it("rejects malformed visual directives", () => {
    const script = readJson("../../workspace/demo/script.json") as Record<string, unknown>;
    const beats = script.beats as Record<string, unknown>[];

    for (const visual of ["", "video:mountain", "template:", "stock:   ", "gen: prompt\nextra", "stock: query "]) {
      const invalid = { ...script, beats: [{ ...beats[0], visual }] };
      expect(() => Script.parse(invalid), `visual ${JSON.stringify(visual)}`).toThrow();
    }
  });

  it("accepts b-roll clip paths and unresolved stock or generated assets", () => {
    const script = readJson("../../workspace/demo/script.json") as Record<string, unknown>;
    const broll = (fields: Record<string, unknown>) => Script.parse({
      ...script,
      beats: [{ kind: "broll", captionSource: "words", durationMs: 2400, ...fields }],
    });

    expect(broll({ clip: "assets/quiet-morning.mp4", overlayText: "Take one step" }).beats[0]).toMatchObject({
      kind: "broll",
      clip: "assets/quiet-morning.mp4",
      overlayText: "Take one step",
      captionSource: "words",
    });
    expect(broll({ visual: "stock:quiet morning" }).beats[0].kind).toBe("broll");
    expect(broll({ visual: "gen:soft sunrise through a window" }).beats[0].kind).toBe("broll");
  });

  it("requires b-roll clips without stock/gen directives and rejects unsafe paths", () => {
    const script = readJson("../../workspace/demo/script.json") as Record<string, unknown>;
    const broll = (fields: Record<string, unknown>) => Script.parse({
      ...script,
      beats: [{ kind: "broll", captionSource: "none", durationMs: 2400, ...fields }],
    });

    expect(() => broll({})).toThrow(/clip path/);
    expect(() => broll({ visual: "template:Moment" })).toThrow(/clip path/);
    for (const clip of ["../private.mp4", "assets/../private.mp4", "/tmp/clip.mp4", "C:/clip.mp4", "assets\\clip.mp4"]) {
      expect(() => broll({ clip }), `clip ${JSON.stringify(clip)}`).toThrow();
    }
    expect(() => broll({ clip: "assets/clip.mp4", captionSource: "script" })).toThrow();
  });

  it("rejects a bad hex and a missing font", () => {
    expect(() => BrandKit.parse(readJson("./fixtures/broken-brand.json"))).toThrow();
  });
});
