#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  cta,
  ctaDwellMs,
  durationCheck,
  hook,
  overlap,
  pacing,
  pixelBands,
  safeZones,
  textFit,
} from "./lint-rules.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const noPixels = args.includes("--no-pixels");
const noRender = args.includes("--no-render");
const workspaceArg = args.find((arg) => !arg.startsWith("--"));
const fail = (message) => {
  console.error(`lint: ${message}`);
  process.exit(1);
};

if (!workspaceArg) {
  fail("usage: node bin/lint.mjs <workspace-dir> [--no-render] [--no-pixels]");
}

const workspaceDir = resolve(repoRoot, workspaceArg);
const renderPath = join(workspaceDir, "render.mp4");
const layoutPath = join(workspaceDir, "layout.json");
const scriptPath = join(workspaceDir, "script.json");
const reportPath = join(workspaceDir, "lint-report.json");

if (!noRender && !existsSync(renderPath)) {
  fail(`missing render.mp4 at ${renderPath}`);
}

function readJson(path) {
  try {
    return { value: JSON.parse(readFileSync(path, "utf8")), error: null };
  } catch (error) {
    return { value: null, error };
  }
}

function probeRender() {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,avg_frame_rate,duration",
      "-of",
      "json",
      renderPath,
    ],
    { encoding: "utf8" },
  );

  if (result.error) fail(`could not start ffprobe: ${result.error.message}`);
  if (result.status !== 0) fail(`ffprobe failed: ${result.stderr.trim()}`);
  try {
    return JSON.parse(result.stdout).streams?.[0] ?? {};
  } catch (error) {
    fail(`ffprobe returned invalid JSON: ${error.message}`);
  }
}

function sampleFrames(width, height, durationSeconds) {
  const frames = [];
  if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(durationSeconds) || width <= 0 || height <= 0 || durationSeconds < 0) {
    return { frames, error: "[pixel-bands] render stream dimensions or duration are invalid" };
  }
  const frameBytes = width * height * 3;
  const durationMs = durationSeconds * 1000;

  for (let timeMs = 0; timeMs < durationMs; timeMs += 500) {
    const result = spawnSync(
      "ffmpeg",
      [
        "-v",
        "error",
        "-ss",
        String(timeMs / 1000),
        "-i",
        renderPath,
        "-frames:v",
        "1",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "pipe:1",
      ],
      { encoding: "buffer", maxBuffer: frameBytes + 1024 * 1024 },
    );

    const output = result.stdout ?? Buffer.alloc(0);
    if (result.status !== 0 || result.error || output.length < frameBytes) {
      return {
        frames,
        error: `[pixel-bands] ffmpeg could not sample frame at ${timeMs}ms`,
      };
    }
    frames.push({ timeMs, width, height, rgb: new Uint8Array(output.subarray(0, frameBytes)) });
  }

  return { frames, error: null };
}

const stream = noRender ? {} : probeRender();
const violations = [];
const rules = {
  width: noRender ? "skipped" : "pass",
  height: noRender ? "skipped" : "pass",
  fps: noRender ? "skipped" : "pass",
  duration: noRender ? "skipped" : "pass",
  "safe-zone": "skipped",
  "text-fit": "skipped",
  hook: "skipped",
  pacing: "skipped",
  cta: "skipped",
  overlap: "skipped",
  "pixel-bands": noRender || noPixels ? "skipped" : "pass",
};

if (!noRender && stream.width !== 1080) {
  violations.push(`width must be 1080; got ${stream.width ?? "missing"}`);
  rules.width = "fail";
}
if (!noRender && stream.height !== 1920) {
  violations.push(`height must be 1920; got ${stream.height ?? "missing"}`);
  rules.height = "fail";
}
if (!noRender && stream.avg_frame_rate !== "60/1") {
  violations.push(`fps must be exactly 60/1; got ${stream.avg_frame_rate ?? "missing"}`);
  rules.fps = "fail";
}

const durationSeconds = Number(stream.duration);
const scriptResult = existsSync(scriptPath) ? readJson(scriptPath) : { value: {}, error: null };
if (scriptResult.error) {
  violations.push(`[script] invalid script.json: ${scriptResult.error.message}`);
}
const script = scriptResult.value ?? {};
const durationResult = noRender
  ? { violations: [], skipped: true, reason: null }
  : durationCheck(durationSeconds, script);
violations.push(...durationResult.violations);
if (durationResult.skipped) {
  rules.duration = "skipped";
} else if (durationResult.violations.length > 0) {
  rules.duration = "fail";
}

let layout = null;
if (existsSync(layoutPath)) {
  const layoutResult = readJson(layoutPath);
  if (layoutResult.error) {
    violations.push(`[layout] invalid layout.json: ${layoutResult.error.message}`);
    for (const name of ["safe-zone", "text-fit", "hook", "pacing", "cta", "overlap"]) rules[name] = "fail";
  } else {
    layout = layoutResult.value;
    const manifestRules = [
      ["safe-zone", safeZones(layout)],
      ["text-fit", textFit(layout)],
      ["hook", hook(layout)],
      ["pacing", pacing(layout)],
      ["cta", cta(layout, script)],
      ["overlap", overlap(layout)],
    ];
    for (const [name, ruleViolations] of manifestRules) {
      violations.push(...ruleViolations);
      rules[name] = ruleViolations.length === 0 ? "pass" : "fail";
    }
  }
} else {
  violations.push("layout.json missing");
}

let samples = 0;
if (!noRender && !noPixels) {
  const sampled = sampleFrames(
    Number(stream.width),
    Number(stream.height),
    Number.isFinite(durationSeconds) ? durationSeconds : 0,
  );
  samples = sampled.frames.length;
  if (sampled.error) {
    violations.push(sampled.error);
    rules["pixel-bands"] = "fail";
  } else {
    const pixelViolations = pixelBands(sampled.frames, { safe: layout?.safe });
    violations.push(...pixelViolations);
    rules["pixel-bands"] = pixelViolations.length === 0 ? "pass" : "fail";
  }
}

const report = {
  ok: violations.length === 0,
  violations,
  stream: {
    width: stream.width ?? null,
    height: stream.height ?? null,
    avgFrameRate: stream.avg_frame_rate ?? null,
    duration: Number.isFinite(durationSeconds) ? durationSeconds : null,
  },
  rules,
  samples,
  closeDwellMs: layout && Number.isFinite(layout.totalDurationMs) && Number.isFinite(layout.closeStartMs)
    ? layout.totalDurationMs - layout.closeStartMs
    : null,
  ctaDwellMs: layout ? ctaDwellMs(layout) : null,
  durationOverrideReason: durationResult.reason,
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

if (!report.ok) process.exit(1);
