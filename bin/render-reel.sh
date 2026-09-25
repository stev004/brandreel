#!/usr/bin/env bash
# render-reel.sh <reel-id> [extra animatic-render args...]
# Scores, masters (-14 LUFS, true peak <= -1.5 dBTP) and renders a seekable reel animatic:
#   animatics/<id>.html + animatics/<id>.sound.mjs -> workspace/<id>/final/<id>.mp4 (+ cover.png)
# Extra args go to bin/animatic-render.mjs (e.g. --virtual --duration 19600 --css ... --viewport ...).
set -euo pipefail
cd "$(dirname "$0")/.."
id="$1"; shift
out="workspace/$id/final"; mkdir -p "$out"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
node "animatics/$id.sound.mjs" "$tmp/raw.wav"
I=$(ffmpeg -hide_banner -i "$tmp/raw.wav" -af loudnorm=print_format=json -f null - 2>&1 | grep '"input_i"' | sed 's/[^-0-9.]//g')
G=$(python3 -c "print(round(-14 - ($I) + 0.6, 2))")
ffmpeg -y -loglevel error -i "$tmp/raw.wav" -af "volume=${G}dB,alimiter=limit=0.83:attack=2:release=60:level=disabled" -c:a pcm_s24le "$tmp/master.wav"
node bin/animatic-render.mjs "animatics/$id.html" "$out/$id.mp4" --audio "$tmp/master.wav" "$@"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames -show_entries format=duration -of compact "$out/$id.mp4"
ffmpeg -hide_banner -i "$out/$id.mp4" -vn -af loudnorm=print_format=summary -f null - 2>&1 | grep -E "Input Integrated|Input True Peak"
