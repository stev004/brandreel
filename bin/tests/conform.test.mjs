import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { execFile as execFileCallback, spawnSync } from "node:child_process";
import { promisify } from "node:util";

import {
  discoverVideoFiles,
  outputRelativePathForSource,
  parseFrameRate,
  planInterpolation,
  run,
} from "../conform.mjs";

const execFile = promisify(execFileCallback);

function makeWorkspace() {
  return mkdtempSync(join(tmpdir(), "brandreel-conform-test-"));
}

function forceRifeUnavailable(workspace) {
  return {
    BRANDREEL_RIFE_DIR: join(workspace, "missing-rife"),
    BRANDREEL_RIFE_PYTHON: join(workspace, "missing-python"),
  };
}

function generateClip(workspace, { fps = 30, duration = 2, filename = "nested/sample.mp4", audio = false, frameCount } = {}) {
  const assetsDir = join(workspace, "assets");
  const input = join(assetsDir, filename);
  mkdirSync(dirname(input), { recursive: true });
  const args = [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", `color=c=0x336699:s=160x284:r=${fps}:d=${duration}`,
  ];
  if (audio) args.push("-f", "lavfi", "-i", `sine=frequency=440:sample_rate=48000:duration=${duration}`);
  args.push("-map", "0:v:0");
  if (audio) args.push("-map", "1:a:0", "-shortest");
  else args.push("-an");
  if (frameCount !== undefined) args.push("-frames:v", String(frameCount));
  args.push("-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", input);
  const result = spawnSync("ffmpeg", args, { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return { input, relativePath: `assets/${filename}` };
}

async function probe(path) {
  const { stdout } = await execFile("ffprobe", [
    "-v", "error", "-count_frames", "-select_streams", "v:0",
    "-show_entries", "stream=width,height,sample_aspect_ratio,avg_frame_rate,nb_read_frames:format=duration",
    "-of", "json", path,
  ]);
  const data = JSON.parse(stdout);
  return { ...data.streams[0], formatDuration: Number(data.format.duration) };
}

async function probeAudio(path) {
  const { stdout } = await execFile("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_name", "-of", "json", path]);
  return JSON.parse(stdout).streams[0];
}

test("interpolation planning uses a ceiling multiplier and bypasses sources at 60 fps or above", () => {
  assert.deepEqual(planInterpolation(30), { interpolation: "minterpolate", multi: 2 });
  assert.deepEqual(planInterpolation(29.97), { interpolation: "minterpolate", multi: 3 });
  assert.deepEqual(planInterpolation(59.94), { interpolation: "minterpolate", multi: 2 });
  assert.deepEqual(planInterpolation(60), { interpolation: "none", multi: 1 });
  assert.deepEqual(planInterpolation(120), { interpolation: "none", multi: 1 });
  assert.equal(parseFrameRate("30000/1001"), 30000 / 1001);
});

test("discovery skips generated output and staging trees and never follows symlinks", () => {
  const workspace = makeWorkspace();
  try {
    const assets = join(workspace, "assets");
    mkdirSync(join(assets, "conformed"), { recursive: true });
    mkdirSync(join(assets, ".conform-stage-old"), { recursive: true });
    mkdirSync(join(assets, "nested"), { recursive: true });
    writeFileSync(join(assets, "root.mp4"), "input");
    writeFileSync(join(assets, "conformed", "already.mp4"), "generated");
    writeFileSync(join(assets, ".conform-stage-old", "partial.mp4"), "staged");
    writeFileSync(join(assets, "nested", "clip.mov"), "input");
    const outside = join(workspace, "outside");
    mkdirSync(outside);
    writeFileSync(join(outside, "escape.mp4"), "outside");
    symlinkSync(outside, join(assets, "linked"));
    assert.deepEqual(discoverVideoFiles(assets).map((item) => item.relativePath), [
      "assets/nested/clip.mov",
      "assets/root.mp4",
    ]);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("conforms a generated two-second 30 fps clip to 120 frames at 1080x1920 and writes the source map", async () => {
  const workspace = makeWorkspace();
  try {
    const source = generateClip(workspace, { audio: true });
    const warnings = [];
    const result = await run(workspace, { env: forceRifeUnavailable(workspace), onWarning: (warning) => warnings.push(warning) });
    assert.equal(result.manifest.version, 1);
    assert.equal(result.manifest.assets.length, 1);
    const asset = result.manifest.assets[0];
    assert.equal(asset.source, source.relativePath);
    assert.equal(asset.interpolation, "minterpolate");
    assert.equal(asset.fit, "crop");
    assert.equal(asset.output.frameRate, "60/1");
    assert.equal(asset.output.frames, 120);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /Practical-RIFE unavailable.*ffmpeg minterpolate/);
    const output = join(workspace, asset.file);
    const facts = await probe(output);
    assert.equal(Number(facts.width), 1080);
    assert.equal(Number(facts.height), 1920);
    assert.equal(facts.sample_aspect_ratio, "1:1");
    assert.equal(facts.avg_frame_rate, "60/1");
    assert.equal(Number(facts.nb_read_frames), 120);
    assert.ok(Math.abs(facts.formatDuration - 2) <= 1 / 60);
    assert.equal((await probeAudio(output)).codec_name, "aac");
    const manifest = JSON.parse(readFileSync(join(workspace, "assets/conformed/manifest.json"), "utf8"));
    assert.deepEqual(manifest, result.manifest);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("a single-frame low-rate source is padded before interpolation and still gets the target frame count", async () => {
  const workspace = makeWorkspace();
  try {
    generateClip(workspace, { duration: 1, frameCount: 1, filename: "single.mp4" });
    const result = await run(workspace, { env: forceRifeUnavailable(workspace), onWarning: () => {} });
    const asset = result.manifest.assets[0];
    assert.equal(asset.interpolation, "minterpolate");
    assert.equal(asset.output.frames, 2);
    const output = await probe(join(workspace, asset.file));
    assert.equal(Number(output.nb_read_frames), 2);
    assert.equal(output.avg_frame_rate, "60/1");
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("60 fps input is converted without frame interpolation", async () => {
  const workspace = makeWorkspace();
  try {
    generateClip(workspace, { fps: 60, duration: 1, filename: "input.mp4" });
    const result = await run(workspace, { onWarning: () => assert.fail("RIFE warning is not expected at 60 fps") });
    assert.equal(result.manifest.assets[0].interpolation, "none");
    assert.equal(result.manifest.assets[0].output.frames, 60);
    assert.equal(result.warnings.length, 0);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("unusable RIFE Python dependencies fall back to minterpolate with an explicit warning", async () => {
  const workspace = makeWorkspace();
  try {
    generateClip(workspace, { duration: 1, filename: "input.mp4" });
    const rifeDirectory = join(workspace, "fake-rife");
    mkdirSync(join(rifeDirectory, "train_log"), { recursive: true });
    writeFileSync(join(rifeDirectory, "inference_video.py"), "# test stub\n");
    writeFileSync(join(rifeDirectory, "train_log", "flownet.pkl"), "stub");
    const python = join(workspace, "python");
    writeFileSync(python, "#!/bin/sh\nexit 1\n");
    chmodSync(python, 0o755);
    const calls = [];
    const warnings = [];
    const commandRunner = async (command, args, options) => {
      calls.push({ command, args });
      if (command === python) throw new Error("No module named torch");
      return execFile(command, args, options);
    };
    const result = await run(workspace, {
      env: { BRANDREEL_RIFE_DIR: rifeDirectory, BRANDREEL_RIFE_PYTHON: python },
      commandRunner,
      onWarning: (warning) => warnings.push(warning),
    });
    assert.equal(result.manifest.assets[0].interpolation, "minterpolate");
    assert.equal(result.warnings.length, 1);
    assert.match(warnings[0], /ffmpeg minterpolate \(RIFE Python dependencies are unavailable/);
    assert.equal(calls.filter((call) => call.command === python).length, 1);
    assert.deepEqual(calls.find((call) => call.command === python).args.slice(1), ["--help"]);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("RIFE output with the wrong intermediate rate falls back instead of masking the speed change", async () => {
  const workspace = makeWorkspace();
  try {
    generateClip(workspace, { duration: 1, filename: "input.mp4" });
    const rifeDirectory = join(workspace, "fake-rife");
    mkdirSync(join(rifeDirectory, "train_log"), { recursive: true });
    writeFileSync(join(rifeDirectory, "inference_video.py"), "# test stub\n");
    writeFileSync(join(rifeDirectory, "train_log", "flownet.pkl"), "stub");
    const python = join(workspace, "python");
    writeFileSync(python, "#!/bin/sh\nexit 0\n");
    chmodSync(python, 0o755);
    const warnings = [];
    const commandRunner = async (command, args, options) => {
      if (command === python && args.includes("--help")) return { stdout: "help", stderr: "" };
      if (command === python && args.some((arg) => arg.startsWith("--output="))) {
        const inputPath = args.find((arg) => arg.startsWith("--video=")).slice("--video=".length);
        const outputPath = args.find((arg) => arg.startsWith("--output=")).slice("--output=".length);
        copyFileSync(inputPath, outputPath);
        return { stdout: "", stderr: "" };
      }
      return execFile(command, args, options);
    };
    const result = await run(workspace, {
      env: { BRANDREEL_RIFE_DIR: rifeDirectory, BRANDREEL_RIFE_PYTHON: python },
      commandRunner,
      onWarning: (warning) => warnings.push(warning),
    });
    assert.equal(result.manifest.assets[0].interpolation, "minterpolate");
    assert.match(warnings[0], /Practical-RIFE failed.*rate 30\/1 does not match the planned 60\.000 fps/);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("bad input leaves any previous output and manifest untouched and removes staging files", async () => {
  const workspace = makeWorkspace();
  try {
    const sourceRelativePath = "assets/bad.mp4";
    const sourcePath = join(workspace, sourceRelativePath);
    const assetsDir = join(workspace, "assets");
    const outputPath = join(workspace, outputRelativePathForSource(sourceRelativePath));
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(sourcePath, "not a video");
    writeFileSync(outputPath, "previous good output");
    const manifestPath = join(assetsDir, "conformed", "manifest.json");
    writeFileSync(manifestPath, '{"version":1,"assets":["previous"]}\n');
    await assert.rejects(run(workspace), /could not probe assets\/bad\.mp4/);
    assert.equal(readFileSync(outputPath, "utf8"), "previous good output");
    assert.equal(readFileSync(manifestPath, "utf8"), '{"version":1,"assets":["previous"]}\n');
    assert.deepEqual(readdirSync(assetsDir).filter((name) => name.startsWith(".conform-stage-")), []);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("a symlinked output directory cannot redirect conformed files outside the workspace", async () => {
  const workspace = makeWorkspace();
  try {
    const assetsDir = join(workspace, "assets");
    const sourcePath = join(assetsDir, "nested/input.mp4");
    const outside = join(workspace, "outside");
    mkdirSync(dirname(sourcePath), { recursive: true });
    mkdirSync(join(assetsDir, "conformed"), { recursive: true });
    mkdirSync(outside);
    writeFileSync(sourcePath, "probe stub");
    symlinkSync(outside, join(assetsDir, "conformed/nested"));
    const commandRunner = async (command, args) => {
      if (command === "ffprobe") {
        const isOutput = args.at(-1).includes(".conform-stage-");
        const stream = isOutput
          ? { width: 1080, height: 1920, sample_aspect_ratio: "1:1", avg_frame_rate: "60/1", r_frame_rate: "60/1", duration: "1.000000", nb_read_frames: "60" }
          : { width: 160, height: 284, sample_aspect_ratio: "1:1", avg_frame_rate: "30/1", r_frame_rate: "30/1", duration: "1.000000", nb_read_frames: "30" };
        return { stdout: JSON.stringify({ streams: [stream], format: { duration: "1.000000" } }), stderr: "" };
      }
      if (command === "ffmpeg") {
        writeFileSync(args.at(-1), "encoded stub");
        return { stdout: "", stderr: "" };
      }
      throw new Error(`unexpected command ${command}`);
    };
    await assert.rejects(run(workspace, {
      env: { BRANDREEL_RIFE_DIR: join(workspace, "missing-rife"), BRANDREEL_RIFE_PYTHON: join(workspace, "missing-python") },
      commandRunner,
      onWarning: () => {},
    }), /output directory is not a real directory: assets\/conformed\/nested/);
    assert.deepEqual(readdirSync(outside), []);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
