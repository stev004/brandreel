# brandreel

brandreel is a standalone, brand-agnostic 60fps 9:16 short-form video pipeline.

Milestone 1 includes the Remotion engine scaffold, the Moment template, the Stack composition, schema and layout lints, and a Regulate demo.

From the repository root, render the demo with:

```sh
node bin/compose.mjs workspace/demo
```

Create the stage 8 review sheet with:

```sh
node bin/review.mjs workspace/demo
```

Run stage 7 lint checks with:

```sh
node bin/lint.mjs workspace/demo
```

Use `node bin/lint.mjs workspace/demo --no-render` to lint layout.json without
ffprobe or pixel sampling. The render-dependent rules are marked skipped.

The linter checks the 1080x1920, 60fps render with ffprobe, validates the
layout.json safe zones, text fit, hook, pacing, CTA and text overlap rules, and samples
rendered pixels for overflow in the top, bottom and right bands. Use
`--no-pixels` when ffmpeg frame decoding is not available. A
`durationOverride` with a non-empty `reason` in script.json skips the 15-35
second duration check and records that reason in lint-report.json.

Chain the stages selected by a script with:

```sh
node bin/reel.mjs workspace/demo --dry-run
```

Draft a validated stage 1 script with a configured model CLI:

```sh
node bin/script.mjs workspace/demo --brand regulate --topic "cannot sleep at 3am" [--vo <voice-id>] [--music <file>] [--url <url>] [--tagline <text>]
```

Start a creative brief first with the interview stage:

```sh
node bin/interview.mjs workspace/demo [--answers <file.json>] [--brand <name>] [--defaults]
```

When `brief.json` exists, script generation uses its topic, mechanic, facts,
allowed beat kinds, phrases, modules and close data as the creative contract.
Explicit script flags override the matching brief values. A reel with neither
`brief.json` nor `script.json` runs interview before script; existing scripts
continue directly to downstream stages.

Resolve visual directives with the stage 4 asset CLI:

```sh
node bin/assets.mjs workspace/demo --dry-run
PEXELS_API_KEY=your_key PIXABAY_API_KEY=your_key node bin/assets.mjs workspace/demo
```

Each beat may have a `visual` string such as `template:moment`,
`stock:quiet forest at dawn`, or `gen:slow clouds over a dark lake`. Template
beats need no fetch. Stock beats try Pexels first, then Pixabay, and save a
portrait MP4 plus source URL and contributor details in
`assets/manifest.json`. Keep provider keys in environment variables. Stock
clips follow the provider's license and attribution terms; they are not treated
as CC0. See the [Pexels API documentation](https://www.pexels.com/api/documentation/)
and [Pixabay API documentation](https://pixabay.com/api/docs/).

Generation directives write pending prompts to `assets/veo-manifest.json` for
manual or later automated fetching. This stage resolves and records assets;
Remotion Broll rendering and reel-stage wiring are still pending G5c, so a
successful asset run does not yet make `compose` consume stock clips.

When a script includes a `broll` beat, its data shape is:

```json
{
  "kind": "broll",
  "visual": "stock:quiet forest at dawn",
  "overlayText": "A slower morning",
  "captionSource": "words",
  "durationMs": 4000
}
```

After assets resolve, the workspace-relative `clip` path is available in
`assets/manifest.json`. An existing broll beat with a `clip` and no `visual`
directive is left alone by the assets stage.

Script generation retries layout lint failures twice by default. Use
`--retries N`, `--skip-lint`, or `--lint-cmd <command>` to control that loop.
Each run writes `script-attempts.json` with `attempts`, `retriesUsed`, `retryLimit`,
`outcome`, and `violationsPerAttempt`.

Use `--vo` and `--music` to opt into those modules. Model-provided modules are ignored. Use `--dry-run` to write `script-prompt.md` without calling the model. The default model command is `claude -p`; override it with `--model-cmd` for another CLI or a fake model.

Add a brand by copying the `brands/regulate/brand.json` shape and pointing a script at the new brand directory. See [SPEC.md](SPEC.md) for the design and stage contracts.
