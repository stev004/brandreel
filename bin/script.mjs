#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const allowedKinds = new Set(["moment", "question", "figure", "verdict"]);
const requiredScriptKeys = ["id", "brand", "coreMechanic", "beats", "close", "caption", "hashtags"];

function parseArgs(argv) {
  let workspaceArg = null;
  const options = { modelCmd: "claude -p", durationMs: 25000, dryRun: false };
  const valueOptions = new Map([
    ["--brand", "brand"],
    ["--topic", "topic"],
    ["--model-cmd", "modelCmd"],
    ["--duration-ms", "durationMs"],
  ]);

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
    const optionName = [...valueOptions.keys()].find((name) => arg === name || arg.startsWith(`${name}=`));
    if (optionName) {
      let value;
      if (arg.startsWith(`${optionName}=`)) {
        value = arg.slice(optionName.length + 1);
      } else {
        value = argv[index + 1];
        if (!value || value === "--dry-run" || value.startsWith("--")) {
          throw new Error(`${optionName} requires a value`);
        }
        index += 1;
      }
      if (!value) throw new Error(`${optionName} requires a value`);
      options[valueOptions.get(optionName)] = value;
      continue;
    }
    throw new Error(`unknown argument ${arg}`);
  }

  if (!workspaceArg) throw new Error("missing workspace directory");
  if (!options.brand) throw new Error("missing --brand");
  if (!options.topic) throw new Error("missing --topic");
  options.durationMs = Number(options.durationMs);
  if (!Number.isFinite(options.durationMs) || options.durationMs <= 0) {
    throw new Error("--duration-ms must be a positive number");
  }
  return { workspaceArg, ...options };
}

function readBrand(brandName) {
  const brandPath = join(repoRoot, "brands", brandName, "brand.json");
  if (!existsSync(brandPath)) throw new Error(`missing brand.json for ${brandName} at ${brandPath}`);
  let brand;
  try {
    brand = JSON.parse(readFileSync(brandPath, "utf8"));
  } catch (error) {
    throw new Error(`could not read or parse ${brandPath}: ${error.message}`);
  }
  if (brand.name !== brandName) throw new Error(`brand.json name ${brand.name} does not match --brand ${brandName}`);
  if (!Array.isArray(brand.voice?.tone) || typeof brand.voice?.notes !== "string") {
    throw new Error(`brand.json for ${brandName} is missing voice tone or notes`);
  }
  return brand;
}

function scriptExample() {
  return {
    id: "workspace-basename",
    brand: "brand-name",
    coreMechanic: "One sentence describing the single visual mechanism.",
    modules: {
      vo: { voice: "voice-id" },
      music: { file: "audio/music.wav" },
    },
    beats: [
      {
        kind: "moment",
        eyebrow: "HOOK",
        line: "A short opening line.",
        thoughts: ["Optional supporting thought."],
        bg: "#0a1812",
        durationMs: 4000,
      },
      {
        kind: "question",
        kicker: "NOTICE",
        lines: ["A question on screen?"],
        dek: "Optional supporting line.",
        durationMs: 4000,
      },
      {
        kind: "figure",
        label: "A measurable idea",
        unitLabel: "steps",
        value: { to: 3, decimals: 0 },
        goalText: "The goal",
        axis: { min: 0, max: 3, achieved: 1, goal: 3 },
        achievedTick: "Now",
        goalTick: "Goal",
        minTick: "Start",
        stamps: [{ tone: "done", text: "First step", offsetMs: 1000 }],
        flash: { colorKey: "accent" },
        durationMs: 4000,
      },
      {
        kind: "verdict",
        lines: ["The closing insight.", "A practical invitation."],
        durationMs: 4000,
      },
    ],
    close: {
      line: "A clear closing line.",
      showWordmark: true,
      tagline: "Optional tagline.",
      url: "https://example.com",
      durationMs: 1000,
    },
    caption: "A caption of no more than 150 characters.",
    hashtags: ["#one", "#two", "#three"],
  };
}

