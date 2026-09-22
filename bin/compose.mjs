#!/usr/bin/env node
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const engineDir = join(repoRoot, "engine");
const VIDEO_SIZE = { width: 1080, height: 1920 };
const VIDEO_FPS = 60;

function readJson(path, label = path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`could not read or parse ${label}: ${error.message}`);
  }
}

function isInside(parent, candidate) {
  const rel = relative(parent, candidate);
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`));
}

function workspacePath(value, description) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\") ||
    value.startsWith("/") || /^[A-Za-z]:/.test(value)) {
    throw new Error(`${description} must be a workspace-relative POSIX path`);
  }
  const parts = value.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new Error(`${description} must not contain empty, dot, or traversal path segments`);
  }
  return parts;
}

function regularWorkspaceFile(workspaceDir, relativePath, description) {
  const parts = workspacePath(relativePath, description);
  let current = workspaceDir;
  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    let stat;
    try {
      stat = lstatSync(current);
    } catch (error) {
      if (error.code === "ENOENT") throw new Error(`${description} does not exist: ${relativePath}`);
      throw error;
    }
    if (stat.isSymbolicLink()) throw new Error(`${description} contains a symlink: ${relativePath}`);
    if (index < parts.length - 1 && !stat.isDirectory()) {
      throw new Error(`${description} has a non-directory path component: ${relativePath}`);
    }
    if (index === parts.length - 1 && !stat.isFile()) {
      throw new Error(`${description} is not a regular file: ${relativePath}`);
    }
  }
  if (!isInside(workspaceDir, current)) throw new Error(`${description} escaped the workspace`);
  return current;
}

function readVersionOneManifest(workspaceDir, path, label) {
  const manifestPath = regularWorkspaceFile(workspaceDir, path, label);
  const manifest = readJson(manifestPath, label);
  if (manifest?.version !== 1 || !Array.isArray(manifest.assets)) {
    throw new Error(`${label} must have version 1 and an assets array`);
  }
  return manifest;
}

function uniqueMapping(entries, predicate, description) {
  const matches = entries.filter(predicate);
  if (matches.length === 0) return null;
  if (matches.length > 1) throw new Error(`${description} is ambiguous in assets/conformed/manifest.json`);
  return matches[0];
}

function conformedFileFor(workspaceDir, manifest, requestedPath, description) {
  workspacePath(requestedPath, description);
  const byFile = uniqueMapping(
    manifest.assets,
    (entry) => entry?.file === requestedPath,
    description,
  );
  if (byFile) {
    const parts = workspacePath(byFile.file, "conformed clip path");
    if (parts[0] !== "assets" || parts[1] !== "conformed") {
      throw new Error(`verified conformed clip must be under assets/conformed/: ${byFile.file}`);
    }
    return { relativePath: byFile.file, fullPath: regularWorkspaceFile(workspaceDir, byFile.file, "conformed clip") };
  }

  const bySource = uniqueMapping(
    manifest.assets,
    (entry) => entry?.source === requestedPath,
    description,
  );
  if (bySource) {
    if (typeof bySource.file !== "string") throw new Error(`conform mapping for ${requestedPath} has no output file`);
    const parts = workspacePath(bySource.file, "conformed clip path");
    if (parts[0] !== "assets" || parts[1] !== "conformed") {
      throw new Error(`conform output for ${requestedPath} must be under assets/conformed/`);
    }
    return { relativePath: bySource.file, fullPath: regularWorkspaceFile(workspaceDir, bySource.file, "conformed clip") };
  }
  return null;
}

function matchingAssetEntry(manifest, beatIndex, directive) {
  const matches = manifest.assets.filter((entry) => entry?.beatIndex === beatIndex && entry?.directive === directive);
  if (matches.length > 1) throw new Error(`assets/manifest.json has ambiguous entries for beat ${beatIndex} and its current visual directive`);
  return matches[0] ?? null;
}

function visualKind(directive, beatIndex) {
  if (typeof directive !== "string") throw new Error(`beats[${beatIndex}].visual is required to resolve its clip`);
  const match = /^(stock|gen|template):([^\r\n]+)$/.exec(directive);
  if (!match || !match[2].trim() || match[2] !== match[2].trim()) {
    throw new Error(`beats[${beatIndex}].visual is not a valid visual directive`);
  }
  return match[1];
}

export function validateWordsForBroll(script, words) {
  const needsWords = script.beats.some((beat) => beat?.kind === "broll" && beat.captionSource === "words");
  if (!needsWords) return;
  if (!words || !Array.isArray(words.words) || words.words.length === 0) {
    throw new Error("Broll captionSource:'words' requires a non-empty words.json words array");
  }
  for (const [index, word] of words.words.entries()) {
    if (typeof word?.text !== "string" || !word.text.trim() ||
      !Number.isFinite(word.startMs) || !Number.isFinite(word.endMs) ||
      word.startMs < 0 || word.endMs <= word.startMs) {
      throw new Error(`words.json words[${index}] must have non-empty text and valid startMs/endMs`);
    }
  }
}

function fraction(value) {
  if (typeof value !== "string") return NaN;
  const parts = value.split("/");
  if (parts.length !== 2) return NaN;
  const numerator = Number(parts[0]);
  const denominator = Number(parts[1]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return NaN;
  return numerator / denominator;
}

function assertConformedFacts(probe, beatIndex, durationMs) {
  const stream = probe?.streams?.[0];
  const width = Number(stream?.width);
  const height = Number(stream?.height);
  const frameRate = stream?.avg_frame_rate ?? stream?.r_frame_rate;
  const fps = fraction(frameRate);
  if (!stream || width !== VIDEO_SIZE.width || height !== VIDEO_SIZE.height) {
    throw new Error(`broll clip for beat ${beatIndex} must be 1080x1920; got ${width || "unknown"}x${height || "unknown"}`);
  }
  if (stream.sample_aspect_ratio !== "1:1") {
    throw new Error(`broll clip for beat ${beatIndex} must use square pixels (sample aspect ratio 1:1); got ${stream.sample_aspect_ratio ?? "unknown"}`);
  }
  if (frameRate !== "60/1" || fps !== VIDEO_FPS) {
    throw new Error(`broll clip for beat ${beatIndex} must be 60/1 fps; got ${frameRate ?? "unknown"}`);
  }
  const frames = Number(stream.nb_read_frames ?? stream.nb_frames);
  const durationSeconds = Number(stream.duration ?? probe?.format?.duration);
  const requiredFrames = Math.ceil((durationMs / 1000) * VIDEO_FPS - 1e-9);
  if (Number.isFinite(frames) && frames > 0) {
    if (frames < requiredFrames) {
      throw new Error(`broll clip for beat ${beatIndex} is too short: ${frames} frames, needs at least ${requiredFrames}`);
    }
  } else if (!Number.isFinite(durationSeconds) || durationSeconds * VIDEO_FPS + 1e-6 < requiredFrames) {
    throw new Error(`broll clip for beat ${beatIndex} is too short for its ${durationMs}ms beat`);
  }
}

function probeConformedClip(commandRunner, clip, beatIndex, durationMs) {
  const result = commandRunner("ffprobe", [
    "-v", "error",
    "-count_frames",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height,sample_aspect_ratio,avg_frame_rate,r_frame_rate,duration,nb_frames,nb_read_frames:format=duration",
    "-of", "json",
    clip.fullPath,
  ], { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.error) throw new Error(`could not inspect broll clip for beat ${beatIndex}: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = String(result.stderr ?? "").trim().split(/\r?\n/, 1)[0];
    throw new Error(`could not inspect broll clip for beat ${beatIndex}${detail ? `: ${detail}` : ""}`);
  }
  let metadata;
  try {
    metadata = JSON.parse(result.stdout);
  } catch {
    throw new Error(`ffprobe returned invalid metadata for broll clip in beat ${beatIndex}`);
  }
  assertConformedFacts(metadata, beatIndex, durationMs);
}

