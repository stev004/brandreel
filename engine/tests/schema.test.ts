import { readFileSync } from "node:fs";
import { BrandKit, Script } from "../src/schema";
import { describe, expect, it } from "vitest";

const readJson = (relativePath: string): unknown =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));

describe("M1 JSON contracts", () => {
  it("parses the curated Regulate brand", () => {
    const brand = BrandKit.parse(readJson("../../brands/regulate/brand.json"));
    expect(brand.name).toBe("regulate");
    expect(brand.wordmark.dotColor).toBe("#F2F0E9");
  });

  it("parses the complete demo script", () => {
    const script = Script.parse(readJson("../../workspace/demo/script.json"));
    expect(script.beats).toHaveLength(3);
    expect(script.beats[1].kind).toBe("moment");
  });

  it("rejects a bad hex and a missing font", () => {
    expect(() => BrandKit.parse(readJson("./fixtures/broken-brand.json"))).toThrow();
  });
});
