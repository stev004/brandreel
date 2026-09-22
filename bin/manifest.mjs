#!/usr/bin/env node
import { existsSync, readFileSync, rmSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { addMeasuredMetrics, measureLayoutElements } from "./measure-text.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const engineDir = join(repoRoot, "engine");

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`could not read or parse ${path}: ${error.message}`);
  }
}

export async function run(workspaceArg, options = {}) {
  if (!workspaceArg) throw new Error("usage: node bin/manifest.mjs <workspace-dir>");

  const workspaceDir = resolve(repoRoot, workspaceArg);
  const scriptPath = join(workspaceDir, "script.json");
  if (!existsSync(scriptPath)) throw new Error(`missing script.json at ${scriptPath}`);

  const script = readJson(scriptPath);
  if (!script || typeof script.brand !== "string" || script.brand.length === 0) {
    throw new Error(`${scriptPath} must contain a non-empty brand name`);
  }

  const brandPath = join(repoRoot, "brands", script.brand, "brand.json");
  if (!existsSync(brandPath)) throw new Error(`missing brand.json for "${script.brand}" at ${brandPath}`);
  const brand = readJson(brandPath);

  let words;
  const wordsPath = join(workspaceDir, "words.json");
  if (existsSync(wordsPath)) words = readJson(wordsPath);

  const tempDir = mkdtempSync(join(tmpdir(), "brandreel-props-"));
  const propsPath = join(tempDir, "props.json");
  try {
    const props = { brand, script };
    if (words !== undefined) props.words = words;
    writeFileSync(propsPath, JSON.stringify(props, null, 2));

    const manifestBuild = spawnSync("npm", ["run", "manifest", "--silent"], {
      cwd: engineDir,
      stdio: "inherit",
    });
    if (manifestBuild.error || manifestBuild.status !== 0) {
      return manifestBuild.status ?? 1;
    }

    const layoutPath = join(workspaceDir, "layout.json");
    const manifestWrite = spawnSync(
      process.execPath,
      [join(engineDir, "out", "manifest", "manifest-cli.js"), propsPath, layoutPath],
      { cwd: engineDir, stdio: "inherit" },
    );
    if (manifestWrite.error || manifestWrite.status !== 0) {
      return manifestWrite.status ?? 1;
    }

    if (options.noMeasure || process.env.BRANDREEL_NO_MEASURE === "1") {
      console.error("manifest: glyph measurement disabled; retained estimatedLines");
      return 0;
    }

    const layout = readJson(layoutPath);
    const { metrics, warnings } = await measureLayoutElements(layout.elements);
    if (Object.keys(metrics).length > 0) {
      writeFileSync(layoutPath, `${JSON.stringify(addMeasuredMetrics(layout, metrics), null, 2)}\n`);
    }
    for (const warning of warnings) console.error(`manifest: ${warning}`);
    return 0;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const noMeasure = args.includes("--no-measure");
    const workspaceArg = args.find((arg) => !arg.startsWith("--"));
    process.exitCode = await run(workspaceArg, { noMeasure });
  } catch (error) {
    console.error(`manifest: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
