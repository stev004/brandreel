#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";

const archetypes = ["curiosity-gap", "contrarian-claim", "direct-callout", "numbered-promise"];
const beatKinds = ["moment", "question", "figure", "verdict"];
const platforms = ["tiktok", "reels", "shorts"];

export const questions = [
  { key: "brand", label: "Brand", default: null },
  { key: "topic", label: "Topic", required: true },
  { key: "audience", label: "Audience and situation", required: true },
  { key: "hookArchetype", label: "Hook archetype", default: "direct-callout", enum: archetypes },
  { key: "hookLine", label: "Exact first line", default: "", optional: true },
  { key: "coreMechanic", label: "Core mechanic", required: true },
  { key: "facts", label: "Facts and numbers", default: [], list: true },
  { key: "beatKinds", label: "Allowed beat kinds", default: beatKinds, list: true, enum: beatKinds },
  { key: "targetDurationMs", label: "Target duration in ms", default: 25000, number: true },
  { key: "voice", label: "Voice", default: "none" },
  { key: "music", label: "Music", default: "none" },
  { key: "platform", label: "Platform", default: "reels", enum: platforms },
  { key: "url", label: "URL", default: "none" },
  { key: "tagline", label: "Tagline", default: "none" },
  { key: "requiredPhrases", label: "Required phrases", default: [], list: true },
  { key: "bannedPhrases", label: "Banned phrases", default: [], list: true },
  { key: "notes", label: "Notes", default: "" },
];

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`could not read or parse ${label}: ${error.message}`);
  }
}

export function parseArgs(argv) {
  let workspaceArg = null;
  const options = { answers: null, brand: null, defaults: false };
  const valueOptions = new Map([["--answers", "answers"], ["--brand", "brand"]]);
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("-") && workspaceArg === null) {
      workspaceArg = arg;
      continue;
    }
    if (arg === "--defaults") {
      options.defaults = true;
      continue;
    }
    const optionName = [...valueOptions.keys()].find((name) => arg === name || arg.startsWith(`${name}=`));
    if (optionName) {
      const value = arg.startsWith(`${optionName}=`) ? arg.slice(optionName.length + 1) : argv[++index];
      if (!value || value.startsWith("--")) throw new Error(`${optionName} requires a value`);
      options[valueOptions.get(optionName)] = value;
      continue;
    }
    throw new Error(`unknown argument ${arg}`);
  }
  if (!workspaceArg) throw new Error("missing workspace directory");
  return { workspaceArg, ...options };
}

