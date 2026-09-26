#!/usr/bin/env bash
# render-long.sh <id> [jobs=4] - render-reel.sh for long seekable animatics: the picture is
# captured in <jobs> parallel headless-Chrome workers over whole-second ranges (frame-exact at
# 60fps), the parts are joined losslessly, then the mastered score is muxed once.
#   animatics/<id>.html + animatics/<id>.sound.mjs -> workspace/<id>/final/<id>.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
id="$1"; jobs="${2:-4}"
out="workspace/$id/final"; mkdir -p "$out"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
node "animatics/$id.sound.mjs" "$tmp/raw.wav"
I=$(ffmpeg -hide_banner -i "$tmp/raw.wav" -af loudnorm=print_format=json -f null - 2>&1 | grep '"input_i"' | sed 's/[^-0-9.]//g')
G=$(python3 -c "print(round(-14 - ($I) + 0.6, 2))")
ffmpeg -y -loglevel error -i "$tmp/raw.wav" -af "volume=${G}dB,alimiter=limit=0.83:attack=2:release=60:level=disabled" -c:a pcm_s24le "$tmp/master.wav"
dur=$(node -e "
const fs=require('fs'),l=(f)=>fs.readFileSync('animatics/'+f,'utf8').replace(/if \(typeof module[^\n]*/,'');
let src=l('lib/timing-kit.js'); if (fs.existsSync('animatics/$id.vo.js')) src+=l('$id.vo.js'); src+=l('$id.timing.js');
console.log(new Function(src+';return TIMING;')().dur)")
step=$(( (dur / jobs / 1000 + 1) * 1000 ))
pids=(); i=0
for (( a=0; a<dur; a+=step )); do
  b=$(( a + step < dur ? a + step : dur ))
  node bin/animatic-render.mjs "animatics/$id.html" "$tmp/part$i.mp4" --from "$a" --to "$b" > "$tmp/log$i.txt" 2>&1 &
  pids+=($!); echo "file '$tmp/part$i.mp4'" >> "$tmp/parts.txt"; i=$((i+1))
done
for p in "${pids[@]}"; do wait "$p"; done
ffmpeg -y -loglevel error -f concat -safe 0 -i "$tmp/parts.txt" -i "$tmp/master.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart "$out/$id.mp4"
cp "$tmp/master.wav" "$out/$id.master.wav"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames -show_entries format=duration -of compact "$out/$id.mp4"
ffmpeg -hide_banner -i "$out/$id.mp4" -vn -af loudnorm=print_format=summary -f null - 2>&1 | grep -E "Input Integrated|Input True Peak"
