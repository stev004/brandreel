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
layout.json safe zones, text fit, hook, pacing and CTA rules, and samples
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
node bin/script.mjs workspace/demo --brand regulate --topic "cannot sleep at 3am" [--vo <voice-id>] [--music <file>]
```

Script generation retries layout lint failures twice by default. Use
`--retries N`, `--skip-lint`, or `--lint-cmd <command>` to control that loop.

Use `--vo` and `--music` to opt into those modules. Model-provided modules are ignored. Use `--dry-run` to write `script-prompt.md` without calling the model. The default model command is `claude -p`; override it with `--model-cmd` for another CLI or a fake model.

Add a brand by copying the `brands/regulate/brand.json` shape and pointing a script at the new brand directory. See [SPEC.md](SPEC.md) for the design and stage contracts.
