#!/usr/bin/env bash
# One-time setup, from the skill folder: bash scripts/setup.sh
# Installs Node packages (headless Chrome via puppeteer, three.js, a static ffmpeg) and a Python venv in .venv/.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node >/dev/null || { echo "Node.js 18+ is required: https://nodejs.org"; exit 1; }
command -v python3 >/dev/null || { echo "Python 3.10+ is required: https://python.org"; exit 1; }
echo "→ npm install (downloads headless Chrome, ~170 MB)"; npm install --no-audit --no-fund
echo "→ python venv"; python3 -m venv .venv
.venv/bin/pip install -q --upgrade pip
.venv/bin/pip install -q numpy pillow yt-dlp edge-tts
echo "   (optional, ~200 MB: .venv/bin/pip install faster-whisper — to transcribe narration of the original)"
echo "→ checking"; bash scripts/doctor.sh
