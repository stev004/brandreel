import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { validateScript } from "../script.mjs";

const repoRoot = new URL("../..", import.meta.url).pathname;
const scriptCli = join(repoRoot, "bin", "script.mjs");
const fakeModel = join(repoRoot, "bin", "tests", "fixtures", "fake-model.mjs");

function workspace() {
  return mkdtempSync(join(tmpdir(), "brandreel-script-test-"));
}

function runScript(workspaceDir, extraArgs = [], env = {}) {
  return spawnSync(process.execPath, [scriptCli, workspaceDir, "--brand", "regulate", "--topic", "cannot sleep at 3am", ...extraArgs], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

function validationScript(durations = { moment: 3000, question: 3000, figure: 6000, verdict: 3000 }) {
  return {
    id: "validation",
    brand: "regulate",
    coreMechanic: "One visual mechanism carries the idea.",
    beats: [
      { kind: "moment", line: "Still awake?", durationMs: durations.moment },
      { kind: "question", lines: ["Need rest?"], durationMs: durations.question },
      {
        kind: "figure",
        label: "A small shift",
        value: { to: 3, decimals: 0 },
        axis: { min: 0, max: 3, achieved: 1, goal: 3 },
        stamps: [],
        durationMs: durations.figure,
      },
      { kind: "verdict", lines: ["Start with less."], durationMs: durations.verdict },
    ],
    close: { line: "Make room.", showWordmark: true },
    caption: "A small shift.",
    hashtags: ["#one", "#two", "#three"],
  };
}

test("dry-run writes a prompt containing the tone words and notes", () => {
  const dir = workspace();
  try {
    const result = runScript(dir, ["--dry-run"]);
    assert.equal(result.status, 0, result.stderr);
    const prompt = readFileSync(join(dir, "script-prompt.md"), "utf8");
    assert.match(prompt, /direct/);
    assert.match(prompt, /grounded in lived experience/);
    assert.match(prompt, /Brand voice notes, copied verbatim:/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fake model happy path writes script.json with the workspace basename as id", () => {
  const dir = workspace();
  try {
    writeFileSync(join(dir, "script-rejected.json"), "stale");
    const result = runScript(dir, ["--model-cmd", `node ${fakeModel}`]);
    assert.equal(result.status, 0, result.stderr);
    const script = JSON.parse(readFileSync(join(dir, "script.json"), "utf8"));
    assert.equal(script.id, dir.split("/").at(-1));
    assert.equal(script.brand, "regulate");
    assert.equal(Object.hasOwn(script, "modules"), false);
    assert.equal(existsSync(join(dir, "script-rejected.json")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("vo and music flags write only the requested module values", () => {
  const dir = workspace();
  try {
    const result = runScript(dir, [
      "--vo", "af_heart",
      "--music", "audio/custom.wav",
      "--model-cmd", `node ${fakeModel}`,
    ]);
    assert.equal(result.status, 0, result.stderr);
    const script = JSON.parse(readFileSync(join(dir, "script.json"), "utf8"));
    assert.deepEqual(script.modules, {
      vo: { voice: "af_heart" },
      music: { file: "audio/custom.wav" },
    });
    assert.match(result.stdout, /dropped model-provided modules/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a model module is dropped when no module flags are given", () => {
  const dir = workspace();
  try {
    const result = runScript(dir, ["--model-cmd", `node ${fakeModel}`]);
    assert.equal(result.status, 0, result.stderr);
    const script = JSON.parse(readFileSync(join(dir, "script.json"), "utf8"));
    assert.equal(Object.hasOwn(script, "modules"), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("invalid fake model reply exits nonzero and lists each violation", () => {
  const dir = workspace();
  try {
    const result = runScript(dir, ["--model-cmd", `node ${fakeModel}`], { FAKE_MODEL_INVALID: "1" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /missing required key: coreMechanic/);
    assert.match(result.stderr, /total beat durationMs must be between 15000 and 35000/);
    assert.equal(existsSync(join(dir, "script.json")), false);
    const rejected = JSON.parse(readFileSync(join(dir, "script-rejected.json"), "utf8"));
    assert.ok(Array.isArray(rejected.violations));
    assert.equal(rejected.script.id, dir.split("/").at(-1));
    assert.match(result.stderr, /script-rejected\.json/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("banned phrase in a model reply is rejected", () => {
  const dir = workspace();
  try {
    const bannedResult = runScript(dir, ["--model-cmd", `node ${fakeModel}`], { FAKE_MODEL_BANNED: "1" });
    assert.notEqual(bannedResult.status, 0);
    assert.match(bannedResult.stderr, /banned phrase found: journey/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("copy limit violations name the beat field", () => {
  const dir = workspace();
  try {
    const result = runScript(dir, ["--model-cmd", `node ${fakeModel}`], { FAKE_MODEL_LONG_MOMENT: "1" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /beats\[0\]\.line must be 44 characters or fewer/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("caption with more than two lines is rejected", () => {
  const dir = workspace();
  try {
    const result = runScript(dir, ["--model-cmd", `node ${fakeModel}`], { FAKE_MODEL_THREE_LINE_CAPTION: "1" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /caption must contain at most 2 lines/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("hashtags must start with a hash and contain no spaces", () => {
  const dir = workspace();
  try {
    const result = runScript(dir, ["--model-cmd", `node ${fakeModel}`], { FAKE_MODEL_BAD_HASHTAG: "1" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /hashtags\[0\] must start with # and contain no spaces/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("dry-run prompt states the copy limits and module rule", () => {
  const dir = workspace();
  try {
    const result = runScript(dir, ["--dry-run"]);
    assert.equal(result.status, 0, result.stderr);
    const prompt = readFileSync(join(dir, "script-prompt.md"), "utf8");
    assert.match(prompt, /moment\.line <= 44/);
    assert.match(prompt, /figure\.minTick <= 1 character; minTick is a single character such as 0/);
    assert.match(prompt, /figure\.achievedTick <= 5 characters/);
    assert.match(prompt, /figure\.goalTick <= 18 characters/);
    assert.match(prompt, /Figure pacing:.*3000ms static/);
    assert.match(prompt, /stamp after 5600ms/);
    assert.match(prompt, /caption has at most 2 newline-separated lines/);
    assert.match(prompt, /Do not emit a modules key/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fenced JSON is extracted and persisted", () => {
  const dir = workspace();
  try {
    const result = runScript(dir, ["--model-cmd", `node ${fakeModel}`]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(readFileSync(join(dir, "script.json"), "utf8"), /"kind": "figure"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("each beat kind accepts its minimum duration", () => {
  const minimums = { moment: 2000, question: 2500, figure: 6000, verdict: 2000 };
  for (const [kind, minimum] of Object.entries(minimums)) {
    const durations = { moment: 4000, question: 4500, figure: 9000, verdict: 4000 };
    durations[kind] = minimum;
    const index = ["moment", "question", "figure", "verdict"].indexOf(kind);
    const violations = validateScript(validationScript(durations), "regulate", "validation", "");
    assert.equal(violations.some((violation) => violation.startsWith(`beats[${index}].durationMs`)), false, kind);
  }
});

test("each beat kind rejects a duration below its minimum", () => {
  const minimums = { moment: 2000, question: 2500, figure: 6000, verdict: 2000 };
  for (const [kind, minimum] of Object.entries(minimums)) {
    const durations = { moment: 4000, question: 4500, figure: 9000, verdict: 4000 };
    durations[kind] = minimum - 1;
    const index = ["moment", "question", "figure", "verdict"].indexOf(kind);
    const violations = validateScript(validationScript(durations), "regulate", "validation", "");
    assert.ok(violations.some((violation) => violation.startsWith(`beats[${index}].durationMs must be between`)), kind);
  }
});

test("question lines reject thirteen characters", () => {
  const script = validationScript();
  script.beats[1].lines = ["1234567890123"];
  const violations = validateScript(script, "regulate", "validation", "");
  assert.ok(violations.some((violation) => violation.includes("beats[1].lines[0] must be 12 characters or fewer")));
});

test("figure minTick limit names the beat and field", () => {
  const script = validationScript();
  script.beats[2].minTick = "0h";
  const violations = validateScript(script, "regulate", "validation", "");
  assert.ok(violations.some((violation) => violation.includes("beats[2].minTick must be 1 characters or fewer")));
});

test("figure goalTick accepts eighteen characters and rejects nineteen", () => {
  const accepted = validationScript();
  accepted.beats[2].goalTick = "123456789012345678";
  assert.equal(validateScript(accepted, "regulate", "validation", "").some((violation) => violation.includes("goalTick")), false);

  const rejected = validationScript();
  rejected.beats[2].goalTick = "1234567890123456789";
  const violations = validateScript(rejected, "regulate", "validation", "");
  assert.ok(violations.some((violation) => violation.includes("beats[2].goalTick must be 18 characters or fewer")));
});

test("figure static-tail rule rejects a long beat without a late stamp", () => {
  const script = validationScript({ moment: 3000, question: 3000, figure: 9000, verdict: 3000 });
  const violations = validateScript(script, "regulate", "validation", "");
  assert.ok(violations.includes("[pacing] figure beat 2 would be static for 3400ms after its last event; shorten durationMs or add a stamp after 5600ms"));
});

test("figure static-tail rule accepts an 8000ms beat with a stamp at 6000ms", () => {
  const script = validationScript({ moment: 3000, question: 3000, figure: 8000, verdict: 3000 });
  script.beats[2].stamps = [{ tone: "done", text: "Now", offsetMs: 6000 }];
  assert.equal(validateScript(script, "regulate", "validation", "").some((violation) => violation.startsWith("[pacing] figure beat")), false);
});

test("retry loop succeeds on the second attempt and writes both artifacts", () => {
  const dir = workspace();
  const modelState = join(dir, "model-state");
  const lintState = join(dir, "lint-state");
  try {
    const result = runScript(dir, [
      "--retries", "1",
      "--lint-cmd", `node ${join(repoRoot, "bin/tests/fixtures/fake-lint.mjs")}`,
      "--model-cmd", `node ${fakeModel}`,
    ], { FAKE_MODEL_STATE: modelState, FAKE_LINT_STATE: lintState });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(readFileSync(join(dir, "script.json"), "utf8")).brand, "regulate");
    assert.equal(existsSync(join(dir, "layout.json")), true);
    assert.equal(readFileSync(modelState, "utf8"), "2");
    assert.equal(readFileSync(lintState, "utf8"), "2");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("retry loop fails after retries and preserves an existing script", () => {
  const dir = workspace();
  const original = JSON.stringify({ keep: true });
  writeFileSync(join(dir, "script.json"), original);
  try {
    const result = runScript(dir, ["--retries", "1", "--skip-lint", "--model-cmd", `node ${fakeModel}`], { FAKE_MODEL_INVALID: "1" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /missing required key: coreMechanic/);
    assert.equal(readFileSync(join(dir, "script.json"), "utf8"), original);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
