const DEFAULT_SAFE = { top: 150, bottom: 320, left: 60, right: 120 };
export const MIN_CTA_DWELL_MS = 2500;
const CTA_TEXT_IDS = new Set(["close-line", "close-tagline", "close-url"]);

function elementsOf(manifest) {
  return Array.isArray(manifest?.elements) ? manifest.elements : [];
}

function elementName(element, index) {
  return element?.id ?? `element-${index + 1}`;
}

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function safeOf(manifest) {
  return { ...DEFAULT_SAFE, ...(manifest?.safe ?? {}) };
}

export function safeZones(manifest) {
  const safe = safeOf(manifest);
  const width = manifest?.width;
  const height = manifest?.height;
  const violations = [];

  elementsOf(manifest).forEach((element, index) => {
    const name = elementName(element, index);
    const x = element?.x;
    const y = element?.y;
    const w = element?.w;
    const h = element?.h;
    const rightEdge = isNumber(x) && isNumber(w) ? x + w : null;
    const driftPx = isNumber(element?.driftPx) ? element.driftPx : 0;
    const bottomEdge = isNumber(y) && isNumber(h) ? y + h + driftPx : null;

    if (!isNumber(x) || x < safe.left) {
      violations.push(`[safe-zone] ${name}: x ${isNumber(x) ? x : "missing"} is less than ${safe.left}`);
    }
    if (!isNumber(rightEdge) || rightEdge > width - safe.right) {
      violations.push(`[safe-zone] ${name}: box right edge ${isNumber(rightEdge) ? rightEdge : "missing"} exceeds ${width - safe.right}`);
    }
    if (!isNumber(y) || y < safe.top) {
      violations.push(`[safe-zone] ${name}: y ${isNumber(y) ? y : "missing"} is less than ${safe.top}`);
    }
    if (!isNumber(bottomEdge) || bottomEdge > height - safe.bottom) {
      violations.push(`[safe-zone] ${name}: box bottom edge ${isNumber(bottomEdge) ? bottomEdge : "missing"} exceeds ${height - safe.bottom}`);
    }
  });

  return violations;
}

export function textFit(manifest) {
  return elementsOf(manifest).flatMap((element, index) => {
    const name = elementName(element, index);
    const hasMeasuredLines = Object.hasOwn(element ?? {}, "measuredLines");
    const hasMeasuredWidth = Object.hasOwn(element ?? {}, "measuredWidthPx");
    const hasMeasurements = hasMeasuredLines || hasMeasuredWidth;

    if (!isNumber(element?.maxLines)) {
      return [`[text-fit] ${name}: maxLines is required`];
    }

    if (hasMeasurements) {
      if (!hasMeasuredLines || !hasMeasuredWidth) {
        return [`[text-fit] ${name}: measuredLines and measuredWidthPx must be provided together`];
      }
      if (!Number.isInteger(element.measuredLines) || element.measuredLines < 0 || !isNumber(element.measuredWidthPx) || element.measuredWidthPx < 0) {
        return [`[text-fit] ${name}: measuredLines must be a non-negative integer and measuredWidthPx must be a non-negative finite number`];
      }
      if (typeof element.text === "string" && element.text.length > 0 && element.measuredLines === 0) {
        return [`[text-fit] ${name}: non-empty text cannot have zero measured lines`];
      }
      if (!isNumber(element.w) || element.w < 0) {
        return [`[text-fit] ${name}: a non-negative box width is required for measured text`];
      }

      const violations = [];
      if (element.measuredLines > element.maxLines) {
        violations.push(`[text-fit] ${name}: ${element.measuredLines} measured lines exceeds maxLines ${element.maxLines}`);
      }
      if (element.measuredWidthPx > element.w) {
        violations.push(`[text-fit] ${name}: measured width ${element.measuredWidthPx}px exceeds box width ${element.w}px`);
      }
      return violations;
    }

    if (!isNumber(element?.estimatedLines)) {
      return [`[text-fit] ${name}: estimatedLines is required when measured text is unavailable`];
    }
    if (element.estimatedLines > element.maxLines) {
      return [`[text-fit] ${name}: ${element.estimatedLines} lines exceeds maxLines ${element.maxLines}`];
    }
    return [];
  });
}

