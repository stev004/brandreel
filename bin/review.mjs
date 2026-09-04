#!/usr/bin/env node
import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function valueIsPass(value) {
  if (typeof value === "boolean") return value;
  if (!value || typeof value !== "object") return null;
  if (typeof value.ok === "boolean") return value.ok;
  if (typeof value.pass === "boolean") return value.pass;
  if (typeof value.passed === "boolean") return value.passed;
  if (typeof value.failed === "boolean") return !value.failed;
  if (typeof value.status === "string") {
    return ["pass", "passed", "ok", "success"].includes(value.status.toLowerCase());
  }
  return null;
}

function formatCheck(name, value) {
  const pass = valueIsPass(value);
  if (pass === null) return null;
  const detail = value && typeof value === "object" && typeof value.message === "string"
    ? ` - ${value.message}`
    : "";
  return `- ${name}: ${pass ? "PASS" : "FAIL"}${detail}`;
}

function lintSummary(report) {
  const lines = ["## Lint summary", ""];
  if (report === null) {
    lines.push("lint not run");
    return lines;
  }

  const overall = valueIsPass(report);
  if (overall !== null) lines.push(`- Overall: ${overall ? "PASS" : "FAIL"}`);

  const checks = report && typeof report === "object" ? report.checks : null;
  if (Array.isArray(checks)) {
    for (const [index, check] of checks.entries()) {
      if (!check || typeof check !== "object") continue;
      const name = check.name ?? check.id ?? `check ${index + 1}`;
      const line = formatCheck(name, check);
      if (line) lines.push(line);
    }
  } else if (checks && typeof checks === "object") {
    for (const [name, check] of Object.entries(checks)) {
      const line = formatCheck(name, check);
      if (line) lines.push(line);
    }
  }

  if (Array.isArray(report?.violations)) {
    if (report.violations.length === 0) {
      lines.push("- violations: PASS");
    } else {
      for (const violation of report.violations) {
        lines.push(`- violations: FAIL - ${String(violation)}`);
      }
    }
  }

  if (lines.length === 2) lines.push("- report: PASS");
  return lines;
}

function outputFiles(workspaceDir) {
  const candidates = [];
  const directFiles = ["render.mp4", "vo.wav", "words.json"];
  for (const name of directFiles) {
    const path = join(workspaceDir, name);
    if (existsSync(path)) candidates.push(path);
  }

  const finalDir = join(workspaceDir, "final");
  if (existsSync(finalDir)) {
    for (const name of readdirSync(finalDir).sort()) {
      if (name.endsWith(".mp4") && existsSync(join(finalDir, name))) {
        candidates.push(join(finalDir, name));
      }
    }
  }

  return candidates
    .sort()
    .map((path) => relative(repoRoot, path) || ".");
}

export function buildReview(script, lintReport, workspaceDir) {
  const hashtags = Array.isArray(script.hashtags) ? script.hashtags.join(" ") : "";
  const firstComment = typeof script.firstComment === "string" && script.firstComment.trim()
    ? script.firstComment
    : "TODO";
  const altText = typeof script.altText === "string" && script.altText.trim()
    ? script.altText
    : "TODO";
  const cta = [script.close.line];
  if (script.close.tagline?.trim()) cta.push(script.close.tagline);
  if (script.close.url?.trim()) cta.push(script.close.url);
  const files = outputFiles(workspaceDir);

  return [
    `# Review: ${script.id} (${script.brand})`,
    "",
    "## Core mechanic",
    "",
    script.coreMechanic,
    "",
    "## Decision",
    "",
    "- [ ] KEEP",
    "- [ ] TWEAK",
    "- [ ] KILL",
    "",
    "## CTA",
    "",
    ...cta,
    "",
    "## Caption",
    "",
    script.caption,
    "",
    "## Hashtags",
    "",
    hashtags,
    "",
    "## First comment",
    "",
    firstComment,
    "",
    "## Alt text",
    "",
    altText,
    "",
    ...lintSummary(lintReport),
    "",
    "## Files",
    "",
    ...(files.length > 0 ? files.map((path) => `- ${path}`) : ["- none"]),
    "",
  ].join("\n");
}

export function writeReview(workspaceArg) {
  const workspaceDir = resolve(repoRoot, workspaceArg);
  const scriptPath = join(workspaceDir, "script.json");
  if (!existsSync(scriptPath)) {
    throw new Error(`missing script.json at ${scriptPath}`);
  }

  let script;
  try {
    script = readJson(scriptPath);
  } catch (error) {
    throw new Error(`could not read or parse ${scriptPath}: ${error.message}`);
  }

  const lintPath = join(workspaceDir, "lint-report.json");
  let lintReport = null;
  if (existsSync(lintPath)) {
    try {
      lintReport = readJson(lintPath);
    } catch (error) {
      throw new Error(`could not read or parse ${lintPath}: ${error.message}`);
    }
  }

  const reviewPath = join(workspaceDir, "review.md");
  writeFileSync(reviewPath, buildReview(script, lintReport, workspaceDir), "utf8");
  return reviewPath;
}

function main() {
  const workspaceArg = process.argv[2];
  if (!workspaceArg) {
    console.error("review: usage: node bin/review.mjs <workspace-dir>");
    process.exitCode = 1;
    return;
  }

  try {
    const reviewPath = writeReview(workspaceArg);
    console.log(`wrote ${reviewPath}`);
  } catch (error) {
    console.error(`review: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
