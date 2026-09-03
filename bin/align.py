#!/usr/bin/env python3
"""Force-align workspace voiceover against its known script text."""

from __future__ import annotations

import json
import math
import sys
from collections.abc import Mapping
from pathlib import Path
from typing import Any


def _fail(message: str) -> None:
    raise RuntimeError(message)


def _read_config(path: Path) -> str:
    if not path.exists():
        _fail(f"missing vo.json at {path}")
    try:
        config = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        _fail(f"could not read or parse {path}: {exc}")
    if not isinstance(config, dict):
        _fail("vo.json must contain an object")
    segments = config.get("segments")
    if not isinstance(segments, list) or not segments:
        _fail("vo.json has empty segments; cannot align empty text")
    texts = []
    for index, segment in enumerate(segments, start=1):
        if not isinstance(segment, dict) or not isinstance(segment.get("text"), str):
            _fail(f"vo.json segment {index} must have text")
        text = segment["text"].strip()
        if not text:
            _fail(f"vo.json segment {index} has empty text")
        texts.append(text)
    return " ".join(texts)


def _field(value: Any, name: str, default: Any = None) -> Any:
    if isinstance(value, Mapping):
        return value.get(name, default)
    return getattr(value, name, default)


def _result_segments(result: Any) -> list[Any]:
    data = result
    if hasattr(result, "to_dict"):
        try:
            data = result.to_dict()
        except Exception:
            data = result
    segments = _field(data, "segments")
    if segments is None:
        segments = _field(result, "segments")
    if not isinstance(segments, (list, tuple)):
        return []
    return list(segments)


def _aligned_words(result: Any) -> list[dict[str, Any]]:
    found: list[tuple[float, int, dict[str, Any]]] = []
    order = 0
    for segment in _result_segments(result):
        segment_words = _field(segment, "words", [])
        if not isinstance(segment_words, (list, tuple)):
            continue
        for word in segment_words:
            text = _field(word, "word", _field(word, "text"))
            start = _field(word, "start")
            end = _field(word, "end")
            if not isinstance(text, str) or not text.strip():
                continue
            if not isinstance(start, (int, float)) or isinstance(start, bool):
                _fail(f"stable-ts returned a word without a numeric start: {word!r}")
            if not isinstance(end, (int, float)) or isinstance(end, bool):
                _fail(f"stable-ts returned a word without a numeric end: {word!r}")
            if not math.isfinite(float(start)) or not math.isfinite(float(end)):
                _fail(f"stable-ts returned a word with non-finite timing: {word!r}")
            if float(end) < float(start):
                _fail(f"stable-ts returned a word with end before start: {word!r}")
            found.append(
                (
                    float(start),
                    order,
                    {
                        "text": text.strip(),
                        "startMs": round(float(start) * 1000),
                        "endMs": round(float(end) * 1000),
                    },
                )
            )
            order += 1

    found.sort(key=lambda item: (item[0], item[1]))
    return [item[2] for item in found]


def run(workspace: Path) -> None:
    audio_path = workspace / "vo.wav"
    if not audio_path.exists():
        _fail(f"missing vo.wav at {audio_path}; run vo.py first")
    text = _read_config(workspace / "vo.json")

    try:
        import stable_whisper
    except ImportError as exc:
        _fail("stable-ts is not installed; run the audio virtualenv setup in audio/README.md")

    try:
        model = stable_whisper.load_model("base")
        result = model.align(str(audio_path), text, language="en")
    except Exception as exc:
        raise RuntimeError(f"stable-ts alignment failed: {exc}") from exc

    words = _aligned_words(result)
    if not words:
        _fail("stable-ts returned no word-level timestamps")
    (workspace / "words.json").write_text(
        f"{json.dumps({'words': words}, indent=2)}\n", encoding="utf-8"
    )
    print(f"wrote {workspace / 'words.json'}")


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: python3 bin/align.py <workspace-dir>", file=sys.stderr)
        return 2
    try:
        run(Path(argv[1]))
    except (OSError, RuntimeError, ValueError) as exc:
        print(f"align: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
