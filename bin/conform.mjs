#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import {
  accessSync,
  constants as fsConstants,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { promisify } from "node:util";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const execFile = promisify(execFileCallback);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VIDEO_EXTENSIONS = new Set([
  ".3gp", ".asf", ".avi", ".flv", ".m2ts", ".m4v", ".mkv", ".mov", ".mp4", ".mpeg", ".mpg", ".mts", ".mxf", ".ogv", ".ts", ".vob", ".webm", ".wmv",
]);
const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1920;
const TARGET_FPS = 60;

function isInside(parent, candidate) {
  const rel = relative(parent, candidate);
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`));
}

function workspaceRelative(workspaceDir, filePath) {
  return relative(workspaceDir, filePath).split(sep).join("/");
}

export function discoverVideoFiles(assetsDir) {
  const files = [];
  if (!existsSync(assetsDir)) return files;
  const rootStat = lstatSync(assetsDir);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error("assets must be a real directory, not a symlink");
  }

  function visit(directory, relativeDirectory = "") {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const childRelative = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (relativeDirectory === "" && entry.name === "conformed") continue;
        if (/^(?:\.assets-stage-|\.conform-stage-|\.conform-staging$)/.test(entry.name)) continue;
        visit(join(directory, entry.name), childRelative);
      } else if (entry.isFile() && VIDEO_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        files.push({ path: join(directory, entry.name), relativePath: `assets/${childRelative}` });
      }
    }
  }

  visit(assetsDir);
  return files;
}

export function outputRelativePathForSource(sourceRelativePath) {
  const sourceUnderAssets = sourceRelativePath.replace(/^assets\//, "");
  const extension = extname(sourceUnderAssets);
  const stem = extension ? sourceUnderAssets.slice(0, -extension.length) : sourceUnderAssets;
  const digest = createHash("sha256").update(sourceRelativePath).digest("hex").slice(0, 8);
  return `assets/conformed/${stem}-${digest}.mp4`;
}

export function parseFrameRate(rate) {
  if (typeof rate !== "string") return NaN;
  const [numerator, denominator] = rate.split("/").map(Number);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return NaN;
  return numerator / denominator;
}

export function planInterpolation(frameRate) {
  if (!Number.isFinite(frameRate) || frameRate <= 0) throw new Error("source video has an invalid frame rate");
  if (frameRate >= TARGET_FPS) return { interpolation: "none", multi: 1 };
  return { interpolation: "minterpolate", multi: Math.ceil(TARGET_FPS / frameRate) };
}

async function invoke(command, args, options = {}) {
  const runner = options.commandRunner ?? execFile;
  try {
    return await runner(command, args, {
      cwd: options.cwd,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (error) {
    const detail = String(error.stderr || error.message || "command failed").trim().split(/\r?\n/, 1)[0];
    const cleanDetail = options.workspaceDir
      ? detail.replaceAll(options.workspaceDir, ".")
      : detail;
    throw new Error(cleanDetail.slice(0, 300));
  }
}

async function probeVideo(filePath, options = {}) {
  const { stdout } = await invoke("ffprobe", [
    "-v", "error",
    "-count_frames",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height,sample_aspect_ratio,avg_frame_rate,r_frame_rate,duration,nb_read_frames:format=duration",
    "-of", "json",
    filePath,
  ], options);
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error(`ffprobe returned invalid data for ${filePath}`);
  }
  const stream = parsed?.streams?.[0];
  if (!stream) throw new Error(`no video stream found in ${filePath}`);
  const frameRate = stream.avg_frame_rate && stream.avg_frame_rate !== "0/0"
    ? stream.avg_frame_rate
    : stream.r_frame_rate;
  const durationSeconds = Number(stream.duration || parsed?.format?.duration);
  const fps = parseFrameRate(frameRate);
  if (!(Number(stream.width) > 0) || !(Number(stream.height) > 0) || !(durationSeconds > 0) || !(fps > 0)) {
    throw new Error(`ffprobe found incomplete video metadata for ${filePath}`);
  }
  return {
    width: Number(stream.width),
    height: Number(stream.height),
    sampleAspectRatio: stream.sample_aspect_ratio ?? null,
    frameRate,
    durationSeconds,
    frames: Number.isFinite(Number(stream.nb_read_frames)) ? Number(stream.nb_read_frames) : null,
  };
}

function resolveRifeConfig(env = process.env, overrideDirectory) {
  const rifeDirectory = resolve(overrideDirectory ?? env.BRANDREEL_RIFE_DIR ?? join(repoRoot, "audio", "rife-v4.25"));
  const python = resolve(env.BRANDREEL_RIFE_PYTHON ?? join(repoRoot, "audio", ".venv", "bin", "python"));
  const inference = join(rifeDirectory, "inference_video.py");
  const model = join(rifeDirectory, "train_log", "flownet.pkl");
  try {
    accessSync(python, fsConstants.X_OK);
  } catch {
    return { available: false, reason: "audio/.venv/bin/python is unavailable", python, rifeDirectory, inference, model };
  }
  if (!existsSync(inference) || !existsSync(model)) {
    return { available: false, reason: "the Practical-RIFE v4.25 checkout or train_log/flownet.pkl model is missing", python, rifeDirectory, inference, model };
  }
  return { available: true, python, rifeDirectory, inference, model };
}

async function checkRife(config, options = {}) {
  if (!config.available) return config;
  try {
    await invoke(config.python, [config.inference, "--help"], { ...options, cwd: config.rifeDirectory });
    return config;
  } catch (error) {
    return { ...config, available: false, reason: `RIFE Python dependencies are unavailable (${error.message})` };
  }
}

function fitFilter(fit) {
  if (fit === "pad") {
    return `scale=${TARGET_WIDTH}:${TARGET_HEIGHT}:force_original_aspect_ratio=decrease,pad=${TARGET_WIDTH}:${TARGET_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`;
  }
  return `scale=${TARGET_WIDTH}:${TARGET_HEIGHT}:force_original_aspect_ratio=increase,crop=${TARGET_WIDTH}:${TARGET_HEIGHT},setsar=1`;
}

function frameCountForDuration(durationSeconds) {
  return Math.max(1, Math.round(durationSeconds * TARGET_FPS));
}

async function makeRifeInput(sourcePath, outputPath, options) {
  await invoke("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", sourcePath,
    "-map", "0:v:0",
    "-vf", "setpts=PTS-STARTPTS",
    "-fps_mode", "passthrough",
    "-an",
    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "0", "-pix_fmt", "yuv420p",
    outputPath,
  ], options);
  if (!existsSync(outputPath)) throw new Error("could not prepare normalized RIFE input");
}

async function runRife(config, inputPath, outputPath, multi, options) {
  await invoke(config.python, [
    config.inference,
    `--video=${inputPath}`,
    `--output=${outputPath}`,
    "--model=train_log",
    `--multi=${multi}`,
  ], { ...options, cwd: config.rifeDirectory });
  if (!existsSync(outputPath)) throw new Error("RIFE completed without producing its output video");
}

async function verifyRifeOutput(path, source, expectedFps, options) {
  const output = await probeVideo(path, options);
  const fps = parseFrameRate(output.frameRate);
  const tolerance = Math.max(0.01, expectedFps * 0.001);
  if (Math.abs(fps - expectedFps) > tolerance) {
    throw new Error(`RIFE output rate ${output.frameRate} does not match the planned ${expectedFps.toFixed(3)} fps`);
  }
  if (Math.abs(output.durationSeconds - source.durationSeconds) > 1 / parseFrameRate(source.frameRate) + 1e-6) {
    throw new Error(`RIFE output duration ${output.durationSeconds.toFixed(3)}s changed the source duration`);
  }
  return output;
}

async function encodeConformed(videoInput, sourceInput, outputPath, meta, interpolation, fit, options) {
  const frames = frameCountForDuration(meta.durationSeconds);
  const filters = ["setpts=PTS-STARTPTS", "tpad=stop_mode=clone:stop_duration=1"];
  if (interpolation === "minterpolate") {
    filters.push("minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1");
  }
  filters.push("fps=60:start_time=0", `trim=end_frame=${frames}`, "setpts=PTS-STARTPTS", fitFilter(fit));
  const args = ["-hide_banner", "-loglevel", "error", "-y", "-i", videoInput];
  let sourceAudioIndex = 0;
  if (sourceInput !== videoInput) {
    args.push("-i", sourceInput);
    sourceAudioIndex = 1;
  }
  args.push(
    "-map", "0:v:0",
    "-map", `${sourceAudioIndex}:a?`,
    "-vf", filters.join(","),
    "-af", `asetpts=PTS-STARTPTS,atrim=duration=${meta.durationSeconds}`,
    "-frames:v", String(frames),
    "-r", "60",
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high", "-level:v", "4.2", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k",
    "-t", String(meta.durationSeconds),
    "-movflags", "+faststart",
    outputPath,
  );
  await invoke("ffmpeg", args, options);
  if (!existsSync(outputPath)) throw new Error("ffmpeg did not produce a conformed video");
  return frames;
}

function atomicJson(path, value, stageDirectory) {
  const temporary = join(stageDirectory, `manifest-${randomUUID()}.tmp`);
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  return { temporary, path };
}

function ensureDirectoryTree(workspaceDir, targetDirectory) {
  if (!isInside(workspaceDir, targetDirectory)) throw new Error("output directory escaped the workspace");
  const relativeDirectory = relative(workspaceDir, targetDirectory);
  let current = workspaceDir;
  for (const segment of relativeDirectory.split(sep).filter(Boolean)) {
    current = join(current, segment);
    try {
      const stat = lstatSync(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`output directory is not a real directory: ${workspaceRelative(workspaceDir, current)}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      mkdirSync(current);
    }
  }
}

