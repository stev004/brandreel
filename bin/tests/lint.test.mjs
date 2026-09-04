import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  cta,
  durationCheck,
  hook,
  pacing,
  pixelBands,
  safeZones,
  textFit,
} from "../lint-rules.mjs";

const fixtures = join(new URL("./fixtures", import.meta.url).pathname);

function fixture(name) {
  return JSON.parse(readFileSync(join(fixtures, name), "utf8"));
}

const closeScript = { close: { line: "Make room for the next breath." } };

test("safe-zone passing fixture stays inside all edges", () => {
  assert.deepEqual(safeZones(fixture("lint-safe-pass.json")), []);
});

test("safe-zone failing fixture reports the right edge", () => {
  const violations = safeZones(fixture("lint-safe-fail.json"));
  assert.equal(violations.length, 1);
  assert.match(violations[0], /^\[safe-zone\]/);
  assert.match(violations[0], /right edge/);
});

test("text-fit passing fixture fits its line budget", () => {
  assert.deepEqual(textFit(fixture("lint-text-pass.json")), []);
});

test("text-fit failing fixture exceeds its line budget", () => {
  const violations = textFit(fixture("lint-text-fail.json"));
  assert.equal(violations.length, 1);
  assert.match(violations[0], /^\[text-fit\]/);
});

test("hook passing fixture has an early text and visual change", () => {
  assert.deepEqual(hook(fixture("lint-hook-pass.json")), []);
});

test("hook failing fixture reports late text and visual change", () => {
  const violations = hook(fixture("lint-hook-fail.json"));
  assert.equal(violations.length, 2);
  assert.ok(violations.every((violation) => violation.startsWith("[hook]")));
});

test("pacing passing fixture has no interval over three seconds", () => {
  assert.deepEqual(pacing(fixture("lint-pacing-pass.json")), []);
});

test("pacing failing fixture catches a gap over three seconds", () => {
  const violations = pacing(fixture("lint-pacing-fail.json"));
  assert.equal(violations.length, 1);
  assert.match(violations[0], /^\[pacing\]/);
});

test("CTA passing fixture has a close line in the final 20 percent", () => {
  assert.deepEqual(cta(fixture("lint-cta-pass.json"), closeScript), []);
});

test("CTA failing fixture catches a close that starts too early", () => {
  const violations = cta(fixture("lint-cta-fail.json"), closeScript);
  assert.equal(violations.length, 1);
  assert.match(violations[0], /^\[cta\]/);
});

test("duration fixture fails without a valid override", () => {
  const input = fixture("lint-duration-fail.json");
  const result = durationCheck(input.durationSeconds, input.script);
  assert.equal(result.skipped, false);
  assert.equal(result.violations.length, 1);
  assert.match(result.violations[0], /^\[duration\]/);
});

test("duration override fixture skips the duration range", () => {
  const input = fixture("lint-duration-override.json");
  const result = durationCheck(input.durationSeconds, input.script);
  assert.deepEqual(result.violations, []);
  assert.equal(result.skipped, true);
  assert.equal(result.reason, "The story needs a shorter cut.");
});

function frame(width, height, color = [0, 0, 0]) {
  const rgb = new Uint8Array(width * height * 3);
  for (let offset = 0; offset < rgb.length; offset += 3) {
    rgb.set(color, offset);
  }
  return { timeMs: 500, width, height, rgb };
}

const pixelOptions = { safe: { top: 2, bottom: 2, right: 2 } };

test("pixel bands pass for a uniform frame", () => {
  assert.deepEqual(pixelBands([frame(100, 10)], pixelOptions), []);
});

test("pixel bands fail for a three percent contrasting top block", () => {
  const sampled = frame(100, 10);
  for (let pixel = 0; pixel < 6; pixel += 1) {
    sampled.rgb.set([255, 255, 255], pixel * 3);
  }
  const violations = pixelBands([sampled], pixelOptions);
  assert.equal(violations.length, 1);
  assert.match(violations[0], /top band/);
});

test("pixel bands pass when a whole band is a different uniform colour", () => {
  const sampled = frame(100, 10);
  for (let y = 0; y < 2; y += 1) {
    for (let x = 0; x < 100; x += 1) {
      sampled.rgb.set([255, 255, 255], (y * 100 + x) * 3);
    }
  }
  assert.deepEqual(pixelBands([sampled], pixelOptions), []);
});

