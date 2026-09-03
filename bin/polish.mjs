#!/usr/bin/env node
import { existsSync, mkdirSync, rmSync, renameSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const TARGET_I = -14;
const TARGET_TP = -1;
const TARGET_LRA = 11;
const STDERR_TAIL_LENGTH = 4000;

function usage() {
  console.error("usage: node bin/polish.mjs <workspace-dir> [--music <file>] [--music-db <gain>] [--no-vo]");
}

function fail(message) {
  console.error(`polish: ${message}`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  let workspaceArg = null;
  let musicArg = null;
  let musicDb = -6;
  let noVo = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (index === 0 && !arg.startsWith("-")) {
      workspaceArg = arg;
      continue;
    }
    if (arg === "--music" || arg === "--music-db") {
      const value = argv[index + 1];
      if (value === undefined) {
        throw new Error(`${arg} requires a value`);
      }
      index += 1;
      if (arg === "--music") {
        musicArg = value;
      } else {
        musicDb = Number(value);
        if (!Number.isFinite(musicDb)) {
          throw new Error("--music-db must be a finite number of decibels");
        }
      }
      continue;
    }
    if (arg === "--no-vo") {
      noVo = true;
      continue;
    }
    if (arg.startsWith("--music=")) {
      musicArg = arg.slice("--music=".length);
      if (!musicArg) throw new Error("--music requires a value");
      continue;
    }
    if (arg.startsWith("--music-db=")) {
      musicDb = Number(arg.slice("--music-db=".length));
      if (!Number.isFinite(musicDb)) {
        throw new Error("--music-db must be a finite number of decibels");
      }
      continue;
    }
    throw new Error(`unknown argument ${arg}`);
  }

  if (!workspaceArg) throw new Error("missing workspace directory");
  return { workspaceDir: resolve(process.cwd(), workspaceArg), musicArg, musicDb, noVo };
}

function tail(text) {
  const value = String(text ?? "").trim();
  if (value.length <= STDERR_TAIL_LENGTH) return value;
  return value.slice(-STDERR_TAIL_LENGTH);
}

function runFfmpeg(args, passName) {
  const result = spawnSync("ffmpeg", args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(`could not start ffmpeg for ${passName}: ${result.error.message}`);
  }
  const log = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status !== 0) {
    throw new Error(`ffmpeg ${passName} failed. stderr tail:\n${tail(result.stderr)}`);
  }
  return log;
}

