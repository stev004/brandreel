#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const STAGES = ["vo", "align", "compose", "polish", "lint", "review"];

export function planStages(script, options = {}) {
  const from = options.from ?? STAGES[0];
  const to = options.to ?? STAGES.at(-1);
  const fromIndex = STAGES.indexOf(from);
  const toIndex = STAGES.indexOf(to);
  if (fromIndex === -1) throw new Error(`unknown stage ${from}`);
  if (toIndex === -1) throw new Error(`unknown stage ${to}`);
  if (fromIndex > toIndex) throw new Error("--from must not come after --to");

  const skip = new Set(
    Array.isArray(options.skip)
      ? options.skip
      : String(options.skip ?? "").split(",").filter(Boolean),
  );
  for (const stage of skip) {
    if (!STAGES.includes(stage)) throw new Error(`unknown stage ${stage}`);
  }

  const hasVo = Boolean(script?.modules?.vo);
  const hasMusic = Boolean(script?.modules?.music);
  return STAGES.slice(fromIndex, toIndex + 1).filter((stage) => {
    if (skip.has(stage)) return false;
    if ((stage === "vo" || stage === "align") && !hasVo) return false;
    if (stage === "polish" && !hasVo && !hasMusic) return false;
    return true;
  });
}

function parseArgs(argv) {
  let workspaceArg = null;
  const options = { skip: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("-") && workspaceArg === null) {
      workspaceArg = arg;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (["--from", "--to", "--skip", "--music"].includes(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value`);
      index += 1;
      if (arg === "--skip") options.skip.push(...value.split(",").filter(Boolean));
      else options[arg.slice(2)] = value;
      continue;
    }
    if (arg.startsWith("--from=") || arg.startsWith("--to=") || arg.startsWith("--skip=") || arg.startsWith("--music=")) {
      const separator = arg.indexOf("=");
      const name = arg.slice(2, separator);
      const value = arg.slice(separator + 1);
      if (!value) throw new Error(`--${name} requires a value`);
      if (name === "skip") options.skip.push(...value.split(",").filter(Boolean));
      else options[name] = value;
      continue;
    }
    throw new Error(`unknown argument ${arg}`);
  }

  if (!workspaceArg) throw new Error("missing workspace directory");
  return { workspaceArg, ...options };
}

function readScript(workspaceDir) {
  const scriptPath = join(workspaceDir, "script.json");
  if (!existsSync(scriptPath)) throw new Error(`missing script.json at ${scriptPath}`);
  try {
    return JSON.parse(readFileSync(scriptPath, "utf8"));
  } catch (error) {
    throw new Error(`could not read or parse ${scriptPath}: ${error.message}`);
  }
}

function commandFor(stage, workspaceArg, music) {
  const commands = {
    vo: ["audio/.venv/bin/python", ["bin/vo.py", workspaceArg]],
    align: ["audio/.venv/bin/python", ["bin/align.py", workspaceArg]],
    compose: ["node", ["bin/compose.mjs", workspaceArg]],
    polish: ["node", ["bin/polish.mjs", workspaceArg]],
    lint: ["node", ["bin/lint.mjs", workspaceArg]],
    review: ["node", ["bin/review.mjs", workspaceArg]],
  };
  const command = commands[stage];
  if (stage === "polish" && music) command[1].push("--music", music);
  return command;
}

function shellQuote(value) {
  return /^[A-Za-z0-9_./:-]+$/.test(value) ? value : JSON.stringify(value);
}

function displayCommand(stage, workspaceArg, music) {
  const [executable, args] = commandFor(stage, workspaceArg, music);
  return [executable, ...args].map(shellQuote).join(" ");
}

function runStage(stage, workspaceArg, music) {
  const [executable, args] = commandFor(stage, workspaceArg, music);
  const result = spawnSync(executable, args, { cwd: repoRoot, stdio: "inherit" });
  if (result.error) {
    throw new Error(`${stage} failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${stage} failed with exit code ${result.status ?? 1}`);
  }
}

export function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const workspaceDir = resolve(repoRoot, options.workspaceArg);
  const script = readScript(workspaceDir);
  const stages = planStages(script, options);
  const music = options.music ?? script.modules?.music?.file;

  if (options.dryRun) {
    for (const stage of stages) {
      console.log(`${stage}: ${displayCommand(stage, options.workspaceArg, music)}`);
    }
    return 0;
  }

  for (const stage of stages) runStage(stage, options.workspaceArg, music);
  return 0;
}

function main() {
  try {
    process.exitCode = run();
  } catch (error) {
    console.error(`reel: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