export function resolveBrollClips(workspaceDirectory, script, words, options = {}) {
  const workspaceDir = realpathSync(resolve(workspaceDirectory));
  const workspaceStat = lstatSync(workspaceDir);
  if (!workspaceStat.isDirectory()) throw new Error("workspace must be a real directory");
  validateWordsForBroll(script, words);

  const broll = script.beats
    .map((beat, beatIndex) => ({ beat, beatIndex }))
    .filter(({ beat }) => beat?.kind === "broll");
  if (broll.length === 0) return [];

  const assetsPath = join(workspaceDir, "assets", "manifest.json");
  const conformedPath = join(workspaceDir, "assets", "conformed", "manifest.json");
  const existsSafe = (path) => {
    try {
      const stat = lstatSync(path);
      return !stat.isSymbolicLink() && stat.isFile();
    } catch (error) {
      if (error.code === "ENOENT") return false;
      throw error;
    }
  };
  const assetManifest = existsSafe(assetsPath)
    ? readVersionOneManifest(workspaceDir, "assets/manifest.json", "assets/manifest.json")
    : null;
  const conformManifest = existsSafe(conformedPath)
    ? readVersionOneManifest(workspaceDir, "assets/conformed/manifest.json", "assets/conformed/manifest.json")
    : null;
  const commandRunner = options.commandRunner ?? spawnSync;
  const resolved = [];

  for (const { beat, beatIndex } of broll) {
    if (!Number.isFinite(beat.durationMs) || beat.durationMs <= 0) {
      throw new Error(`beats[${beatIndex}].durationMs must be positive to render Broll`);
    }
    let clip = null;
    if (typeof beat.clip === "string") {
      workspacePath(beat.clip, `beats[${beatIndex}].clip`);
      if (conformManifest) {
        clip = conformedFileFor(workspaceDir, conformManifest, beat.clip, `beats[${beatIndex}].clip`);
      }
      if (!clip) throw new Error(`beats[${beatIndex}].clip is not verified by assets/conformed/manifest.json`);
    } else {
      const kind = visualKind(beat.visual, beatIndex);
      if (kind === "template") {
        throw new Error(`Broll beat ${beatIndex} cannot use a template: visual directive`);
      }
      if (!assetManifest) throw new Error("missing assets/manifest.json; run the assets stage before compose");
      const asset = matchingAssetEntry(assetManifest, beatIndex, beat.visual);
      if (!asset) {
        throw new Error(`assets/manifest.json has no entry for beat ${beatIndex} matching its current visual directive; rerun the assets stage`);
      }
      if (asset.status === "pending") {
        throw new Error(`visual for beat ${beatIndex} is pending generation; set its clip to the generated source path under assets/, then run conform`);
      }
      if (asset.status !== "downloaded" || typeof asset.file !== "string") {
        throw new Error(`assets/manifest.json has no downloaded clip for beat ${beatIndex}`);
      }
      if (!conformManifest) throw new Error("missing assets/conformed/manifest.json; run the conform stage before compose");
      clip = conformedFileFor(workspaceDir, conformManifest, asset.file, `asset for beat ${beatIndex}`);
      if (!clip) throw new Error(`assets/conformed/manifest.json has no output for ${asset.file}`);
    }

    probeConformedClip(commandRunner, clip, beatIndex, beat.durationMs);
    resolved.push({ beatIndex, relativePath: clip.relativePath, fullPath: clip.fullPath });
  }
  return resolved;
}