export function hook(manifest) {
  const violations = [];
  const firstText = manifest?.firstOnScreenTextMs;
  const changes = Array.isArray(manifest?.visualChangeMs) ? manifest.visualChangeMs : [];
  const firstChangeAfterZero = changes.find((timeMs) => isNumber(timeMs) && timeMs > 0);

  if (!isNumber(firstText) || firstText > 3000) {
    violations.push(`[hook] first on-screen text must be at or before 3000ms; got ${firstText === null ? "null" : (firstText ?? "missing")}`);
  }
  if (!isNumber(firstChangeAfterZero) || firstChangeAfterZero > 3000) {
    violations.push(`[hook] first visual change after 0ms must be at or before 3000ms; got ${firstChangeAfterZero ?? "missing"}`);
  }

  return violations;
}

export function pacing(manifest) {
  const changes = Array.isArray(manifest?.visualChangeMs) ? manifest.visualChangeMs : [];
  const totalDurationMs = manifest?.totalDurationMs;
  const violations = [];

  for (let index = 1; index < changes.length; index += 1) {
    const gap = changes[index] - changes[index - 1];
    if (!isNumber(gap) || gap > 3000) {
      violations.push(`[pacing] visual change gap ${changes[index - 1]}-${changes[index]}ms is greater than 3000ms`);
    }
  }

  if (changes.length > 0) {
    const last = changes.at(-1);
    const gap = totalDurationMs - last;
    if (!isNumber(gap) || gap > 3000) {
      violations.push(`[pacing] visual change at ${last}ms to ${totalDurationMs ?? "missing"}ms leaves a gap greater than 3000ms`);
    }
  } else {
    violations.push("[pacing] visualChangeMs must contain at least one entry");
  }

  return violations;
}

export function cta(manifest, script) {
  void script;
  const ctaElements = elementsOf(manifest).filter((element) => (
    CTA_TEXT_IDS.has(element?.id) && typeof element?.text === "string" && element.text.trim() !== ""
  ));
  if (ctaElements.length === 0) return ["[cta] no rendered CTA text element in the close"];

  if (!isNumber(manifest?.totalDurationMs)) {
    return ["[cta] cannot measure CTA dwell: manifest.totalDurationMs must be a number"];
  }
  const malformedStart = ctaElements.find((element) => !isNumber(element.fromMs));
  if (malformedStart) {
    return [`[cta] cannot measure CTA dwell: ${elementName(malformedStart, 0)}.fromMs must be a number`];
  }

  const dwellMs = ctaDwellMs(manifest);
  if (isNumber(dwellMs) && dwellMs < MIN_CTA_DWELL_MS) {
    return [`[cta] CTA on screen for ${dwellMs}ms; minimum ${MIN_CTA_DWELL_MS}ms`];
  }
  return [];
}

export function ctaDwellMs(manifest) {
  const ctaElements = elementsOf(manifest).filter((element) => (
    CTA_TEXT_IDS.has(element?.id) && typeof element?.text === "string" && element.text.trim() !== ""
  ));
  const totalDurationMs = manifest?.totalDurationMs;
  const starts = ctaElements.map((element) => element.fromMs);
  if (ctaElements.length === 0 || !isNumber(totalDurationMs) || starts.some((startMs) => !isNumber(startMs))) return null;
  return totalDurationMs - Math.min(...starts);
}

