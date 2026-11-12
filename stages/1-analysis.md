# 1. Break down the original → style spec

Goal: `style.md` precise enough to build the style without re-watching the original. Analysis first, action second: don't start building until the spec exists.

## What to download

- 2–3 videos of the channel (the hit + a recent one + a different story), full length, best quality (1080p): what they share is the style, what differs is the story. `bash scripts/fetch.sh <url> <tmp>/orig`.
- Channel numbers from `info.json` or the YouTube page: created, videos, subscribers, views, hits. With the date you looked.

## Measurements

1. `python scripts/pulse.py <video> <tmp>/pulse-<name>` — cuts per minute, average shot, share of still frames, longest still run, first visual change, silences, words per minute, one-frame-per-second sheet.
2. Speech: `pulse.py --words <subs.vtt>` with the auto-subtitles from fetch.sh, or faster-whisper. No speech — write that down ("the story is told only by on-screen text").
3. **Retention:** some videos' `info.json` (fetch.sh) carry a `heatmap` — YouTube's "most replayed" curve (for Shorts it is effectively a retention curve). Save it to `analysis/heatmap-<id>.json` and note where it drops: the first scene must hold through the steepest drop (Simply Animated: 1.0 → 0.25 in the first 2 s).
4. **Music:** tempo (BPM) and downbeats of the soundtrack — `python scripts/beatgrid.py <video.mp4>`. Scene lengths are often a whole number of bars (Simply Animated: 94 BPM, a scene = 2 bars ≈ 5.1 s). If every video of the channel uses the same track, the track is part of the style — note genre and tempo; you'll use your own track (stage 5), never theirs.
5. Key frames at full resolution (`ffmpeg -ss T -i video -frames:v 1 key.png`): one per screen type (overlay on a plain background, wide shot, close-up, transition, ending).

## Style spec (`style.md`) — sections

1. **Channel** — numbers with date, hits, the story formula, the ending.
2. **Recognizable in one second** — 3–5 traits that must match (for OutwardAnimates: serif typography, crimson tag, metric block on the left, centered italic caption, hazy 3D).
3. **Frame layout** — a table of elements: position and size in px (on a full-resolution frame), colour as HEX (sample pixels, don't eyeball), font, size, letter-spacing, weight.
4. **Font** — identify by shape (serifs, old-style figures, italic forms), find the closest free font (Google Fonts), put the TTF in `src/fonts/`, confirm by overlay (`scripts/compare.py --regions`). For CapCut-style captions (rounded, bold, outlined) start from these candidates: Fredoka 700, Baloo 2, Luckiest Guy, Montserrat Black, Bangers — overlay each as a text mask on an original frame and keep the closest.
5. **Scene / graphics** — shapes, materials, light, fog, depth of field, effects; for 2D — lines, fills, shadows, characters (head/body proportions), backgrounds.
6. **Camera and transitions** — always moving or not, type of motion, how scenes change, cuts per minute.
7. **Pacing** — the pulse table (cuts/min, average shot, still share, longest still, first change, how often captions change).
8. **Sound** — voice yes/no, words per minute, music character, effects on events. The agent can't hear — record what the loudness and spectrum show and what the user says.

## Check before showing

Build one sample frame — the most recognizable screen (usually the overlay on a simple background) — and compare: `python scripts/compare.py orig.png ours.png analysis/<element>-side-by-side.jpg --regions regions.json`. Target for the overlay: element boxes within ~5 px, high IoU of text masks. For 3D / backgrounds — by eye: light, palette, contrast, haze; write down what still differs.

🛑 To the user: "recognizable in one second", the comparison image, what still differs, what we'll draw with.

## Lessons

- Giant old channels (TED-Ed, OverSimplified) are good style references but bad pacing references: their views were earned over years. Measure pacing on young channels with short videos.
- "Flat" doesn't always mean canvas 2D: glowing "clay" figures (Simply Animated) are three.js with an orthographic camera + soft light + bloom (UnrealBloom 0.45 / 0.3 / 0.82). If the user asks "is this 3D?" — the camera is orthographic, the image is flat; three.js is there for shading and glow.
- Subtitles from YouTube auto-captions give approximate word timings; good enough for words/min, not for per-word sync.
- YouTube serves Shorts at 608×1080 even when you ask for 1080p. Scale every px measurement by 1920/1080 ≈ 1.78 before putting it into the spec.
- Font matching works best by rendering: put 6–8 free candidates (Google Fonts) under a crop of the original's caption with the same text and compare line width and letter shapes. The Kurzgesagt-style example matched its tag font within ~2% of line width this way (Lexend 700).
- Measure tag/caption sizes in px (line width, box height) before building, not after the first comparison — a 58 px font where the original has ~50 px was only caught late.
