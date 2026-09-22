import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { pixelBandCheck, safeZones, textFit } from "../lint-rules.mjs";

function frame(timeMs, { contrast = false } = {}) {
  const width = 100;
  const height = 10;
  const rgb = new Uint8Array(width * height * 3);
  if (contrast) {
    for (let pixel = 0; pixel < 6; pixel += 1) rgb.set([255, 255, 255], pixel * 3);
  }
  return { timeMs, width, height, rgb };
}

const pixelOptions = { safe: { top: 2, bottom: 2, right: 2 } };
const lintCli = fileURLToPath(new URL("../lint.mjs", import.meta.url));

test("footage intervals exclude only coincident sampled frames with half-open bounds", () => {
  const result = pixelBandCheck([
    frame(499),
    frame(500, { contrast: true }),
    frame(999, { contrast: true }),
    frame(1000, { contrast: true }),
  ], {
    ...pixelOptions,
    durationMs: 1500,
    layout: { footageIntervals: [{ fromMs: 500, toMs: 1000 }] },
  });

  assert.equal(result.sampledFrames, 4);
  assert.equal(result.excludedFootageFrames, 2);
  assert.equal(result.checkedFrames, 2);
  assert.equal(result.status, "fail");
  assert.deepEqual(result.violations, ["[pixel-bands] top band at 1000ms has 3.00% divergent pixels"]);
  assert.match(result.exclusionReason, /half-open footage intervals/);
});

test("invalid, overlapping, or out-of-duration footage ranges fail closed without exclusions", () => {
  const invalidRanges = [
    [{ fromMs: -1, toMs: 200 }],
    [{ fromMs: 200, toMs: 200 }],
    [{ fromMs: 200, toMs: 1200 }],
    [{ fromMs: 600, toMs: 900 }, { fromMs: 500, toMs: 800 }],
    [{ fromMs: Number.NaN, toMs: 800 }],
    null,
  ];

  for (const footageIntervals of invalidRanges) {
    const frames = [frame(500), frame(750)];
    const result = pixelBandCheck(frames, {
      ...pixelOptions,
      durationMs: 1000,
      layout: { footageIntervals },
    });
    assert.equal(result.status, "fail");
    assert.equal(result.excludedFootageFrames, 0);
    assert.equal(result.checkedFrames, frames.length);
    assert.ok(result.violations.some((violation) => violation.startsWith("[pixel-bands] invalid layout.footageIntervals:")));
    assert.equal(result.exclusionReason, "No frames excluded because footage interval metadata is invalid.");
  }
});

test("all sampled footage frames skip only pixel bands and keep the exclusion visible", () => {
  const layout = {
    width: 100,
    height: 100,
    safe: { top: 10, bottom: 10, left: 10, right: 10 },
    footageIntervals: [{ fromMs: 0, toMs: 1000 }],
    elements: [{
      id: "unsafe-caption",
      text: "Too wide",
      x: 0,
      y: 0,
      w: 200,
      h: 60,
      maxLines: 1,
      estimatedLines: 2,
    }],
  };
  const result = pixelBandCheck([frame(0, { contrast: true }), frame(999, { contrast: true })], {
    ...pixelOptions,
    durationMs: 1000,
    layout,
  });

  assert.equal(result.status, "skipped");
  assert.equal(result.sampledFrames, 2);
  assert.equal(result.checkedFrames, 0);
  assert.equal(result.excludedFootageFrames, 2);
  assert.match(result.exclusionReason, /full-bleed video can vary/);
  assert.ok(safeZones(layout).some((violation) => violation.startsWith("[safe-zone]")));
  assert.ok(textFit(layout).some((violation) => violation.startsWith("[text-fit]")));
});

test("empty and absent footage interval metadata preserve legacy pixel checking", () => {
  const contrasting = frame(500, { contrast: true });
  const legacy = pixelBandCheck([contrasting], pixelOptions);
  const empty = pixelBandCheck([contrasting], {
    ...pixelOptions,
    durationMs: 1000,
    layout: { footageIntervals: [] },
  });

  assert.equal(legacy.status, "fail");
  assert.equal(legacy.excludedFootageFrames, 0);
  assert.equal(legacy.exclusionReason, null);
  assert.equal(empty.status, "fail");
  assert.equal(empty.checkedFrames, 1);
  assert.equal(empty.exclusionReason, null);
});

test("CLI reports footage pixel exclusions while safe-zone and text-fit violations still fail", () => {
  const workspace = mkdtempSync(join(tmpdir(), "brandreel-footage-lint-test-"));
  try {
    const generated = spawnSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", "color=c=black:s=1080x1920:r=60:d=3",
      "-an", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
      join(workspace, "render.mp4"),
    ], { encoding: "utf8" });
    assert.equal(generated.status, 0, generated.stderr);

    writeFileSync(join(workspace, "layout.json"), JSON.stringify({
      width: 1080,
      height: 1920,
      fps: 60,
      totalDurationMs: 3000,
      firstOnScreenTextMs: 0,
      visualChangeMs: [0, 1000, 2000, 3000],
      closeStartMs: 0,
      safe: { top: 150, bottom: 320, left: 60, right: 120 },
      footageIntervals: [{ fromMs: 0, toMs: 3000 }],
      elements: [{
        id: "close-line",
        role: "display",
        text: "A clear close.",
        x: 0,
        y: 0,
        w: 1100,
        h: 120,
        maxLines: 1,
        estimatedLines: 2,
        fromMs: 0,
        toMs: 3000,
      }],
    }));
    writeFileSync(join(workspace, "script.json"), JSON.stringify({
      close: { line: "A clear close." },
      durationOverride: { reason: "Short generated CLI fixture." },
    }));

    const result = spawnSync(process.execPath, [lintCli, workspace], { encoding: "utf8" });
    assert.equal(result.status, 1, result.stderr);
    const report = JSON.parse(readFileSync(join(workspace, "lint-report.json"), "utf8"));
    assert.equal(report.rules["pixel-bands"], "skipped");
    assert.equal(report.pixelBandCoverage.sampledFrames, 6);
    assert.equal(report.pixelBandCoverage.checkedFrames, 0);
    assert.equal(report.pixelBandCoverage.excludedFootageFrames, 6);
    assert.match(report.pixelBandCoverage.exclusionReason, /full-bleed video can vary/);
    assert.equal(report.rules["safe-zone"], "fail");
    assert.equal(report.rules["text-fit"], "fail");
    assert.ok(report.violations.some((violation) => violation.startsWith("[safe-zone]")));
    assert.ok(report.violations.some((violation) => violation.startsWith("[text-fit]")));
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
