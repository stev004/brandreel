import { statSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, platform } from "node:os";
import { createRequire } from "node:module";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const engineDir = join(repoRoot, "engine");
const engineRequire = createRequire(join(engineDir, "package.json"));

// Keep this list in sync with engine/src/fonts.ts. That file is the renderer's
// supported-font boundary; arbitrary manifest strings are never used as module
// paths.
const GOOGLE_FONT_MODULES = {
  "Playfair Display": { module: "PlayfairDisplay", weights: [400, 500, 600, 700] },
  Inter: { module: "Inter", weights: [400, 500, 600, 700] },
  "IBM Plex Mono": { module: "IBMPlexMono", weights: [400, 500, 600, 700] },
  "JetBrains Mono": { module: "JetBrainsMono", weights: [400, 500, 600, 700] },
  "Source Serif 4": { module: "SourceSerif4", weights: [400, 600, 700] },
};

const browserEnvironmentKeys = [
  "BRANDREEL_CHROME_EXECUTABLE",
  "REMOTION_BROWSER_EXECUTABLE",
  "REMOTION_CHROME_EXECUTABLE",
  "CHROME_BIN",
  "CHROMIUM_PATH",
];

const browserCommands = platform() === "win32"
  ? ["chrome.exe", "chromium.exe", "chromium-browser.exe"]
  : ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome"];

const macBrowserPaths = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  join(homedir(), "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  join(homedir(), "Applications/Chromium.app/Contents/MacOS/Chromium"),
];

const existingExecutable = (candidate) => {
  if (!candidate) return null;
  try {
    return statSync(candidate).isFile() ? candidate : null;
  } catch {
    return null;
  }
};

export const findBrowserExecutable = (env = process.env) => {
  for (const key of browserEnvironmentKeys) {
    const candidate = existingExecutable(env[key]);
    if (candidate) return candidate;
  }

  const searchPath = (env.PATH ?? "").split(delimiter).filter(Boolean);
  for (const command of browserCommands) {
    for (const directory of searchPath) {
      const candidate = existingExecutable(join(directory, command));
      if (candidate) return candidate;
    }
  }

  if (platform() === "darwin") {
    for (const candidatePath of macBrowserPaths) {
      const candidate = existingExecutable(candidatePath);
      if (candidate) return candidate;
    }
  }

  return null;
};

const getFontInfo = (fontFamily) => {
  const config = GOOGLE_FONT_MODULES[fontFamily];
  if (!config) return null;

  try {
    const fontModule = engineRequire(`@remotion/google-fonts/${config.module}`);
    return { ...fontModule.getInfo(), loadedWeights: config.weights };
  } catch {
    return null;
  }
};

const cssMatchedWeight = (requestedWeight, loadedWeights) => {
  const weights = [...new Set(loadedWeights)].sort((a, b) => a - b);
  if (weights.length === 0) return null;

  let searchOrder;
  if (requestedWeight < 400) {
    searchOrder = [
      ...weights.filter((weight) => weight <= requestedWeight).sort((a, b) => b - a),
      ...weights.filter((weight) => weight > requestedWeight),
    ];
  } else if (requestedWeight <= 500) {
    searchOrder = [
      ...weights.filter((weight) => weight >= requestedWeight && weight <= 500),
      ...weights.filter((weight) => weight < requestedWeight).sort((a, b) => b - a),
      ...weights.filter((weight) => weight > 500),
    ];
  } else {
    searchOrder = [
      ...weights.filter((weight) => weight >= requestedWeight),
      ...weights.filter((weight) => weight < requestedWeight).sort((a, b) => b - a),
    ];
  }
  return searchOrder[0] ?? null;
};

const latinRangeContains = (rangeText, codePoint) => {
  const ranges = rangeText.matchAll(/U\+([0-9a-f]{1,6})(?:-([0-9a-f]{1,6}))?/giu);
  for (const [, startText, endText] of ranges) {
    const start = Number.parseInt(startText, 16);
    const end = Number.parseInt(endText ?? startText, 16);
    if (codePoint >= start && codePoint <= end) return true;
  }
  return false;
};

const textCoveredByLatinSubset = (text, unicodeRange) => {
  for (const character of text) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && !latinRangeContains(unicodeRange, codePoint)) return false;
  }
  return true;
};

const elementHasText = (element) => typeof element?.text === "string" && element.text.length > 0;

const variantKey = ({ fontFamily, fontStyle, fontWeight }) =>
  `${fontFamily}\u0000${fontStyle}\u0000${fontWeight}`;

const validElementForMeasurement = (element) => (
  elementHasText(element) &&
  typeof element.fontFamily === "string" && element.fontFamily.length > 0 &&
  (element.fontStyle === "normal" || element.fontStyle === "italic") &&
  Number.isInteger(element.fontWeight) && element.fontWeight >= 1 && element.fontWeight <= 1000 &&
  Number.isFinite(element.fontSize) && element.fontSize > 0 &&
  Number.isFinite(element.lineHeight) && element.lineHeight > 0 &&
  Number.isFinite(element.letterSpacingEm) &&
  Number.isFinite(element.w) && element.w > 0 &&
  ["normal", "nowrap", "pre-line"].includes(element.whiteSpace) &&
  ["none", "uppercase"].includes(element.textTransform)
);