export function buildPrompt(brand, topic, targetDurationMs) {
  const tone = brand.voice.tone.map((word) => `- ${word}`).join("\n");
  return `You are writing stage 1 of a short-form video pipeline.

Topic: ${topic}
Target total beat duration: ${targetDurationMs}ms
Brand: ${brand.name}

Brand voice tone:
${tone}

Brand voice notes, copied verbatim:
${brand.voice.notes}

Choose one hook archetype for the opening beat:
- Curiosity gap: reveal a surprising gap or unanswered question.
- Contrarian claim: challenge a familiar assumption.
- Direct callout: speak plainly to the person experiencing the problem.
- Numbered promise: promise a specific numbered set of useful steps.

Write a valid script using this JSON shape. The example includes every beat kind and all schema fields:
${JSON.stringify(scriptExample(), null, 2)}

Rules:
- coreMechanic is exactly one sentence and describes one visual mechanism.
- Every on-screen string lives in the beats. Keep the close and metadata purposeful.
- Use 4 to 8 beats. Every beat has a positive durationMs.
- Total beat durationMs must be between 15000 and 35000.
- caption must be 150 characters or fewer.
- hashtags must be an array of 3 to 6 strings.
- Do not use any banned phrases from the brand voice notes, case-insensitively.
- Respond with JSON only, no prose and no markdown.
`;
}

function extractFirstJsonObject(output) {
  for (let start = 0; start < output.length; start += 1) {
    if (output[start] !== "{") continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < output.length; index += 1) {
      const character = output[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') {
        inString = true;
        continue;
      }
      if (character === "{") depth += 1;
      if (character === "}") {
        depth -= 1;
        if (depth === 0) {
          try {
            const value = JSON.parse(output.slice(start, index + 1));
            if (value && typeof value === "object" && !Array.isArray(value)) return value;
          } catch {
            break;
          }
        }
      }
    }
  }
  throw new Error("model reply did not contain a JSON object");
}

function splitPhrases(text) {
  return text
    .split(/[;,/\n]/)
    .map((phrase) => phrase.trim().replace(/^[-*]\s*/, "").replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

export function bannedPhrases(notes) {
  const phrases = [];
  const lines = notes.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const marker = lines[index].match(/^\s*Banned:\s*(.*)$/i);
    if (!marker) continue;
    if (marker[1]) phrases.push(...splitPhrases(marker[1]));
    for (let next = index + 1; next < lines.length && /^\s*(?:[-*]\s*)?\S/.test(lines[next]); next += 1) {
      phrases.push(...splitPhrases(lines[next]));
    }
  }

  const copyBans = notes.match(/Copy bans:\s*(.*?)(?:\.\s+Message order:|$)/i)?.[1];
  if (copyBans) {
    for (const item of copyBans.split(";")) {
      const parenthetical = item.match(/\(([^)]+)\)/)?.[1];
      if (parenthetical) phrases.push(...splitPhrases(parenthetical));
      const quoted = item.match(/['"]([^'"]+)['"]/)?.[1];
      if (quoted) phrases.push(quoted.trim());
      if (!parenthetical && !quoted) phrases.push(...splitPhrases(item.replace(/\s+framing$/i, "")));
    }
  }
  return [...new Set(phrases.map((phrase) => phrase.toLowerCase()).filter(Boolean))];
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function addStringViolation(violations, value, label) {
  if (!isNonEmptyString(value)) violations.push(`${label} must be a non-empty string`);
}

function validateBeat(beat, index, violations) {
  const label = `beats[${index}]`;
  if (!beat || typeof beat !== "object" || Array.isArray(beat)) {
    violations.push(`${label} must be an object`);
    return;
  }
  if (!allowedKinds.has(beat.kind)) {
    violations.push(`${label}.kind must be one of moment, question, figure, verdict`);
    return;
  }
  if (typeof beat.durationMs !== "number" || !Number.isFinite(beat.durationMs) || beat.durationMs <= 0) {
    violations.push(`${label}.durationMs must be a positive number`);
  }
  if (beat.kind === "moment") addStringViolation(violations, beat.line, `${label}.line`);
  if (beat.kind === "question") {
    if (!Array.isArray(beat.lines) || beat.lines.length < 1 || beat.lines.length > 3 || beat.lines.some((line) => !isNonEmptyString(line))) {
      violations.push(`${label}.lines must contain 1 to 3 non-empty strings`);
    }
  }
  if (beat.kind === "figure") {
    addStringViolation(violations, beat.label, `${label}.label`);
    if (!beat.value || typeof beat.value !== "object" || typeof beat.value.to !== "number" || typeof beat.value.decimals !== "number") {
      violations.push(`${label}.value must contain numeric to and decimals`);
    }
    if (!beat.axis || typeof beat.axis !== "object" || ["min", "max", "achieved", "goal"].some((key) => typeof beat.axis[key] !== "number")) {
      violations.push(`${label}.axis must contain numeric min, max, achieved, and goal`);
    }
    if (!Array.isArray(beat.stamps)) violations.push(`${label}.stamps must be an array`);
  }
  if (beat.kind === "verdict") {
    if (!Array.isArray(beat.lines) || beat.lines.length < 1 || beat.lines.length > 3 || beat.lines.some((line) => !isNonEmptyString(line))) {
      violations.push(`${label}.lines must contain 1 to 3 non-empty strings`);
    }
  }
}

function allStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(allStrings);
  return [];
}

