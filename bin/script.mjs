#!/usr/bin/env node
import { cpSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const allowedKinds = new Set(["moment", "question", "figure", "verdict"]);
const requiredScriptKeys = ["id", "brand", "coreMechanic", "beats", "close", "caption", "hashtags"];
// Mirror engine FIGURE_TIMING.goalMs and the pacing lint's maximum static gap.
export const FIGURE_LAST_EVENT_MS = 5600;
export const MAX_STATIC_MS = 3000;
// Mirror engine CLOSE_D_TIMING.taglineMs and urlMs for close pacing validation.
export const CLOSE_D_TIMING = { taglineMs: 500, urlMs: 900 };

export const COPY_LIMITS = {
  moment: { line: 44, eyebrow: 24, thoughts: 3, thought: 60 },
  question: { line: 12, lines: 3, kicker: 24, dek: 36 },
  figure: {
    label: 40,
    goalText: 30,
    unitLabel: 12,
    minTick: 1,
    achievedTick: 5,
    goalTick: 18,
    stamps: 4,
    stamp: 32,
  },
  verdict: { line: 20, lines: 3 },
  close: { line: 44, tagline: 18 },
  caption: { lines: 2, line: 44 },
  hashtags: { min: 3, max: 6 },
};

export const DURATION_LIMITS = {
  moment: { min: 2000, max: 4000 },
  question: { min: 2500, max: 4500 },
  verdict: { min: 2000, max: 4000 },
  figure: { min: 6000, max: 8500 },
  close: { min: 2500, max: 3800 },
};

const CLOSE_VARIANT_LIMITS = {
  plain: { label: "plain close", max: MAX_STATIC_MS },
  "tagline-only": { label: "tagline-only close", max: CLOSE_D_TIMING.taglineMs + MAX_STATIC_MS },
  "with-url": { label: "close with URL", max: DURATION_LIMITS.close.max },
};

export function parseArgs(argv) {
  let workspaceArg = null;
  const options = { modelCmd: "claude -p", durationMs: 25000, durationExplicit: false, retries: 2, dryRun: false, skipLint: false };
  const valueOptions = new Map([
    ["--brand", "brand"],
    ["--topic", "topic"],
    ["--model-cmd", "modelCmd"],
    ["--duration-ms", "durationMs"],
    ["--retries", "retries"],
    ["--lint-cmd", "lintCmd"],
    ["--vo", "vo"],
    ["--music", "music"],
    ["--url", "url"],
    ["--tagline", "tagline"],
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
    if (arg === "--skip-lint") {
      options.skipLint = true;
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
      if (optionName === "--duration-ms") options.durationExplicit = true;
      continue;
    }
    throw new Error(`unknown argument ${arg}`);
  }

  if (!workspaceArg) throw new Error("missing workspace directory");
  if (options.tagline !== undefined && options.tagline.length > COPY_LIMITS.close.tagline) {
    throw new Error(`--tagline must be ${COPY_LIMITS.close.tagline} characters or fewer (got ${options.tagline.length})`);
  }
  options.durationMs = Number(options.durationMs);
  if (!Number.isFinite(options.durationMs) || options.durationMs <= 0) {
    throw new Error("--duration-ms must be a positive number");
  }
  options.retries = Number(options.retries);
  if (!Number.isInteger(options.retries) || options.retries < 0) {
    throw new Error("--retries must be a non-negative integer");
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
        lines: ["Need rest?"],
        dek: "Try one small step.",
        durationMs: 3000,
      },
      {
        kind: "figure",
        label: "A measurable idea",
        unitLabel: "steps",
        value: { to: 3, decimals: 0 },
        goalText: "A smaller step",
        axis: { min: 0, max: 3, achieved: 1, goal: 3 },
        achievedTick: "Now",
        goalTick: "Goal",
        minTick: "0",
        stamps: [{ tone: "done", text: "First step", offsetMs: 1000 }],
        flash: { colorKey: "accent" },
        durationMs: 6000,
      },
      {
        kind: "verdict",
        lines: ["Start with less.", "Let night soften."],
        durationMs: 3000,
      },
    ],
    close: {
      line: "A clear closing line.",
      showWordmark: true,
      durationMs: 3000,
    },
    caption: "A short caption for the post.",
    hashtags: ["#one", "#two", "#three"],
  };
}