const resolveFontDefinition = (element) => {
  const info = getFontInfo(element.fontFamily);
  if (!info) return { error: `no renderer Google Fonts metadata for "${element.fontFamily}"` };

  const loadedWeight = cssMatchedWeight(element.fontWeight, info.loadedWeights);
  if (loadedWeight === null) {
    return { error: `no loaded font weight matches ${element.fontWeight} for "${element.fontFamily}"` };
  }
  const styleVariants = info.fonts?.[element.fontStyle];
  const weightVariant = styleVariants?.[String(loadedWeight)];
  const url = weightVariant?.latin;
  const unicodeRange = info.unicodeRanges?.latin;
  if (typeof url !== "string" || typeof unicodeRange !== "string") {
    return { error: `font variant ${element.fontStyle} ${loadedWeight} is unavailable for "${element.fontFamily}"` };
  }
  const glyphText = element.textTransform === "uppercase"
    ? element.text.toUpperCase()
    : element.text;
  if (!textCoveredByLatinSubset(glyphText, unicodeRange)) {
    return { error: `text uses glyphs outside the renderer's Latin subset for "${element.fontFamily}"` };
  }

  return {
    definition: {
      key: variantKey({ ...element, fontWeight: loadedWeight }),
      family: info.fontFamily,
      style: element.fontStyle,
      weight: loadedWeight,
      src: url,
      unicodeRange,
    },
  };
};

const withTimeout = (promise, timeoutMs, label) => {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
};

const getRendererOpenBrowser = () => engineRequire("@remotion/renderer").openBrowser;

const measureInPage = async (fontDefinitions, elements) => {
  const fontResults = await Promise.all(fontDefinitions.map(async (definition) => {
    let timer;
    try {
      const face = new FontFace(
        definition.family,
        `url(${JSON.stringify(definition.src)}) format("woff2")`,
        {
          style: definition.style,
          weight: String(definition.weight),
          unicodeRange: definition.unicodeRange,
        },
      );
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("font load timed out")), 8000);
      });
      await Promise.race([face.load(), timeout]);
      document.fonts.add(face);
      return { key: definition.key, loaded: true };
    } catch (error) {
      return { key: definition.key, loaded: false, error: String(error?.message ?? error) };
    } finally {
      clearTimeout(timer);
    }
  }));

  const loadedKeys = new Set(fontResults.filter((result) => result.loaded).map((result) => result.key));
  const root = document.createElement("div");
  root.style.position = "absolute";
  root.style.left = "-100000px";
  root.style.top = "0";
  root.style.width = "0";
  root.style.height = "0";
  root.style.overflow = "visible";
  root.style.pointerEvents = "none";
  document.body.appendChild(root);

  const metrics = [];
  try {
    for (const element of elements) {
      if (!loadedKeys.has(element.fontKey)) continue;

      const node = document.createElement("div");
      node.style.display = "block";
      node.style.boxSizing = "border-box";
      node.style.width = `${element.w}px`;
      node.style.margin = "0";
      node.style.padding = "0";
      node.style.border = "0";
      node.style.fontFamily = JSON.stringify(element.fontFamily);
      node.style.fontStyle = element.fontStyle;
      node.style.fontWeight = String(element.fontWeight);
      node.style.fontSize = `${element.fontSize}px`;
      node.style.lineHeight = `${element.fontSize * element.lineHeight}px`;
      node.style.letterSpacing = `${element.letterSpacingEm}em`;
      node.style.whiteSpace = element.whiteSpace;
      node.style.textTransform = element.textTransform;
      node.style.fontVariantNumeric = element.fontVariantNumeric;
      node.style.wordBreak = "normal";
      node.style.overflowWrap = "normal";
      node.textContent = element.text;
      root.appendChild(node);

      const fontCheck = `${element.fontStyle} ${element.fontWeight} ${element.fontSize}px ${JSON.stringify(element.fontFamily)}`;
      if (!document.fonts.check(fontCheck, element.text)) {
        node.remove();
        continue;
      }

      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = Array.from(range.getClientRects());
      const lineTopWidths = new Map();
      for (const rect of rects) {
        const top = Math.round(rect.top * 100) / 100;
        const previous = lineTopWidths.get(top);
        const left = previous ? Math.min(previous.left, rect.left) : rect.left;
        const right = previous ? Math.max(previous.right, rect.right) : rect.right;
        lineTopWidths.set(top, { left, right });
      }

      let measuredWidthPx = 0;
      for (const line of lineTopWidths.values()) {
        measuredWidthPx = Math.max(measuredWidthPx, line.right - line.left);
      }
      const lineHeightPx = element.fontSize * element.lineHeight;
      const heightLineCount = lineHeightPx > 0
        ? Math.round(node.getBoundingClientRect().height / lineHeightPx)
        : 0;
      const measuredLines = Math.max(lineTopWidths.size, heightLineCount);
      if (Number.isInteger(measuredLines) && measuredLines >= 0 && Number.isFinite(measuredWidthPx)) {
        metrics.push({ id: element.id, measuredLines, measuredWidthPx });
      }
      node.remove();
    }
  } finally {
    root.remove();
  }

  return {
    metrics,
    fontFailures: fontResults.filter((result) => !result.loaded),
  };
};

