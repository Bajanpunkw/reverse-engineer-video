# Example: "What happens in the second after you press Enter" — Kurzgesagt style

`preview.mp4` — 53.8 s, 1920×1080 (preview 720p), 30 fps, narrated. A new-style run: about 1 h 15 min from downloading the reference to `final.mp4`.

Style credit: **[Kurzgesagt – In a Nutshell](https://www.youtube.com/@kurzgesagt)** (25.8M subscribers). The story, the characters (a peeking purple blob, token pills with eyes), code, narration and music are original; the channel's birds and creatures are deliberately not copied, and no frames, footage or audio are included.

## The style, measured

| | |
|---|---|
| **Recognizable in one second** | deep navy/violet background (#0d0045, #12013a) with a soft radial glow in the middle (#25379a); flat shapes with no outlines and smooth gradients (violet #861dfd → magenta #a620d8); a highlight is a light rounded strip inside the shape, a shadow is the same colour darker and offset; glow = white core + cyan halo (#06ecfa) with additive blending |
| **Tags** | a rectangle with square corners, solid or gradient (#0096fc → #04daf0, #7624b9 → #4708cd, #3e52fd), white bold geometric sans, usually top left (x ≈ 96–110, y ≈ 84–88, height ≈ 90 px) or with a pointer to the object |
| **Fonts** | Lexend 700 for tags (picked from 8 free candidates by rendering them under a crop of the original — line width within ~2%), Chakra Petch Bold for big spaced caps titles |
| **Pacing** (`pulse.py` on 3 pieces of the original) | 6.8–20 cuts/min, an average shot 2.9–8.3 s, the camera almost always drifts or pushes in; transitions dive "into" an object, fly out of it, or cut |
| **Sound** | a calm male narrator (edge-tts `en-US-AndrewMultilingualNeural`), our own ambient bed (soft pads, a bell arpeggio, sub), gentle whooshes and blips on tags; −26 LUFS. The channel's composer's music is not used |

## Scenes (keyed to words in `src/timeline.json`)

chat → tokens → a web of neurons (70B parameters, "all of them") → "140 billion calculations — for one token" → a GPU → a hot data center → one token comes out → it starts again for every word → "a building gets a little warmer". Facts on screen: ~70B parameters for a big open model, ≈ 2 × parameters operations per token for a dense model; the thermometer at the end is an illustration without a number.

## Engine

Canvas 2D (`src/main.js`), no three.js. Scene times come from word timings, so changing the narration re-times the whole video.

## What the critic said

6.1 → 6.2 after fixes (FIX). Best: the chat (7.5). Weakest: the data center and the tokens (5.3) — "a generated look: dozens of identical objects, an even layout, flat light without layers". The one defect in the final (GPU cables stopping short of the case) was fixed by re-rendering 3.5 s and splicing it in by frame.

## Render

```bash
.venv/bin/python scripts/tts.py examples/kurzgesagt-style/src/script.json work/kz/voice   # voice + word timings
# copy the generated timeline.json into src/ if you change the script
node scripts/render.cjs examples/kurzgesagt-style/src work/kz/video-full.mp4 --end 53.8 --size 1920x1080 --workers 2
.venv/bin/python examples/kurzgesagt-style/src/sound.py examples/kurzgesagt-style/src/timeline.json work/kz/voice/voice.wav work/kz/draft.wav
.venv/bin/python scripts/loudness.py work/kz/draft.wav work/kz/sound-full.wav
bash scripts/mux.sh work/kz/video-full.mp4 work/kz/sound-full.wav work/kz/final.mp4
```
