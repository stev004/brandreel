import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { overlap } from "../lint-rules.mjs";

const fixtures = join(new URL("./fixtures", import.meta.url).pathname);

function fixture(name) {
  return JSON.parse(readFileSync(join(fixtures, name), "utf8"));
}

test("overlap reports text crossing an opaque geometry bar", () => {
  assert.deepEqual(overlap(fixture("lint-overlap-geometry.json")), [
    "[overlap] bar-label and figure-bar intersect at 100,100 during 500-1500ms",
  ]);
});

test("overlap ignores opaque geometry outside the text interval", () => {
  assert.deepEqual(overlap({
    elements: [
      { id: "label", text: "Label", x: 10, y: 10, w: 40, h: 20, fromMs: 0, toMs: 500 },
    ],
    geometry: [
      { id: "bar", x: 20, y: 15, w: 40, h: 20, fromMs: 500, toMs: 1000 },
    ],
  }), []);
});

test("overlap checks a moving opaque box over the coincident motion interval", () => {
  const violations = overlap({
    elements: [
      { id: "label", text: "Label", x: 100, y: 10, w: 20, h: 20, fromMs: 400, toMs: 450 },
    ],
    geometry: [
      {
        id: "moving-bar",
        x: 200,
        y: 10,
        w: 20,
        h: 20,
        fromMs: 0,
        toMs: 1000,
        motion: {
          startMs: 0,
          endMs: 1000,
          from: { x: 200, y: 10, w: 20, h: 20 },
          to: { x: 0, y: 10, w: 20, h: 20 },
          bezier: [0, 0, 1, 1],
        },
      },
    ],
  });
  assert.equal(violations.length, 1);
  assert.match(violations[0], /^\[overlap\] label and moving-bar intersect at \d+(?:\.\d+)?,10 during 400-450ms$/);
});

test("overlap limits a motion sweep to the coincident portion of its path", () => {
  assert.deepEqual(overlap({
    elements: [
      { id: "label", text: "Label", x: 0, y: 10, w: 20, h: 20, fromMs: 100, toMs: 200 },
    ],
    geometry: [
      {
        id: "moving-bar",
        x: 200,
        y: 10,
        w: 20,
        h: 20,
        fromMs: 0,
        toMs: 1200,
        motion: {
          startMs: 0,
          endMs: 1000,
          from: { x: 200, y: 10, w: 20, h: 20 },
          to: { x: 0, y: 10, w: 20, h: 20 },
          bezier: [0, 0, 1, 1],
        },
      },
    ],
  }), []);
});

test("overlap excludes empty text and does not compare intentional shape layering", () => {
  assert.deepEqual(overlap({
    elements: [
      { id: "empty", text: "  ", x: 10, y: 10, w: 40, h: 20, fromMs: 0, toMs: 1000 },
    ],
    geometry: [
      { id: "track", x: 10, y: 10, w: 40, h: 20, fromMs: 0, toMs: 1000 },
      { id: "fill", x: 10, y: 10, w: 40, h: 20, fromMs: 0, toMs: 1000 },
    ],
  }), []);
});

test("overlap ignores zero-area opaque geometry", () => {
  assert.deepEqual(overlap({
    elements: [
      { id: "label", text: "Label", x: 10, y: 10, w: 40, h: 20, fromMs: 0, toMs: 1000 },
    ],
    geometry: [
      { id: "drained-fill", x: 10, y: 10, w: 40, h: 0, fromMs: 0, toMs: 1000 },
    ],
  }), []);
});

test("overlap bounds arbitrary bezier overshoot when checking motion", () => {
  const violations = overlap({
    elements: [
      { id: "label", text: "Label", x: 120, y: 10, w: 20, h: 20, fromMs: 0, toMs: 1000 },
    ],
    geometry: [
      {
        id: "moving-bar",
        x: 0,
        y: 10,
        w: 20,
        h: 20,
        fromMs: 0,
        toMs: 1000,
        motion: {
          startMs: 0,
          endMs: 1000,
          from: { x: 0, y: 10, w: 20, h: 20 },
          to: { x: 100, y: 10, w: 20, h: 20 },
          bezier: [0.25, 2, 0.75, 2],
        },
      },
    ],
  });
  assert.equal(violations.length, 1);
  assert.match(violations[0], /^\[overlap\] label and moving-bar intersect at 120,10 during 0-1000ms$/);
});
