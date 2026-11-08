# 3. Build the engine and control frames

## The `src/video.html` contract (what the renderer expects)

- Page size = video size (1080×1920 or 1920×1080), no scrolling, an explicit background.
- `window.renderFrame = async (t) => {...}` — draws the frame at `t` seconds of video. Depends only on `t`: randomness through your own seeded generator, no `Date.now()`, no CSS animations, no `requestAnimationFrame` loops.
- `window.READY = true` — after fonts (`document.fonts.load('400 88px MyFont')` for every weight/style you use), textures and the first frame are loaded.
- `?t=12.5` in the URL — draw the first frame at that time.
- three.js — `import * as THREE from 'three'` through an import map `{"three":"/three/build/three.module.js"}` (the renderer serves `/three/` from node_modules); addons from `/three/examples/jsm/...`.
- Everything lives next to it in `src/`: TTF/WOFF2 fonts, images, json. No external URLs.

## Structure (as in the examples)

- **Timeline** in one place: the scene table (start, end, scene), milestones, the number formula, easing helpers.
- **Overlay** (`hud.js`) — the 2D interface over the scene: HTML/CSS or canvas, sizes and positions from the spec in px. The most recognizable part — match it first.
- **Scenes** (`scenes.js`) — one function per scene (`makeEarth`, `makeCity`…): builds objects once; `update(t)` moves the camera and objects. Transitions are smooth: crossfade or one continuous camera move.
- **Readability:** a blurred dark backdrop (radial gradient) behind text, stronger on bright scenes.
- A 2D style uses the same contract: draw on canvas 2D or SVG; characters from primitives with the original's proportions.

## Order

1. Overlay over an original frame (use the original as a temporary background) → `compare.py --regions` → until it matches.
2. One full scene → control frames: `node scripts/render.cjs src work/frames --frames 2.5,5,10` then `python scripts/sheet.py work/frames`.
3. The other scenes, 2–3 control frames each.
4. **Self-check before showing:** for every scene put our frame next to a similar frame of the original (`compare.py` without masks — look at colour and palette; plus your eyes): light, palette, contrast, haze, text size, proportions. Write down what still differs. Iterate until the differences are small.
5. 🛑 To the user: the control-frame sheet (ours | original) + what still differs.

## Pitfalls already hit

- **Characters with limbs:** start from `examples/simply-animated/src/rig.js` — capsule figure, `pose()` by angles, `poseIK()` by targets (feet on steps, hands on objects), `walker()` for walking/climbing on any `ground(x)`. With angle-only poses the feet sink into stairs and slopes.
- **Cut scenes on bars** when the style is an edit to music: put the cut times in bars (`CUTS = [0, 2.5, 5, …].map(b => b * BAR)`) and fit the track to the same numbers in stage 5.
- A long render and one bad scene: render only that time range (`--start/--end`) and splice it into `video-full.mp4` frame-exactly with ffmpeg `trim=start_frame/end_frame` + `concat`, instead of re-rendering everything.

- A dark, low-contrast image with small text is unreadable on a phone: check by downscaling a frame to 360 px wide.
- Captions must not cover the key object or the platform UI (the bottom ~250 px of a vertical frame is covered by Shorts/Reels/X buttons).
- Numbers with units: English formatting (1,024; 2.9 MW), abbreviations like the original.
- Wide shots (a planet, a galaxy): a slow rotation counts as a still frame in `pulse.py`. Push in / orbit the camera and rotate the object visibly, or you get a 5–6 s dead zone.
- Thousands of people/objects: the near ones as `InstancedMesh` (up to ~2k, popping in one by one via scale), far ones as `THREE.Points` with `setDrawRange` driven by the counter. Millions — a colour fill in a shader (covered area share = value / maximum).
- Layers over the important thing (clouds over the crowd on Earth) — part them, or the event is invisible.
- Place the next set piece where the camera is already looking (the stadium behind the house), or it slides in from the edge, huge and cut off.

- 2D canvas (TED-Ed run): `ctx.filter = 'blur()'` on every frame slows rendering ~5× (0.12 → 0.65 s/frame). Bake anything static (cliffs, shading, sky) into an offscreen canvas once at load; blur per frame only what moves.
- Draw background textures with margin for the whole camera path — a tilt from above exposed a dark band at the top where the sky texture ended.
- Captions above something that enters the frame (an avalanche) — fade them out before it arrives; a white flash goes to pure white in 3–4 frames, never a milky half-white.
- "Only the lantern circle is lit": everything outside is fully opaque; characters in the dark are drawn on top as black silhouettes with white eyes, otherwise they look like 25% ghosts.

## Lessons

- A 3D hall that's too dark reads as a black blob → lighter, with haze.
- Daylight vs. the original's dusk and capsule people vs. figures with limbs were accepted trade-offs; say so instead of hiding them.
