# Example: "Infinite Dice Waves" — a seamless 3D loop

`preview.mp4` — 5.6 s, 1080×1920, 30 fps, synthesized sound, plays as an endless loop (the last frame leads straight into the first). A new-style run, made start to finish by the agent while the author was away.

Style credit: **3d Loop Layer** on YouTube — a channel started at the end of October 2026 that posts nothing but 5–6 s seamless 3D loops; its "Infinite Dice Waves 2" passed 2.6M views in under three days. No voice, no text, no story: a field of dice, and a new colour keeps landing on the old one forever. The code, sound and timing are original; no frames or audio from the channel are included.

## The style, measured

| | |
|---|---|
| **Recognizable in one second** | dice to the edges of the frame, grid turned 45° (diamonds), camera from above at ~50° with strong perspective; acid flat colours; a hole in the centre showing the layer below; the new layer pops in small, grows and lands with shadows; a die of the next colour rises out of the hole |
| **Palette** (median body colour per layer) | green #1fe681 → magenta #d80ae2 → orange #ee5a10; glossy black pips with a small highlight |
| **Timing** | 3 cycles × 1.86 s = 5.58 s. 0–0.5 s field and hole, the hero die appears; 0.5–1.0 it grows, a few early dice land; 1.0–1.45 the wave thickens and covers the field; 1.45–1.86 the new field stands |
| **Sound** | per cycle: a bright bell when the hero appears (C5/E5/G5 — one note per colour), a scatter of quiet clicks as the dice land, a clack when the field settles; −26 LUFS |

## How the loop closes

- Every cycle is identical (the original varies them — no hole on one layer — which would break the seam).
- Each cycle the new layer lands one die higher and the camera rises by exactly one die, so the end state is the start state shifted by one layer and one colour. After three colours it's back to the first frame.
- The hero die grows from zero at the start of the cycle, so there's no pop at the seam; the sound's tail is wrapped to the start.

## Engine (`src/video.html`, ~145 lines)

three.js: `RoundedBoxGeometry`, one `InstancedMesh` per colour (61×61 grid), 6-material arrays with canvas-drawn faces + a roughness map (glossy pips), hemisphere + directional light with PCF soft shadows, no tone mapping (keeps the acid colours flat). The lower layer is only drawn under the hole, so the seams between dice stay dark.

## Known flaw

The rising hero die grazes its neighbours for a few frames. It was posted as is; the lesson is in `stages/3-build.md`.

## Render

```bash
node scripts/render.cjs examples/dice-loop/src work/dice/video-full.mp4 --end 5.58 --workers 2
python examples/dice-loop/src/sound.py work/dice/draft.wav
python scripts/loudness.py work/dice/draft.wav work/dice/sound-full.wav
bash scripts/mux.sh work/dice/video-full.mp4 work/dice/sound-full.wav work/dice/final.mp4
```

Heavy for software WebGL (~3.5 s per frame on a cloud box): 167 frames.
