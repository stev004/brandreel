import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { resolveBrollClips, run, validateWordsForBroll } from "../compose.mjs";

const directive = "stock:quiet forest";
const sourceFile = "assets/stock/forest.mp4";
const conformedFile = "assets/conformed/stock/forest-abc123.mp4";

function makeWorkspace({ beat = {}, assetEntry, conform = true, writeClip = true, outputFile } = {}) {
  const workspace = mkdtempSync(join(tmpdir(), "brandreel-broll-test-"));
  const script = {
    id: "test-broll",
    brand: "regulate",
    coreMechanic: "One visual idea.",
    beats: [{ kind: "broll", visual: directive, captionSource: "none", durationMs: 4000, ...beat }],
    close: { line: "done", showWordmark: false },
    caption: "A caption",
    hashtags: [],
  };
  writeFileSync(join(workspace, "script.json"), JSON.stringify(script));
  mkdirSync(join(workspace, "assets"), { recursive: true });
  if (assetEntry !== false) {
    const entry = assetEntry ?? { beatIndex: 0, directive, kind: "stock", status: "downloaded", file: sourceFile };
    writeFileSync(join(workspace, "assets", "manifest.json"), JSON.stringify({ version: 1, assets: [entry] }));
  }
  if (conform) {
    mkdirSync(join(workspace, "assets", "conformed"), { recursive: true });
    const output = outputFile ?? assetEntry?.file ?? conformedFile;
    const source = assetEntry?.source ?? sourceFile;
    writeFileSync(join(workspace, "assets", "conformed", "manifest.json"), JSON.stringify({
      version: 1,
      assets: [{ source, file: output }],
    }));
    if (writeClip && output.startsWith("assets/")) {
      const outputPath = join(workspace, output);
      mkdirSync(join(outputPath, ".."), { recursive: true });
      writeFileSync(outputPath, "conformed-video-bytes");
    }
  }
  return { workspace, script };
}

function probeRunner(overrides = {}) {
  return (command, args) => {
    if (command === "ffprobe") {
      const facts = {
        streams: [{
          width: 1080,
          height: 1920,
          sample_aspect_ratio: "1:1",
          avg_frame_rate: "60/1",
          r_frame_rate: "60/1",
          duration: "4",
          nb_read_frames: "240",
        }],
        format: { duration: "4" },
      };
      return { status: 0, stdout: JSON.stringify({ ...facts, ...overrides.probe }) };
    }
    if (command === "npx") return { status: 0 };
    return { status: 0 };
  };
}

