#!/usr/bin/env bash
# Talk to your render server. Needs RENDER_URL and RENDER_KEY in the environment (never commit the key).
#   bash server/remote.sh frames <outdir> 2.5 10 20     control frames (+ sheet.jpg)
#   bash server/remote.sh start <end> [start] [workers]  start a render
#   bash server/remote.sh wait <out.mp4>                 wait for it and download
set -euo pipefail
: "${RENDER_URL:?set RENDER_URL}"; : "${RENDER_KEY:?set RENDER_KEY}"
ROOT=$(cd "$(dirname "$0")/.." && pwd); cmd=$1; shift
case $cmd in
  frames) out=$1; shift; mkdir -p "$out"; for t in "$@"; do curl -sf -o "$out/f$t.jpg" "$RENDER_URL/frame.jpg?key=$RENDER_KEY&t=$t" || echo "frame $t failed"; done
          "$ROOT/.venv/bin/python" "$ROOT/scripts/sheet.py" "$out" ;;
  start) curl -s "$RENDER_URL/start?key=$RENDER_KEY&start=${2:-0}&end=$1&fps=30&workers=${3:-6}"; echo ;;
  wait) while true; do s=$(curl -s "$RENDER_URL/status?key=$RENDER_KEY"); echo "$(date -u +%H:%M) $s"
          [[ $s == *'"done"'* ]] && break; [[ $s == *'"error"'* ]] && exit 1; sleep 60; done
        curl -s -o "$1" "$RENDER_URL/out.mp4?key=$RENDER_KEY"; ls -la "$1" ;;
esac
