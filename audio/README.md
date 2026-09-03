# brandreel audio stages

These stages are standalone CLIs. They communicate through files in a video
workspace and do not import the Remotion engine.

## One-time setup

```sh
python3 -m venv audio/.venv
audio/.venv/bin/python -m pip install -r audio/requirements.txt
brew install ffmpeg
```

The Python stages use Kokoro and stable-ts on the CPU. The requirements file
intentionally installs `torch` without a CUDA-specific build. On Apple
Silicon, use the normal PyTorch wheel and let PyTorch use the CPU or available
Metal support as appropriate. `ffmpeg` is a system executable from Homebrew,
not a pip package.

## Per-stage usage

```sh
source audio/.venv/bin/activate
python3 bin/vo.py workspace/howclose-fusion-v2
python3 bin/align.py workspace/howclose-fusion-v2
node bin/polish.mjs workspace/howclose-fusion-v2 --music path/to/music.wav
```

`polish.mjs` also accepts `--music-db -6` to set the music gain and
`--no-vo` to ignore `vo.wav`. The music path is resolved from the directory
where the command is run.

## Workspace file contracts

For a workspace such as `workspace/howclose-fusion-v2/`:

- `vo.json` is the input to stage 2:

  ```json
  {
    "voice": "<kokoro voice id>",
    "speed": 1.0,
    "segments": [
      { "id": "s1", "text": "...", "pauseAfterMs": 400 }
    ]
  }
  ```

  `speed` and `pauseAfterMs` are optional. A missing pause defaults to 400ms.
  Pauses are inserted only between segments, so a final segment's pause does
  not add trailing silence.

- `vo.wav` is stage 2 output: all segments concatenated as 24kHz mono audio,
  with the requested silence gaps.
- `vo-timing.json` is stage 2 output:

  ```json
  { "segments": [{ "id": "s1", "startMs": 0, "endMs": 1935 }] }
  ```

- `words.json` is stage 3 output:

  ```json
  { "words": [{ "text": "Can", "startMs": 0, "endMs": 310 }] }
  ```

  Word times are integer milliseconds and words are in spoken order.
- `render.mp4` is the stage 6 input produced elsewhere. Pass the music file
  path to stage 6 with `--music` when music is needed.
- `final/social.mp4` is stage 6 output. Its video stream is copied from
  `render.mp4`; its mixed audio is two-pass loudness-normalized to -14 LUFS
  integrated loudness and -1 dBTP true peak, then encoded as 48kHz AAC at
  256kbit/s.
- `audio-report.json` records the pass 1 loudnorm measurements, the target,
  and the pass 2 loudnorm result when ffmpeg reports it.