function promptList(values) {
  return Array.isArray(values) && values.length > 0 ? values.map((value) => `- ${value}`).join("\n") : "- none";
}

export function buildPrompt(brand, topic, targetDurationMs, brief = null) {
  const tone = brand.voice.tone.map((word) => `- ${word}`).join("\n");
  const briefSection = brief ? `
BRIEF - creative contract. These values are copied verbatim from brief.json:
audience: ${brief.audience}
hook archetype: ${brief.hookArchetype}
hook line: ${brief.hookLine || "none"}
core mechanic: ${brief.coreMechanic}
facts:
${promptList(brief.facts)}
allowed beat kinds:
${promptList(brief.beatKinds)}
required phrases:
${promptList(brief.requiredPhrases)}
banned phrases:
${promptList(brief.bannedPhrases)}
notes: ${brief.notes || ""}
` : "";
  return `You are writing stage 1 of a short-form video pipeline.

Topic: ${topic}
Target total beat duration: ${targetDurationMs}ms
Brand: ${brand.name}
${briefSection}

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
- Beat duration limits: moment ${DURATION_LIMITS.moment.min}-${DURATION_LIMITS.moment.max}ms; question ${DURATION_LIMITS.question.min}-${DURATION_LIMITS.question.max}ms; figure ${DURATION_LIMITS.figure.min}-${DURATION_LIMITS.figure.max}ms; verdict ${DURATION_LIMITS.verdict.min}-${DURATION_LIMITS.verdict.max}ms.
- Do not emit a modules key. Modules are supplied by the command flags.
- Copy limits: moment.line <= ${COPY_LIMITS.moment.line} characters; moment.eyebrow <= ${COPY_LIMITS.moment.eyebrow}; moment.thoughts has at most ${COPY_LIMITS.moment.thoughts} entries and each is <= ${COPY_LIMITS.moment.thought} characters.
- question.lines has 1 to ${COPY_LIMITS.question.lines} entries and each is <= ${COPY_LIMITS.question.line} characters; question.kicker <= ${COPY_LIMITS.question.kicker}; question.dek <= ${COPY_LIMITS.question.dek}.
- figure.label <= ${COPY_LIMITS.figure.label}; figure.goalText <= ${COPY_LIMITS.figure.goalText}; figure.unitLabel <= ${COPY_LIMITS.figure.unitLabel}; figure.minTick <= ${COPY_LIMITS.figure.minTick} character; minTick is a single character such as 0; figure.achievedTick <= ${COPY_LIMITS.figure.achievedTick} characters; figure.goalTick <= ${COPY_LIMITS.figure.goalTick} characters; stamps has at most ${COPY_LIMITS.figure.stamps} entries and each stamp text is <= ${COPY_LIMITS.figure.stamp} characters.
- Figure pacing: leave no more than ${MAX_STATIC_MS}ms static after the last figure event. The goal marker lands at ${FIGURE_LAST_EVENT_MS}ms, so if no stamp is later than ${FIGURE_LAST_EVENT_MS}ms, shorten durationMs or add a stamp after ${FIGURE_LAST_EVENT_MS}ms; durationMs over ${FIGURE_LAST_EVENT_MS + MAX_STATIC_MS}ms is invalid.
- verdict.lines has 1 to ${COPY_LIMITS.verdict.lines} entries and each is <= ${COPY_LIMITS.verdict.line} characters.
- Do not emit close.url. Do not emit close.tagline; a curated tagline is supplied only by the --tagline flag.
- close.line <= ${COPY_LIMITS.close.line}; close.tagline <= ${COPY_LIMITS.close.tagline} when supplied by the flag.
- close.durationMs must be between ${DURATION_LIMITS.close.min} and ${CLOSE_VARIANT_LIMITS.plain.max}ms for a plain close (no tagline or URL), between ${DURATION_LIMITS.close.min} and ${CLOSE_VARIANT_LIMITS["tagline-only"].max}ms for a tagline-only close, or between ${DURATION_LIMITS.close.min} and ${CLOSE_VARIANT_LIMITS["with-url"].max}ms for a close with a URL.
- caption has at most ${COPY_LIMITS.caption.lines} newline-separated lines and each line is <= ${COPY_LIMITS.caption.line} characters.
- hashtags must contain ${COPY_LIMITS.hashtags.min} to ${COPY_LIMITS.hashtags.max} strings, each starting with # and containing no spaces.
- Do not use any banned phrases from the brand voice notes, case-insensitively.
${brief ? `- coreMechanic in the output must equal the brief core mechanic, ignoring surrounding whitespace and letter case.
- The first beat must follow the brief hook archetype: ${brief.hookArchetype}.
- Every figure beat value.to, axis number, and number in figure label, unitLabel, goalText, tick text or stamp text must come from a number in brief.facts.
- Use only the allowed beat kinds from the brief.
- Every required phrase must appear somewhere on screen, and every banned phrase from the brief must be absent.
- If the brief hook line is set, the first beat's first on-screen text must equal it exactly.
- The brief is the creative contract. Do not invent facts, numbers, hook copy, mechanics or close data outside it.
` : ""}
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

function addMaxLengthViolation(violations, value, label, limit) {
  if (typeof value === "string" && value.length > limit) {
    violations.push(`${label} must be ${limit} characters or fewer (got ${value.length})`);
  }
}

function addOptionalStringLimit(violations, value, label, limit) {
  if (value === undefined) return;
  addStringViolation(violations, value, label);
  addMaxLengthViolation(violations, value, label, limit);
}

function closeVariant(close) {
  if (isNonEmptyString(close.url)) return "with-url";
  if (isNonEmptyString(close.tagline)) return "tagline-only";
  return "plain";
}

function validateStringArray(violations, values, label, maxItems, itemLimit) {
  if (!Array.isArray(values) || values.length < 1 || values.length > maxItems || values.some((value) => !isNonEmptyString(value))) {
    violations.push(`${label} must contain 1 to ${maxItems} non-empty strings`);
    return;
  }
  values.forEach((value, itemIndex) => addMaxLengthViolation(violations, value, `${label}[${itemIndex}]`, itemLimit));
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
  } else {
    const duration = DURATION_LIMITS[beat.kind];
    if (duration && (beat.durationMs < duration.min || beat.durationMs > duration.max)) {
      violations.push(`${label}.durationMs must be between ${duration.min} and ${duration.max}ms for ${beat.kind} (got ${beat.durationMs})`);
    }
  }
  if (beat.kind === "moment") {
    addOptionalStringLimit(violations, beat.eyebrow, `${label}.eyebrow`, COPY_LIMITS.moment.eyebrow);
    addStringViolation(violations, beat.line, `${label}.line`);
    addMaxLengthViolation(violations, beat.line, `${label}.line`, COPY_LIMITS.moment.line);
    if (beat.thoughts !== undefined) {
      if (!Array.isArray(beat.thoughts) || beat.thoughts.length > COPY_LIMITS.moment.thoughts || beat.thoughts.some((thought) => !isNonEmptyString(thought))) {
        violations.push(`${label}.thoughts must contain at most ${COPY_LIMITS.moment.thoughts} non-empty strings`);
      } else {
        beat.thoughts.forEach((thought, thoughtIndex) => addMaxLengthViolation(
          violations,
          thought,
          `${label}.thoughts[${thoughtIndex}]`,
          COPY_LIMITS.moment.thought,
        ));
      }
    }
  }
  if (beat.kind === "question") {
    validateStringArray(violations, beat.lines, `${label}.lines`, COPY_LIMITS.question.lines, COPY_LIMITS.question.line);
    addOptionalStringLimit(violations, beat.kicker, `${label}.kicker`, COPY_LIMITS.question.kicker);
    addOptionalStringLimit(violations, beat.dek, `${label}.dek`, COPY_LIMITS.question.dek);
  }
  if (beat.kind === "figure") {
    addStringViolation(violations, beat.label, `${label}.label`);
    addMaxLengthViolation(violations, beat.label, `${label}.label`, COPY_LIMITS.figure.label);
    addOptionalStringLimit(violations, beat.goalText, `${label}.goalText`, COPY_LIMITS.figure.goalText);
    addOptionalStringLimit(violations, beat.unitLabel, `${label}.unitLabel`, COPY_LIMITS.figure.unitLabel);
    for (const tick of ["minTick", "achievedTick", "goalTick"]) {
      addOptionalStringLimit(violations, beat[tick], `${label}.${tick}`, COPY_LIMITS.figure[tick]);
    }
    if (!beat.value || typeof beat.value !== "object" || typeof beat.value.to !== "number" || typeof beat.value.decimals !== "number") {
      violations.push(`${label}.value must contain numeric to and decimals`);
    }
    if (!beat.axis || typeof beat.axis !== "object" || ["min", "max", "achieved", "goal"].some((key) => typeof beat.axis[key] !== "number")) {
      violations.push(`${label}.axis must contain numeric min, max, achieved, and goal`);
    }
    if (!Array.isArray(beat.stamps)) {
      violations.push(`${label}.stamps must be an array`);
    } else {
      if (beat.stamps.length > COPY_LIMITS.figure.stamps) {
        violations.push(`${label}.stamps must contain at most ${COPY_LIMITS.figure.stamps} entries`);
      }
      beat.stamps.forEach((stamp, stampIndex) => {
        if (!stamp || typeof stamp !== "object" || Array.isArray(stamp)) {
          violations.push(`${label}.stamps[${stampIndex}] must be an object`);
          return;
        }
        addStringViolation(violations, stamp.text, `${label}.stamps[${stampIndex}].text`);
        addMaxLengthViolation(violations, stamp.text, `${label}.stamps[${stampIndex}].text`, COPY_LIMITS.figure.stamp);
      });
    }
    if (typeof beat.durationMs === "number" && Number.isFinite(beat.durationMs) && beat.durationMs > 0) {
      const lateStampOffsets = Array.isArray(beat.stamps)
        ? beat.stamps
          .map((stamp) => stamp?.offsetMs)
          .filter((offsetMs) => typeof offsetMs === "number" && Number.isFinite(offsetMs) && offsetMs > FIGURE_LAST_EVENT_MS)
        : [];
      const lastEventMs = lateStampOffsets.length > 0 ? Math.max(...lateStampOffsets) : FIGURE_LAST_EVENT_MS;
      const staticMs = beat.durationMs - lastEventMs;
      if (beat.durationMs > FIGURE_LAST_EVENT_MS + MAX_STATIC_MS || staticMs > MAX_STATIC_MS) {
        violations.push(`[pacing] figure beat ${index} would be static for ${staticMs}ms after its last event; shorten durationMs or add a stamp after ${FIGURE_LAST_EVENT_MS}ms`);
      }
    }
  }
  if (beat.kind === "verdict") {
    validateStringArray(violations, beat.lines, `${label}.lines`, COPY_LIMITS.verdict.lines, COPY_LIMITS.verdict.line);
  }
}

function allStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(allStrings);
  return [];
}

function numbersIn(value) {
  return String(value ?? "").match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
}

function firstBeatText(beat) {
  if (!beat || typeof beat !== "object") return "";
  if (beat.kind === "moment") return beat.line ?? "";
  if (beat.kind === "question") return beat.lines?.[0] ?? "";
  if (beat.kind === "figure") return beat.label ?? "";
  if (beat.kind === "verdict") return beat.lines?.[0] ?? "";
  return "";
}

function screenStrings(script) {
  const strings = [];
  for (const beat of script.beats ?? []) {
    if (beat?.kind === "moment") strings.push(beat.eyebrow, beat.line, ...(beat.thoughts ?? []));
    if (beat?.kind === "question") strings.push(beat.kicker, ...(beat.lines ?? []), beat.dek);
    if (beat?.kind === "figure") strings.push(beat.label, beat.unitLabel, beat.goalText, beat.minTick, beat.achievedTick, beat.goalTick, ...(beat.stamps ?? []).map((stamp) => stamp?.text), beat.value?.to);
    if (beat?.kind === "verdict") strings.push(...(beat.lines ?? []));
  }
  strings.push(script.close?.line, script.close?.tagline, script.close?.url);
  return strings.filter((value) => value !== undefined && value !== null).map(String);
}

function validateBriefContract(script, brief, violations) {
  if (!brief) return;
  if (typeof script.coreMechanic === "string" && script.coreMechanic.trim().toLowerCase() !== String(brief.coreMechanic).trim().toLowerCase()) {
    violations.push("brief rule: coreMechanic must equal brief.coreMechanic");
  }
  if (Array.isArray(brief.beatKinds) && Array.isArray(script.beats)) {
    const allowed = new Set(brief.beatKinds);
    script.beats.forEach((beat, index) => {
      if (beat && !allowed.has(beat.kind)) violations.push(`brief rule: beats[${index}].kind ${beat.kind} is not allowed by brief.beatKinds`);
    });
  }
  const factNumbers = new Set((brief.facts ?? []).flatMap(numbersIn));
  script.beats?.forEach((beat, index) => {
    if (beat?.kind !== "figure") return;
    const numbers = [beat.value?.to, beat.axis?.min, beat.axis?.max, beat.axis?.achieved, beat.axis?.goal].flatMap(numbersIn);
    for (const field of ["label", "unitLabel", "goalText", "minTick", "achievedTick", "goalTick"]) numbers.push(...numbersIn(beat[field]));
    for (const stamp of beat.stamps ?? []) numbers.push(...numbersIn(stamp?.text));
    for (const number of numbers) {
      if (!factNumbers.has(number)) violations.push(`brief rule: beats[${index}] figure number ${number} is not in brief.facts`);
    }
  });
  const screenText = screenStrings(script).join("\n").toLowerCase();
  for (const phrase of brief.requiredPhrases ?? []) {
    if (!screenText.includes(String(phrase).toLowerCase())) violations.push(`brief rule: required phrase missing: ${phrase}`);
  }
  for (const phrase of brief.bannedPhrases ?? []) {
    if (allStrings(script).join("\n").toLowerCase().includes(String(phrase).toLowerCase())) violations.push(`brief rule: banned phrase found: ${phrase}`);
  }
  if (brief.hookLine && Array.isArray(script.beats) && script.beats.length > 0 && firstBeatText(script.beats[0]) !== brief.hookLine) {
    violations.push("brief rule: first beat hook line does not equal brief.hookLine");
  }
}

export function validateScript(script, brandName, workspaceId, notes, brief = null) {
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
    addMaxLengthViolation(violations, script.close.line, "close.line", COPY_LIMITS.close.line);
    addOptionalStringLimit(violations, script.close.tagline, "close.tagline", COPY_LIMITS.close.tagline);
    if (typeof script.close.showWordmark !== "boolean") violations.push("close.showWordmark must be a boolean");
    const closeDuration = DURATION_LIMITS.close;
    const variant = CLOSE_VARIANT_LIMITS[closeVariant(script.close)];
    if (typeof script.close.durationMs !== "number" || !Number.isFinite(script.close.durationMs) || script.close.durationMs < closeDuration.min || script.close.durationMs > variant.max) {
      violations.push(`close.durationMs must be between ${closeDuration.min} and ${variant.max}ms for ${variant.label} (got ${script.close.durationMs ?? "missing"})`);
    }
  }
  if (typeof script.caption !== "string") violations.push("caption must be a string");
  else {
    const captionLines = script.caption.split(/\r?\n/);
    if (captionLines.length > COPY_LIMITS.caption.lines) {
      violations.push(`caption must contain at most ${COPY_LIMITS.caption.lines} lines (got ${captionLines.length})`);
    }
    captionLines.forEach((line, lineIndex) => addMaxLengthViolation(
      violations,
      line,
      `caption.lines[${lineIndex}]`,
      COPY_LIMITS.caption.line,
    ));
  }
  if (!Array.isArray(script.hashtags)) violations.push("hashtags must be an array");
  else {
    if (script.hashtags.length < COPY_LIMITS.hashtags.min || script.hashtags.length > COPY_LIMITS.hashtags.max) {
      violations.push(`hashtags must contain ${COPY_LIMITS.hashtags.min} to ${COPY_LIMITS.hashtags.max} strings`);
    }
    script.hashtags.forEach((tag, tagIndex) => {
      if (!isNonEmptyString(tag) || !/^#[^\s]+$/.test(tag)) {
        violations.push(`hashtags[${tagIndex}] must start with # and contain no spaces`);
      }
    });
  }
  const banned = bannedPhrases(notes);
  for (const phrase of banned) {
    if (allStrings(script).some((value) => value.toLowerCase().includes(phrase))) {
      violations.push(`banned phrase found: ${phrase}`);
    }
  }
  validateBriefContract(script, brief, violations);
  return violations;
}