function runCommand(commandRunner, command, args, options) {
  const result = commandRunner(command, args, options);
  if (result.error) throw new Error(`${command} failed to start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status ?? 1}`);
  return result;
}

function brandForScript(script) {
  if (typeof script?.brand !== "string" || !/^[A-Za-z0-9_-]+$/.test(script.brand)) {
    throw new Error("script.json must contain a valid brand name");
  }
  const brandPath = join(repoRoot, "brands", script.brand, "brand.json");
  if (!existsSync(brandPath)) throw new Error(`missing brand.json for ${JSON.stringify(script.brand)}`);
  return readJson(brandPath, `brands/${script.brand}/brand.json`);
}

function stagedScript(script, clips) {
  const copy = JSON.parse(JSON.stringify(script));
  for (const clip of clips) copy.beats[clip.beatIndex].clip = clip.relativePath;
  return copy;
}

export function run(workspaceArgument, options = {}) {
  if (!workspaceArgument) throw new Error("usage: node bin/compose.mjs <workspace-dir> [--browser-executable <path>]");
  const workspaceInput = resolve(repoRoot, workspaceArgument);
  let workspaceDir;
  try {
    workspaceDir = realpathSync(workspaceInput);
  } catch {
    throw new Error(`workspace directory does not exist: ${workspaceArgument}`);
  }
  const workspaceStat = lstatSync(workspaceDir);
  if (!workspaceStat.isDirectory()) throw new Error("workspace must be a real directory");
  const scriptPath = join(workspaceDir, "script.json");
  if (!existsSync(scriptPath)) throw new Error("missing script.json");
  const script = readJson(scriptPath, "script.json");
  const brand = brandForScript(script);
  const wordsPath = join(workspaceDir, "words.json");
  const words = existsSync(wordsPath) ? readJson(wordsPath, "words.json") : undefined;
  const clips = resolveBrollClips(workspaceDir, script, words, options);
  const commandRunner = options.commandRunner ?? spawnSync;
  const tempDir = mkdtempSync(join(tmpdir(), "brandreel-compose-"));
  const publicDir = join(tempDir, "public");
  const propsPath = join(tempDir, "props.json");

  try {
    mkdirSync(publicDir, { recursive: true });
    if (clips.length > 0) {
      for (const clip of clips) {
        const targetParts = workspacePath(clip.relativePath, "staged clip path");
        const target = join(publicDir, ...targetParts);
        if (!isInside(publicDir, target)) throw new Error("staged clip escaped the temporary public directory");
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(clip.fullPath, target);
      }
    }

    runCommand(commandRunner, process.execPath, [join(repoRoot, "bin", "manifest.mjs"), workspaceArgument], {
      cwd: repoRoot,
      stdio: "inherit",
    });

    const props = { brand, script: stagedScript(script, clips) };
    if (words !== undefined) props.words = words;
    writeFileSync(propsPath, JSON.stringify(props, null, 2));

    const outputPath = join(workspaceDir, "render.mp4");
    const remotionArgs = [
      "--no-install",
      "remotion",
      "render",
      "src/index.ts",
      "Stack",
      outputPath,
      `--props=${propsPath}`,
      `--public-dir=${publicDir}`,
    ];
    if (options.browserExecutable) remotionArgs.push(`--browser-executable=${options.browserExecutable}`);
    runCommand(commandRunner, "npx", remotionArgs, { cwd: engineDir, stdio: "inherit" });
    return 0;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  let workspaceArg = null;
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--browser-executable") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--browser-executable requires a path");
      options.browserExecutable = value;
      index += 1;
    } else if (arg.startsWith("--browser-executable=")) {
      const value = arg.slice("--browser-executable=".length);
      if (!value) throw new Error("--browser-executable requires a path");
      options.browserExecutable = value;
    } else if (arg.startsWith("--")) {
      throw new Error(`unknown option ${arg}`);
    } else if (workspaceArg === null) {
      workspaceArg = arg;
    } else {
      throw new Error(`unexpected argument ${arg}`);
    }
  }
  if (!workspaceArg) throw new Error("usage: node bin/compose.mjs <workspace-dir> [--browser-executable <path>]");
  return { workspaceArg, options };
}

function main() {
  try {
    const { workspaceArg, options } = parseArgs(process.argv.slice(2));
    process.exitCode = run(workspaceArg, options);
  } catch (error) {
    console.error(`compose: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
