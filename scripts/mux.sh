#!/usr/bin/env bash
# Put the soundtrack on the video without re-rendering: mux.sh <video.mp4> <sound.wav> <final.mp4>
# Video is stream-copied (-c:v copy), audio → AAC 192k. Changing the sound = new wav + mux, no render.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
FF=${FFMPEG:-$ROOT/node_modules/ffmpeg-static/ffmpeg}; [[ -x $FF ]] || FF=$(command -v ffmpeg)
"$FF" -hide_banner -loglevel error -y -i "$1" -i "$2" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -movflags +faststart -shortest "$3"
echo "ok $3"
