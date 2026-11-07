#!/usr/bin/env bash
# Download a reference video for analysis: fetch.sh <url> <outdir> [sections, e.g. "*0-60"] [max height=1080]
# For analysis only: keep originals out of your project and never put their frames into your own video.
set -euo pipefail
URL=$1; OUT=$2; SEC=${3:-}; H=${4:-1080}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
PY=$ROOT/.venv/bin; FF=${FFMPEG:-$ROOT/node_modules/ffmpeg-static/ffmpeg}; [[ -x $FF ]] || FF=$(command -v ffmpeg)
mkdir -p "$OUT"
ARGS=(--no-warnings -f "bv*[height<=$H]+ba/b[height<=$H]" --merge-output-format mp4 --ffmpeg-location "$FF"
      --write-info-json --write-auto-subs --sub-langs "en.*" --sub-format vtt -o "$OUT/%(id)s.%(ext)s")
[[ -n $SEC ]] && ARGS+=(--download-sections "$SEC")
"$PY/yt-dlp" "${ARGS[@]}" "$URL" 2>&1 | grep -v "^\[download\] *[0-9.]*%" | tail -4
ls -la "$OUT"
