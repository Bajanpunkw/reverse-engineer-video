# 0. Can it be drawn in code?

Goal: know in 5 minutes whether a breakdown makes sense. Analysis and building take hours; a "style" that turns out to be a Minecraft screen recording has nothing to recreate.

## Steps

1. Download 30–60 s from the middle of the video (the start can be an intro or an ad): `bash scripts/fetch.sh <url> <tmp>/orig "*30-90" 720`. For a channel — two videos: the biggest hit and a recent one.
2. `python scripts/feasibility.py <file> <tmp>/feas` → numbers + `sheet.jpg`.
3. **Look at the frame sheet.** The numbers are a hint; the verdict comes from the frames.

## Reading the numbers (calibrated on 6 videos)

| Video | flat | grain | texture | colors | actually |
|---|---|---|---|---|---|
| TED-Ed (flat 2D) | 0.78 | 0.00 | 0.13 | 8 | 🟢 2D |
| Kurzgesagt (vector) | 0.64 | 0.00 | 0.21 | 39 | 🟢 2D |
| OverSimplified (2D, textured backgrounds) | 0.32 | 0.00 | 0.26 | 60 | 🟢 2D |
| OutwardAnimates (stylized 3D) | 0.19 | 0.30 | 0.27 | 32 | 🟢 3D |
| Minecraft channel | 0.35 | 0.00 | 0.27 | 76 | 🔴 game — numbers can't tell |
| MrBeast (live footage) | 0.20 | 0.22 | 0.39 | 84 | 🔴 footage |

- The numbers reliably catch **live footage and photos** (lots of fine texture, few flat fills) and **flat 2D** (lots of flat fills, small palette).
- **Games, screen recordings and AI video are not caught by numbers** — only by eye, using the signs below.

## "Not the channel's own style" — look for these on the sheet

- **Game capture:** a recognizable game (Minecraft, Roblox, GTA, Fortnite), game UI — hotbar, health bars, crosshair, nametags, minimap; first/third-person camera driven by a player. Recreating it "in code" means recreating the game, not an authored style.
- **Screen recording:** cursor, windows, app or website UI, scrolling.
- **Live footage:** faces and skin, grain, camera motion blur, natural light, handheld camera.
- **AI video:** details "swim" between frames (hands, text, faces change), objects morph, unreadable lettering, glossy generated lighting. Compare 3–4 neighbouring frames of one shot.
- **Stock / clips:** spliced third-party clips of mixed quality.

## Verdict

- 🟢 **Drawable in code:** flat 2D (vector, cut-out, infographics) or simplified 3D (simple shapes, soft light, fog, no photorealism). Say with what: canvas 2D / SVG / three.js.
- 🟡 **Partly:** the background can't be recreated (footage, game), but there is an authored layer on top (HUD, numbers, tags, captions, charts) and that layer *is* the recognizable part. Say that only the layer will be recreated, the background replaced by our own — and ask whether that's worth it.
- 🔴 **No:** footage, game, screen, AI video, photorealism. Stop, explain in one or two lines, show the sheet.

To the user: verdict, one line of why, the sheet path, and for 🟢 — what we'll draw with and what will be hardest.

## Lessons

- Pitch channels only after looking at real frames, never from thumbnails and view counts — two "animation" channels turned out to be Minecraft/Roblox recordings.
- Hand-drawn characters in close-up (anime, ink drawings) are 🔴 for code. A test with a 90s anime got the sky, sun and red palette close, but the people (figure, eyes, faces) looked like a Flash cartoon next to ink drawing. Recreate such styles only when there are no characters in frame or they are silhouettes.
- Stylized Blender 3D with fine ground textures and motion blur can score as "footage" on the numbers. Decide by eye: clean geometry, no skin pores, no handheld shake → it's authored 3D.
