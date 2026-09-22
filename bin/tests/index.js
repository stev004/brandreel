process.env.BRANDREEL_NO_MEASURE = "1";

await import("./reel-review.test.mjs");
await import("./script.test.mjs");
await import("./lint.test.mjs");
await import("./overlap.test.mjs");
await import("./measured-text-fit.test.mjs");
await import("./manifest-measure.test.mjs");
await import("./interview.test.mjs");
await import("./assets.test.mjs");
await import("./conform.test.mjs");
await import("./broll-compose.test.mjs");
await import("./footage-lint.test.mjs");
