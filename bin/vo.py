#!/usr/bin/env python3
"""Synthesize workspace voiceover with Kokoro."""

from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path
from typing import Any


SAMPLE_RATE = 24_000
DEFAULT_PAUSE_MS = 400
DEFAULT_LANG_CODE = "a"
SUPPORTED_LANG_CODES = frozenset("abefhijp z".replace(" ", ""))


def _fail(message: str) -> None:
    raise RuntimeError(message)


def _read_vo_config(path: Path) -> tuple[str, float, list[dict[str, Any]]]:
    if not path.exists():
        _fail(f"missing vo.json at {path}")
    try:
        config = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        _fail(f"could not read or parse {path}: {exc}")

    if not isinstance(config, dict):
        _fail("vo.json must contain an object")

    voice = config.get("voice")
    if not isinstance(voice, str) or not voice.strip():
        _fail("vo.json must contain a non-empty voice")

    speed = config.get("speed", 1.0)
    if (
        isinstance(speed, bool)
        or not isinstance(speed, (int, float))
        or not math.isfinite(float(speed))
        or speed <= 0
    ):
        _fail("vo.json speed must be a positive number")

    segments = config.get("segments")
    if not isinstance(segments, list) or not segments:
        _fail("vo.json has empty segments; add at least one segment")

    normalized: list[dict[str, Any]] = []
    for index, segment in enumerate(segments, start=1):
        if not isinstance(segment, dict):
            _fail(f"vo.json segment {index} must be an object")
        segment_id = segment.get("id")
        text = segment.get("text")
        if not isinstance(segment_id, str) or not segment_id.strip():
            _fail(f"vo.json segment {index} must have a non-empty id")
        if not isinstance(text, str) or not text.strip():
            _fail(f"vo.json segment {segment_id!r} must have non-empty text")
        pause = segment.get("pauseAfterMs", DEFAULT_PAUSE_MS)
        if isinstance(pause, bool) or not isinstance(pause, int) or pause < 0:
            _fail(f"vo.json segment {segment_id!r} pauseAfterMs must be a non-negative integer")
        normalized.append({"id": segment_id, "text": text, "pauseAfterMs": pause})

    return voice.strip(), float(speed), normalized


def _language_code_for_voice(voice: str) -> str:
    # Kokoro voice IDs begin with a language code, for example af_heart where
    # a means American English. Keep the default explicit for future callers.
    language_code = voice[:1].lower() if voice else DEFAULT_LANG_CODE
    if language_code not in SUPPORTED_LANG_CODES:
        _fail(
            f"unknown Kokoro voice {voice!r}: unsupported language prefix "
            f"{language_code!r}"
        )
    return language_code


def _audio_array(audio: Any):
    import numpy as np

    if hasattr(audio, "detach"):
        audio = audio.detach().cpu().numpy()
    array = np.asarray(audio, dtype=np.float32)
    if array.ndim == 2:
        if array.shape[1] == 1:
            array = array[:, 0]
        elif array.shape[0] == 1:
            array = array[0]
        else:
            array = array.mean(axis=1)
    if array.ndim != 1 or array.size == 0:
        _fail("Kokoro returned an empty or unsupported audio shape")
    return array


def _synthesize_segment(pipeline: Any, text: str, voice: str, speed: float):
    import numpy as np

    chunks = []
    try:
        generated = pipeline(text, voice=voice, speed=speed)
        for item in generated:
            # Newer Kokoro yields Result objects with an .audio attribute;
            # older versions yield (graphemes, phonemes, audio) tuples.
            audio = getattr(item, "audio", None)
            if audio is None and isinstance(item, (tuple, list)) and len(item) >= 3:
                audio = item[-1]
            if audio is None:
                _fail("Kokoro returned an unexpected segment result")
            chunks.append(_audio_array(audio))
    except RuntimeError:
        raise
    except Exception as exc:  # Kokoro may validate a voice while iterating.
        raise RuntimeError(f"unknown or unusable Kokoro voice {voice!r}: {exc}") from exc
    if not chunks:
        _fail(f"Kokoro produced no audio for text {text!r}")
    return np.concatenate(chunks).astype(np.float32, copy=False)


def _segment_filename(segment_id: str, used: set[str]) -> str:
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", segment_id).strip("._") or "segment"
    candidate = safe
    suffix = 2
    while candidate in used:
        candidate = f"{safe}-{suffix}"
        suffix += 1
    used.add(candidate)
    return f"{candidate}.wav"


def run(workspace: Path) -> None:
    voice, speed, segments = _read_vo_config(workspace / "vo.json")
    language_code = _language_code_for_voice(voice)

    try:
        import numpy as np
        import soundfile as sf
    except ImportError as exc:
        _fail("numpy and soundfile are not installed; run the audio virtualenv setup in audio/README.md")

    try:
        from kokoro import KPipeline
    except ImportError as exc:
        _fail("Kokoro is not installed; run the audio virtualenv setup in audio/README.md")

    try:
        pipeline = KPipeline(lang_code=language_code)
    except Exception as exc:
        raise RuntimeError(
            f"could not load Kokoro language {language_code!r} for voice {voice!r}: {exc}"
        ) from exc

    segment_dir = workspace / "vo"
    segment_dir.mkdir(parents=True, exist_ok=True)
    rendered: list[tuple[dict[str, Any], Any, Path]] = []
    used_names: set[str] = set()
    for segment in segments:
        audio = _synthesize_segment(pipeline, segment["text"], voice, speed)
        segment_path = segment_dir / _segment_filename(segment["id"], used_names)
        sf.write(segment_path, audio, SAMPLE_RATE, subtype="PCM_16")
        rendered.append((segment, audio, segment_path))

    pieces = []
    timing_segments = []
    cursor_samples = 0
    for index, (segment, audio, _segment_path) in enumerate(rendered):
        start_samples = cursor_samples
        end_samples = start_samples + len(audio)
        timing_segments.append(
            {
                "id": segment["id"],
                "startMs": round(start_samples * 1000 / SAMPLE_RATE),
                "endMs": round(end_samples * 1000 / SAMPLE_RATE),
            }
        )
        pieces.append(audio)
        cursor_samples = end_samples
        if index < len(rendered) - 1:
            pause_samples = round(segment["pauseAfterMs"] * SAMPLE_RATE / 1000)
            if pause_samples:
                pieces.append(np.zeros(pause_samples, dtype=np.float32))
            cursor_samples += pause_samples

    output_audio = np.concatenate(pieces).astype(np.float32, copy=False)
    sf.write(workspace / "vo.wav", output_audio, SAMPLE_RATE, subtype="PCM_16")
    (workspace / "vo-timing.json").write_text(
        f"{json.dumps({'segments': timing_segments}, indent=2)}\n", encoding="utf-8"
    )
    print(f"wrote {workspace / 'vo.wav'} and {workspace / 'vo-timing.json'}")


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: python3 bin/vo.py <workspace-dir>", file=sys.stderr)
        return 2
    try:
        run(Path(argv[1]))
    except (OSError, RuntimeError, ValueError) as exc:
        print(f"vo: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
