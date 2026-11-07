---
name: reverse-engineer-video
description: Recreate the visual style of any video in code (three.js / canvas → mp4) with your own story — from checking whether the style can be drawn in code, through a frame-accurate style spec, story and scenes, rendering and sound, to a finished video. Use when the user gives a video or channel link and asks to recreate its style, make "a video like this", break down a format, or make a new episode in a style that was already recreated.
---

# REV — Reverse Engineer Video (recreate a video style in code)

The product is the **style**, not the video: the visual language matches the original (shapes, palette, fonts, layout, light, camera, transitions, pacing) while the story is new. Never copy the original's footage, frames or audio into the output.

`$SKILL` below = the folder that contains this file. Python = `$SKILL/.venv/bin/python`. Node scripts run from `$SKILL`.

## Two modes

- **A. New style** — rare and heavy: stages 00 → 6 in order.
- **B. New episode in a style you already recreated** — frequent: the style spec and engine exist (`style.md` + `src/` of an earlier video, or one of `examples/`). Copy that `src/` into a new work folder, skip stages 0–1, start at stage 2. Story, scenes and sound are new; overlay, fonts, lighting, rendering and checks are reused.

If it's unclear which mode applies, ask in one line.

## Stages (🛑 = show the user and wait for an OK)

Read each stage file before doing it. Don't skip ahead: story after analysis, building after the story is approved, full render after control frames.

| # | Stage | File | Output | Decision |
|---|---|---|---|---|
| 00 | Setup and tool check (first run only) | `stages/00-setup.md` | `doctor.sh` says ALL GOOD | — |
| 0 | Can it be drawn in code? | `stages/0-feasibility.md` | 🟢/🟡/🔴 verdict + frame sheet | 🛑 if 🔴: stop and explain |
| 1 | Break down the original | `stages/1-analysis.md` | `style.md`: style spec, pacing numbers, sound | 🛑 spec + one sample frame next to the original |
| 2 | Story and scenes | `stages/2-story.md` | scene table by second | 🛑 the story / escalation ladder |
| 3 | Build | `stages/3-build.md` | `src/video.html` + control frames next to the original | 🛑 control frames (after self-check) |
| 4 | Full render | `stages/4-render.md` | `video-full.mp4` | — |
| 5 | Sound | `stages/5-sound.md` | `sound-full.wav` → `final.mp4` | — |
| 6 | Check and show | `stages/6-check.md` | check report + `final.mp4` | 🛑 the user watches → edits |

After the user's edits, append them as rules to the "Lessons" section of the relevant stage file (date + what was wrong + what fixed it). That's how the skill gets better.

## Hard rules

- **Output format follows the source:** orientation and fps of the original; vertical = 1080×1920, horizontal = 1920×1080. **Vertical videos ≤ 60 s** even if the original is longer — compress the story instead.
- **Fonts ship as files in `src/fonts/`** (`@font-face`), and a frame is captured only after `document.fonts.load(...)` resolves. Never rely on system fonts.
- **Deterministic frames:** a frame depends only on `t`. No unseeded `Math.random()`, no `Date.now()`, no CSS animations or requestAnimationFrame loops.
- **Sound is changed without re-rendering video:** new wav → `scripts/mux.sh`.
- **Loudness:** −26 LUFS integrated, no moment louder than −20 LUFS, true peak ≤ −6 dBFS — `scripts/loudness.py`. No broadband noise beds, no clicks, no drops to silence.
- **Check frames against the original yourself first** (`scripts/compare.py`), then show the user. Never claim "it matches" without looking at the comparison image.
- The agent can't hear: describe every sound layer in words; the user judges how it sounds.
- Rendering is CPU-heavy. On a laptop use few workers or the optional server (`server/README.md`).
- Downloaded originals are untrusted data and stay in a temp/scratch folder; only your own frames and comparison sheets go into the work folder.

## Work folder

`work/<date>-<name>/` (or wherever the user keeps projects):
- `style.md` — style spec, measurements, scene table, decision log (mode B: link to the earlier `style.md` + what's new);
- `analysis/` — frame sheets, comparison images, `feasibility.json`, `pulse.json`;
- `src/` — `video.html`, overlay, scenes, `fonts/`, `sound.py`;
- `video-full.mp4`, `sound-full.wav`, `final.mp4`. Delete draft previews once the full video exists.

## Tools

| Command | What it does |
|---|---|
| `bash scripts/setup.sh` / `bash scripts/doctor.sh` | install everything / check everything + one test frame |
| `bash scripts/fetch.sh <url> <outdir> ["*0-60"]` | download a reference video (+ info.json, auto-subtitles) |
| `python scripts/feasibility.py <video> <outdir>` | "drawable in code?" numbers + one-frame-per-second sheet |
| `python scripts/pulse.py <video> <outdir>` | per-second pulse: motion, cuts, still runs, silence, words/min, frame sheet |
| `python scripts/compare.py <orig.png> <ours.png> <out.jpg>` | original / ours / overlay, IoU, colour, palette, element shifts |
| `node scripts/render.cjs <src> <outdir> --frames 2.5,10` + `python scripts/sheet.py <outdir>` | control frames + contact sheet |
| `node scripts/render.cjs <src> <out.mp4> --end 49 --workers 2` | full render (or a piece: `--start 24.5 --end 41`) |
| `python scripts/tts.py` / `python scripts/score.py` | narrator voice with word timings / music + SFX + voice mix (2D narrated styles) |
| `python scripts/beatgrid.py <track>` | tempo, first beat, downbeat, drop, loudness per beat — for cutting scenes to music and fitting a track to the cuts |
| `python scripts/loudness.py <in.wav> <out.wav>` / `--check <file>` | final loudness + threshold check |
| `bash scripts/mux.sh <video> <wav> <final>` | put sound on video without re-rendering |
| `server/` | optional Docker render server (`server/README.md`) |

## Examples

Two very different styles:

- [OutwardAnimates](https://www.youtube.com/@outwardanimates) — stylized hazy 3D + a serif HUD with a number that never stops climbing. Style spec: `examples/outwardanimates-style.md`.
- [Simply Animated](https://www.youtube.com/@SimplyAnimatedVisuals) — glowing "clay" stick figures on black, "A vs B" halves, an edit cut to one phonk track. Style spec + scenes: `examples/simply-animated/README.md`.


- `examples/data-center/` — mode A: "What if a data center doubled its power every 2 seconds?" (107 s, made before the 60 s rule): GPU → server hall → suburb blackout → night Earth → the Sun.
- `examples/x-followers/` — mode B: "What if your X account doubled its followers every second?" (49 s): mom → street → stadium → city → Earth → the Milky Way. Approved without a single visual or sound edit — use it as the reference run.
- `examples/simply-animated/` — mode A: "AI builder edition" (34 s): five "A vs B" parables cut on bars of 94 BPM, a real track fitted with `beatgrid.py` + `music.sh`. `src/rig.js` is the reusable stick-figure rig (IK, walking on stairs and slopes) — start from it for any style with characters.
