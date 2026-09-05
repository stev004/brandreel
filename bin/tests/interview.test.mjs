import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { validateBrief } from "../interview.mjs";
import { buildPrompt, validateScript } from "../script.mjs";

const repoRoot = new URL("../..", import.meta.url).pathname;
const interviewCli = join(repoRoot, "bin", "interview.mjs");
const scriptCli = join(repoRoot, "bin", "script.mjs");
const fakeModel = join(repoRoot, "bin", "tests", "fixtures", "fake-model.mjs");
const reelCli = join(repoRoot, "bin", "reel.mjs");

const answers = {
  brand: "regulate",
  topic: "cannot sleep at 3am",
  audience: "People awake in bed at 3am.",
  hookArchetype: "direct-callout",
  hookLine: "Still awake?",
  coreMechanic: "A quiet visual reset makes the next step visible.",
  facts: ["0 to 3 steps", "1 small shift"],
  beatKinds: ["moment", "question", "figure", "verdict"],
  targetDurationMs: 25000,
  voice: "none",
  music: "none",
  platform: "reels",
  url: "none",
  tagline: "none",
  requiredPhrases: ["Start with less."],
  bannedPhrases: ["hustle"],
  notes: "Keep it quiet.",
};

function tempWorkspace() {
  return mkdtempSync(join(tmpdir(), "brandreel-interview-test-"));
}

function runInterview(workspace, supplied = answers, extra = []) {
  const answerPath = join(workspace, "answers.json");
  writeFileSync(answerPath, JSON.stringify(supplied));
  return spawnSync(process.execPath, [interviewCli, workspace, "--answers", answerPath, ...extra], { encoding: "utf8" });
}

function briefScript() {
  return {
    id: "brief-test",
    brand: "regulate",
    coreMechanic: answers.coreMechanic,
    beats: [
      { kind: "moment", line: answers.hookLine, durationMs: 3000 },
      { kind: "question", lines: ["Need rest?"], durationMs: 3000 },
      {
        kind: "figure",
        label: "A small shift",
        unitLabel: "step",
        value: { to: 3, decimals: 0 },
        axis: { min: 0, max: 3, achieved: 1, goal: 3 },
        stamps: [{ tone: "done", text: "Notice", offsetMs: 1000 }],
        durationMs: 6000,
      },
      { kind: "verdict", lines: ["Start with less."], durationMs: 3000 },
    ],
    close: { line: "Make room.", showWordmark: true, durationMs: 3000 },
    caption: "A small shift.",
    hashtags: ["#one", "#two", "#three"],
  };
}

