#!/usr/bin/env node
import { readFileSync } from "node:fs";

readFileSync(0, "utf8");
const invalid = process.env.FAKE_MODEL_INVALID === "1";
const banned = process.env.FAKE_MODEL_BANNED === "1";
const script = {
  id: "model-id-is-overridden",
  brand: "regulate",
  ...(invalid ? {} : { coreMechanic: "A quiet visual reset makes the next step visible." }),
  beats: [
    { kind: "moment", eyebrow: "3AM", line: banned ? "This journey starts now." : "Still awake?", durationMs: invalid ? 10000 : 4000 },
    { kind: "question", kicker: "TRY THIS", lines: ["What if rest starts with less effort?"], durationMs: invalid ? 10000 : 4000 },
    {
      kind: "figure",
      label: "One small shift",
      unitLabel: "step",
      value: { to: 3, decimals: 0 },
      axis: { min: 0, max: 3, achieved: 1, goal: 3 },
      stamps: [{ tone: "done", text: "Notice", offsetMs: 1000 }],
      durationMs: invalid ? 10000 : 4000,
    },
    { kind: "verdict", lines: ["You do not have to force the night."], durationMs: invalid ? 10000 : 4000 },
  ],
  close: { line: "Make room for the next breath.", showWordmark: true, durationMs: 1000 },
  caption: "A small shift can change how the night feels.",
  hashtags: ["#regulation", "#rest", "#sleep"],
};

console.log("```json");
console.log(JSON.stringify(script, null, 2));
console.log("```");
