#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PEXELS_URL = "https://api.pexels.com/v1/videos/search";
const PIXABAY_URL = "https://pixabay.com/api/videos/";
const MAX_JSON_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 150 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`could not read or parse ${path}: ${error.message}`);
  }
}

export function parseVisualDirective(directive, beatIndex) {
  if (typeof directive !== "string" || directive.trim() !== directive || /[\r\n]/.test(directive)) {
    throw new Error(`beats[${beatIndex}].visual must be a single directive string`);
  }
  const separator = directive.indexOf(":");
  if (separator < 1) {
    throw new Error(`beats[${beatIndex}].visual must start with template:, stock:, or gen:`);
  }
  const kind = directive.slice(0, separator);
  const value = directive.slice(separator + 1);
  if (!["template", "stock", "gen"].includes(kind) || !value.trim() || value.trim() !== value) {
    throw new Error(`beats[${beatIndex}].visual must be template:<name>, stock:<query>, or gen:<prompt>`);
  }
  return { directive, kind, value };
}

export function planAssets(script) {
  if (!script || !Array.isArray(script.beats)) throw new Error("script.json must contain a beats array");
  return script.beats.flatMap((beat, beatIndex) => {
    if (beat?.visual === undefined) return [];
    const parsed = parseVisualDirective(beat.visual, beatIndex);
    return [{ beatIndex, ...parsed }];
  });
}

function safeSourceUrl(value) {
  if (typeof value !== "string" || !value) return undefined;
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/key|token|secret|auth|api/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

function assertSmallResponse(response, limit, what) {
  const rawLength = response.headers?.get?.("content-length");
  if (rawLength && Number(rawLength) > limit) throw new Error(`${what} response exceeded the size limit`);
}

async function fetchJson(fetchImpl, url, init, provider) {
  let response;
  try {
    response = await fetchImpl(url, init);
  } catch {
    throw new Error(`${provider} search request failed`);
  }
  if (!response?.ok) throw new Error(`${provider} search returned HTTP ${response?.status ?? "error"}`);
  try {
    const body = await readBoundedResponse(response, MAX_JSON_BYTES, `${provider} search`);
    return JSON.parse(body.toString("utf8"));
  } catch {
    throw new Error(`${provider} returned invalid search data`);
  }
}

async function readBoundedResponse(response, limit, label) {
  assertSmallResponse(response, limit, label);
  const chunks = [];
  let length = 0;
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > limit) {
          await reader.cancel();
          throw new Error(`${label} response exceeded the size limit`);
        }
        chunks.push(Buffer.from(value));
      }
    } catch (error) {
      if (error instanceof Error && /size limit/.test(error.message)) throw error;
      throw new Error(`${label} response could not be read`);
    }
  } else if (typeof response.arrayBuffer === "function") {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > limit) throw new Error(`${label} response exceeded the size limit`);
    chunks.push(buffer);
    length = buffer.byteLength;
  } else {
    throw new Error(`${label} response has no readable body`);
  }
  if (length === 0) throw new Error(`${label} response was empty`);
  return Buffer.concat(chunks, length);
}