function assertRegularFileOrMissing(workspaceDir, path) {
  try {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new Error(`output path is not a regular file: ${workspaceRelative(workspaceDir, path)}`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

export async function run(workspaceArg, options = {}) {
  if (!workspaceArg) throw new Error("usage: node bin/conform.mjs <workspace-dir> [--fit crop|pad] [--rife-dir <checkout>]");
  const workspaceDir = resolve(repoRoot, workspaceArg);
  let workspaceStat;
  try {
    workspaceStat = lstatSync(workspaceDir);
  } catch {
    throw new Error(`workspace directory does not exist: ${workspaceArg}`);
  }
  if (workspaceStat.isSymbolicLink() || !workspaceStat.isDirectory()) throw new Error("workspace must be a real directory");
  const fit = options.fit ?? "crop";
  if (!new Set(["crop", "pad"]).has(fit)) throw new Error("--fit must be crop or pad");
  const assetsDir = join(workspaceDir, "assets");
  const sources = discoverVideoFiles(assetsDir);
  if (sources.length === 0) {
    if (!existsSync(assetsDir)) return { manifest: null, sources: [] };
  }
  const outDirectory = join(assetsDir, "conformed");
  ensureDirectoryTree(workspaceDir, outDirectory);
  const stagingDir = mkdtempSync(join(assetsDir, ".conform-stage-"));
  const outputs = [];
  const warnings = [];
  const commandOptions = { commandRunner: options.commandRunner, workspaceDir };
  let rife = null;
  try {
    for (let index = 0; index < sources.length; index += 1) {
      const source = sources[index];
      const input = await probeVideo(source.path, commandOptions).catch((error) => {
        throw new Error(`could not probe ${source.relativePath}: ${error.message}`);
      });
      const rate = parseFrameRate(input.frameRate);
      let interpolationPlan = planInterpolation(rate);
      let interpolation = interpolationPlan.interpolation;
      let videoInput = source.path;
      let rifed = false;
      const stagedOutput = join(stagingDir, `conformed-${index}.mp4`);

      if (interpolation !== "none") {
        if (!rife) {
          rife = await checkRife(resolveRifeConfig(options.env ?? process.env, options.rifeDirectory), commandOptions);
        }
        if (rife.available) {
          const rifeInput = join(stagingDir, `rife-input-${index}.mp4`);
          const rifeOutput = join(stagingDir, `rife-output-${index}.mp4`);
          try {
            await makeRifeInput(source.path, rifeInput, commandOptions);
            await runRife(rife, rifeInput, rifeOutput, interpolationPlan.multi, commandOptions);
            await verifyRifeOutput(rifeOutput, input, rate * interpolationPlan.multi, commandOptions);
            videoInput = rifeOutput;
            interpolation = "rife";
            rifed = true;
          } catch (error) {
            const warning = `Practical-RIFE failed for ${source.relativePath}; using ffmpeg minterpolate (${error.message}).`;
            warnings.push(warning);
            (options.onWarning ?? console.warn)(warning);
            videoInput = source.path;
            interpolation = "minterpolate";
          }
        } else {
          const warning = `Practical-RIFE unavailable for ${source.relativePath}; using ffmpeg minterpolate (${rife.reason}).`;
          warnings.push(warning);
          (options.onWarning ?? console.warn)(warning);
          interpolation = "minterpolate";
        }
      }

      const outputFrames = await encodeConformed(videoInput, source.path, stagedOutput, input, interpolation, fit, commandOptions);
      const outputInfo = await probeVideo(stagedOutput, commandOptions);
      if (outputInfo.width !== TARGET_WIDTH || outputInfo.height !== TARGET_HEIGHT || outputInfo.frameRate !== "60/1" || !["1:1", "1/1"].includes(outputInfo.sampleAspectRatio)) {
        throw new Error(`conformed output failed 1080x1920 square-pixel 60/1 verification: ${source.relativePath}`);
      }
      if (Math.abs(outputInfo.durationSeconds - input.durationSeconds) > 1 / TARGET_FPS + 1e-6) {
        throw new Error(`conformed output duration changed by more than one frame: ${source.relativePath}`);
      }
      if (outputInfo.frames !== null && outputInfo.frames !== outputFrames) {
        throw new Error(`conformed output has ${outputInfo.frames} frames, expected ${outputFrames}: ${source.relativePath}`);
      }
      const outputRelativePath = outputRelativePathForSource(source.relativePath);
      outputs.push({
        stagedPath: stagedOutput,
        finalPath: resolve(workspaceDir, outputRelativePath),
        entry: {
          source: source.relativePath,
          file: outputRelativePath,
          input,
          output: {
            width: outputInfo.width,
            height: outputInfo.height,
            frameRate: "60/1",
            durationSeconds: outputInfo.durationSeconds,
            frames: outputInfo.frames ?? outputFrames,
          },
          interpolation,
          ...(rifed ? { rifeMultiplier: interpolationPlan.multi } : {}),
          fit,
        },
      });
    }

    for (const output of outputs) {
      if (!isInside(workspaceDir, output.finalPath)) throw new Error("conformed output path escaped the workspace");
      ensureDirectoryTree(workspaceDir, dirname(output.finalPath));
      assertRegularFileOrMissing(workspaceDir, output.finalPath);
      renameSync(output.stagedPath, output.finalPath);
    }
    const manifest = { version: 1, assets: outputs.map((output) => output.entry) };
    const manifestPath = join(outDirectory, "manifest.json");
    assertRegularFileOrMissing(workspaceDir, manifestPath);
    const manifestWrite = atomicJson(manifestPath, manifest, stagingDir);
    renameSync(manifestWrite.temporary, manifestWrite.path);
    return { manifest, manifestPath: workspaceRelative(workspaceDir, manifestWrite.path), warnings, sources: outputs.map((output) => output.entry) };
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }
}

async function main() {
  try {
    const positional = [];
    let fit = "crop";
    let rifeDirectory;
    const args = process.argv.slice(2);
    for (let index = 0; index < args.length; index += 1) {
      const arg = args[index];
      if (arg === "--fit" && args[index + 1]) fit = args[++index];
      else if (arg === "--rife-dir" && args[index + 1]) rifeDirectory = args[++index];
      else if (arg.startsWith("--")) throw new Error(`unknown option ${arg}`);
      else positional.push(arg);
    }
    if (positional.length !== 1) throw new Error("usage: node bin/conform.mjs <workspace-dir> [--fit crop|pad] [--rife-dir <checkout>]");
    const result = await run(positional[0], { fit, rifeDirectory });
    if (!result.manifest) console.log("conform: no assets directory or video clips to convert");
    else console.log(`wrote ${result.manifestPath} (${result.sources.length} clip${result.sources.length === 1 ? "" : "s"})`);
  } catch (error) {
    console.error(`conform: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
