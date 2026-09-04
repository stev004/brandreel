#!/usr/bin/env node
import { existsSync, readFileSync, rmSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const engineDir = join(repoRoot, "engine");
const workspaceArg = process.argv[2];

const fail = (message) => {
  console.error(`compose: ${message}`);
  process.exit(1);
};

if (!workspaceArg) {
  fail("usage: node bin/compose.mjs <workspace-dir>");
}

const workspaceDir = resolve(repoRoot, workspaceArg);
const scriptPath = join(workspaceDir, "script.json");
const wordsPath = join(workspaceDir, "words.json");

if (!existsSync(scriptPath)) {
  fail(`missing script.json at ${scriptPath}`);
}

let script;
try {
  script = JSON.parse(readFileSync(scriptPath, "utf8"));
} catch (error) {
  fail(`could not read or parse ${scriptPath}: ${error.message}`);
}

let words;
if (existsSync(wordsPath)) {
  try {
    words = JSON.parse(readFileSync(wordsPath, "utf8"));
  } catch (error) {
    fail(`could not read or parse ${wordsPath}: ${error.message}`);
  }
}

if (!script || typeof script.brand !== "string" || script.brand.length === 0) {
  fail(`${scriptPath} must contain a non-empty brand name`);
}

const brandPath = join(repoRoot, "brands", script.brand, "brand.json");
if (!existsSync(brandPath)) {
  fail(`missing brand.json for "${script.brand}" at ${brandPath}`);
}

let brand;
try {
  brand = JSON.parse(readFileSync(brandPath, "utf8"));
} catch (error) {
  fail(`could not read or parse ${brandPath}: ${error.message}`);
}

const tempDir = mkdtempSync(join(tmpdir(), "brandreel-props-"));
const propsPath = join(tempDir, "props.json");
const props = { brand, script };
if (words !== undefined) {
  props.words = words;
}
writeFileSync(propsPath, JSON.stringify(props, null, 2));

const outputPath = join(workspaceDir, "render.mp4");
const result = spawnSync(
  "npx",
  ["remotion", "render", "src/index.ts", "Stack", outputPath, `--props=${propsPath}`],
  { cwd: engineDir, stdio: "inherit" },
);

rmSync(tempDir, { recursive: true, force: true });

if (result.error) {
  fail(`could not start Remotion: ${result.error.message}`);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