export const measureLayoutElements = async (elements, options = {}) => {
  const warnings = [];
  const candidates = [];
  const fontDefinitions = new Map();

  for (const element of elements) {
    if (!elementHasText(element)) continue;
    if (!validElementForMeasurement(element)) {
      warnings.push(`${element.id ?? "text element"}: missing or invalid font measurement metadata`);
      continue;
    }
    const result = resolveFontDefinition(element);
    if (result.error) {
      warnings.push(`${element.id ?? "text element"}: ${result.error}`);
      continue;
    }

    const key = result.definition.key;
    fontDefinitions.set(key, result.definition);
    candidates.push({
      id: element.id,
      text: element.text,
      w: element.w,
      fontFamily: result.definition.family,
      fontStyle: element.fontStyle,
      fontWeight: element.fontWeight,
      fontSize: element.fontSize,
      lineHeight: element.lineHeight,
      letterSpacingEm: element.letterSpacingEm,
      whiteSpace: element.whiteSpace,
      textTransform: element.textTransform,
      fontVariantNumeric: element.fontVariantNumeric ?? "normal",
      fontKey: key,
    });
  }

  if (candidates.length === 0) return { metrics: {}, warnings };

  const browserExecutable = Object.hasOwn(options, "browserExecutable")
    ? options.browserExecutable
    : findBrowserExecutable();
  if (!browserExecutable) {
    return {
      metrics: {},
      warnings: [...warnings, "Chromium was not found; retained estimatedLines. Set BRANDREEL_CHROME_EXECUTABLE or pass --no-measure to select the offline estimate path."],
    };
  }

  const timeoutMs = options.timeoutMs ?? 30000;
  let browser;
  let launchExpired = false;

  try {
    const openBrowser = options.openBrowser ?? getRendererOpenBrowser();
    const launching = Promise.resolve().then(() => openBrowser("chrome", {
      browserExecutable,
      chromiumOptions: { headless: true },
      logLevel: "error",
    })).then(async (instance) => {
      if (launchExpired) {
        await withTimeout(instance.close({ silent: true }), 3000, "closing late Chromium launch").catch(() => {});
        throw new Error(`opening Chromium timed out after ${timeoutMs}ms`);
      }
      browser = instance;
      return instance;
    });
    browser = await withTimeout(launching, timeoutMs, "opening Chromium");
    const page = await withTimeout(browser.newPage({
      context: () => null,
      logLevel: "error",
      indent: false,
      pageIndex: 0,
      onBrowserLog: null,
      onLog: () => {},
    }), Math.min(timeoutMs, 8000), "opening browser page");
    await withTimeout(page.goto({ url: "about:blank", timeout: Math.min(timeoutMs, 5000) }), Math.min(timeoutMs, 6000), "opening measurement page");
    const result = await withTimeout(
      page.evaluate(measureInPage, [...fontDefinitions.values()], candidates),
      timeoutMs,
      "measuring text",
    );

    const metrics = {};
    for (const metric of result.metrics) {
      if (
        typeof metric.id === "string" &&
        Number.isInteger(metric.measuredLines) && metric.measuredLines >= 0 &&
        Number.isFinite(metric.measuredWidthPx) && metric.measuredWidthPx >= 0
      ) {
        metrics[metric.id] = {
          measuredLines: metric.measuredLines,
          measuredWidthPx: metric.measuredWidthPx,
        };
      }
    }
    for (const failure of result.fontFailures) {
      const definition = [...fontDefinitions.values()].find((font) => font.key === failure.key);
      warnings.push(`${definition?.family ?? failure.key}: font failed to load (${failure.error}); retained estimate for affected elements`);
    }
    const measuredIds = new Set(Object.keys(metrics));
    for (const element of candidates) {
      if (!measuredIds.has(element.id) && !result.fontFailures.some((failure) => failure.key === element.fontKey)) {
        warnings.push(`${element.id ?? "text element"}: browser did not confirm the requested font; retained estimatedLines`);
      }
    }
    return { metrics, warnings };
  } catch (error) {
    return {
      metrics: {},
      warnings: [...warnings, `glyph measurement failed (${error.message}); retained estimatedLines`],
    };
  } finally {
    if (browser) {
      await withTimeout(Promise.resolve().then(() => browser.close({ silent: true })), 3000, "closing Chromium").catch(() => {});
    } else {
      launchExpired = true;
    }
  }
};

export const addMeasuredMetrics = (manifest, metrics) => ({
  ...manifest,
  elements: manifest.elements.map((element) => {
    const measured = metrics[element.id];
    return measured
      ? { ...element, ...measured }
      : element;
  }),
});
