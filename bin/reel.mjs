#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const STAGES = ["vo", "align", "manifest", "compose", "polish", "lint", "review"];
export const PRE_STAGES = ["interview", "script"];

export function planStages(script, options = {}) {
  const allStages = [
    ...(options.includeInterview ? ["interview"] : []),
    ...(options.includeScript ? ["script"] : []),
    ...STAGES,
  ];
  const from = options.from ?? allStages[0];
  const to = options.to ?? allStages.at(-1);
  const fromIndex = allStages.indexOf(from);
  const toIndex = allStages.indexOf(to);
  if (fromIndex === -1) throw new Error(`unknown stage ${from}`);
  if (toIndex === -1) throw new Error(`unknown stage ${to}`);
  if (fromIndex > toIndex) throw new Error("--from must not come after --to");

  const skip = new Set(
    Array.isArray(options.skip)
      ? options.skip
      : String(options.skip ?? "").split(",").filter(Boolean),
  );
  for (const stage of skip) {
    if (!allStages.includes(stage)) throw new Error(`unknown stage ${stage}`);
  }

  const hasVo = Boolean(script?.modules?.vo);
  const hasMusic = Boolean(script?.modules?.music) || Boolean(options.music);
  return allStages.slice(fromIndex, toIndex + 1).filter((stage) => {
    if (skip.has(stage)) return false;
    if ((stage === "vo" || stage === "align") && !hasVo) return false;
    if (stage === "polish" && !hasVo && !hasMusic) return false;
    return true;
  });
}

function parseArgs(argv) {
  let workspaceArg = null;
  const options = { skip: [], modelCmd: "claude -p" };

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
    if (["--from", "--to", "--skip", "--music", "--model-cmd", "--brand", "--topic"].includes(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value`);
      index += 1;
      if (arg === "--skip") options.skip.push(...value.split(",").filter(Boolean));
      else options[arg.slice(2)] = value;
      continue;
    }
    if (["--from=", "--to=", "--skip=", "--music=", "--model-cmd=", "--brand=", "--topic="].some((prefix) => arg.startsWith(prefix))) {
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

function commandFor(stage, workspaceArg, music, options) {
  const commands = {
    interview: ["node", ["bin/interview.mjs", workspaceArg, ...(options.brand ? ["--brand", options.brand] : [])]],
    script: ["node", ["bin/script.mjs", workspaceArg, "--model-cmd", options.modelCmd, ...(options.brand ? ["--brand", options.brand] : []), ...(options.topic ? ["--topic", options.topic] : [])]],
    vo: ["audio/.venv/bin/python", ["bin/vo.py", workspaceArg]],
    align: ["audio/.venv/bin/python", ["bin/align.py", workspaceArg]],
    manifest: ["node", ["bin/manifest.mjs", workspaceArg]],
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

function displayCommand(stage, workspaceArg, music, options) {
  const [executable, args] = commandFor(stage, workspaceArg, music, options);
  return [executable, ...args].map(shellQuote).join(" ");
}

function runStage(stage, workspaceArg, music, options) {
  const [executable, args] = commandFor(stage, workspaceArg, music, options);
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
  const scriptPath = join(workspaceDir, "script.json");
  const briefPath = join(workspaceDir, "brief.json");
  const script = existsSync(scriptPath) ? readScript(workspaceDir) : null;
  const brief = existsSync(briefPath) ? JSON.parse(readFileSync(briefPath, "utf8")) : null;
  const includeInterview = !existsSync(briefPath) && !script;
  const includeScript = !script;
  const planningScript = script ?? {
    modules: {
      ...(brief?.voice && brief.voice !== "none" ? { vo: { voice: brief.voice } } : {}),
      ...(brief?.music && brief.music !== "none" ? { music: { file: brief.music } } : {}),
    },
  };
  const music = options.music ?? script?.modules?.music?.file ?? (brief?.music !== "none" ? brief?.music : undefined);
  const stages = planStages(planningScript, { ...options, music, includeInterview, includeScript });

  if (options.dryRun) {
    for (const stage of stages) {
      console.log(`${stage}: ${displayCommand(stage, options.workspaceArg, music, options)}`);
    }
    return 0;
  }

  for (const stage of stages) runStage(stage, options.workspaceArg, music, options);
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
