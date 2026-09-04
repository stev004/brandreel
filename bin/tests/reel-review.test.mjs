import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

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
  assert.deepEqual(planStages(baseScript), ["compose", "lint", "review"]);
});

test("planStages includes vo and align when modules.vo is set", () => {
  const script = { ...baseScript, modules: { vo: { voice: "af_heart" } } };
  assert.deepEqual(planStages(script), ["vo", "align", "compose", "polish", "lint", "review"]);
});

test("planStages includes polish for music-only scripts", () => {
  const script = { ...baseScript, modules: { music: { file: "audio/music.wav" } } };
  assert.deepEqual(planStages(script), ["compose", "polish", "lint", "review"]);
});

test("planStages applies an inclusive range and skips named stages", () => {
  const script = { ...baseScript, modules: { vo: { voice: "af_heart" } } };
  assert.deepEqual(planStages(script, {
    from: "align",
    to: "review",
    skip: ["polish", "lint"],
  }), ["align", "compose", "review"]);
});

test("planStages accepts comma-separated skips", () => {
  assert.deepEqual(planStages(baseScript, { skip: "compose,review" }), ["lint"]);
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
