#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const workspace = process.argv[2];
if (!workspace || !existsSync(`${workspace}/script.json`)) process.exit(2);
const statePath = process.env.FAKE_LINT_STATE;
let state = 0;
if (statePath) {
  try {
    state = Number(readFileSync(statePath, "utf8")) || 0;
  } catch {
    state = 0;
  }
  writeFileSync(statePath, String(state + 1));
}
if (state === 0) process.exit(1);
