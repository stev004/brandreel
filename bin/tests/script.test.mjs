import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { buildPrompt, HOOK_ARCHETYPE_RULES, validateScript } from "../script.mjs";

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
    close: { line: "Make room.", showWordmark: true, durationMs: 3000 },
    caption: "A small shift.",
    hashtags: ["#one", "#two", "#three"],
  };
}

function hookBrief(hookArchetype, hookLine = "") {
  return {
    coreMechanic: "One visual mechanism carries the idea.",
    hookArchetype,
    hookLine,
    facts: ["0 to 3 steps", "1 small shift"],
    beatKinds: ["moment", "question", "figure", "verdict"],
    requiredPhrases: [],
    bannedPhrases: [],
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

test("direct-callout rejects a numbered-promise opener", () => {
  const script = validationScript();
  script.beats[0].line = "Three ways to reset.";
  const violations = validateScript(script, "regulate", "validation", "", hookBrief("direct-callout"));
  assert.ok(violations.some((violation) => violation.includes("direct-callout") && violation.includes("Three ways to reset")));
});

test("numbered-promise accepts a number word", () => {
  const accepted = validationScript();
  accepted.beats[0].line = "Three ways to reset.";
  assert.equal(validateScript(accepted, "regulate", "validation", "", hookBrief("numbered-promise")).some((violation) => violation.includes("hook archetype")), false);
});

test("numbered-promise rejects a plain opener", () => {
  const rejected = validationScript();
  rejected.beats[0].line = "Reset your body.";
  assert.ok(validateScript(rejected, "regulate", "validation", "", hookBrief("numbered-promise")).some((violation) => violation.includes("numbered-promise")));
});

test("curiosity-gap accepts a question", () => {
  const accepted = validationScript();
  accepted.beats[0].line = "Why are you awake?";
  assert.equal(validateScript(accepted, "regulate", "validation", "", hookBrief("curiosity-gap")).some((violation) => violation.includes("hook archetype")), false);
});

test("curiosity-gap rejects a plain opener", () => {
  const rejected = validationScript();
  rejected.beats[0].line = "Start with less.";
  assert.ok(validateScript(rejected, "regulate", "validation", "", hookBrief("curiosity-gap")).some((violation) => violation.includes("curiosity-gap")));
});

test("contrarian-claim accepts a challenge", () => {
  const accepted = validationScript();
  accepted.beats[0].line = "This is not rest.";
  assert.equal(validateScript(accepted, "regulate", "validation", "", hookBrief("contrarian-claim")).some((violation) => violation.includes("hook archetype")), false);
});

test("contrarian-claim rejects a question", () => {
  const rejected = validationScript();
  rejected.beats[0].line = "Need rest?";
  assert.ok(validateScript(rejected, "regulate", "validation", "", hookBrief("contrarian-claim")).some((violation) => violation.includes("contrarian-claim")));
});

test("direct-callout accepts a person-facing opener", () => {
  const accepted = validationScript();
  accepted.beats[0].line = "You are still awake.";
  assert.equal(validateScript(accepted, "regulate", "validation", "", hookBrief("direct-callout")).some((violation) => violation.includes("hook archetype")), false);
});

test("direct-callout rejects an abstract opener", () => {
  const rejected = validationScript();
  rejected.beats[0].line = "A quiet reset helps.";
  assert.ok(validateScript(rejected, "regulate", "validation", "", hookBrief("direct-callout")).some((violation) => violation.includes("direct-callout")));
});

test("hook archetype rules expose descriptions and predicates", () => {
  for (const rule of Object.values(HOOK_ARCHETYPE_RULES)) {
    assert.equal(typeof rule.predicate, "function");
    assert.equal(typeof rule.description, "string");
    assert.ok(rule.description.length > 0);
  }
});

test("an incompatible exact hook line is rejected by both brief rules", () => {
  const script = validationScript();
  script.beats[0].line = "Three ways to reset.";
  const violations = validateScript(script, "regulate", "validation", "", hookBrief("direct-callout", "Three ways to reset."));
  assert.ok(violations.some((violation) => violation.includes("direct-callout")));
});

test("script exits clearly when a loaded brief hook line conflicts with its archetype", () => {
  const dir = workspace();
  try {
    writeFileSync(join(dir, "brief.json"), JSON.stringify({
      brand: "regulate",
      topic: "cannot sleep at 3am",
      hookArchetype: "direct-callout",
      hookLine: "Three ways to reset.",
    }));
    const result = runScript(dir, ["--retries", "0", "--skip-lint", "--model-cmd", `node ${fakeModel}`]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /brief\.hookLine .*does not satisfy hook archetype direct-callout/);
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

test("model-provided close.url and close.tagline are dropped", () => {
  const dir = workspace();
  try {
    const result = runScript(dir, ["--model-cmd", `node ${fakeModel}`]);
    assert.equal(result.status, 0, result.stderr);
    const script = JSON.parse(readFileSync(join(dir, "script.json"), "utf8"));
    assert.equal(Object.hasOwn(script.close, "url"), false);
    assert.equal(Object.hasOwn(script.close, "tagline"), false);
    assert.match(result.stdout, /dropped model-provided close\.url/);
    assert.match(result.stdout, /dropped model-provided close\.tagline/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--url sets the close URL after dropping any model URL", () => {
  const dir = workspace();
  try {
    const result = runScript(dir, ["--url", "https://regulate.example", "--tagline", "Make room.", "--model-cmd", `node ${fakeModel}`], { FAKE_MODEL_CLOSE_DURATION: "3400" });
    assert.equal(result.status, 0, result.stderr);
    const script = JSON.parse(readFileSync(join(dir, "script.json"), "utf8"));
    assert.equal(script.close.url, "https://regulate.example");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--tagline sets the close tagline after dropping any model tagline", () => {
  const dir = workspace();
  try {
    const result = runScript(dir, ["--tagline", "Make room.", "--model-cmd", `node ${fakeModel}`]);
    assert.equal(result.status, 0, result.stderr);
    const script = JSON.parse(readFileSync(join(dir, "script.json"), "utf8"));
    assert.equal(script.close.tagline, "Make room.");
    assert.match(result.stdout, /dropped model-provided close\.tagline/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--tagline rejects values over thirty-six characters", () => {
  const dir = workspace();
  try {
    const result = runScript(dir, ["--dry-run", "--tagline", "1234567890123456789012345678901234567"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /--tagline must be 36 characters or fewer/);
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
    assert.match(prompt, /Do not emit close\.url/);
    assert.match(prompt, /Do not emit close\.tagline; a curated tagline is supplied only by the --tagline flag/);
    assert.match(prompt, /2500 and 3000ms for a plain close/);
    assert.match(prompt, /3000 and 3500ms for a tagline-only close/);
    assert.match(prompt, /3400 and 3800ms for a close with a URL/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("dry-run prompt puts hook, pacing, and CTA timing in one lint-safe block", () => {
  const dir = workspace();
  try {
    const result = runScript(dir, ["--dry-run"]);
    assert.equal(result.status, 0, result.stderr);
    const prompt = readFileSync(join(dir, "script-prompt.md"), "utf8");
    assert.match(prompt, /Lint-safe timing contract \(hook, pacing, CTA\):.*moment with no thoughts is at most 3000ms.*verdict must end within 3000ms.*question must end within 3000ms.*close duration must be 2500-3000ms plain, 3000-3500ms tagline-only, or 3400-3800ms with a URL/s);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("plain close duration must be between 2500 and 3000ms", () => {
  const rejected = validationScript();
  rejected.close.durationMs = 2000;
  assert.ok(validateScript(rejected, "regulate", "validation", "").some((violation) => violation.includes("close.durationMs must be between 2500 and 3000ms for plain close")));

  const accepted = validationScript();
  accepted.close.durationMs = 3000;
  assert.equal(validateScript(accepted, "regulate", "validation", "").some((violation) => violation.startsWith("close.durationMs")), false);
});

test("moment without thoughts rejects 4000ms with a hook-safe fix", () => {
  const script = validationScript();
  script.beats[0].durationMs = 4000;
  const violations = validateScript(script, "regulate", "validation", "");
  assert.ok(violations.some((violation) => violation.includes("beats[0].durationMs") && violation.includes("add a thought or shorten")));
});

test("moment with a thought accepts 4000ms", () => {
  const script = validationScript();
  script.beats[0].thoughts = ["Let the room get quieter."];
  script.beats[0].durationMs = 4000;
  assert.equal(validateScript(script, "regulate", "validation", "").some((violation) => violation.startsWith("beats[0].durationMs")), false);
});

test("tagline-only close rejects 2800ms because CTA dwell is too short", () => {
  const script = validationScript();
  script.close.tagline = "Make room.";
  script.close.durationMs = 2800;
  const violations = validateScript(script, "regulate", "validation", "");
  assert.ok(violations.some((violation) => violation.includes("between 3000 and 3500ms for tagline-only close")));
});

test("plain close accepts its 2500ms CTA minimum", () => {
  const script = validationScript();
  script.close.durationMs = 2500;
  assert.equal(validateScript(script, "regulate", "validation", "").some((violation) => violation.startsWith("close.durationMs")), false);
});

test("close with a URL rejects 3300ms and accepts 3400ms", () => {
  const rejected = validationScript();
  rejected.close.url = "https://regulate.example";
  rejected.close.durationMs = 3300;
  assert.ok(validateScript(rejected, "regulate", "validation", "").some((violation) => violation.includes("between 3400 and 3800ms for close with URL")));

  const accepted = validationScript();
  accepted.close.url = "https://regulate.example";
  accepted.close.durationMs = 3400;
  assert.equal(validateScript(accepted, "regulate", "validation", "").some((violation) => violation.startsWith("close.durationMs")), false);
});

test("one-line verdict rejects 3600ms and accepts 3200ms", () => {
  const rejected = validationScript();
  rejected.beats[3].durationMs = 3600;
  assert.ok(validateScript(rejected, "regulate", "validation", "").some((violation) => violation.includes("beats[3].durationMs") && violation.includes("3200ms")));

  const accepted = validationScript();
  accepted.beats[3].durationMs = 3200;
  assert.equal(validateScript(accepted, "regulate", "validation", "").some((violation) => violation.startsWith("beats[3].durationMs")), false);
});

test("question without a dek rejects 4000ms and accepts 3600ms", () => {
  const rejected = validationScript();
  rejected.beats[1].durationMs = 4000;
  assert.ok(validateScript(rejected, "regulate", "validation", "").some((violation) => violation.includes("beats[1].durationMs") && violation.includes("3600ms")));

  const accepted = validationScript();
  accepted.beats[1].durationMs = 3600;
  assert.equal(validateScript(accepted, "regulate", "validation", "").some((violation) => violation.startsWith("beats[1].durationMs")), false);
});

test("plain close rejects 3800ms because its maximum is 3000ms", () => {
  const script = validationScript();
  script.close.durationMs = 3800;
  const violations = validateScript(script, "regulate", "validation", "");
  assert.ok(violations.some((violation) => violation.includes("plain close") && violation.includes("3000ms")));
});

test("tagline-only close rejects 3600ms because its maximum is 3500ms", () => {
  const script = validationScript();
  script.close.tagline = "Make room.";
  script.close.durationMs = 3600;
  const violations = validateScript(script, "regulate", "validation", "");
  assert.ok(violations.some((violation) => violation.includes("tagline-only close") && violation.includes("3500ms")));
});

test("close with a URL accepts 3800ms", () => {
  const script = validationScript();
  script.close.url = "https://regulate.example";
  script.close.durationMs = 3800;
  assert.equal(validateScript(script, "regulate", "validation", "").some((violation) => violation.startsWith("close.durationMs")), false);
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

test("figure value.decimals must be an integer from zero to two", () => {
  const script = validationScript();
  script.beats[2].value.decimals = 17;
  const violations = validateScript(script, "regulate", "validation", "");
  assert.ok(violations.some((violation) => violation.includes("beats[2].value.decimals") && violation.includes("integer from 0 to 2")));
});

test("figure value.decimals must match the matching fact number", () => {
  const script = validationScript();
  script.beats[2].value = { to: 3.5, decimals: 0 };
  script.beats[2].axis = { min: 0, max: 3.5, achieved: 1, goal: 3.5 };
  const brief = hookBrief("direct-callout");
  brief.facts = ["0 to 3.5 steps", "1 small shift"];
  const violations = validateScript(script, "regulate", "validation", "", brief);
  assert.ok(violations.some((violation) => violation.includes("beats[2].value.decimals") && violation.includes("3.5")));
});

test("figure stamp offsets must be strictly increasing", () => {
  const script = validationScript();
  script.beats[2].stamps = [
    { tone: "done", text: "First", offsetMs: 2000 },
    { tone: "done", text: "Second", offsetMs: 1000 },
  ];
  const violations = validateScript(script, "regulate", "validation", "");
  assert.ok(violations.some((violation) => violation.includes("beats[2].stamps[1].offsetMs") && violation.includes("strictly increasing")));
});

test("figure stamp offsets must be before the beat duration", () => {
  const script = validationScript();
  script.beats[2].stamps = [{ tone: "done", text: "Late", offsetMs: 6000 }];
  const violations = validateScript(script, "regulate", "validation", "");
  assert.ok(violations.some((violation) => violation.includes("beats[2].stamps[0].offsetMs") && violation.includes("less than beat.durationMs")));
});

test("a figure with valid decimals and stamp offsets is accepted", () => {
  const script = validationScript();
  script.beats[2].stamps = [
    { tone: "done", text: "First", offsetMs: 1000 },
    { tone: "done", text: "Now", offsetMs: 5999 },
  ];
  const violations = validateScript(script, "regulate", "validation", "");
  assert.equal(violations.some((violation) => violation.includes("beats[2].value.decimals") || violation.includes("beats[2].stamps")), false, violations.join("\n"));
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
  try {
    const result = runScript(dir, [
      "--retries", "1",
      "--skip-lint",
      "--model-cmd", `node ${fakeModel}`,
    ], { FAKE_MODEL_STATE: modelState, FAKE_MODEL_BAD_THEN_GOOD: "1" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(readFileSync(join(dir, "script.json"), "utf8")).brand, "regulate");
    assert.equal(existsSync(join(dir, "layout.json")), true);
    assert.equal(readFileSync(modelState, "utf8"), "2");
    const attempts = JSON.parse(readFileSync(join(dir, "script-attempts.json"), "utf8"));
    assert.equal(attempts.attempts, 2);
    assert.equal(attempts.retries, 1);
    assert.equal(attempts.outcome, "accepted");
    assert.equal(attempts.violationsPerAttempt.length, 2);
    assert.ok(attempts.violationsPerAttempt[0].length > 0);
    assert.deepEqual(attempts.violationsPerAttempt[1], []);
    assert.match(result.stdout, /script: accepted on attempt 2 of 2/);
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
    const attempts = JSON.parse(readFileSync(join(dir, "script-attempts.json"), "utf8"));
    assert.equal(attempts.attempts, 2);
    assert.equal(attempts.retries, 1);
    assert.equal(attempts.outcome, "rejected");
    assert.equal(attempts.violationsPerAttempt.length, 2);
    assert.match(result.stdout, /script: rejected after 2 attempts/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
