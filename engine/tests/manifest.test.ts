import { readFileSync } from "node:fs";
import { BrandKit, Script } from "../src/schema";
import { buildManifest } from "../src/manifest";
import { CAPTION_LAYOUT, computeTimeline, FIGURE_LAYOUT, MOMENT_LAYOUT } from "../src/layout";
import { describe, expect, it } from "vitest";

const readJson = (relativePath: string): unknown =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));

const brand = BrandKit.parse(readJson("../../brands/regulate/brand.json"));
const demo = Script.parse(readJson("../../workspace/demo/script.json"));
const smoke = Script.parse(readJson("../../workspace/smoke-3am/script.json"));
const smokeV2 = Script.parse(readJson("../../workspace/smoke-3am-v2/script.json"));

describe("layout manifest", () => {
  it("includes every demo beat text and each caption line", () => {
    const manifest = buildManifest(demo, brand);
    const texts = manifest.elements.map((element) => element.text);

    expect(texts).toEqual(expect.arrayContaining([
      "11:47 PM",
      "your body is still\nat the meeting",
      "did I miss something",
      "one more email",
      "tomorrow can wait",
      "screen face down",
      "the room gets\nquiet again",
      "what if they need me",
      "I should check once more",
      "maybe I can solve it now",
      "one small thing",
      "let the night\nbe enough",
      "feel the pillow",
      "let your shoulders drop",
      "leave the light off",
      "you can pick this up\ntomorrow.",
      "regulate.",
      "a softer landing",
      "for tonight.",
    ]));
    expect(manifest.elements.filter((element) => element.id.startsWith("caption-line-"))).toHaveLength(2);
    expect(manifest.closeStartMs).toBe(4500 + 5000 + 4500);
  });

  it("keeps beat element timing inside its beat span", () => {
    const manifest = buildManifest(demo, brand);
    const timeline = computeTimeline(demo, brand);

    manifest.elements
      .filter((element) => element.beatIndex !== null)
      .forEach((element) => {
        const span = timeline.beats[element.beatIndex as number];
        expect(element.fromMs).toBeGreaterThanOrEqual(span.startMs);
        expect(element.toMs).toBeLessThanOrEqual(span.endMs);
        expect(element.toMs).toBe(span.endMs);
      });
  });

  it("reports a long figure text beyond its configured line limit", () => {
    const script: Script = {
      id: "long-goal",
      brand: "regulate",
      coreMechanic: "A figure explains the distance to the goal.",
      beats: [{
        kind: "figure",
        label: "HOURS SINCE THE MEETING ENDED",
        value: { to: 9, decimals: 0 },
        goalText: "Where your nervous system stopped and kept replaying the meeting all night",
        axis: { min: 0, max: 9, achieved: 9, goal: 0 },
        stamps: [],
        durationMs: 6000,
      }],
      close: { line: "", showWordmark: false },
      caption: "",
      hashtags: [],
    };
    const manifest = buildManifest(script, brand);
    const goal = manifest.elements.find((element) => element.id === "beat-0-goal");

    expect(goal?.w).toBe(540);
    expect(goal?.maxLines).toBe(2);
    expect(goal?.h).toBe(60 * 1.2 * 2);
    expect(goal?.estimatedLines).toBeGreaterThan(goal?.maxLines ?? 0);
  });

  it("gives the smoke figure goal a wrapped two-line safe box", () => {
    const manifest = buildManifest(smoke, brand);
    const goal = manifest.elements.find((element) => element.id === "beat-3-goal");

    expect(goal).toMatchObject({ w: 540, maxLines: 2, h: 60 * 1.2 * 2 });
  });

  it("keeps the smoke v2 figure counter, goal, and unit label clear", () => {
    const manifest = buildManifest(smokeV2, brand);
    const boxes = ["counter", "goal", "unit-label"].map((part) =>
      manifest.elements.find((element) => element.id === `beat-2-${part}`),
    );
    const overlaps = (first: typeof boxes[number], second: typeof boxes[number]): boolean => {
      if (!first || !second) return false;
      return first.x < second.x + second.w && first.x + first.w > second.x &&
        first.y < second.y + second.h && first.y + first.h > second.y;
    };

    expect(boxes[0]?.w).toBe(FIGURE_LAYOUT.counterWidth);
    expect(overlaps(boxes[0], boxes[1])).toBe(false);
    expect(overlaps(boxes[1], boxes[2])).toBe(false);
  });

  it("fits a two-row close tagline above the close URL", () => {
    const script = Script.parse({
      id: "close-tagline-wrap",
      brand: "regulate",
      coreMechanic: "A tagline settles into two clear rows.",
      beats: [],
      close: {
        line: "",
        showWordmark: false,
        tagline: "Not meditation. Regulation.",
        url: "example.com",
      },
      caption: "",
      hashtags: [],
    });
    const manifest = buildManifest(script, brand);
    const tagline = manifest.elements.find((element) => element.id === "close-tagline");
    const url = manifest.elements.find((element) => element.id === "close-url");
    const intersects = (first: typeof tagline, second: typeof url): boolean => {
      if (!first || !second) return false;
      return first.x < second.x + second.w && first.x + first.w > second.x &&
        first.y < second.y + second.h && first.y + first.h > second.y;
    };

    expect(tagline?.maxLines).toBe(2);
    expect(tagline?.estimatedLines).toBeLessThanOrEqual(2);
    expect(intersects(tagline, url)).toBe(false);
  });

  it("uses the shared frame and safe-zone dimensions", () => {
    const manifest = buildManifest(demo, brand);

    expect(manifest.width).toBe(1080);
    expect(manifest.height).toBe(1920);
    expect(manifest.fps).toBe(60);
    expect(manifest.safe).toEqual({ top: 150, bottom: 320, left: 60, right: 120 });
    expect(manifest.totalDurationMs).toBe(4500 + 5000 + 4500 + 1920);
  });

  it("keeps three Moment thoughts clear of the caption block", () => {
    const script: Script = {
      id: "moment-thought-caption-gap",
      brand: "regulate",
      coreMechanic: "Thoughts settle before the caption arrives.",
      beats: [{
        kind: "moment",
        line: "the room gets quiet",
        thoughts: ["one thought", "another thought", "one last thought"],
        durationMs: 15000,
      }],
      close: { line: "", showWordmark: false },
      caption: "a caption line\nwith a second line",
      hashtags: [],
    };
    const manifest = buildManifest(script, brand);
    const thoughtBoxes = manifest.elements.filter((element) => /^beat-0-thought-/.test(element.id));
    const captionBoxes = manifest.elements.filter((element) => element.id.startsWith("caption-line-"));
    const overlaps = (first: typeof thoughtBoxes[number], second: typeof captionBoxes[number]): boolean =>
      first.x < second.x + second.w && first.x + first.w > second.x &&
      first.y < second.y + second.h && first.y + first.h > second.y;
    const momentLine = manifest.elements.find((element) => element.id === "beat-0-line");

    expect(thoughtBoxes).toHaveLength(3);
    expect(captionBoxes).toHaveLength(CAPTION_LAYOUT.maxLines);
    expect(thoughtBoxes.every((thought) => captionBoxes.every((caption) => !overlaps(thought, caption)))).toBe(true);
    expect(MOMENT_LAYOUT.thoughtsTop).toBeGreaterThan((momentLine?.y ?? 0) + (momentLine?.h ?? 0));
  });
});
