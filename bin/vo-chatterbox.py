#!/usr/bin/env python3
"""vo-chatterbox.py <workspace> [--redo piece,piece] - expressive narration with Chatterbox.

Runs in audio/.venv-cb (Chatterbox needs its own torch pins). Reads <workspace>/vo.json:
  segments[{id, text, gapMs?}], gapMs (between segments), beatGapMs (" | " marks),
  groupGapMs (between sentence groups), cb{ref, exaggeration, cfg, seed, groupChars, tempo}, respell{}.
Each segment is split at " | " into parts, each part into sentence groups of <= groupChars, and
each group is voiced in ONE generation so intonation carries across its sentences (voicing
sentence by sentence resets the pitch contour every time - Steven 09-27: "monotone ... doesn't
say words in the right tone across sentences"). Groups are cached in <workspace>/cb/ by index;
--redo regenerates listed indices with the next seed. Writes <workspace>/vo.wav and
<workspace>/vo-pieces.json; word timings come from bin/vo-align.py (forced alignment).
Chatterbox output carries Resemble's Perth imperceptible watermark (kept on purpose).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import torch


def trim(w: np.ndarray, sr: int) -> np.ndarray:
    hop = int(sr * 0.01)
    rms = np.array([np.sqrt(np.mean(w[i:i + hop] ** 2) + 1e-12) for i in range(0, len(w) - hop, hop)])
    thr = rms.max() * 10 ** (-42 / 20)
    on = np.where(rms > thr)[0]
    if not len(on):
        return w
    a = max(0, on[0] * hop - int(sr * 0.04))
    b = min(len(w), (on[-1] + 1) * hop + int(sr * 0.12))
    out = w[a:b].copy()
    f = min(int(sr * 0.01), len(out) // 4)
    out[:f] *= np.linspace(0, 1, f); out[-f:] *= np.linspace(1, 0, f)
    return out


def pieces_of(cfg: dict) -> list[dict]:
    limit = cfg["cb"].get("groupChars", 260)
    out = []
    for seg in cfg["segments"]:
        for pi, part in enumerate(re.split(r"\s*\|\s*", seg["text"])):
            sents = [s for s in re.split(r"(?<=[.?!])\s+", part.strip()) if s]
            groups, cur = [], ""
            for s in sents:
                if cur and len(cur) + 1 + len(s) > limit:
                    groups.append(cur); cur = s
                else:
                    cur = f"{cur} {s}".strip()
            if cur:
                groups.append(cur)
            for gi, g in enumerate(groups):
                gap = cfg.get("gapMs", 900) if not out or (pi == 0 and gi == 0) else (cfg.get("beatGapMs", 650) if gi == 0 else cfg.get("groupGapMs", 380))
                if pi == 0 and gi == 0 and "gapMs" in seg:
                    gap = seg["gapMs"]
                display = re.sub(r"\[([^\]]+)\]\(/[^)]*/\)", r"\1", g)
                spoken = display
                for k, v in cfg.get("respell", {}).items():
                    spoken = re.sub(rf"\b{re.escape(k)}\b", v, spoken)
                out.append({"i": len(out), "seg": seg["id"], "text": display, "spoken": spoken, "gapMs": gap if out else cfg.get("leadMs", 600)})
    return out


def main() -> None:
    ws = Path(sys.argv[1]); cfg = json.loads((ws / "vo.json").read_text(encoding="utf-8"))
    redo = set()
    if "--redo" in sys.argv:
        redo = {int(x) for x in sys.argv[sys.argv.index("--redo") + 1].split(",") if x}
    cb = cfg["cb"]; cache = ws / "cb"; cache.mkdir(exist_ok=True)
    pcs = pieces_of(cfg)
    from chatterbox.tts import ChatterboxTTS
    dev = "mps" if torch.backends.mps.is_available() else "cpu"
    model = None
    sr = 24000
    audio, cursor, meta = [], 0, []
    for p in pcs:
        f = cache / f"{p['i']:03d}.wav"; seedf = cache / f"{p['i']:03d}.seed"
        seed = int(seedf.read_text()) if seedf.exists() else cb.get("seed", 7)
        txtf = cache / f"{p['i']:03d}.txt"
        stale = not f.exists() or p["i"] in redo or not txtf.exists() or txtf.read_text(encoding="utf-8") != p["spoken"]
        if stale:
            if p["i"] in redo:
                seed += 1
            if model is None:
                model = ChatterboxTTS.from_pretrained(device=dev); sr = model.sr
                model.prepare_conditionals(str(ws / cb["ref"]), exaggeration=cb.get("exaggeration", 0.55))
            torch.manual_seed(seed)
            w = model.generate(p["spoken"], exaggeration=cb.get("exaggeration", 0.55), cfg_weight=cb.get("cfg", 0.45)).squeeze(0).cpu().numpy()
            sf.write(f, w, model.sr); seedf.write_text(str(seed)); (cache / f"{p['i']:03d}.txt").write_text(p["spoken"], encoding="utf-8")
            print(f"voiced {p['i']:3d} seed {seed} {p['seg']}: {p['text'][:60]}", flush=True)
        w, sr = sf.read(f, dtype="float32")
        w = trim(w, sr)
        if cb.get("tempo", 1.0) != 1.0:  # pitch-preserving slow-down (WSOLA); Chatterbox has no speed control
            import subprocess
            r = subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "f32le", "-ar", str(sr), "-ac", "1", "-i", "-", "-af", f"atempo={cb['tempo']}", "-f", "f32le", "-"], input=w.tobytes(), capture_output=True, check=True)
            w = np.frombuffer(r.stdout, dtype=np.float32).copy()
        g = np.zeros(int(sr * p["gapMs"] / 1000), dtype=np.float32)
        audio += [g, w]; cursor += len(g)
        meta.append({"i": p["i"], "seg": p["seg"], "text": p["text"], "startMs": round(cursor / sr * 1000), "endMs": round((cursor + len(w)) / sr * 1000)})
        cursor += len(w)
    wav = np.concatenate(audio)
    sf.write(ws / "vo.wav", wav, sr, subtype="FLOAT")
    (ws / "vo-pieces.json").write_text(json.dumps({"sr": sr, "durMs": round(len(wav) / sr * 1000), "pieces": meta}, indent=1), encoding="utf-8")
    print(f"total {len(wav) / sr:.1f}s in {len(meta)} pieces -> {ws / 'vo.wav'}")


if __name__ == "__main__":
    main()