test("answers write a versioned valid brief", () => {
  const workspace = tempWorkspace();
  try {
    const result = runInterview(workspace);
    assert.equal(result.status, 0, result.stderr);
    const brief = JSON.parse(readFileSync(join(workspace, "brief.json"), "utf8"));
    assert.equal(brief.version, 1);
    assert.equal(brief.coreMechanic, answers.coreMechanic);
    assert.ok(brief.createdAt);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("missing required answer exits one with the field name", () => {
  const workspace = tempWorkspace();
  try {
    const result = runInterview(workspace, { ...answers, audience: "" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /missing required answer: audience/);
    assert.equal(existsSync(join(workspace, "brief.json")), false);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("defaults fill omitted optional answers", () => {
  const workspace = tempWorkspace();
  try {
    const supplied = { brand: answers.brand, topic: answers.topic, audience: answers.audience, coreMechanic: answers.coreMechanic };
    const result = runInterview(workspace, supplied, ["--defaults"]);
    assert.equal(result.status, 0, result.stderr);
    const brief = JSON.parse(readFileSync(join(workspace, "brief.json"), "utf8"));
    assert.equal(brief.hookArchetype, "direct-callout");
    assert.equal(brief.targetDurationMs, 25000);
    assert.deepEqual(brief.facts, []);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("empty facts remove figure from allowed beat kinds", () => {
  const workspace = tempWorkspace();
  try {
    const result = runInterview(workspace, { ...answers, facts: [] });
    assert.equal(result.status, 0, result.stderr);
    const brief = JSON.parse(readFileSync(join(workspace, "brief.json"), "utf8"));
    assert.equal(brief.beatKinds.includes("figure"), false);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("invalid enums are listed by brief validation", () => {
  const violations = validateBrief({ ...answers, hookArchetype: "made-up" });
  assert.ok(violations.some((violation) => violation.includes("hookArchetype")));
});

test("brief prompt contains its creative contract verbatim", () => {
  const prompt = buildPrompt({ name: "regulate", voice: { tone: ["direct"], notes: "notes" } }, answers.topic, 25000, answers);
  assert.match(prompt, /BRIEF - creative contract/);
  assert.match(prompt, /audience: People awake in bed at 3am\./);
  assert.match(prompt, /core mechanic: A quiet visual reset makes the next step visible\./);
  assert.match(prompt, /Use only the allowed beat kinds from the brief/);
});

test("brief rejects a core mechanic mismatch", () => {
  const violations = validateScript({ ...briefScript(), coreMechanic: "A different visual idea." }, "regulate", "brief-test", "", answers);
  assert.ok(violations.some((violation) => violation.includes("coreMechanic must equal brief.coreMechanic")));
});

test("brief rejects a figure number absent from facts", () => {
  const script = briefScript();
  script.beats[2].value.to = 9;
  const violations = validateScript(script, "regulate", "brief-test", "", answers);
  assert.ok(violations.some((violation) => violation.includes("figure number 9 is not in brief.facts")));
});

test("brief accepts figure numbers present in facts", () => {
  const violations = validateScript(briefScript(), "regulate", "brief-test", "", answers);
  assert.equal(violations.filter((violation) => violation.startsWith("brief rule:")).length, 0, violations.join("\n"));
});

test("brief rejects a banned phrase", () => {
  const script = briefScript();
  script.beats[0].line = "Try hustle tonight.";
  const violations = validateScript(script, "regulate", "brief-test", "", answers);
  assert.ok(violations.some((violation) => violation.includes("banned phrase found: hustle")));
});

test("brief requires required phrases on screen", () => {
  const script = briefScript();
  script.beats[3].lines = ["Take it slowly."];
  const violations = validateScript(script, "regulate", "brief-test", "", answers);
  assert.ok(violations.some((violation) => violation.includes("required phrase missing: Start with less.")));
});

test("brief rejects a hook line mismatch", () => {
  const script = briefScript();
  script.beats[0].line = "Not still awake?";
  const violations = validateScript(script, "regulate", "brief-test", "", answers);
  assert.ok(violations.some((violation) => violation.includes("first beat hook line")));
});

test("brief-aware fixture model echoes the mechanic and fact numbers", () => {
  const workspace = tempWorkspace();
  try {
    const interview = runInterview(workspace);
    assert.equal(interview.status, 0, interview.stderr);
    const result = spawnSync(process.execPath, [scriptCli, workspace, "--model-cmd", `node ${fakeModel}`, "--skip-lint"], {
      encoding: "utf8",
      env: { ...process.env, FAKE_MODEL_BRIEF: "1" },
    });
    assert.equal(result.status, 0, result.stderr);
    const script = JSON.parse(readFileSync(join(workspace, "script.json"), "utf8"));
    assert.equal(script.coreMechanic, answers.coreMechanic);
    assert.equal(script.beats[2].value.to, 3);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("reel dry-run adds interview and script only when script is absent", () => {
  const workspace = tempWorkspace();
  try {
    const result = spawnSync(process.execPath, [reelCli, workspace, "--dry-run"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.stdout.trim().split("\n").slice(0, 2).map((line) => line.split(":")[0]), ["interview", "script"]);
    writeFileSync(join(workspace, "script.json"), JSON.stringify(briefScript()));
    const existing = spawnSync(process.execPath, [reelCli, workspace, "--dry-run"], { encoding: "utf8" });
    assert.equal(existing.status, 0, existing.stderr);
    assert.equal(existing.stdout.includes("interview:"), false);
    assert.equal(existing.stdout.includes("script:"), false);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
