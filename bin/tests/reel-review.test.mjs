import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { planStages } from "../reel.mjs";
import { buildReview, writeReview } from "../review.mjs";

const baseScript = {
  id: "test-reel",
  brand: "test-brand",
  coreMechanic: "One clear visual idea.",
  beats: [],
  close: { line: "done", showWordmark: false },
  caption: "A caption",
  hashtags: ["#one", "#two"],
};

test("planStages skips voice stages when modules.vo is absent", () => {
  assert.deepEqual(planStages(baseScript), ["manifest", "compose", "lint", "review"]);
});

test("planStages includes vo and align when modules.vo is set", () => {
  const script = { ...baseScript, modules: { vo: { voice: "af_heart" } } };
  assert.deepEqual(planStages(script), ["vo", "align", "manifest", "compose", "polish", "lint", "review"]);
});

test("planStages includes polish for music-only scripts", () => {
  const script = { ...baseScript, modules: { music: { file: "audio/music.wav" } } };
  assert.deepEqual(planStages(script), ["manifest", "compose", "polish", "lint", "review"]);
});

test("planStages includes polish for explicit music", () => {
  assert.deepEqual(planStages(baseScript, { music: "audio/custom.wav" }), [
    "manifest",
    "compose",
    "polish",
    "lint",
    "review",
  ]);
});

test("planStages applies an inclusive range and skips named stages", () => {
  const script = { ...baseScript, modules: { vo: { voice: "af_heart" } } };
  assert.deepEqual(planStages(script, {
    from: "align",
    to: "review",
    skip: ["polish", "lint"],
  }), ["align", "manifest", "compose", "review"]);
});

test("planStages accepts comma-separated skips", () => {
  assert.deepEqual(planStages(baseScript, { skip: "compose,review" }), ["manifest", "lint"]);
});

test("reel dry-run prints manifest before compose and lint", () => {
  const workspace = mkdtempSync(join(tmpdir(), "brandreel-reel-dry-run-test-"));
  try {
    writeFileSync(join(workspace, "script.json"), JSON.stringify(baseScript));
    const result = spawnSync(process.execPath, [join(new URL("../reel.mjs", import.meta.url).pathname), workspace, "--dry-run"], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.stdout.trim().split("\n").map((line) => line.split(":")[0]), ["manifest", "compose", "lint", "review"]);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("buildReview writes the required review content and TODO fallbacks", () => {
  const workspace = mkdtempSync(join(tmpdir(), "brandreel-review-test-"));
  try {
    writeFileSync(join(workspace, "render.mp4"), "placeholder");
    writeFileSync(join(workspace, "script.json"), JSON.stringify(baseScript));
    const reviewPath = writeReview(workspace);
    const content = readFileSync(reviewPath, "utf8");
    assert.match(content, /- \[ \] KEEP/);
    assert.match(content, /- \[ \] TWEAK/);
    assert.match(content, /- \[ \] KILL/);
    assert.match(content, /#one #two/);
    assert.match(content, /First comment[\s\S]*TODO/);
    assert.match(content, /Alt text[\s\S]*TODO/);
    assert.match(content, /lint not run/);
    assert.match(content, /render\.mp4/);
    assert.equal(readFileSync(join(workspace, "script.json"), "utf8"), JSON.stringify(baseScript));
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("buildReview reports lint checks and optional handoff copy", () => {
  const workspace = mkdtempSync(join(tmpdir(), "brandreel-review-test-"));
  try {
    const script = {
      ...baseScript,
      firstComment: "Tell us what landed.",
      altText: "A quiet line settles on screen.",
    };
    const content = buildReview(script, {
      ok: false,
      checks: { fps: { ok: true }, safeZone: { ok: false, message: "outside bounds" } },
    }, workspace);
    assert.match(content, /fps: PASS/);
    assert.match(content, /safeZone: FAIL - outside bounds/);
    assert.match(content, /Tell us what landed\./);
    assert.match(content, /A quiet line settles on screen\./);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("buildReview renders the CTA fields in order", () => {
  const content = buildReview({
    ...baseScript,
    close: {
      ...baseScript.close,
      line: "take a breath",
      tagline: "Make room for quiet.",
      url: "https://example.test/quiet",
    },
  }, null, "");

  assert.match(content, /## CTA\n\ntake a breath\nMake room for quiet\.\nhttps:\/\/example\.test\/quiet/);
  assert.match(content, /## Decision[\s\S]*- \[ \] KEEP[\s\S]*- \[ \] TWEAK[\s\S]*- \[ \] KILL/);
});
