import { test } from "node:test";
import assert from "node:assert/strict";
import { textFit } from "../lint-rules.mjs";

const baseElement = {
  id: "measured-line",
  text: "A measured line",
  w: 100,
  estimatedLines: 1,
  maxLines: 2,
};

const manifestWith = (element) => ({ elements: [element] });

test("text-fit prefers valid browser measurements over an incorrect estimate", () => {
  const element = {
    ...baseElement,
    estimatedLines: 9,
    measuredLines: 1,
    measuredWidthPx: 96.5,
  };

  assert.deepEqual(textFit(manifestWith(element)), []);
});

test("text-fit reports measured wrapping beyond maxLines even when the estimate fits", () => {
  const element = {
    ...baseElement,
    measuredLines: 3,
    measuredWidthPx: 96.5,
  };
  const violations = textFit(manifestWith(element));

  assert.equal(violations.length, 1);
  assert.match(violations[0], /3 measured lines exceeds maxLines 2/);
});

test("text-fit reports measured horizontal overflow", () => {
  const element = {
    ...baseElement,
    measuredLines: 1,
    measuredWidthPx: 100.01,
  };
  const violations = textFit(manifestWith(element));

  assert.equal(violations.length, 1);
  assert.match(violations[0], /measured width 100\.01px exceeds box width 100px/);
});

test("text-fit fails closed for partial or malformed measurement pairs", () => {
  const malformed = [
    { measuredLines: 1 },
    { measuredLines: Number.NaN, measuredWidthPx: 40 },
    { measuredLines: -1, measuredWidthPx: 40 },
    { measuredLines: 1.5, measuredWidthPx: 40 },
    { measuredLines: 1, measuredWidthPx: Number.NaN },
    { measuredLines: 1, measuredWidthPx: Number.POSITIVE_INFINITY },
    { measuredLines: 1, measuredWidthPx: -0.1 },
    { measuredLines: undefined, measuredWidthPx: 40 },
    { measuredLines: 0, measuredWidthPx: 0 },
  ];

  malformed.forEach((measurement) => {
    const violations = textFit(manifestWith({ ...baseElement, ...measurement }));
    assert.equal(violations.length, 1, JSON.stringify(measurement));
    assert.match(violations[0], /^\[text-fit\]/);
  });
});

test("text-fit keeps the estimate path when measurements are absent", () => {
  assert.deepEqual(textFit(manifestWith(baseElement)), []);
  const violations = textFit(manifestWith({ ...baseElement, estimatedLines: undefined }));
  assert.equal(violations.length, 1);
  assert.match(violations[0], /estimatedLines is required when measured text is unavailable/);
});
