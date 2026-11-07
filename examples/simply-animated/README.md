# Example: "AI builder edition" — Simply Animated style

`preview.mp4` — 34 s, 1080×1920, 30 fps. A new-style run (all stages), made in one day; accepted after two edits (see "Lessons" below).

Style credit: **[Simply Animated](https://www.youtube.com/@SimplyAnimatedVisuals)** — motivational Shorts, 307K subscribers and 257M views in 8 months (YouTube Data API, 7 Nov 2026). The story, code, scenes and figure rig are original; no frames, footage or audio from the channel are included.

## The style, measured

| | |
|---|---|
| **Recognizable in one second** | pure black background; white "clay" stick figures with soft shading and a strong glow; the frame split into two halves "A vs B", each with a short caption; colour only as an accent of the outcome (green WIN, gold SUCCESS, red FAIL); a small grey watermark |
| **Layout** (from 608×1080, ×1.776) | pair captions at y≈366, centres at x≈305 / 808, Montserrat 500, 34 px, caps; the scene in the top ~75% of the frame, the bottom empty; watermark y≈1508, 22 px, #555 |
| **Graphics** | three.js with an orthographic camera (it reads as flat 2D) + MeshStandard + UnrealBloom (0.45, 0.3, 0.82); floor = gradient #1f1f1f → #000 over 520 px; figure height ≈ 470 px, head ≈ 0.075 H |
| **Camera / transitions** | static camera, motion comes from the figures; scenes change through a short fade to black |
| **Pacing** (`pulse.py` on 3 videos) | 4–7 mini-parables of 5–9 s; still-frame share 0.18–0.69, longest still 1.4–6 s; retention (YouTube "most replayed") drops 1.0 → 0.25 in the first 2 s, so the first pair must be the clearest |
| **Sound** | no voice, no effects: an "edit" cut to one phonk track; 94 BPM; a scene ≈ 2 bars (5.1 s) |

## Scenes (cut on bars of 94 BPM: `CUTS = [0, 2.5, 5, 7.5, 10, 13.5]` bars)

| # | Time | Pair | On screen |
|---|---|---|---|
| 1 | 0–6.4 | WATCHING TUTORIALS / BUILDING | grey figure on a box with a phone; white figure builds stairs and climbs them |
| 2 | 6.4–12.8 | PROMPTING FROM SCRATCH / WRITING A SKILL | both push a boulder uphill; left: it rolls back every time; right: a glowing stopper pops up behind it after every push, it reaches the top |
| 3 | 12.8–19.1 | 10 AI tools / 1 tool, mastered | an orb hops between 10 bars that barely grow / hits one bar that grows into a glowing pillar |
| 4 | 19.1–25.5 | MOTIVATED / CONSISTENT | two lifters, overhead press; "motivated" quits on DAY 003, the other keeps going to DAY 180 (Orbitron counter, flipping calendar) |
| 5 | 25.5–34.5 | "If you knew your first 100 posts would flop, how fast would you ship them?" | a runner jumps red FAIL blocks, FAILS 000/100, then a green WIN pillar and gold SUCCESS |

## Files

- `src/rig.js` — the reusable stick-figure rig: `makeFigure()`, `pose()` by joint angles, `poseIK()` by targets (two-bone IK for knees/elbows, hands on objects), `walker()` — walking/climbing with feet planted on any `ground(x)` (stairs, slopes), `tint()` to dim a figure.
- `src/scenes.js` — the five scenes; `src/video.html` — page, captions, cuts on bars, fades. Set your handle in `#wm`.
- `src/music.sh` — fits a real track to the cuts (see below). `src/fonts/` — Montserrat and Orbitron (SIL OFL 1.1).

## Sound

The channel uses one licensed track on every video (through YouTube's Shorts library — that licence doesn't cover other platforms), so we don't. The preview uses **"Brazilian Phonk - Phonk" by MondaMusic** from Pixabay (Pixabay Content License: free, no attribution required, but the file itself may not be redistributed — download it into `src/music/`):
https://pixabay.com/music/phonk-brazilian-phonk-phonk-542543/

`scripts/beatgrid.py` measured it: 98 BPM, the drop on a downbeat at 4.891 s. `music.sh` stretches it to 94 BPM with rubberband (pitch kept) and starts on the drop, so every bar lands on a scene cut. Then `loudness.py` → −26 LUFS and `mux.sh`.

## Render

```bash
node scripts/render.cjs examples/simply-animated/src work/sa/frames --frames 3,9,15,22,30 && .venv/bin/python scripts/sheet.py work/sa/frames
node scripts/render.cjs examples/simply-animated/src work/sa/video-full.mp4 --end 34.47 --workers 4
bash examples/simply-animated/src/music.sh work/sa/music.wav && .venv/bin/python scripts/loudness.py work/sa/music.wav work/sa/sound-full.wav
bash scripts/mux.sh work/sa/video-full.mp4 work/sa/sound-full.wav work/sa/final.mp4
```

## Lessons from this run

- Scene 2, first version: on the right the boulder rode up a glowing conveyor belt by itself — the user didn't get it. The "right" half must be the same action as the left with a different outcome (push → rolls back / push → a stopper holds it). No abstract "mechanisms".
- The first soundtrack was phonk synthesized in numpy — rejected ("the music sucks"). For an edit-style channel use a real royalty-free track of the same genre, fitted to the cuts.
- Feet sank into the stairs with angle-only poses → `poseIK` + `walker` with a `plant()` snap.
- What still differs from the original: less shading along the limbs, no motion ghosting on the grey figure.
