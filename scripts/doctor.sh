#!/usr/bin/env bash
# Checks every tool the skill needs and renders one test frame of the bundled example (SKIP_RENDER_TEST=1 to skip the render).
cd "$(dirname "$0")/.."
ok=1; say(){ printf "%-34s %s\n" "$1" "$2"; }
v=$(node -v 2>/dev/null) && say "node" "$v" || { say "node" "MISSING (Node 18+)"; ok=0; }
[[ -d node_modules/puppeteer ]] && say "puppeteer (headless Chrome)" ok || { say "puppeteer" "MISSING → bash scripts/setup.sh"; ok=0; }
[[ -d node_modules/three ]] && say "three.js" ok || { say "three.js" "MISSING → bash scripts/setup.sh"; ok=0; }
FF=${FFMPEG:-node_modules/ffmpeg-static/ffmpeg}; [[ -x $FF ]] || FF=$(command -v ffmpeg || true)
[[ -n $FF ]] && say "ffmpeg" "$("$FF" -version | head -1 | cut -c1-40)" || { say "ffmpeg" "MISSING"; ok=0; }
if [[ -x .venv/bin/python ]]; then
  for m in numpy PIL yt_dlp edge_tts faster_whisper; do
    if .venv/bin/python -c "import $m" 2>/dev/null; then say "python: $m" ok
    elif [[ $m == faster_whisper ]]; then say "python: $m" "not installed (optional)"
    else say "python: $m" MISSING; ok=0; fi
  done
else say ".venv" "MISSING → bash scripts/setup.sh"; ok=0; fi
if [[ $ok == 1 && -z ${SKIP_RENDER_TEST:-} ]]; then
  echo "→ test frame of examples/x-followers at t=10 s (CPU WebGL, ~20–60 s)…"
  node scripts/render.cjs examples/x-followers/src work/doctor --frames 10 && say "test render" "ok → work/doctor/f10.jpg" || { say "test render" FAILED; ok=0; }
fi
[[ $ok == 1 ]] && echo "ALL GOOD" || { echo "SOMETHING IS MISSING — see above"; exit 1; }
