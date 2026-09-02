#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceArg = process.argv[2];
const fail = (message) => {
  console.error(`lint: ${message}`);
  process.exit(1);
};

if (!workspaceArg) {
  fail("usage: node bin/lint.mjs <workspace-dir>");
}

const workspaceDir = resolve(repoRoot, workspaceArg);
const renderPath = join(workspaceDir, "render.mp4");
const reportPath = join(workspaceDir, "lint-report.json");

if (!existsSync(renderPath)) {
  fail(`missing render.mp4 at ${renderPath}`);
}

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

if (result.error) {
  fail(`could not start ffprobe: ${result.error.message}`);
}
if (result.status !== 0) {
  fail(`ffprobe failed: ${result.stderr.trim()}`);
}

let probe;
try {
  probe = JSON.parse(result.stdout);
} catch (error) {
  fail(`ffprobe returned invalid JSON: ${error.message}`);
}

const stream = probe.streams?.[0] ?? {};
const violations = [];
if (stream.width !== 1080) {
  violations.push(`width must be 1080; got ${stream.width ?? "missing"}`);
}
if (stream.height !== 1920) {
  violations.push(`height must be 1920; got ${stream.height ?? "missing"}`);
}
if (stream.avg_frame_rate !== "60/1") {
  violations.push(`fps must be exactly 60/1; got ${stream.avg_frame_rate ?? "missing"}`);
}

const duration = Number(stream.duration);
if (!Number.isFinite(duration) || duration < 15 || duration > 35) {
  violations.push(`duration must be between 15 and 35 seconds; got ${stream.duration ?? "missing"}`);
}

const report = {
  ok: violations.length === 0,
  violations,
  stream: {
    width: stream.width ?? null,
    height: stream.height ?? null,
    avgFrameRate: stream.avg_frame_rate ?? null,
    duration: Number.isFinite(duration) ? duration : null,
  },
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

if (!report.ok) {
  process.exit(1);
}
