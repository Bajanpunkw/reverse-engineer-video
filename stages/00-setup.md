# 00. Setup and tool check (first run only)

## Needs

- macOS or Linux (Windows: use WSL), ~1 GB free disk.
- **Node.js 18+** and **Python 3.10+** on PATH. Nothing else: Chrome comes with puppeteer, ffmpeg comes with ffmpeg-static.

## Steps

1. From `$SKILL`: `bash scripts/setup.sh` — `npm install` (headless Chrome ~170 MB, three.js, static ffmpeg) + Python venv `.venv/` (numpy, pillow, yt-dlp, edge-tts). Optional: `.venv/bin/pip install faster-whisper` to transcribe an original's narration.
2. `bash scripts/doctor.sh` — prints every tool with "ok/MISSING" and renders one test frame of `examples/x-followers` to `work/doctor/f10.jpg`. Open the frame: you should see a crowd of colourful mannequins in front of a house with a serif "FOLLOWERS 256" overlay.
3. If something is MISSING — fix that line and re-run `doctor.sh`. Typical issues:
   - Chrome fails to launch on Linux → install system libraries (`apt install chromium` and set `CHROME=/usr/bin/chromium`).
   - `npm error EACCES … cache folder contains root-owned files` → an old npm bug on that machine: `npm_config_cache=/tmp/npmcache bash scripts/setup.sh` (or fix ownership of `~/.npm`).
   - Corporate proxy blocks the Chrome download → set `CHROME=/path/to/chrome` and install `puppeteer-core` instead.
4. Decide where to render (tell the user):
   - **Locally** — fine for control frames and short videos. Full renders keep the CPU at 100% for a long time (a 49 s 3D video took ~18 min on 8 vCPU with 6 workers; a laptop with 2 workers takes several times longer and gets hot).
   - **Server** — `server/README.md`, any Docker host.

## Lessons

- Rendering 3D on a laptop CPU for an hour overheats it — move full renders to a server when that's a concern, keep control frames local.