test("stock resolution requires the current beat directive, then maps its source to a conformed file", () => {
  const { workspace } = makeWorkspace();
  try {
    const clips = resolveBrollClips(workspace, JSON.parse(readFileSync(join(workspace, "script.json"), "utf8")), undefined, {
      commandRunner: probeRunner(),
    });
    assert.equal(clips.length, 1);
    assert.equal(clips[0].relativePath, conformedFile);
    assert.equal(readFileSync(clips[0].fullPath, "utf8"), "conformed-video-bytes");
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("stale asset directives and pending generation fail with actionable errors", () => {
  const stale = makeWorkspace({ assetEntry: { beatIndex: 0, directive: "stock:old forest", kind: "stock", status: "downloaded", file: sourceFile } });
  const pending = makeWorkspace({ assetEntry: { beatIndex: 0, directive, kind: "gen", status: "pending" }, conform: false });
  try {
    const staleScript = JSON.parse(readFileSync(join(stale.workspace, "script.json"), "utf8"));
    assert.throws(() => resolveBrollClips(stale.workspace, staleScript, undefined, { commandRunner: probeRunner() }), /no entry.*current visual directive/);
    const pendingScript = JSON.parse(readFileSync(join(pending.workspace, "script.json"), "utf8"));
    pendingScript.beats[0].visual = "gen:quiet forest";
    writeFileSync(join(pending.workspace, "script.json"), JSON.stringify(pendingScript));
    writeFileSync(join(pending.workspace, "assets", "manifest.json"), JSON.stringify({
      version: 1,
      assets: [{ beatIndex: 0, directive: "gen:quiet forest", kind: "gen", status: "pending" }],
    }));
    assert.throws(() => resolveBrollClips(pending.workspace, pendingScript, undefined, { commandRunner: probeRunner() }), /pending generation/);
  } finally {
    rmSync(stale.workspace, { recursive: true, force: true });
    rmSync(pending.workspace, { recursive: true, force: true });
  }
});

test("explicit clip paths must be verified, regular workspace files with no traversal or symlink escape", () => {
  const traversal = makeWorkspace({ beat: { clip: "../outside.mp4" }, assetEntry: false, conform: false });
  const missing = makeWorkspace({
    beat: { clip: "assets/conformed/missing.mp4" },
    assetEntry: false,
    conform: true,
    writeClip: false,
    outputFile: "assets/conformed/missing.mp4",
  });
  const linked = makeWorkspace({ beat: { clip: "assets/conformed/escape.mp4" }, assetEntry: false, conform: false });
  const outside = join(tmpdir(), `brandreel-outside-${process.pid}.mp4`);
  try {
    writeFileSync(outside, "outside");
    mkdirSync(join(linked.workspace, "assets", "conformed"), { recursive: true });
    symlinkSync(outside, join(linked.workspace, "assets", "conformed", "escape.mp4"));
    writeFileSync(join(linked.workspace, "assets", "conformed", "manifest.json"), JSON.stringify({
      version: 1,
      assets: [{ source: sourceFile, file: "assets/conformed/escape.mp4" }],
    }));

    for (const { workspace } of [traversal, missing, linked]) {
      const script = JSON.parse(readFileSync(join(workspace, "script.json"), "utf8"));
      assert.throws(() => resolveBrollClips(workspace, script, undefined, { commandRunner: probeRunner() }));
    }
    assert.throws(() => resolveBrollClips(
      traversal.workspace,
      JSON.parse(readFileSync(join(traversal.workspace, "script.json"), "utf8")),
      undefined,
      { commandRunner: probeRunner() },
    ), /traversal path segments/);
    assert.throws(() => resolveBrollClips(
      linked.workspace,
      JSON.parse(readFileSync(join(linked.workspace, "script.json"), "utf8")),
      undefined,
      { commandRunner: probeRunner() },
    ), /symlink/);
  } finally {
    rmSync(traversal.workspace, { recursive: true, force: true });
    rmSync(missing.workspace, { recursive: true, force: true });
    rmSync(linked.workspace, { recursive: true, force: true });
    rmSync(outside, { force: true });
  }
});

test("Broll rejects non-mezzanine clips and clips shorter than the beat", () => {
  const { workspace, script } = makeWorkspace();
  try {
    assert.throws(() => resolveBrollClips(workspace, script, undefined, {
      commandRunner: probeRunner({ probe: { streams: [{ width: 720, height: 1280, sample_aspect_ratio: "1:1", avg_frame_rate: "60/1", nb_read_frames: "240" }] } }),
    }), /must be 1080x1920/);
    assert.throws(() => resolveBrollClips(workspace, script, undefined, {
      commandRunner: probeRunner({ probe: { streams: [{ width: 1080, height: 1920, sample_aspect_ratio: "1:1", avg_frame_rate: "30/1", nb_read_frames: "240" }] } }),
    }), /must be 60\/1 fps/);
    assert.throws(() => resolveBrollClips(workspace, script, undefined, {
      commandRunner: probeRunner({ probe: { streams: [{ width: 1080, height: 1920, sample_aspect_ratio: "1:1", avg_frame_rate: "60/1", nb_read_frames: "120" }] } }),
    }), /too short/);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("words caption mode requires valid aligned words", () => {
  const script = { beats: [{ kind: "broll", captionSource: "words" }] };
  assert.throws(() => validateWordsForBroll(script, undefined), /requires a non-empty words.json/);
  assert.throws(() => validateWordsForBroll(script, { words: [{ text: "hello", startMs: 20, endMs: 10 }] }), /valid startMs\/endMs/);
  assert.doesNotThrow(() => validateWordsForBroll(script, { words: [{ text: "hello", startMs: 0, endMs: 200 }] }));
});

test("compose stages only selected clips in a temporary public dir and cleans temp data on success", () => {
  const { workspace } = makeWorkspace();
  mkdirSync(join(workspace, "assets", "conformed", "unused"), { recursive: true });
  writeFileSync(join(workspace, "assets", "conformed", "unused", "other.mp4"), "must-not-be-staged");
  writeFileSync(join(workspace, "assets", "unselected.mp4"), "must-not-be-staged");
  const originalScript = readFileSync(join(workspace, "script.json"), "utf8");
  const tempBefore = new Set(readdirSync(tmpdir()).filter((name) => name.startsWith("brandreel-compose-")));
  let capturedPublicDir;
  const runner = (command, args, options) => {
    if (command === "ffprobe") return probeRunner()(command, args, options);
    if (command === "npx") {
      const propsPath = args.find((value) => value.startsWith("--props=")).slice("--props=".length);
      capturedPublicDir = args.find((value) => value.startsWith("--public-dir=")).slice("--public-dir=".length);
      assert.equal(args.includes("--browser-executable=/local/chrome"), true);
      const props = JSON.parse(readFileSync(propsPath, "utf8"));
      assert.equal(props.script.beats[0].clip, conformedFile);
      const selectedClip = join(capturedPublicDir, conformedFile);
      assert.equal(readFileSync(selectedClip, "utf8"), "conformed-video-bytes");
      assert.deepEqual(readdirSync(join(capturedPublicDir, "assets", "conformed")), ["stock"]);
      assert.deepEqual(readdirSync(join(capturedPublicDir, "assets", "conformed", "stock")), ["forest-abc123.mp4"]);
      assert.equal(existsSync(join(capturedPublicDir, "script.json")), false);
      assert.equal(existsSync(join(capturedPublicDir, "assets", "unselected.mp4")), false);
      assert.equal(existsSync(join(capturedPublicDir, "assets", "conformed", "unused")), false);
    }
    return { status: 0 };
  };
  try {
    assert.equal(run(workspace, { commandRunner: runner, browserExecutable: "/local/chrome" }), 0);
    assert.equal(readFileSync(join(workspace, "script.json"), "utf8"), originalScript);
    assert.equal(existsSync(capturedPublicDir), false);
    const tempAfter = readdirSync(tmpdir()).filter((name) => name.startsWith("brandreel-compose-"));
    assert.deepEqual(tempAfter.filter((name) => !tempBefore.has(name)), []);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("compose cleans its temporary props and public files after a renderer failure", () => {
  const { workspace } = makeWorkspace();
  const tempBefore = new Set(readdirSync(tmpdir()).filter((name) => name.startsWith("brandreel-compose-")));
  try {
    assert.throws(() => run(workspace, {
      commandRunner(command, args) {
        if (command === "ffprobe") return probeRunner()(command, args);
        if (command === "npx") return { status: 1 };
        return { status: 0 };
      },
    }), /npx failed with exit code 1/);
    const tempAfter = readdirSync(tmpdir()).filter((name) => name.startsWith("brandreel-compose-"));
    assert.deepEqual(tempAfter.filter((name) => !tempBefore.has(name)), []);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
