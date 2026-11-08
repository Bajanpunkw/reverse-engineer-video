# Example: "The avalanche bridge" — TED-Ed riddle style

`preview.mp4` — 41.6 s, 1920×1080 (preview downscaled to 720p), 30 fps, narrated. A new-style run (all stages), made autonomously in about an hour: the agent took every decision itself, including the story, and the human only watched the result.

Style credit: **[TED-Ed](https://www.youtube.com/@TEDEd)** — "Can you solve the bridge riddle?" (2015, 24.3M views, channel 23M subscribers; yt-dlp, 8 Nov 2026). Every TED-Ed lesson is drawn by a different studio, so the style is that one video, not the whole channel. The story, characters, code and sound are original; no frames, footage or audio from the video are included.

## The style, measured

| | |
|---|---|
| **Recognizable in one second** | night: deep navy sky with inky clouds and film grain; white angular cliffs with soft airbrushed shading and dark jagged ledges; long wedge-headed characters (wide top, narrow chin), white round eyes, dot mouth, stick legs, flat colours, no outlines; handwritten small-caps labels ("1 MINUTE") and a countdown timer top right; a light oval vignette and one soft lantern circle |
| **Palette** (pixel-sampled) | sky p5/p50/p95 #000610 / #001025 / #051a39; ground #525252, lit #b1b1b1; cliffs #c4c2bf; coats #fcfcfc; skins #0155bd #673c07 #2d8b8d #878787; red #af2806; bridge #4f463a |
| **Font** | Amatic SC Bold (OFL) drawn as small caps (first letter 1.0, rest 0.8), stroked 3.5% of the size in the same colour and stretched ×1.12 — the original's hand is thicker and wider than plain Amatic. Patrick Hand SC, Short Stack, Delius, Kalam, Gochi Hand were tried and rejected |
| **Graphics** | canvas 2D; sky = seeded fractal value noise baked once; cliffs = polygons + blurred grey strips along the ridges + dark ledge bands, prerendered offscreen; characters from primitives, animated on twos (12 poses/s) |
| **Pacing** (`pulse.py`) | ours: motion 4.0 (original 4.2), still-frame share 38% (67%), longest still 2.3 s, 14 cuts/min (25) — scenes change by camera moves more than hard cuts |
| **Sound** | narrator (edge-tts AndrewMultilingual +10%), D-minor bed at 96 BPM with a low pulse and a soft clock tick, plucks on labels, synthesized effects; −26 LUFS |

## Scenes (keyed to words in `src/audio/timeline.json`)

| Time | On screen |
|---|---|
| 0–4.9 | a crack opens on the peak, snow starts to slide; camera tilts down to four hikers and a lantern on a ledge; timer 17:00 |
| 4.9–7.7 | silhouettes; eyes blink on at "hikers", the lantern lights at "lantern" and colour comes in |
| 7.7–9.9 | pan along the old rope bridge, a plank snaps at "old" |
| 9.9–15.0 | two step on and the bridge sags, "2 AT A TIME"; at "dark" everything outside the lantern circle goes black |
| 15.0–20.8 | line-up in spotlights, "1 / 2 / 5 / 10 MINUTES" pop on the words |
| 20.8–24.3 | the fast one waits for the slow one on the bridge |
| 24.3–34.4 | wide shot, time-lapse of the obvious plan, timer runs down, "10 + 1 + 5 + 1 + 2 = 19" written on the words; at 0:00 the avalanche hits, white-out |
| 34.4–37.8 | rewind to the ledge, timer back to 17:00, "17 MINUTES" |
| 37.8–41.6 | black card in the spirit of "Pause the video now": "Can you get all four across in 17 minutes? Answer: tomorrow" |

## Files

- `src/video.html` + `src/main.js` — the whole video: palette, small-caps text, character builder (`drawChar`), lantern light and darkness mask, cliffs, bridge, avalanche, scenes A–L.
- `src/script.json` — narration; `src/audio/timeline.json` — word timings. Regenerate the voice: `.venv/bin/python scripts/tts.py examples/ted-ed-riddle/src/script.json examples/ted-ed-riddle/src/audio en-US-AndrewMultilingualNeural +10%`.
- `src/sound.py` — soundtrack + mix: `.venv/bin/python examples/ted-ed-riddle/src/sound.py examples/ted-ed-riddle/src work/draft.wav`, then `scripts/loudness.py`.

## Lessons from this run

- Auto-critic, round 1: 4.8/10 (FIX), it recognised our frame in 6/6 blind pairs. Defects it found and we fixed: a dark band at the top during a camera move (sky texture too small), an unreadable white "chunk" on the peak, a half-transparent character in the dark, numbers under the avalanche, a milky half-white flash.
- `ctx.filter = 'blur()'` every frame made rendering ~5× slower (0.12 → 0.65 s/frame). Bake static blur into offscreen canvases once.
- Snowflakes read as stars in a night scene: removed.
