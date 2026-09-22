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
manual or later automated fetching. To use a generated clip, copy it under
`assets/`, set that broll beat's `clip` to the workspace-relative source path,
then run `reel` (or run `conform` and `compose` directly). `assets` leaves the
generation entry pending, while the explicit `clip` path selects the supplied
file.

`reel` runs `assets` and `conform` after script authoring only when a beat has a
`visual` directive. The script is reloaded after authoring so directives added
by the model activate those stages in the same pipeline run. `compose` matches
each stock or generated beat against both version 1 manifests using its beat
index and current directive, then uses the conformed output path. Stale or
pending entries fail with a clear error.

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
`assets/manifest.json`. `compose` reads the asset and conformed manifests rather
than editing `script.json`. A broll beat may also set `clip` to a source path
present in `assets/conformed/manifest.json`, or to a
verified conformed output path. Paths must stay inside the workspace and cannot
contain symlinks. Clips must be square-pixel 1080x1920 at 60/1 fps and at least
as long as the beat.

The optional `overlayText` is a script-owned safe-zone overlay. Set
`captionSource` to `words` to require `words.json` with word timings, or `none`
for a footage beat without karaoke captions. `compose` stages only the selected
clips in a temporary Remotion public directory, preserving paths relative to
the workspace, and removes that directory and its props file after success or
failure. On systems where Chromium is not auto-detected, pass its executable to
`compose` or `reel` with `--browser-executable <path>`.

Conform downloaded or supplied video clips before composition:

```sh
node bin/conform.mjs workspace/demo
node bin/conform.mjs workspace/demo --fit pad
```

The conform stage scans regular video files under `assets/` recursively and
skips its own `assets/conformed/` output and temporary staging directories.
The default `--fit crop` scales to fill 1080x1920 and center-crops. Use
`--fit pad` to preserve the full frame with black bars where needed. Outputs
are square-pixel 1080x1920 H.264 at constant 60 fps, with the source duration
preserved to within one 60 fps frame. Source audio is retained as AAC. The
stage writes `assets/conformed/manifest.json` with `version: 1` and an `assets`
array. Each entry maps a workspace-relative `source` path to a workspace-relative
conformed `file` path and records source/output probe facts, interpolation
method and fit mode.

Clips below 60 fps use Practical-RIFE 4.25 when the local checkout, model and
`audio/.venv/bin/python` are usable. The default checkout is
`audio/rife-v4.25/` and must contain `inference_video.py` and
`train_log/flownet.pkl`. Set `BRANDREEL_RIFE_DIR` to use a checkout elsewhere,
or `BRANDREEL_RIFE_PYTHON` to select the Python executable. RIFE's multiplier
is the ceiling of 60 divided by the source frame rate; ffmpeg then converts
that intermediate rate to 60 fps. If the checkout, Python dependencies or
inference are unavailable or produce the wrong rate/duration, the stage warns
and uses ffmpeg `minterpolate`. No dependencies are installed by the stage.

Script generation retries layout lint failures twice by default. Use
`--retries N`, `--skip-lint`, or `--lint-cmd <command>` to control that loop.
Each run writes `script-attempts.json` with `attempts`, `retriesUsed`, `retryLimit`,
`outcome`, and `violationsPerAttempt`.

Use `--vo` and `--music` to opt into those modules. Model-provided modules are ignored. Use `--dry-run` to write `script-prompt.md` without calling the model. The default model command is `claude -p`; override it with `--model-cmd` for another CLI or a fake model.

Add a brand by copying the `brands/regulate/brand.json` shape and pointing a script at the new brand directory. See [SPEC.md](SPEC.md) for the design and stage contracts.