export function validateScript(script, brandName, workspaceId, notes) {
  const violations = [];
  if (!script || typeof script !== "object" || Array.isArray(script)) {
    return ["script must be a JSON object"];
  }
  for (const key of requiredScriptKeys) {
    if (!Object.prototype.hasOwnProperty.call(script, key)) violations.push(`missing required key: ${key}`);
  }
  addStringViolation(violations, script.coreMechanic, "coreMechanic");
  if (isNonEmptyString(script.coreMechanic) && script.coreMechanic.trim().split(/[.!?]+/).filter(Boolean).length !== 1) {
    violations.push("coreMechanic must be exactly one sentence");
  }
  if (script.brand !== brandName) violations.push(`brand must equal ${brandName}`);
  script.id = workspaceId;
  if (!Array.isArray(script.beats)) {
    violations.push("beats must be an array");
  } else {
    if (script.beats.length < 4 || script.beats.length > 8) violations.push("beats must contain 4 to 8 beats");
    script.beats.forEach((beat, index) => validateBeat(beat, index, violations));
    const total = script.beats.reduce((sum, beat) => sum + (typeof beat?.durationMs === "number" ? beat.durationMs : 0), 0);
    if (total < 15000 || total > 35000) violations.push(`total beat durationMs must be between 15000 and 35000 (got ${total})`);
  }
  if (!script.close || typeof script.close !== "object" || Array.isArray(script.close)) {
    violations.push("close must be an object");
  } else {
    addStringViolation(violations, script.close.line, "close.line");
    if (typeof script.close.showWordmark !== "boolean") violations.push("close.showWordmark must be a boolean");
    if (script.close.durationMs !== undefined && (typeof script.close.durationMs !== "number" || script.close.durationMs <= 0)) {
      violations.push("close.durationMs must be a positive number when present");
    }
  }
  if (typeof script.caption !== "string") violations.push("caption must be a string");
  else if (script.caption.length > 150) violations.push(`caption must be 150 characters or fewer (got ${script.caption.length})`);
  if (!Array.isArray(script.hashtags)) violations.push("hashtags must be an array");
  else {
    if (script.hashtags.length < 3 || script.hashtags.length > 6 || script.hashtags.some((tag) => !isNonEmptyString(tag))) {
      violations.push("hashtags must contain 3 to 6 non-empty strings");
    }
  }
  const banned = bannedPhrases(notes);
  for (const phrase of banned) {
    if (allStrings(script).some((value) => value.toLowerCase().includes(phrase))) {
      violations.push(`banned phrase found: ${phrase}`);
    }
  }
  return violations;
}

function run(options) {
  const workspaceDir = resolve(repoRoot, options.workspaceArg);
  const workspaceId = basename(workspaceDir);
  const brand = readBrand(options.brand);
  const prompt = buildPrompt(brand, options.topic, options.durationMs);
  mkdirSync(workspaceDir, { recursive: true });

  if (options.dryRun) {
    const promptPath = join(workspaceDir, "script-prompt.md");
    writeFileSync(promptPath, prompt, "utf8");
    console.log(`wrote ${promptPath}`);
    return 0;
  }

  const result = spawnSync(options.modelCmd, {
    cwd: repoRoot,
    input: prompt,
    encoding: "utf8",
    shell: true,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) throw new Error(`model command failed to start: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = String(result.stderr || "").trim();
    throw new Error(`model command exited with ${result.status ?? 1}${detail ? `: ${detail}` : ""}`);
  }

  let script;
  try {
    script = extractFirstJsonObject(String(result.stdout || ""));
  } catch (error) {
    throw new Error(error.message);
  }
  const violations = validateScript(script, options.brand, workspaceId, brand.voice.notes);
  if (violations.length > 0) throw new Error(`script validation failed:\n${violations.map((violation) => `- ${violation}`).join("\n")}`);

  const scriptPath = join(workspaceDir, "script.json");
  writeFileSync(scriptPath, `${JSON.stringify(script, null, 2)}\n`, "utf8");
  console.log(`wrote ${scriptPath}`);
  return 0;
}

export { extractFirstJsonObject, parseArgs, run };

function main() {
  try {
    process.exitCode = run(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(`script: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
