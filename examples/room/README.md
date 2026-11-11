# Example: a room in code — photoreal three.js with light and render modes

`preview.mp4` — 20 s, 1920×1080 (preview 720p), 30 fps, no sound. A new-style run made autonomously in one evening.

Style credit: **[Meng To](https://x.com/MengTo)** — an X post (9 Nov 2026) showing his apartment rebuilt as a three.js scene with a mode bar (walk / clay / wireframe, times of day), ~52K views in 7 hours. The room here is our own; only the approach is shared. Not a YouTube channel — the skill works on any reference video.

## What makes it recognizable

1. Low sun through venetian blinds: hard stripes over the desk, wall and floor; the rest of the room is dark.
2. A warm evening: glowing orange blinds and stripes.
3. A mode bar top right: a dark translucent pill, active items as light pills with dark text, a cursor clicking them.
4. Wireframe: glowing cyan edges on dark teal, hidden lines removed. Clay: grey material, same light.
5. Lots of small things: books, keyboard, mug, lamp, plants, chair.

## Engine (`src/video.html`)

Everything is code: geometry from primitives (`RoundedBoxGeometry`), seeded canvas textures (wood, marble, plaster, parquet, the view outside, a monitor showing a terminal). Light: a sun with a 4096 shadow map through 32 blind slats, sky light from the windows (`RectAreaLight`), a desk lamp and monitor glow at night, `RoomEnvironment` reflections. Post: GTAO, bloom, ACES, vignette, grain. `Math.random` is seeded because GTAO uses it — otherwise the noise differs between render workers.

| Time, s | Light | Mode | Camera |
|---|---|---|---|
| 0–5.5 | low sun | walk | at the desk, stripes over the keyboard |
| 5.5–9.5 | evening | walk | pulls back, window behind the monitor |
| 9.5–12.9 | night | walk | lamp, monitor |
| 12.9–15.6 | night → low sun | wireframe | wide |
| 15.6–17.9 | low sun | clay | wide from the right |
| 17.9–20 | low sun | walk | back to the desk |

## What the critic said

Round 1: 2–5 — "an empty, game-like room, acid colours, the night almost black, a neon wireframe" → +25 small objects, −20% saturation, cooler walls, a brighter night with an amber fill, a quieter wireframe, wider FOV, head bob. Round 2: 4–5 — "same idea, different style: neat low-poly vs heavy photorealism with lots of clutter". Going further means hundreds of objects and soft global light — hours of work, so it stopped there and was shown as "my version", not "my clone". Mode switches: swap materials on the objects directly — `scene.overrideMaterial` is reset by GTAO; rounded boxes have no hard edges, so the wireframe uses a plain box's edges.

## Render

```bash
node scripts/render.cjs examples/room/src work/room/video-full.mp4 --end 20 --size 1920x1080 --workers 2
```

Heavy: ~2.2 s per frame on 6 workers of a cloud box; with 6 workers one browser timed out on load — use 4 or fewer.
