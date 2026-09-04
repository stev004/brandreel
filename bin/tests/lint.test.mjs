import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import {
  cta,
  durationCheck,
  hook,
  overlap,
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

test("CTA passing fixture has rendered close text for the minimum dwell", () => {
  assert.deepEqual(cta(fixture("lint-cta-pass.json"), closeScript), []);
});

test("CTA failing fixture reports when no close text is rendered", () => {
  const violations = cta(fixture("lint-cta-fail.json"), closeScript);
  assert.equal(violations.length, 1);
  assert.equal(violations[0], "[cta] no rendered CTA text element in the close");
});

test("CTA fails on a short rendered tagline even when close.line is non-empty", () => {
  const violations = cta(fixture("lint-cta-tagline-short.json"), closeScript);
  assert.deepEqual(violations, ["[cta] CTA on screen for 1000ms; minimum 2500ms"]);
});

test("CTA passes when a tagline alone is rendered for at least 2500ms", () => {
  const manifest = fixture("lint-cta-tagline-short.json");
  manifest.elements[0].fromMs = 23500;
  assert.deepEqual(cta(manifest, closeScript), []);
});

test("overlap passes for text boxes that do not intersect", () => {
  assert.deepEqual(overlap({
    elements: [
      { id: "a", text: "A", x: 0, y: 0, w: 100, h: 50, fromMs: 0, toMs: 1000 },
      { id: "b", text: "B", x: 0, y: 60, w: 100, h: 50, fromMs: 0, toMs: 1000 },
    ],
  }), []);
});

test("overlap reports two text boxes intersecting in time and space", () => {
  const violations = overlap({
    elements: [
      { id: "a", text: "A", x: 10, y: 20, w: 100, h: 50, fromMs: 100, toMs: 1000 },
      { id: "b", text: "B", x: 50, y: 40, w: 100, h: 50, fromMs: 500, toMs: 1200 },
    ],
  });
  assert.deepEqual(violations, ["[overlap] a and b intersect at 50,40 during 500-1000ms"]);
});

test("overlap passes when text boxes do not intersect in time", () => {
  assert.deepEqual(overlap({
    elements: [
      { id: "a", text: "A", x: 0, y: 0, w: 100, h: 50, fromMs: 0, toMs: 500 },
      { id: "b", text: "B", x: 0, y: 0, w: 100, h: 50, fromMs: 600, toMs: 1000 },
    ],
  }), []);
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

test("no-render lint writes a report with render rules skipped", () => {
  const workspace = mkdtempSync(join(tmpdir(), "brandreel-no-render-test-"));
  try {
    writeFileSync(join(workspace, "layout.json"), readFileSync(join(fixtures, "layout-pass.json")));
    writeFileSync(join(workspace, "script.json"), JSON.stringify({ close: { line: "A clear close." } }));
    const result = spawnSync(process.execPath, [join(new URL("../lint.mjs", import.meta.url).pathname), workspace, "--no-render"], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(readFileSync(join(workspace, "lint-report.json"), "utf8"));
    assert.equal(report.rules.fps, "skipped");
    assert.equal(report.rules.duration, "skipped");
    assert.equal(report.rules["pixel-bands"], "skipped");
    assert.equal(report.rules.overlap, "pass");
    assert.equal(report.closeDwellMs, 3000);
    assert.equal(report.ctaDwellMs, 3000);
    assert.equal(existsSync(join(workspace, "render.mp4")), false);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
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
