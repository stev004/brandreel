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
    const bottomEdge = isNumber(y) && isNumber(h) ? y + h : null;

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
    if (!isNumber(element?.estimatedLines) || !isNumber(element?.maxLines)) {
      return [`[text-fit] ${elementName(element, index)}: estimatedLines and maxLines are required`];
    }
    if (element.estimatedLines > element.maxLines) {
      return [`[text-fit] ${elementName(element, index)}: ${element.estimatedLines} lines exceeds maxLines ${element.maxLines}`];
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
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function overlap(manifest) {
  const textElements = elementsOf(manifest).filter((element) => (
    typeof element?.text === "string" && element.text.trim() !== ""
  ));
  const violations = [];

  for (let firstIndex = 0; firstIndex < textElements.length; firstIndex += 1) {
    const first = textElements[firstIndex];
    if (![first.x, first.y, first.w, first.h, first.fromMs, first.toMs].every(isNumber)) continue;
    for (let secondIndex = firstIndex + 1; secondIndex < textElements.length; secondIndex += 1) {
      const second = textElements[secondIndex];
      if (![second.x, second.y, second.w, second.h, second.fromMs, second.toMs].every(isNumber)) continue;
      const fromMs = Math.max(first.fromMs, second.fromMs);
      const toMs = Math.min(first.toMs, second.toMs);
      if (fromMs >= toMs || !boxesIntersect(first, second)) continue;
      const x = Math.max(first.x, second.x);
      const y = Math.max(first.y, second.y);
      violations.push(`[overlap] ${first.id} and ${second.id} intersect at ${x},${y} during ${fromMs}-${toMs}ms`);
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
