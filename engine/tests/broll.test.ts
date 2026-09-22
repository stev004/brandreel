import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Stack } from "../src/Stack";
import { BROLL_LAYOUT, CAPTION_LAYOUT, captionTop } from "../src/layout";
import { buildManifest } from "../src/manifest";
import { BrandKit, Script, type Words } from "../src/schema";
import { requireBrollClipPath } from "../src/templates/Broll";

const readJson = (relativePath: string): unknown =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));

const brand = BrandKit.parse(readJson("../../brands/regulate/brand.json"));
const words: Words = {
  words: [
    { text: "before", startMs: 500, endMs: 800 },
    { text: "in", startMs: 1600, endMs: 1800 },
    { text: "clip", startMs: 2000, endMs: 2200 },
    { text: "after", startMs: 3800, endMs: 4000 },
  ],
};

const makeScript = (captionSource: "words" | "none" = "words") => Script.parse({
  id: "broll-engine-fixture",
  brand: "regulate",
  coreMechanic: "A clip interrupts a line, then hands it back.",
  beats: [
    { kind: "moment", line: "before the clip", durationMs: 1500 },
    {
      kind: "broll",
      clip: "assets/conformed/fixture.mp4",
      overlayText: "Clip overlay",
      captionSource,
      durationMs: 2000,
    },
    { kind: "moment", line: "after the clip", durationMs: 1000 },
  ],
  close: { line: "", showWordmark: false, durationMs: 1000 },
  caption: "Static description copy.",
  hashtags: [],
});

describe("Broll template contract", () => {
  it("uses a full-bleed footage interval and reports matching text boxes", () => {
    const manifest = buildManifest(makeScript(), brand, words);
    const overlay = manifest.elements.find((element) => element.id === "beat-1-overlay");
    const watermark = manifest.elements.find((element) => element.id === "beat-1-watermark");
    const clipCaption = manifest.elements.find((element) => element.id === "broll-caption-line-1-0-0");
    const globalCaptions = manifest.elements.filter((element) => element.id.startsWith("caption-line-timed-"));

    expect(manifest.footageIntervals).toEqual([{ fromMs: 1500, toMs: 3500 }]);
    expect(manifest.geometry.some((element) => element.id.includes("broll"))).toBe(false);
    expect(overlay).toMatchObject({
      x: BROLL_LAYOUT.overlayX,
      y: BROLL_LAYOUT.overlayTop,
      fromMs: 1800,
      fontWeight: 500,
      whiteSpace: "pre-line",
    });
    expect(watermark).toMatchObject({ fromMs: 1500, fontWeight: 500, whiteSpace: "nowrap" });
    expect(watermark && watermark.x + watermark.w).toBeLessThanOrEqual(1080 - manifest.safe.right);
    expect(clipCaption).toMatchObject({
      text: "before in clip after",
      fromMs: 1500,
      toMs: 3500,
      x: CAPTION_LAYOUT.contentX,
      y: captionTop,
      fontWeight: 600,
    });
    expect(globalCaptions.some((element) => element.fromMs < 3500 && element.toMs > 1500)).toBe(false);
    expect(manifest.visualChangeMs).toEqual(expect.arrayContaining([1500, 1600, 1800, 2000, 2200]));
  });

  it("masks the global caption for captionSource none and leaves static clips without false timing changes", () => {
    const manifest = buildManifest(makeScript("none"), brand, words);
    const clipWords = manifest.elements.filter((element) => element.id.startsWith("broll-caption-line-"));

    expect(clipWords).toHaveLength(0);
    expect(manifest.visualChangeMs).not.toContain(1600);
    expect(manifest.footageIntervals).toEqual([{ fromMs: 1500, toMs: 3500 }]);
  });

  it("requires words for timed Broll captions and reports missing clip paths clearly", () => {
    expect(() => buildManifest(makeScript(), brand)).toThrow(/captionSource 'words'.*words\.json/);
    expect(() => requireBrollClipPath(undefined)).toThrow(/missing its clip path.*conformed/);
  });

  it("passes the absolute beat start into a later Broll caption layer", () => {
    const stack = Stack({ brand, script: makeScript(), words });
    const sequences = Children.toArray((stack as ReactElement<{ children?: ReactNode }>).props.children);
    const brollSequence = sequences.find((node) =>
      isValidElement<{ name?: string }>(node) && node.props.name === "broll-1",
    );
    if (!isValidElement<{ name?: string; children?: ReactNode }>(brollSequence)) {
      throw new Error("Broll sequence did not contain its template.");
    }
    const brollTemplate = brollSequence.props.children;
    if (!isValidElement<{ beatStartMs: number; words?: Words }>(brollTemplate)) {
      throw new Error("Broll sequence did not contain its template.");
    }

    expect(brollTemplate.props).toMatchObject({ beatStartMs: 1500, words });
  });
});
