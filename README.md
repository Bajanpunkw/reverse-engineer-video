# REV — Reverse Engineer Video

**REV** is short for **Reverse Engineer Video**: a nod to [REA (Reverse Engineer Anything)](https://github.com/morluto/rea), the skill that teaches agents to take compiled software apart. REA reverse-engineers apps; REV reverse-engineers the look of a video and rebuilds it in code.

A [Claude Code](https://claude.com/claude-code) skill that recreates the **visual style** of a video in code — and renders your own story in that style to an mp4.

No AI video generation and no footage from the original: the agent studies the original frame by frame, writes a style spec, builds the scenes in three.js / canvas, renders them frame by frame in headless Chrome, synthesizes the soundtrack, and checks its own frames against the original before showing you anything.

| `examples/x-followers/preview.mp4` | `examples/data-center/preview.mp4` | `examples/simply-animated/preview.mp4` | `examples/ted-ed-riddle/preview.mp4` |
|---|---|---|---|
| "What if your X account doubled its followers every second?" — 49 s | "What if a data center doubled its power every 2 seconds?" — 107 s | "AI builder edition" — glowing stick figures, "A vs B", cut to a phonk track — 34 s | "The avalanche bridge" — a narrated riddle, flat 2D at night — 42 s, made autonomously |

| `examples/kurzgesagt-style/preview.mp4` | `examples/dice-loop/preview.mp4` | `examples/room/preview.mp4` |
|---|---|---|
| "What happens in the second after you press Enter" — Kurzgesagt-style flat 2D explainer, narrated — 54 s | "Infinite Dice Waves" — a seamless 3D loop of dice, made autonomously — 5.6 s | A photoreal room from simple geometry with light and render modes — 20 s |

Styles that have nothing in common, same skill:
- **[OutwardAnimates](https://www.youtube.com/@outwardanimates)** (the first two) — hazy 3D escalation with a serif HUD.
- **[Simply Animated](https://www.youtube.com/@SimplyAnimatedVisuals)** — clay-like stick figures with glow on pure black, motivational "A vs B" parables.
- **[TED-Ed](https://www.youtube.com/@TEDEd)** "Can you solve the bridge riddle?" — flat 2D cut-out characters, handwritten labels, a narrator. Canvas 2D, horizontal.
- **[Kurzgesagt – In a Nutshell](https://www.youtube.com/@kurzgesagt)** — flat vector shapes with gradients and glow on deep violet, square tags, a calm narrator. Canvas 2D, horizontal.
- **3d Loop Layer** — a fresh YouTube channel of 5–6 s seamless 3D loops (2.6M views on one dice loop in under three days). three.js, vertical.
- **[Meng To](https://x.com/MengTo)**'s three.js apartment — photoreal interior with light and render modes. three.js, horizontal.

Credit for the visual language goes to those creators. The stories, code, scenes, figure rig and sound are original; no frames, footage or audio from the channels are included. The Simply Animated example uses a royalty-free Pixabay track (link in its README).

## Heads-up: this is my first public skill

I'm not a seasoned skill author: this is the first skill I'm sharing. It worked end to end on my machine for the videos above, but on yours something may break: a different OS, a different Node or Python version, a missing library, a path the scripts don't expect.

That's fine, because you're not on your own: **your AI agent can fix it.** If a step fails, paste the error into Claude Code (or whatever agent you use) and ask it to read `SKILL.md` and the failing script and patch it for your setup. Everything here is plain text and small scripts, made to be read and changed by an agent. Change the render command for your machine, swap the font, add a stage, rewrite the rules for your own style. Treat it as a starting point, not a finished product.

If you fix something that others will hit too, a PR or an issue is very welcome.

## What it does

You give Claude Code a link and a topic. The skill walks through seven stages, stopping for your decision at the important ones:

```
00 setup       install + check tools, one test frame
 0 feasibility can this style be drawn in code at all?  → 🟢 / 🟡 / 🔴   (stops on 🔴: footage, game capture, screen recording, AI video)
 1 analysis    frame-by-frame breakdown → style.md: layout in px, HEX colours, font, 3D look, camera, pacing numbers
 2 story       your story in the original's skeleton → a scene table by the second            🛑 you approve the story
 3 build       video.html (renderFrame(t)) + control frames, self-checked + blind auto-critic  🛑 you approve the picture
 4 render      headless Chrome, frame by frame → video-full.mp4 (locally or on an optional server)
 5 sound       synthesized soundtrack, or a real royalty-free track fitted to the bars → loudness checked → final.mp4
 6 check       per-second pulse (dead zones), auto-critic, readability, loudness             🛑 you watch it
```

Two modes:
- **New style** — all stages (hours of agent work, a couple of decisions from you).
- **New episode in a style already recreated** — starts at the story; the overlay, look, render and checks are reused. The `x-followers` example was made this way and approved without a single visual or sound edit.

## What you need to give it

- **A reference**: a YouTube link to a video or channel whose style you want (Shorts or long-form, 2D or simplified 3D).
- **A topic** for your own story (or ask the agent for 2–3 options in the original's format).
- **Your decisions** at the 🛑 points: the story, the control frames, the final watch.
- Optional: real numbers for the story (the agent checks facts against primary sources and lists them with sources).

## What you get

```
work/<date>-<name>/
  style.md          style spec + scene table + facts with sources
  analysis/         frame sheets, comparison images, pacing measurements
  src/              video.html, hud.js / rig.js, scenes.js, sound.py or music.sh, fonts/   ← the reusable engine for the next episode
  final.mp4         1080×1920 or 1920×1080 (follows the source), 30 fps, −26 LUFS
```

## Install

Requirements: macOS or Linux (Windows via WSL), **Node.js 18+**, **Python 3.10+**, ~1 GB disk. Chrome and ffmpeg are installed by the setup script.

```bash
git clone <this-repo-url> ~/.claude/skills/reverse-engineer-video
cd ~/.claude/skills/reverse-engineer-video
bash scripts/setup.sh      # npm install (headless Chrome, three.js, ffmpeg) + Python venv; ends with doctor.sh
```

`scripts/doctor.sh` checks every tool and renders one test frame of the example to `work/doctor/f10.jpg`.

(Project-level install works too: put the folder in `<your-project>/.claude/skills/reverse-engineer-video`.)

## Use

In Claude Code:

> Recreate the style of https://www.youtube.com/@somechannel — make a 45-second vertical video about how much water a data center drinks.

> Make a new episode in the OutwardAnimates style (examples/x-followers): what if your coffee got twice as strong every second?

Render on your machine:

```bash
node scripts/render.cjs examples/x-followers/src work/frames --frames 2.5,10,20,35 && .venv/bin/python scripts/sheet.py work/frames
node scripts/render.cjs examples/x-followers/src work/xf/video-full.mp4 --end 49 --workers 2
```

Rendering 3D in software WebGL is CPU-heavy: a 49 s video with crowds took ~18 min on an 8-vCPU cloud box with 6 workers; a laptop with 2 workers takes considerably longer and gets hot. For that there's an optional Docker render server — `server/README.md`.

## How it works

- **The video is a web page.** `src/video.html` exposes `window.renderFrame(t)`, which draws the frame at time `t` (three.js scene + an HTML/CSS overlay), and `window.READY` once fonts and assets are loaded. Every frame depends only on `t`, so rendering is deterministic and can be split across workers.
- **The renderer** (`scripts/render.cjs`) serves `src/`, opens it in several headless Chromes, calls `renderFrame` for every frame, screenshots, and encodes with ffmpeg. Crashed runs resume from cached frames.
- **The style match is measured, not eyeballed:** `compare.py` overlays our frame on the original's (element boxes in px, text-mask IoU, palette difference); `pulse.py` measures pacing per second (motion, cuts, still runs, silence, words/min) for both videos.
- **Sound:** for an edit cut to one track, `beatgrid.py` measures a real royalty-free track (tempo, downbeats, drop) and `music.sh` stretches it so every bar lands on a scene cut. Otherwise sound is code too: `sound.py` synthesizes an ambient bed, milestone booms, whooshes and notification pops with numpy; `loudness.py` normalizes linearly to −26 LUFS and fails the mix if any moment is louder than −20 LUFS or drops to silence. Narrated styles use `tts.py` (edge-tts with word timings) + `score.py`.
- **A blind judge:** before you see anything, a fresh agent gets pairs of frames — one ours, one the original's, in random order — guesses which is which, scores palette, shapes, characters, typography, light and composition 0–10, and lists concrete fixes (`stages/critic.md`, `scripts/critic.py`). Up to 3 fix rounds, then you get the video with the judge's score and what still differs.
- **The skill learns:** every correction you make is written into the "Lessons" section of the stage it belongs to.

## Repository

```
SKILL.md                 the skill: modes, stages, hard rules, tools
stages/00…6-*.md         step-by-step instructions for each stage, with lessons from real runs
stages/critic.md         the blind auto-critic: how to run it, the judge prompt, calibration
scripts/                 setup, doctor, fetch, feasibility, pulse, compare, critic, compare_post, render, sheet, tts, score, beatgrid, loudness, mux
server/                  optional Docker render server + deploy/remote helpers
examples/
  outwardanimates-style.md   the measured style spec
  x-followers/               src/ + preview.mp4 + scene table + facts
  data-center/               src/ + preview.mp4 + scene table + facts
  simply-animated/           style spec + src/ (stick-figure rig, music.sh) + preview.mp4
  ted-ed-riddle/             style spec + src/ (canvas 2D engine, narration, sound.py) + preview.mp4
  kurzgesagt-style/          style spec + src/ (canvas 2D, scenes keyed to word timings, ambient sound.py) + preview.mp4
  dice-loop/                 style spec + src/ (three.js seamless loop, per-cycle sound.py) + preview.mp4
  room/                      notes + src/ (photoreal three.js room, light and render modes) + preview.mp4
```

## Limits

- It recreates **authored** styles: flat 2D, motion graphics, simplified 3D, and up to clean photoreal interiors built from simple geometry. Not live footage, game captures, screen recordings, hand-drawn characters in close-up (anime) or AI-generated video — stage 0 says so and stops.
- The agent can't hear. Sound follows measured rules; whether it *sounds* right is your call.
- Whether a story is interesting is your call too — that's why it waits for your OK before building.
- Respect the reference: copy the visual language, not the content. Don't reuse a channel's footage, characters, music or exact scripts, and credit the channel whose style you studied.

## License

Code: MIT (`LICENSE`). Fonts in `examples/*/src/fonts/`: Cormorant Garamond, Montserrat, Orbitron, Amatic SC, Lexend, Chakra Petch, Figtree — SIL Open Font License 1.1 (`OFL.txt`). three.js, puppeteer and ffmpeg are installed from npm under their own licenses.