function listValue(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (value === undefined || value === null || value === "" || value === "none") return [];
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function existingBrand(workspaceDir, requestedBrand) {
  if (requestedBrand) return requestedBrand;
  const scriptPath = join(workspaceDir, "script.json");
  if (!existsSync(scriptPath)) return undefined;
  return readJson(scriptPath, scriptPath).brand;
}

function answerValue(question, raw, useDefault) {
  if (raw === undefined || raw === null || raw === "") {
    if (useDefault && question.default !== null && question.default !== undefined) return question.default;
    return raw ?? "";
  }
  if (question.list) return listValue(raw);
  if (question.number) return Number(raw);
  if (question.key === "hookLine" && String(raw).trim().toLowerCase() === "none") return "";
  return String(raw).trim();
}

async function collectAnswers(workspaceDir, supplied, options) {
  const answers = { ...supplied };
  answers.brand ??= existingBrand(workspaceDir, options.brand);
  if (options.answers || options.defaults) {
    return Object.fromEntries(questions.map((question) => [
      question.key,
      answerValue(question, answers[question.key], true),
    ]));
  }
  if (!stdin.isTTY) {
    const inputReader = createInterface({ input: stdin, crlfDelay: Infinity });
    const inputLines = [];
    for await (const line of inputReader) inputLines.push(line);
    inputReader.close();
    return Object.fromEntries(questions.map((question, index) => [
      question.key,
      answerValue(question, inputLines[index], true),
    ]));
  }
  const readline = createInterface({ input: stdin, output: stdout });
  const ask = (prompt) => new Promise((resolveAnswer, rejectAnswer) => {
    let settled = false;
    const onClose = () => {
      if (!settled) {
        settled = true;
        rejectAnswer(new Error("input ended before all interview answers were provided"));
      }
    };
    readline.once("close", onClose);
    readline.question(prompt).then((value) => {
      if (settled) return;
      settled = true;
      readline.removeListener("close", onClose);
      resolveAnswer(value);
    }, (error) => {
      if (settled) return;
      settled = true;
      readline.removeListener("close", onClose);
      rejectAnswer(error);
    });
  });
  try {
    for (const question of questions) {
      const fallback = question.key === "brand" ? answers.brand : question.default;
      const shownDefault = fallback === null || fallback === undefined || fallback === "" ? "required" : Array.isArray(fallback) ? fallback.join(",") : fallback;
      const response = await ask(`${question.label} [${shownDefault}]: `);
      answers[question.key] = answerValue(question, response, true);
      if (question.key === "brand" && !answers.brand) answers.brand = existingBrand(workspaceDir, options.brand);
    }
  } finally {
    readline.close();
  }
  return answers;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateBrief(brief) {
  const violations = [];
  for (const key of ["brand", "topic", "audience", "coreMechanic"]) {
    if (!isNonEmptyString(brief?.[key])) violations.push(`missing required answer: ${key}`);
  }
  if (!archetypes.includes(brief?.hookArchetype)) violations.push(`hookArchetype must be one of ${archetypes.join(", ")}`);
  if (!Array.isArray(brief?.facts) || brief.facts.some((fact) => !isNonEmptyString(fact))) violations.push("facts must be a list of non-empty strings");
  if (!Array.isArray(brief?.beatKinds) || brief.beatKinds.some((kind) => !beatKinds.includes(kind))) violations.push(`beatKinds must be a subset of ${beatKinds.join(", ")}`);
  if (!Number.isInteger(brief?.targetDurationMs) || brief.targetDurationMs < 15000 || brief.targetDurationMs > 35000) {
    violations.push("targetDurationMs must be an integer between 15000 and 35000");
  }
  if (brief?.voice !== "none" && !isNonEmptyString(brief?.voice)) violations.push("voice must be a voice id or none");
  if (brief?.music !== "none" && !isNonEmptyString(brief?.music)) violations.push("music must be a path or none");
  if (!platforms.includes(brief?.platform)) violations.push(`platform must be one of ${platforms.join(", ")}`);
  for (const key of ["requiredPhrases", "bannedPhrases"]) {
    if (!Array.isArray(brief?.[key]) || brief[key].some((phrase) => !isNonEmptyString(phrase))) violations.push(`${key} must be a list of non-empty strings`);
  }
  return violations;
}

export async function run(options) {
  const workspaceDir = resolve(options.workspaceArg);
  mkdirSync(workspaceDir, { recursive: true });
  const supplied = options.answers ? readJson(resolve(options.answers), options.answers) : {};
  if (!supplied || typeof supplied !== "object" || Array.isArray(supplied)) throw new Error("answers must be a JSON object");
  const answers = await collectAnswers(workspaceDir, supplied, options);
  if (options.brand) answers.brand = options.brand;
  answers.facts = listValue(answers.facts);
  answers.beatKinds = listValue(answers.beatKinds);
  if (answers.facts.length === 0) answers.beatKinds = answers.beatKinds.filter((kind) => kind !== "figure");
  const brief = { version: 1, ...answers, createdAt: new Date().toISOString() };
  const violations = validateBrief(brief);
  if (violations.length > 0) throw new Error(`brief validation failed:\n${violations.map((violation) => `- ${violation}`).join("\n")}`);
  const briefPath = join(workspaceDir, "brief.json");
  writeFileSync(briefPath, `${JSON.stringify(brief, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(brief, null, 2));
  return 0;
}

async function main() {
  try {
    process.exitCode = await run(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(`interview: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