function applyModules(script, options, brief) {
  if (Object.prototype.hasOwnProperty.call(script, "modules")) {
    console.log("dropped model-provided modules");
  }
  delete script.modules;
  if (script.close && typeof script.close === "object" && !Array.isArray(script.close) && Object.prototype.hasOwnProperty.call(script.close, "url")) {
    console.log("dropped model-provided close.url");
    delete script.close.url;
  }
  if (script.close && typeof script.close === "object" && !Array.isArray(script.close) && Object.prototype.hasOwnProperty.call(script.close, "tagline")) {
    console.log("dropped model-provided close.tagline");
    delete script.close.tagline;
  }
  const url = options.url !== undefined ? options.url : brief?.url;
  const tagline = options.tagline !== undefined ? options.tagline : brief?.tagline;
  if (url !== undefined && url !== "none" && script.close && typeof script.close === "object" && !Array.isArray(script.close)) {
    script.close.url = url;
  }
  if (tagline !== undefined && tagline !== "none" && script.close && typeof script.close === "object" && !Array.isArray(script.close)) {
    script.close.tagline = tagline;
  }
  const modules = {};
  const voice = options.vo !== undefined ? options.vo : brief?.voice;
  const music = options.music !== undefined ? options.music : brief?.music;
  if (voice !== undefined && voice !== "none") modules.vo = { voice };
  if (music !== undefined && music !== "none") modules.music = { file: music };
  if (Object.keys(modules).length > 0) script.modules = modules;
}

