import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

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
    const result = runScript(dir, ["--model-cmd", `node ${fakeModel}`]);
    assert.equal(result.status, 0, result.stderr);
    const script = JSON.parse(readFileSync(join(dir, "script.json"), "utf8"));
    assert.equal(script.id, dir.split("/").at(-1));
    assert.equal(script.brand, "regulate");
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
