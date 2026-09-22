import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { addMeasuredMetrics, measureLayoutElements } from "../measure-text.mjs";

const testsDir = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(testsDir, "fixtures", "manifest-measure.json"), "utf8"));

const makeBrowser = (evaluate, onClose = () => {}) => ({
  async newPage(options) {
    assert.deepEqual(options, {
      context: options.context,
      logLevel: "error",
      indent: false,
      pageIndex: 0,
      onBrowserLog: null,
      onLog: options.onLog,
    });
    assert.equal(typeof options.context, "function");
    assert.equal(typeof options.onLog, "function");
    return {
      async goto(navigation) {
        assert.equal(navigation.url, "about:blank");
      },
      evaluate,
    };
  },
  async close(options) {
    assert.deepEqual(options, { silent: true });
    onClose();
  },
});

test("the Playfair fixture has 44 characters in a 900px box and records browser metrics", async () => {
  const element = fixture.elements[0];
  assert.equal(Array.from(element.text).length, 44);
  assert.equal(element.w, 900);

  let browserOptions;
  let passedElements;
  let passedFonts;
  const browser = makeBrowser(async (measureFunction, fonts, elements) => {
    assert.match(String(measureFunction), /textContent = element\.text/);
    assert.doesNotMatch(String(measureFunction), /innerHTML/);
    passedFonts = fonts;
    passedElements = elements;
    return {
      metrics: [{ id: element.id, measuredLines: 2, measuredWidthPx: 843.25 }],
      fontFailures: [],
    };
  });
  const measured = await measureLayoutElements(fixture.elements, {
    browserExecutable: "/mock/chromium",
    openBrowser: async (browserName, options) => {
      assert.equal(browserName, "chrome");
      browserOptions = options;
      return browser;
    },
  });

  assert.equal(browserOptions.browserExecutable, "/mock/chromium");
  assert.equal(passedFonts.length, 1);
  assert.match(passedFonts[0].src, /^https:\/\/fonts\.gstatic\.com\//);
  assert.equal(passedFonts[0].family, "Playfair Display");
  assert.equal(passedFonts[0].style, "normal");
  assert.equal(passedFonts[0].weight, 400);
  assert.equal(passedElements[0].text, element.text);
  assert.equal(passedElements[0].w, 900);
  assert.deepEqual(measured.metrics[element.id], {
    measuredLines: 2,
    measuredWidthPx: 843.25,
  });

  const output = addMeasuredMetrics(fixture, measured.metrics);
  assert.equal(output.elements[0].estimatedLines, 2);
  assert.equal(output.elements[0].measuredLines, 2);
  assert.equal(output.elements[0].measuredWidthPx, 843.25);
  assert.deepEqual(measured.warnings, []);
});

test("Source Serif 4 CSS weight 500 measures with the renderer's loaded weight 400", async () => {
  const element = {
    ...fixture.elements[0],
    id: "source-serif-weight-match",
    fontFamily: "Source Serif 4",
    fontWeight: 500,
  };
  let passedElements;
  let passedFonts;
  const measured = await measureLayoutElements([element], {
    browserExecutable: "/mock/chromium",
    openBrowser: async () => makeBrowser(async (_measureFunction, fonts, elements) => {
      passedFonts = fonts;
      passedElements = elements;
      return {
        metrics: [{ id: element.id, measuredLines: 2, measuredWidthPx: 810 }],
        fontFailures: [],
      };
    }),
  });

  assert.equal(element.fontFamily, "Source Serif 4");
  assert.equal(passedFonts[0].family, "Source Serif Four");
  assert.equal(passedFonts[0].weight, 400);
  assert.equal(passedElements[0].fontFamily, "Source Serif Four");
  assert.equal(passedElements[0].fontWeight, 500);
  assert.equal(passedElements[0].fontKey, passedFonts[0].key);
  assert.equal(measured.metrics[element.id].measuredLines, 2);
  assert.deepEqual(measured.warnings, []);
});

test("a failed font load leaves the estimate without fabricated metrics", async () => {
  const element = fixture.elements[0];
  const measured = await measureLayoutElements(fixture.elements, {
    browserExecutable: "/mock/chromium",
    openBrowser: async () => makeBrowser(async () => ({
      metrics: [],
      fontFailures: [{
        key: `Playfair Display\u0000normal\u0000400`,
        error: "network unavailable",
      }],
    })),
  });

  assert.deepEqual(measured.metrics, {});
  assert.match(measured.warnings.join(" "), /network unavailable/);
  assert.equal(addMeasuredMetrics(fixture, measured.metrics).elements[0].estimatedLines, element.estimatedLines);
  assert.equal("measuredLines" in addMeasuredMetrics(fixture, measured.metrics).elements[0], false);
});

test("an unresponsive page times out and closes the browser", async () => {
  let closed = false;
  const measured = await measureLayoutElements(fixture.elements, {
    browserExecutable: "/mock/chromium",
    timeoutMs: 15,
    openBrowser: async () => makeBrowser(() => new Promise(() => {}), () => { closed = true; }),
  });

  assert.equal(closed, true);
  assert.deepEqual(measured.metrics, {});
  assert.match(measured.warnings.join(" "), /measuring text timed out/);
});

test("a synchronous Chromium launch error retains estimates", async () => {
  const measured = await measureLayoutElements(fixture.elements, {
    browserExecutable: "/mock/chromium",
    openBrowser: () => {
      throw new Error("launch rejected");
    },
  });

  assert.deepEqual(measured.metrics, {});
  assert.match(measured.warnings.join(" "), /launch rejected/);
});

test("a timed-out newPage call closes the launched browser", async () => {
  let closed = false;
  const measured = await measureLayoutElements(fixture.elements, {
    browserExecutable: "/mock/chromium",
    timeoutMs: 15,
    openBrowser: async () => ({
      newPage: () => new Promise(() => {}),
      close: async () => { closed = true; },
    }),
  });

  assert.equal(closed, true);
  assert.deepEqual(measured.metrics, {});
  assert.match(measured.warnings.join(" "), /opening browser page timed out after 15ms/);
});

test("empty logo text is skipped without requiring font metadata or Chromium", async () => {
  const measured = await measureLayoutElements([{
    id: "close-logo",
    text: "",
  }], {
    browserExecutable: null,
    openBrowser: async () => {
      throw new Error("empty logo should not open a browser");
    },
  });

  assert.deepEqual(measured, { metrics: {}, warnings: [] });
});

test("an unavailable browser keeps estimate-only output", async () => {
  const measured = await measureLayoutElements(fixture.elements, {
    browserExecutable: null,
  });

  assert.deepEqual(measured.metrics, {});
  assert.match(measured.warnings.join(" "), /Chromium was not found/);
  const output = addMeasuredMetrics(fixture, measured.metrics);
  assert.equal(output.elements[0].estimatedLines, 2);
  assert.equal("measuredLines" in output.elements[0], false);
});

test("uppercase conversion is included in Latin font coverage checks", async () => {
  const measured = await measureLayoutElements([{
    ...fixture.elements[0],
    id: "uppercase-micro-sign",
    text: "µ",
    textTransform: "uppercase",
  }], {
    browserExecutable: null,
    openBrowser: async () => {
      throw new Error("uncovered uppercase glyph must not reach Chromium");
    },
  });

  assert.deepEqual(measured.metrics, {});
  assert.match(measured.warnings.join(" "), /outside the renderer's Latin subset/);
});