function isMp4(file) {
  const type = typeof file?.file_type === "string" ? file.file_type.toLowerCase() : "";
  const link = typeof file?.link === "string" ? file.link : typeof file?.url === "string" ? file.url : "";
  return (type.includes("mp4") || /\.mp4(?:[?#]|$)/i.test(link)) && Boolean(link);
}

function rankCandidates(candidates) {
  return candidates
    .filter((candidate) => Number.isFinite(candidate.width) && Number.isFinite(candidate.height) &&
      candidate.width > 0 && candidate.height > candidate.width && candidate.downloadUrl)
    .map((candidate) => ({
      ...candidate,
      aspectError: Math.abs(candidate.width / candidate.height - 9 / 16),
      pixels: candidate.width * candidate.height,
    }))
    .sort((a, b) => a.aspectError - b.aspectError || b.pixels - a.pixels || (b.fps ?? 0) - (a.fps ?? 0));
}

function pexelsCandidates(data) {
  const candidates = [];
  for (const video of Array.isArray(data?.videos) ? data.videos : []) {
    for (const file of Array.isArray(video?.video_files) ? video.video_files : []) {
      if (!isMp4(file)) continue;
      candidates.push({
        provider: "pexels",
        downloadUrl: file.link,
        width: Number(file.width),
        height: Number(file.height),
        fps: Number(file.fps),
        sourceUrl: safeSourceUrl(video.url),
        contributor: typeof video.user?.name === "string" ? video.user.name : undefined,
      });
    }
  }
  return rankCandidates(candidates);
}

function pixabayCandidates(data) {
  const candidates = [];
  for (const video of Array.isArray(data?.hits) ? data.hits : []) {
    for (const file of Object.values(video?.videos ?? {})) {
      if (!file || typeof file.url !== "string" || !/\.mp4(?:[?#]|$)/i.test(file.url)) continue;
      candidates.push({
        provider: "pixabay",
        downloadUrl: file.url,
        width: Number(file.width),
        height: Number(file.height),
        sourceUrl: safeSourceUrl(video.pageURL),
        contributor: typeof video.user === "string" ? video.user : undefined,
      });
    }
  }
  return rankCandidates(candidates);
}

function timeoutSignal() {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
}

async function findWithPexels(query, apiKey, fetchImpl) {
  const url = new URL(PEXELS_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "portrait");
  url.searchParams.set("per_page", "80");
  const data = await fetchJson(fetchImpl, url, {
    headers: { Authorization: apiKey },
    signal: timeoutSignal(),
  }, "Pexels");
  const candidate = pexelsCandidates(data)[0];
  if (!candidate) throw new Error("Pexels returned no portrait MP4 videos");
  return candidate;
}

async function findWithPixabay(query, apiKey, fetchImpl) {
  if (Array.from(query).length > 100) throw new Error("Pixabay query exceeds the 100 character limit");
  const url = new URL(PIXABAY_URL);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("per_page", "100");
  url.searchParams.set("safesearch", "true");
  const data = await fetchJson(fetchImpl, url, { signal: timeoutSignal() }, "Pixabay");
  const candidate = pixabayCandidates(data)[0];
  if (!candidate) throw new Error("Pixabay returned no portrait MP4 videos");
  return candidate;
}

async function fetchVideo(fetchImpl, candidate) {
  const provider = candidate.provider[0].toUpperCase() + candidate.provider.slice(1);
  let url;
  try {
    url = new URL(candidate.downloadUrl);
  } catch {
    throw new Error(`${provider} returned an invalid video URL`);
  }
  if (url.protocol !== "https:") throw new Error(`${provider} returned a non-HTTPS video URL`);

  let response;
  try {
    response = await fetchImpl(url, { signal: timeoutSignal() });
  } catch {
    throw new Error(`${provider} video download failed`);
  }
  if (!response?.ok) throw new Error(`${provider} video download returned HTTP ${response?.status ?? "error"}`);
  try {
    return await readBoundedResponse(response, MAX_VIDEO_BYTES, `${provider} video`);
  } catch (error) {
    if (error instanceof Error && /size limit/.test(error.message)) throw error;
    throw new Error(`${provider} video download failed`);
  }
}

async function resolveStock(plan, { env, fetchImpl }) {
  const attempts = [];
  if (env.PEXELS_API_KEY) {
    try {
      const candidate = await findWithPexels(plan.value, env.PEXELS_API_KEY, fetchImpl);
      candidate.bytes = await fetchVideo(fetchImpl, candidate);
      return candidate;
    } catch (error) {
      attempts.push(`Pexels: ${error.message}`);
    }
  }
  if (env.PIXABAY_API_KEY) {
    try {
      const candidate = await findWithPixabay(plan.value, env.PIXABAY_API_KEY, fetchImpl);
      candidate.bytes = await fetchVideo(fetchImpl, candidate);
      return candidate;
    } catch (error) {
      attempts.push(`Pixabay: ${error.message}`);
    }
  }
  if (!env.PEXELS_API_KEY && !env.PIXABAY_API_KEY) {
    throw new Error("stock visuals need PEXELS_API_KEY or PIXABAY_API_KEY in the environment");
  }
  if (env.PEXELS_API_KEY && !env.PIXABAY_API_KEY) {
    throw new Error(`${attempts[0]}; set PIXABAY_API_KEY to enable provider fallback`);
  }
  throw new Error(`no stock clip could be resolved (${attempts.join("; ")})`);
}

function atomicWriteTemp(directory, contents, prefix) {
  const path = join(directory, `.${prefix}-${randomUUID()}.tmp`);
  writeFileSync(path, contents, { flag: "wx" });
  return path;
}

export async function run(workspaceArg, options = {}) {
  if (!workspaceArg) throw new Error("usage: node bin/assets.mjs <workspace-dir> [--dry-run]");
  const workspaceDir = resolve(repoRoot, workspaceArg);
  const scriptPath = join(workspaceDir, "script.json");
  if (!existsSync(scriptPath)) throw new Error(`missing script.json at ${scriptPath}`);
  const script = readJson(scriptPath);
  const plans = planAssets(script);

  if (options.dryRun) return { plans, dryRun: true };
  if (plans.length === 0) {
    const assetsDir = join(workspaceDir, "assets");
    const manifestPath = join(assetsDir, "manifest.json");
    const veoManifestPath = join(assetsDir, "veo-manifest.json");
    if (!existsSync(manifestPath) && !existsSync(veoManifestPath)) {
      return { plans, dryRun: false, manifestPath: null };
    }
    mkdirSync(assetsDir, { recursive: true });
    const manifest = { version: 1, assets: [] };
    const temporary = atomicWriteTemp(assetsDir, `${JSON.stringify(manifest, null, 2)}\n`, "manifest");
    try {
      renameSync(temporary, manifestPath);
      rmSync(veoManifestPath, { force: true });
    } finally {
      rmSync(temporary, { force: true });
    }
    return { plans, dryRun: false, manifest, manifestPath };
  }

  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (plans.some((plan) => plan.kind === "stock") && !env.PEXELS_API_KEY && !env.PIXABAY_API_KEY) {
    throw new Error("stock visuals need PEXELS_API_KEY or PIXABAY_API_KEY in the environment");
  }
  if (plans.some((plan) => plan.kind === "stock") && typeof fetchImpl !== "function") {
    throw new Error("stock visuals require a Node runtime with fetch support");
  }

  const assetsDir = join(workspaceDir, "assets");
  mkdirSync(assetsDir, { recursive: true });
  const stagingDir = mkdtempSync(join(assetsDir, ".assets-stage-"));
  const stagedFiles = [];
  const entries = [];
  const veoPrompts = [];
  const temporaryOutputs = [];
  try {
    for (const plan of plans) {
      if (plan.kind === "template") {
        entries.push({ beatIndex: plan.beatIndex, directive: plan.directive, kind: plan.kind, status: "ready" });
        continue;
      }
      if (plan.kind === "gen") {
        entries.push({ beatIndex: plan.beatIndex, directive: plan.directive, kind: plan.kind, status: "pending" });
        veoPrompts.push({ beatIndex: plan.beatIndex, prompt: plan.value, status: "pending" });
        continue;
      }

      const clip = await resolveStock(plan, { env, fetchImpl });
      const hash = createHash("sha256").update(clip.bytes).digest("hex").slice(0, 12);
      const file = `assets/stock-beat-${plan.beatIndex}-${hash}.mp4`;
      const stagedPath = join(stagingDir, `stock-beat-${plan.beatIndex}-${hash}.mp4`);
      writeFileSync(stagedPath, clip.bytes, { flag: "wx" });
      stagedFiles.push({ stagedPath, finalPath: join(workspaceDir, file) });
      const entry = {
        beatIndex: plan.beatIndex,
        directive: plan.directive,
        kind: plan.kind,
        status: "downloaded",
        file,
        provider: clip.provider,
      };
      const sourceUrl = safeSourceUrl(clip.sourceUrl);
      if (sourceUrl) entry.sourceUrl = sourceUrl;
      if (clip.contributor) entry.contributor = clip.contributor;
      entries.push(entry);
    }

    const manifest = { version: 1, assets: entries };
    const manifestPath = join(assetsDir, "manifest.json");
    const manifestTempPath = atomicWriteTemp(assetsDir, `${JSON.stringify(manifest, null, 2)}\n`, "manifest");
    temporaryOutputs.push(manifestTempPath);

    let veoManifestPath = null;
    if (veoPrompts.length > 0) {
      veoManifestPath = join(assetsDir, "veo-manifest.json");
      const veoTemp = atomicWriteTemp(assetsDir, `${JSON.stringify({ version: 1, prompts: veoPrompts }, null, 2)}\n`, "veo-manifest");
      temporaryOutputs.push(veoTemp);
    }

    for (const { stagedPath, finalPath } of stagedFiles) {
      if (existsSync(finalPath)) rmSync(stagedPath, { force: true });
      else renameSync(stagedPath, finalPath);
    }
    if (veoManifestPath) renameSync(temporaryOutputs.pop(), veoManifestPath);
    renameSync(manifestTempPath, manifestPath);
    if (!veoManifestPath) rmSync(join(assetsDir, "veo-manifest.json"), { force: true });
    temporaryOutputs.length = 0;
    return { plans, dryRun: false, manifest, manifestPath, veoManifestPath };
  } finally {
    for (const path of temporaryOutputs) rmSync(path, { force: true });
    rmSync(stagingDir, { recursive: true, force: true });
  }
}

function printPlans(plans) {
  if (plans.length === 0) {
    console.log("assets: no visual directives; nothing to do");
    return;
  }
  for (const plan of plans) {
    if (plan.kind === "template") console.log(`beat ${plan.beatIndex}: template ${JSON.stringify(plan.value)} (no fetch)`);
    else if (plan.kind === "stock") console.log(`beat ${plan.beatIndex}: stock ${JSON.stringify(plan.value)} (Pexels then Pixabay, portrait MP4 download)`);
    else console.log(`beat ${plan.beatIndex}: gen ${JSON.stringify(plan.value)} (assets/veo-manifest.json, pending)`);
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    let dryRun = false;
    const positional = [];
    for (const arg of args) {
      if (arg === "--dry-run") {
        if (dryRun) throw new Error("usage: node bin/assets.mjs <workspace-dir> [--dry-run]");
        dryRun = true;
      } else if (arg.startsWith("--")) {
        throw new Error(`unknown option ${arg}; usage: node bin/assets.mjs <workspace-dir> [--dry-run]`);
      } else {
        positional.push(arg);
      }
    }
    if (positional.length !== 1) throw new Error("usage: node bin/assets.mjs <workspace-dir> [--dry-run]");
    const workspaceArg = positional[0];
    const result = await run(workspaceArg, { dryRun });
    if (dryRun) printPlans(result.plans);
    else if (result.manifestPath) console.log(`wrote ${result.manifestPath}`);
    else console.log("assets: no visual directives; nothing to do");
  } catch (error) {
    console.error(`assets: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