function boxesIntersect(a, b) {
  // h is the resting height; entrance drift is intentionally excluded here.
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function isBox(box) {
  return [box?.x, box?.y, box?.w, box?.h].every(isNumber) && box.w >= 0 && box.h >= 0;
}

function hasArea(box) {
  return box.w > 0 && box.h > 0;
}

function cubicBezierCoordinate(t, firstControl, secondControl) {
  const inverse = 1 - t;
  return 3 * inverse * inverse * t * firstControl
    + 3 * inverse * t * t * secondControl
    + t * t * t;
}

function parameterAtBezierX(x, controlX1, controlX2) {
  // For control points inside [0, 1], the cubic x curve is monotone. Curves
  // outside that range use the full control hull below instead.
  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 60; iteration += 1) {
    const middle = (low + high) / 2;
    if (cubicBezierCoordinate(middle, controlX1, controlX2) < x) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

function bezierYRange(controlY1, controlY2, startParameter, endParameter) {
  const a = 1 - 3 * controlY2 + 3 * controlY1;
  const b = 3 * controlY2 - 6 * controlY1;
  const c = 3 * controlY1;
  const candidates = [startParameter, endParameter];
  const quadratic = 3 * a;
  const linear = 2 * b;

  if (Math.abs(quadratic) < 1e-12) {
    if (Math.abs(linear) >= 1e-12) {
      const root = -c / linear;
      if (root > startParameter && root < endParameter) candidates.push(root);
    }
  } else {
    const discriminant = linear * linear - 4 * quadratic * c;
    if (discriminant >= 0) {
      const rootDistance = Math.sqrt(discriminant);
      for (const root of [
        (-linear - rootDistance) / (2 * quadratic),
        (-linear + rootDistance) / (2 * quadratic),
      ]) {
        if (root > startParameter && root < endParameter) candidates.push(root);
      }
    }
  }

  const values = candidates.map((parameter) => cubicBezierCoordinate(parameter, controlY1, controlY2));
  return { min: Math.min(...values), max: Math.max(...values) };
}

function interpolateBounds(from, to, progress) {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
    w: from.w + (to.w - from.w) * progress,
    h: from.h + (to.h - from.h) * progress,
  };
}

function sweptBox(from, to, progressRange) {
  // The enclosing axis-aligned box is deliberately conservative; a diagonal
  // shape path can be reported even when the exact path misses the text.
  const first = interpolateBounds(from, to, progressRange.min);
  const last = interpolateBounds(from, to, progressRange.max);
  const left = Math.min(first.x, last.x);
  const top = Math.min(first.y, last.y);
  const right = Math.max(first.x + first.w, last.x + last.w);
  const bottom = Math.max(first.y + first.h, last.y + last.h);
  return { x: left, y: top, w: right - left, h: bottom - top };
}

function motionProgressRange(motion, fromMs, toMs) {
  const duration = motion.endMs - motion.startMs;
  if (duration <= 0) return { min: 0, max: 1 };

  const control = motion.bezier;
  const progressStart = Math.max(0, Math.min(1, (fromMs - motion.startMs) / duration));
  const progressEnd = Math.max(0, Math.min(1, (toMs - motion.startMs) / duration));
  if (control[0] < 0 || control[0] > 1 || control[2] < 0 || control[2] > 1) {
    return {
      min: Math.min(0, control[1], control[3], 1),
      max: Math.max(0, control[1], control[3], 1),
    };
  }

  const startParameter = parameterAtBezierX(progressStart, control[0], control[2]);
  const endParameter = parameterAtBezierX(progressEnd, control[0], control[2]);
  return bezierYRange(control[1], control[3], startParameter, endParameter);
}

function validMotion(motion) {
  return isNumber(motion?.startMs)
    && isNumber(motion?.endMs)
    && motion.endMs >= motion.startMs
    && isBox(motion?.from)
    && isBox(motion?.to)
    && Array.isArray(motion?.bezier)
    && motion.bezier.length === 4
    && motion.bezier.every(isNumber);
}

function geometryCandidatesDuring(geometry, fromMs, toMs) {
  const motion = geometry.motion;
  if (!validMotion(motion)) return [{ box: geometry, fromMs, toMs }];

  const candidates = [];
  const add = (box, start, end) => {
    if (start < end) candidates.push({ box, fromMs: start, toMs: end });
  };

  const movingStart = Math.max(fromMs, motion.startMs);
  const movingEnd = Math.min(toMs, motion.endMs);
  add(motion.from, fromMs, Math.min(toMs, motion.startMs));

  if (movingStart < movingEnd) {
    add(sweptBox(motion.from, motion.to, motionProgressRange(motion, movingStart, movingEnd)), movingStart, movingEnd);
  }

  add(motion.to, Math.max(fromMs, motion.endMs), toMs);
  return candidates;
}

function overlapViolation(first, second, firstIndex, secondIndex, fromMs, toMs, firstBox, secondBox) {
  if (!boxesIntersect(firstBox, secondBox)) return null;
  const x = Math.max(firstBox.x, secondBox.x);
  const y = Math.max(firstBox.y, secondBox.y);
  return `[overlap] ${elementName(first, firstIndex)} and ${elementName(second, secondIndex)} intersect at ${x},${y} during ${fromMs}-${toMs}ms`;
}

export function overlap(manifest) {
  const textElements = elementsOf(manifest).filter((element) => (
    typeof element?.text === "string" && element.text.trim() !== ""
  ));
  const geometryElements = Array.isArray(manifest?.geometry) ? manifest.geometry : [];
  const violations = [];

  for (let firstIndex = 0; firstIndex < textElements.length; firstIndex += 1) {
    const first = textElements[firstIndex];
    if (![first.x, first.y, first.w, first.h, first.fromMs, first.toMs].every(isNumber)) continue;
    for (let secondIndex = firstIndex + 1; secondIndex < textElements.length; secondIndex += 1) {
      const second = textElements[secondIndex];
      if (![second.x, second.y, second.w, second.h, second.fromMs, second.toMs].every(isNumber)) continue;
      const fromMs = Math.max(first.fromMs, second.fromMs);
      const toMs = Math.min(first.toMs, second.toMs);
      if (fromMs >= toMs) continue;
      if (!boxesIntersect(first, second)) continue;
      const x = Math.max(first.x, second.x);
      const y = Math.max(first.y, second.y);
      violations.push(`[overlap] ${first.id} and ${second.id} intersect at ${x},${y} during ${fromMs}-${toMs}ms`);
    }

    if (![first.x, first.y, first.w, first.h, first.fromMs, first.toMs].every(isNumber)) continue;
    for (let geometryIndex = 0; geometryIndex < geometryElements.length; geometryIndex += 1) {
      const geometry = geometryElements[geometryIndex];
      if (!isBox(geometry) || ![geometry.fromMs, geometry.toMs].every(isNumber)) continue;
      const fromMs = Math.max(first.fromMs, geometry.fromMs);
      const toMs = Math.min(first.toMs, geometry.toMs);
      if (fromMs >= toMs) continue;

      const candidates = geometryCandidatesDuring(geometry, fromMs, toMs);
      for (const candidate of candidates) {
        if (!hasArea(candidate.box)) continue;
        const violation = overlapViolation(first, geometry, firstIndex, geometryIndex, candidate.fromMs, candidate.toMs, first, candidate.box);
        if (violation) {
          violations.push(violation);
          break;
        }
      }
    }
  }
  return violations;
}

export function durationCheck(durationSeconds, script) {
  const override = script?.durationOverride;
  const reason = typeof override?.reason === "string" ? override.reason.trim() : "";
  if (override && typeof override === "object" && reason !== "") {
    return { violations: [], skipped: true, reason };
  }

  if (!isNumber(durationSeconds) || durationSeconds < 15 || durationSeconds > 35) {
    return {
      violations: [`[duration] duration must be between 15 and 35 seconds; got ${isNumber(durationSeconds) ? durationSeconds : "missing"}`],
      skipped: false,
      reason: null,
    };
  }
  return { violations: [], skipped: false, reason: null };
}

function median(values) {
  if (values.length === 0) return 0;
  values.sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[middle - 1] + values[middle]) / 2 : values[middle];
}

