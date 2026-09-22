import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { planAssets, run } from "../assets.mjs";

const cliPath = fileURLToPath(new URL("../assets.mjs", import.meta.url));

function makeWorkspace(beats) {
  const workspace = mkdtempSync(join(tmpdir(), "brandreel-assets-test-"));
  writeFileSync(join(workspace, "script.json"), JSON.stringify({ beats }));
  return workspace;
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function videoResponse(value = "clip-bytes") {
  return new Response(Buffer.from(value), {
    status: 200,
    headers: { "content-type": "video/mp4" },
  });
}

test("assets dry-run prints plans without keys, network, or writes", () => {
  const workspace = makeWorkspace([
    { kind: "moment", visual: "template:moment" },
    { kind: "broll", visual: "stock:quiet forest" },
    { kind: "broll", visual: "gen:slow clouds over a lake" },
  ]);
  try {
    const result = spawnSync(process.execPath, [cliPath, workspace, "--dry-run"], {
      encoding: "utf8",
      env: { ...process.env, PEXELS_API_KEY: "", PIXABAY_API_KEY: "" },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /beat 0: template/);
    assert.match(result.stdout, /beat 1: stock .*Pexels then Pixabay/);
    assert.match(result.stdout, /beat 2: gen .*veo-manifest\.json, pending/);
    assert.equal(existsSync(join(workspace, "assets")), false);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("planAssets leaves explicit broll clips without a visual directive alone", () => {
  assert.deepEqual(planAssets({ beats: [{ kind: "broll", clip: "assets/existing.mp4", captionSource: "none" }] }), []);
});

test("successful empty resolution clears stale manifests, while a fresh empty workspace stays untouched", async () => {
  const workspace = makeWorkspace([{ kind: "moment" }]);
  try {
    assert.equal((await run(workspace, { env: {} })).manifestPath, null);
    assert.equal(existsSync(join(workspace, "assets")), false);

    const assetsDir = join(workspace, "assets");
    mkdirSync(assetsDir, { recursive: true });
    writeFileSync(join(assetsDir, "manifest.json"), "old manifest");
    writeFileSync(join(assetsDir, "veo-manifest.json"), "old prompts");
    const result = await run(workspace, { env: {} });
    assert.deepEqual(result.manifest, { version: 1, assets: [] });
    assert.equal(existsSync(join(assetsDir, "veo-manifest.json")), false);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("template visuals need no key and gen visuals become pending Veo prompts", async () => {
  const workspace = makeWorkspace([
    { kind: "moment", visual: "template:moment" },
    { kind: "broll", visual: "gen:slow clouds over a lake" },
  ]);
  try {
    const result = await run(workspace, { env: {}, fetchImpl: async () => { throw new Error("must not fetch"); } });
    assert.equal(result.manifest.version, 1);
    assert.deepEqual(result.manifest.assets, [
      { beatIndex: 0, directive: "template:moment", kind: "template", status: "ready" },
      { beatIndex: 1, directive: "gen:slow clouds over a lake", kind: "gen", status: "pending" },
    ]);
    assert.equal(existsSync(join(workspace, "assets", "veo-manifest.json")), true);
    const veoManifest = JSON.parse(readFileSync(join(workspace, "assets", "veo-manifest.json"), "utf8"));
    assert.deepEqual(veoManifest, {
      version: 1,
      prompts: [{ beatIndex: 1, prompt: "slow clouds over a lake", status: "pending" }],
    });
    assert.equal(result.manifest.assets[1].file, undefined);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("stock prefers a high-resolution portrait MP4 from Pexels and records attribution", async () => {
  const workspace = makeWorkspace([{ kind: "broll", visual: "stock:quiet forest" }]);
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    const parsed = new URL(url);
    requests.push({ url: parsed, init });
    if (parsed.hostname === "api.pexels.com") {
      return jsonResponse({
        videos: [{
          url: "https://www.pexels.com/video/forest-123/",
          user: { name: "Avery Artist" },
          video_files: [
            { width: 1920, height: 1080, file_type: "video/mp4", link: "https://cdn.test/landscape.mp4", fps: 30 },
            { width: 540, height: 960, file_type: "video/mp4", link: "https://cdn.test/small.mp4", fps: 30 },
            { width: 1080, height: 1920, file_type: "video/mp4", link: "https://cdn.test/large.mp4", fps: 30 },
            { width: 1080, height: 1920, file_type: "video/webm", link: "https://cdn.test/large.webm", fps: 30 },
          ],
        }],
      });
    }
    if (parsed.hostname === "cdn.test") return videoResponse("pexels-video-bytes");
    throw new Error(`unexpected URL ${parsed}`);
  };
  try {
    const result = await run(workspace, {
      env: { PEXELS_API_KEY: "pexels-secret", PIXABAY_API_KEY: "pixabay-secret" },
      fetchImpl,
    });
    assert.equal(requests[0].url.searchParams.get("query"), "quiet forest");
    assert.equal(requests[0].url.searchParams.get("orientation"), "portrait");
    assert.equal(requests[0].url.searchParams.get("per_page"), "80");
    assert.equal(requests[0].init.headers.Authorization, "pexels-secret");
    assert.equal(requests[1].url.href, "https://cdn.test/large.mp4");
    const item = result.manifest.assets[0];
    assert.equal(item.provider, "pexels");
    assert.equal(item.status, "downloaded");
    assert.equal(item.contributor, "Avery Artist");
    assert.equal(item.sourceUrl, "https://www.pexels.com/video/forest-123/");
    assert.match(item.file, /^assets\/stock-beat-0-[a-f0-9]{12}\.mp4$/);
    assert.equal(readFileSync(join(workspace, item.file), "utf8"), "pexels-video-bytes");
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("failed Pexels search falls back to Pixabay and strips credentials from stored URLs", async () => {
  const workspace = makeWorkspace([{ kind: "broll", visual: "stock:night sky" }]);
  const requests = [];
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    requests.push(parsed);
    if (parsed.hostname === "api.pexels.com") return jsonResponse({}, 503);
    if (parsed.hostname === "pixabay.com") {
      assert.equal(parsed.searchParams.get("key"), "pixabay-secret");
      assert.equal(parsed.searchParams.get("q"), "night sky");
      assert.equal(parsed.searchParams.get("per_page"), "100");
      return jsonResponse({ hits: [{
        pageURL: "https://pixabay.com/videos/night-sky-123/?source=review&api_key=leaked&token=leaked-too",
        user: "Night Photographer",
        videos: {
          medium: { width: 640, height: 360, url: "https://cdn.test/landscape.mp4" },
          small: { width: 540, height: 960, url: "https://cdn.test/portrait.mp4" },
          large: { width: 1080, height: 1920, url: "https://cdn.test/portrait-large.mp4" },
        },
      }] });
    }
    if (parsed.hostname === "cdn.test") return videoResponse("pixabay-video-bytes");
    throw new Error("unexpected request");
  };
  try {
    const result = await run(workspace, {
      env: { PEXELS_API_KEY: "pexels-secret", PIXABAY_API_KEY: "pixabay-secret" },
      fetchImpl,
    });
    assert.equal(requests[2].href, "https://cdn.test/portrait-large.mp4");
    assert.equal(result.manifest.assets[0].provider, "pixabay");
    assert.equal(result.manifest.assets[0].contributor, "Night Photographer");
    assert.equal(result.manifest.assets[0].sourceUrl, "https://pixabay.com/videos/night-sky-123/?source=review");
    const persisted = readFileSync(result.manifestPath, "utf8");
    assert.doesNotMatch(persisted, /pixabay-secret|pexels-secret|api_key|token/);
    assert.deepEqual(readdirSync(join(workspace, "assets")).filter((name) => name.startsWith(".assets-stage-")), []);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("Pixabay overlong queries are skipped after Pexels and chunked search responses stay bounded", async () => {
  const workspace = makeWorkspace([{ kind: "broll", visual: `stock:${"a".repeat(101)}` }]);
  const hosts = [];
  try {
    await assert.rejects(run(workspace, {
      env: { PEXELS_API_KEY: "pexels-secret", PIXABAY_API_KEY: "pixabay-secret" },
      fetchImpl: async (url) => {
        const parsed = new URL(url);
        hosts.push(parsed.hostname);
        return jsonResponse({ videos: [] });
      },
    }), /Pixabay query exceeds the 100 character limit/);
    assert.deepEqual(hosts, ["api.pexels.com"]);

    const largeWorkspace = makeWorkspace([{ kind: "broll", visual: "stock:rain" }]);
    try {
      await assert.rejects(run(largeWorkspace, {
        env: { PEXELS_API_KEY: "pexels-secret", PIXABAY_API_KEY: "" },
        fetchImpl: async () => new Response(JSON.stringify({ data: "x".repeat(8 * 1024 * 1024 + 1) })),
      }), /Pexels: Pexels returned invalid search data/);
      assert.equal(existsSync(join(largeWorkspace, "assets", "manifest.json")), false);
    } finally {
      rmSync(largeWorkspace, { recursive: true, force: true });
    }
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("missing stock keys exits clearly without a stack trace or writes", () => {
  const workspace = makeWorkspace([{ kind: "broll", visual: "stock:rain" }]);
  try {
    const result = spawnSync(process.execPath, [cliPath, workspace], {
      encoding: "utf8",
      env: { ...process.env, PEXELS_API_KEY: "", PIXABAY_API_KEY: "" },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /stock visuals need PEXELS_API_KEY or PIXABAY_API_KEY/);
    assert.doesNotMatch(result.stderr, /\n\s+at /);
    assert.equal(existsSync(join(workspace, "assets")), false);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("provider and download failures preserve the previous good manifests and hide keys", async () => {
  const workspace = makeWorkspace([{ kind: "broll", visual: "stock:rain" }]);
  const assetsDir = join(workspace, "assets");
  const manifestPath = join(assetsDir, "manifest.json");
  const oldManifest = '{"version":1,"assets":[{"status":"downloaded","file":"assets/old.mp4"}]}\n';
  mkdirSync(assetsDir, { recursive: true });
  writeFileSync(manifestPath, oldManifest);
  const oldVeo = '{"version":1,"prompts":[{"beatIndex":9,"prompt":"old"}]}\n';
  writeFileSync(join(assetsDir, "veo-manifest.json"), oldVeo);
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    if (parsed.hostname === "api.pexels.com") return jsonResponse({
      videos: [{
        url: "https://www.pexels.com/video/clip-123/",
        video_files: [{ width: 720, height: 1280, file_type: "video/mp4", link: "https://cdn.test/fail.mp4" }],
      }],
    });
    if (parsed.hostname === "cdn.test") throw new Error("transport included pexels-secret by accident");
    throw new Error("unexpected request");
  };
  try {
    await assert.rejects(run(workspace, {
      env: { PEXELS_API_KEY: "pexels-secret", PIXABAY_API_KEY: "" },
      fetchImpl,
    }), /Pexels: Pexels video download failed; set PIXABAY_API_KEY/);
    assert.equal(readFileSync(manifestPath, "utf8"), oldManifest);
    assert.equal(readFileSync(join(assetsDir, "veo-manifest.json"), "utf8"), oldVeo);
    assert.doesNotMatch(readFileSync(manifestPath, "utf8"), /pexels-secret/);
    assert.deepEqual(readdirSync(assetsDir).filter((name) => name.startsWith(".assets-stage-")), []);
    assert.equal(readdirSync(assetsDir).some((name) => /^stock-beat-0-/.test(name)), false);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
