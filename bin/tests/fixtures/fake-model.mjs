#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const prompt = readFileSync(0, "utf8");
const briefMode = process.env.FAKE_MODEL_BRIEF === "1";
const briefMechanic = prompt.match(/^core mechanic: (.+)$/m)?.[1];
const briefHookLine = prompt.match(/^hook line: (.+)$/m)?.[1];
const briefFactSection = prompt.match(/^facts:\n([\s\S]*?)^allowed beat kinds:/m)?.[1] ?? "";
const briefNumbers = briefFactSection.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
const briefRequired = prompt.match(/^required phrases:\n- ([^\n]+)/m)?.[1];
const invalid = process.env.FAKE_MODEL_INVALID === "1";
const banned = process.env.FAKE_MODEL_BANNED === "1";
const longMoment = process.env.FAKE_MODEL_LONG_MOMENT === "1";
const threeLineCaption = process.env.FAKE_MODEL_THREE_LINE_CAPTION === "1";
const badHashtag = process.env.FAKE_MODEL_BAD_HASHTAG === "1";
const statePath = process.env.FAKE_MODEL_STATE;
let state = 0;
if (statePath) {
  try {
    state = Number(readFileSync(statePath, "utf8")) || 0;
  } catch {
    state = 0;
  }
  writeFileSync(statePath, String(state + 1));
}
const stateBad = statePath && state === 0;
const script = {
  id: "model-id-is-overridden",
  brand: "regulate",
  modules: { vo: { voice: "invented-voice" }, music: { file: "invented-music.wav" } },
  ...(invalid ? {} : { coreMechanic: briefMode ? briefMechanic : "A quiet visual reset makes the next step visible." }),
  beats: [
    {
      kind: "moment",
      eyebrow: "3AM",
      line: longMoment ? "x".repeat(45) : (banned ? "This journey starts now." : (briefMode ? briefHookLine : "Still awake?")),
      durationMs: invalid ? 10000 : stateBad ? 4000 : 3000,
    },
    { kind: "question", kicker: "TRY THIS", lines: [stateBad ? "What rest?" : "Need rest?"], durationMs: invalid ? 10000 : 3000 },
    {
      kind: "figure",
      label: "One small shift",
      unitLabel: "step",
      value: { to: briefMode ? briefNumbers[1] : 3, decimals: 0 },
      axis: { min: briefMode ? briefNumbers[0] : 0, max: briefMode ? briefNumbers[1] : 3, achieved: briefMode ? briefNumbers[2] : 1, goal: briefMode ? briefNumbers[1] : 3 },
      stamps: [{ tone: "done", text: "Notice", offsetMs: 1000 }],
      durationMs: invalid ? 10000 : 6000,
    },
    { kind: "verdict", lines: [briefMode ? briefRequired : "Start with less."], durationMs: invalid ? 10000 : 3000 },
  ],
  close: { line: "Make room for the next breath.", showWordmark: true, tagline: "Make room.", url: "https://model.example", durationMs: 3000 },
  caption: threeLineCaption ? "one\ntwo\nthree" : "A small shift can change tonight.",
  hashtags: [badHashtag ? "regulation" : "#regulation", "#rest", "#sleep"],
};

console.log("```json");
console.log(JSON.stringify(script, null, 2));
console.log("```");