function shellQuote(value) {
  return /^[A-Za-z0-9_./:-]+$/.test(value) ? value : JSON.stringify(value);
}

function commandFailure(label, result) {
  const detail = String(result.stderr || result.stdout || "").trim();
  return `[${label}] command exited with ${result.status ?? 1}${detail ? `: ${detail}` : ""}`;
}

function readLintViolations(workspaceDir, result) {
  const reportPath = join(workspaceDir, "lint-report.json");
  if (existsSync(reportPath)) {
    try {
      const report = JSON.parse(readFileSync(reportPath, "utf8"));
      if (Array.isArray(report.violations) && report.violations.length > 0) return report.violations;
    } catch {
      // Fall through to the command result so a malformed report is still actionable.
    }
  }
  return [commandFailure("lint", result)];
}

function runGenerationChecks(workspaceDir, options) {
  const manifestResult = spawnSync(process.execPath, [join(repoRoot, "bin", "manifest.mjs"), workspaceDir], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (manifestResult.error || manifestResult.status !== 0) {
    return [`[manifest] ${manifestResult.error?.message ?? commandFailure("manifest", manifestResult)}`];
  }

  if (options.skipLint) return [];

  const lintResult = options.lintCmd
    ? spawnSync(`${options.lintCmd} ${shellQuote(workspaceDir)}`, {
      cwd: repoRoot,
      encoding: "utf8",
      shell: true,
      maxBuffer: 10 * 1024 * 1024,
    })
    : spawnSync(process.execPath, [join(repoRoot, "bin", "lint.mjs"), workspaceDir, "--no-render"], {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
  if (lintResult.error || lintResult.status !== 0) {
    return lintResult.error ? [`[lint] ${lintResult.error.message}`] : readLintViolations(workspaceDir, lintResult);
  }
  return [];
}

function attemptWorkspace(workspaceDir, script) {
  const tempWorkspace = mkdtempSync(join(tmpdir(), "brandreel-script-attempt-"));
  cpSync(workspaceDir, tempWorkspace, { recursive: true });
  rmSync(join(tempWorkspace, "lint-report.json"), { force: true });
  writeFileSync(join(tempWorkspace, "script.json"), `${JSON.stringify(script, null, 2)}\n`, "utf8");
  return tempWorkspace;
}

function run(options) {
  const workspaceDir = resolve(repoRoot, options.workspaceArg);
  const workspaceId = basename(workspaceDir);
  mkdirSync(workspaceDir, { recursive: true });
  const briefPath = join(workspaceDir, "brief.json");
  let brief = null;
  if (existsSync(briefPath)) {
    try {
      brief = JSON.parse(readFileSync(briefPath, "utf8"));
    } catch (error) {
      throw new Error(`could not read or parse ${briefPath}: ${error.message}`);
    }
  }
  const brandName = options.brand ?? brief?.brand;
  const topic = options.topic ?? brief?.topic;
  if (!brandName) throw new Error("missing --brand (or brief.brand)");
  if (!topic) throw new Error("missing --topic (or brief.topic)");
  if (options.topic && brief?.topic) console.log("--topic overrides brief.topic");
  const brand = readBrand(brandName);
  const targetDurationMs = options.durationExplicit ? options.durationMs : brief?.targetDurationMs ?? options.durationMs;
  const prompt = buildPrompt(brand, topic, targetDurationMs, brief);

  if (options.dryRun) {
    const promptPath = join(workspaceDir, "script-prompt.md");
    writeFileSync(promptPath, prompt, "utf8");
    console.log(`wrote ${promptPath}`);
    return 0;
  }

  const scriptPath = join(workspaceDir, "script.json");
  const layoutPath = join(workspaceDir, "layout.json");
  const rejectedScriptPath = join(workspaceDir, "script-rejected.json");
  let retryPrompt = prompt;
  let violations = [];
  let lastParsedScript = null;

  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    const result = spawnSync(options.modelCmd, {
      cwd: repoRoot,
      input: retryPrompt,
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
      violations = [error.message];
      script = null;
    }

    if (script) {
      applyModules(script, options, brief);
      lastParsedScript = script;
      violations = validateScript(script, brandName, workspaceId, brand.voice.notes, brief);
      if (violations.length === 0) {
        const tempWorkspace = attemptWorkspace(workspaceDir, script);
        try {
          violations = runGenerationChecks(tempWorkspace, options);
          if (violations.length === 0) {
            copyFileSync(join(tempWorkspace, "script.json"), scriptPath);
            copyFileSync(join(tempWorkspace, "layout.json"), layoutPath);
            rmSync(rejectedScriptPath, { force: true });
            console.log(`wrote ${scriptPath}`);
            console.log(`wrote ${layoutPath}`);
            return 0;
          }
        } finally {
          rmSync(tempWorkspace, { recursive: true, force: true });
        }
      }
    }

    if (attempt < options.retries) {
      retryPrompt = `${prompt}\n\nFix these violations and return the full JSON again:\n${violations.map((violation) => `- ${violation}`).join("\n")}\n`;
    }
  }

  writeFileSync(rejectedScriptPath, `${JSON.stringify({ violations, script: lastParsedScript }, null, 2)}\n`, "utf8");
  throw new Error(`script validation failed:\n${violations.map((violation) => `- ${violation}`).join("\n")}\nLast rejected script written to ${rejectedScriptPath}`);
}

export { extractFirstJsonObject, run };

function main() {
  try {
    process.exitCode = run(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(`script: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