function bandPixels(frame, band) {
  const { width, height, rgb } = frame;
  const pixels = [];
  const startX = band === "right" ? width - frame.safe.right : 0;
  const endX = band === "right" ? width : width;
  const startY = band === "top" ? 0 : band === "bottom" ? height - frame.safe.bottom : frame.safe.top;
  const endY = band === "top" ? frame.safe.top : band === "bottom" ? height : height - frame.safe.bottom;

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const offset = (y * width + x) * 3;
      pixels.push([rgb[offset], rgb[offset + 1], rgb[offset + 2]]);
    }
  }
  return pixels;
}

export function pixelBands(frames, opts = {}) {
  const safe = { ...DEFAULT_SAFE, ...(opts.safe ?? opts) };
  const violations = [];
  const threshold = opts.threshold ?? 40;
  const fractionLimit = opts.fractionLimit ?? 0.004;

  for (const frame of Array.isArray(frames) ? frames : []) {
    if (!isNumber(frame?.width) || !isNumber(frame?.height) || !(frame.rgb instanceof Uint8Array)) {
      violations.push(`[pixel-bands] invalid sampled frame at ${frame?.timeMs ?? "unknown"}ms`);
      continue;
    }
    const expectedBytes = frame.width * frame.height * 3;
    if (frame.rgb.length < expectedBytes) {
      violations.push(`[pixel-bands] invalid rgb24 frame at ${frame.timeMs ?? "unknown"}ms`);
      continue;
    }

    const safeFrame = { ...frame, safe };
    for (const band of ["top", "bottom", "right"]) {
      const pixels = bandPixels(safeFrame, band);
      if (pixels.length === 0) continue;
      const medianColor = [0, 1, 2].map((channel) => median(pixels.map((pixel) => pixel[channel])));
      const outlierCount = pixels.reduce((count, pixel) => {
        const difference = Math.max(
          Math.abs(pixel[0] - medianColor[0]),
          Math.abs(pixel[1] - medianColor[1]),
          Math.abs(pixel[2] - medianColor[2]),
        );
        return count + (difference > threshold ? 1 : 0);
      }, 0);
      const fraction = outlierCount / pixels.length;
      if (fraction > fractionLimit) {
        violations.push(`[pixel-bands] ${band} band at ${frame.timeMs}ms has ${(fraction * 100).toFixed(2)}% divergent pixels`);
      }
    }
  }

  return violations;
}
