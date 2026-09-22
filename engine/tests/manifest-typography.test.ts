import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildManifest } from "../src/manifest";
import { BrandKit, Script } from "../src/schema";

const readJson = (relativePath: string): unknown =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));

const brand = BrandKit.parse(readJson("../../brands/regulate/brand.json"));
const smoke = Script.parse(readJson("../../workspace/smoke-3am/script.json"));
const placedExhale = Script.parse(readJson("../../workspace/regulate-3am/script.json"));

const elementById = (script: Script, id: string) =>
  buildManifest(script, brand).elements.find((element) => element.id === id);

describe("manifest typography", () => {
  it("records rendered font, style, weight, whitespace, and transform for legacy templates", () => {
    const manifest = buildManifest(smoke, brand);
    const byId = (id: string) => manifest.elements.find((element) => element.id === id);

    expect(byId("beat-0-eyebrow")).toMatchObject({
      fontFamily: "JetBrains Mono",
      fontStyle: "normal",
      fontWeight: 400,
      textTransform: "uppercase",
      whiteSpace: "normal",
    });
    expect(byId("beat-0-line")).toMatchObject({
      fontFamily: "Playfair Display",
      fontStyle: "italic",
      fontWeight: 400,
      textTransform: "none",
    });
    expect(byId("beat-1-question-line-0")).toMatchObject({
      fontFamily: "Playfair Display",
      fontStyle: "normal",
      fontWeight: 700,
    });
    expect(byId("beat-1-dek")).toMatchObject({ fontStyle: "italic", fontWeight: 400 });
    expect(byId("beat-3-counter")).toMatchObject({
      fontFamily: "JetBrains Mono",
      fontWeight: 600,
      fontVariantNumeric: "tabular-nums",
    });
    expect(byId("beat-3-goal")).toMatchObject({ fontFamily: "JetBrains Mono", whiteSpace: "normal" });
    expect(byId("beat-3-achieved-tick")).toMatchObject({ fontWeight: 600 });
    expect(byId("beat-4-verdict-line-0")).toMatchObject({ fontStyle: "italic", fontWeight: 400 });
    expect(byId("close-tagline")).toMatchObject({
      fontFamily: "Playfair Display",
      fontStyle: "normal",
      fontWeight: 700,
    });
    expect(byId("caption-line-0")).toMatchObject({ fontFamily: "Inter", fontWeight: 600 });
  });

  it("records placed Moment and Exhale overrides plus the upright close wordmark", () => {
    expect(elementById(placedExhale, "beat-0-eyebrow")).toMatchObject({
      fontFamily: "JetBrains Mono",
      textTransform: "uppercase",
      fontStyle: "normal",
    });
    expect(elementById(placedExhale, "beat-0-line")).toMatchObject({
      fontFamily: "Playfair Display",
      fontStyle: "italic",
      textTransform: "none",
    });
    expect(elementById(placedExhale, "beat-0-thought-0")).toMatchObject({
      fontFamily: "Inter",
      whiteSpace: "nowrap",
    });
    expect(elementById(placedExhale, "beat-1-phase-label")).toMatchObject({
      fontFamily: "Playfair Display",
      fontStyle: "normal",
      fontWeight: 400,
    });
    expect(elementById(placedExhale, "beat-1-in-label")).toMatchObject({
      fontFamily: "JetBrains Mono",
      whiteSpace: "nowrap",
    });
    expect(elementById(placedExhale, "beat-1-countdown-0")).toMatchObject({
      fontFamily: "JetBrains Mono",
      fontVariantNumeric: "tabular-nums",
    });
    expect(elementById(placedExhale, "beat-1-thought-0")).toMatchObject({
      fontFamily: "Inter",
      whiteSpace: "nowrap",
    });
    expect(elementById(placedExhale, "close-wordmark")).toMatchObject({
      fontFamily: "Playfair Display",
      fontStyle: "normal",
      fontWeight: 500,
    });
  });
});