function parseLoudnormResult(log, passName) {
  const starts = [...String(log).matchAll(/\{\s*"input_i"\s*:/g)];
  for (let index = starts.length - 1; index >= 0; index -= 1) {
    const start = starts[index].index;
    const end = String(log).indexOf("}", start);
    if (start === -1 || end === -1) continue;
    try {
      const parsed = JSON.parse(String(log).slice(start, end + 1));
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // Try an earlier loudnorm object if another log line interrupted this one.
    }
  }
  throw new Error(`ffmpeg ${passName} did not report loudnorm JSON`);
}

function measuredNumber(measurements, key) {
  const value = Number(measurements[key]);
  if (!Number.isFinite(value)) {
    throw new Error(`loudnorm pass 1 returned no finite ${key}`);
  }
  return value;
}

function mixGraph({ voIndex, musicIndex, musicDb }) {
  const parts = [];
  if (voIndex !== null && musicIndex !== null) {
    parts.push(`[${voIndex}:a]aresample=48000[vo]`);
    parts.push(`[${musicIndex}:a]volume=${musicDb}dB,aresample=48000[music]`);
    parts.push("[music][vo]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[ducked]");
    parts.push("[vo][ducked]amix=inputs=2:duration=longest:dropout_transition=0,aresample=48000[mix]");
  } else if (voIndex !== null) {
    parts.push(`[${voIndex}:a]aresample=48000[mix]`);
  } else if (musicIndex !== null) {
    parts.push(`[${musicIndex}:a]volume=${musicDb}dB,aresample=48000[mix]`);
  } else {
    throw new Error("nothing to mix");
  }
  return parts.join(";");
}

function inputArgs(renderPath, voPath, musicPath) {
  const args = ["-hide_banner", "-nostdin", "-y", "-i", renderPath];
  if (voPath !== null) args.push("-i", voPath);
  if (musicPath !== null) args.push("-i", musicPath);
  return args;
}

function loudnormFilter(measurements = null) {
  const values = [
    `I=${TARGET_I}`,
    `TP=${TARGET_TP}`,
    `LRA=${TARGET_LRA}`,
  ];
  if (measurements) {
    values.push(`measured_I=${measuredNumber(measurements, "input_i")}`);
    values.push(`measured_TP=${measuredNumber(measurements, "input_tp")}`);
    values.push(`measured_LRA=${measuredNumber(measurements, "input_lra")}`);
    values.push(`measured_thresh=${measuredNumber(measurements, "input_thresh")}`);
    values.push(`offset=${measuredNumber(measurements, "target_offset")}`);
    values.push("linear=false");
  }
  values.push("print_format=json");
  return `loudnorm=${values.join(":")}`;
}

function passArgs({ renderPath, voPath, musicPath, musicDb, measurements, outputPath }) {
  const voIndex = voPath === null ? null : 1;
  const musicIndex = musicPath === null ? null : voPath === null ? 1 : 2;
  const graph = `${mixGraph({ voIndex, musicIndex, musicDb })};[mix]${loudnormFilter(measurements)}[normalized]`;
  const args = [
    ...inputArgs(renderPath, voPath, musicPath),
    "-filter_complex",
    graph,
    "-map",
    "0:v:0",
    "-map",
    "[normalized]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "256k",
    "-ar",
    "48000",
    "-shortest",
  ];
  if (outputPath === null) {
    args.push("-f", "null", "-");
  } else {
    args.push("-movflags", "+faststart", outputPath);
  }
  return args;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    usage();
    fail(error.message);
    return;
  }

  const { workspaceDir, musicArg, musicDb, noVo } = options;
  const renderPath = join(workspaceDir, "render.mp4");
  const voPath = join(workspaceDir, "vo.wav");
  const outputDir = join(workspaceDir, "final");
  const outputPath = join(outputDir, "social.mp4");
  const tempOutputPath = join(outputDir, `social-tmp-${process.pid}.mp4`);

  if (!existsSync(renderPath)) {
    fail(`missing render.mp4 at ${renderPath}`);
    return;
  }
  const selectedVoPath = noVo || !existsSync(voPath) ? null : voPath;
  let selectedMusicPath = null;
  if (musicArg !== null) {
    selectedMusicPath = resolve(process.cwd(), musicArg);
    if (!existsSync(selectedMusicPath)) {
      fail(`missing music file at ${selectedMusicPath}`);
      return;
    }
  }
  if (selectedVoPath === null && selectedMusicPath === null) {
    fail("nothing to mix");
    return;
  }

  mkdirSync(outputDir, { recursive: true });
  try {
    const firstPassLog = runFfmpeg(
      passArgs({
        renderPath,
        voPath: selectedVoPath,
        musicPath: selectedMusicPath,
        musicDb,
        measurements: null,
        outputPath: null,
      }),
      "pass 1",
    );
    const inputMeasurements = parseLoudnormResult(firstPassLog, "pass 1");
    const secondPassLog = runFfmpeg(
      passArgs({
        renderPath,
        voPath: selectedVoPath,
        musicPath: selectedMusicPath,
        musicDb,
        measurements: inputMeasurements,
        outputPath: tempOutputPath,
      }),
      "pass 2",
    );
    let outputMeasurements = null;
    try {
      outputMeasurements = parseLoudnormResult(secondPassLog, "pass 2");
    } catch {
      console.error("polish: pass 2 completed without parseable loudnorm JSON; recording output as null");
    }
    renameSync(tempOutputPath, outputPath);
    const report = {
      input: inputMeasurements,
      target: { I: TARGET_I, TP: TARGET_TP },
      output: outputMeasurements,
    };
    writeFileSync(join(workspaceDir, "audio-report.json"), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`wrote ${outputPath}`);
    console.log(`wrote ${join(workspaceDir, "audio-report.json")}`);
  } catch (error) {
    rmSync(tempOutputPath, { force: true });
    fail(error.message);
  }
}

main();
