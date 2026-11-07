# Example: "What if your X account doubled its followers every second?"

Mode B (new episode in an already recreated style) — style: [OutwardAnimates](https://www.youtube.com/@outwardanimates), spec in `../outwardanimates-style.md`. 49 s, vertical 1080×1920, no narration. Approved without a single visual or sound edit.

## Formula

F(t) = 2^(t − 2): 1 follower at 2 s, doubling every second. The title runs 0–2 s.

## Scene table

| t, s | Followers | Caption | Scene |
|---|---|---|---|
| 0–2 | — | title | Earth from orbit |
| 2 | 1 | "Your first follower. It's your mom." | a house, one mannequin waving |
| 7 | 32 | "A whole classroom." | the yard fills, camera pulls back |
| 12 | 1,024 | "A packed high school." | the street fills |
| 18 | 65,536 | "A sold-out stadium." | the stadium behind the house fills |
| 22 | 1M | "A whole city." | every street, from above |
| 26 | 17M | "More than the Netherlands." | day-side Earth, a crowd patch |
| 31 | 550M+ | "Everyone on X." | the crowd spreads over continents |
| 35 | 8.3B | PAST THE MAX — "Every human on Earth follows you." | all land covered |
| 39 | 117B+ | "Everyone who has ever lived." | the planet glows, camera pulls back |
| 42 | 1T+ | "More than every star in the Milky Way." | a spiral galaxy of points |
| 45–49 | — | "So what should we double next?" | black screen |

The crowd patch on Earth is proportional: covered share of land = followers / world population → angular radius of the cap from (1 − cos θ)/2 = share.

## Facts used (checked November 2026)

| Fact | Value | Source |
|---|---|---|
| X monthly active users | ~550M (X + Grok, Mar 2026); X itself claims ~600M | SpaceX S-1 filing (SEC, May 2026), as reported |
| Most-followed X account | ~241M | Wikipedia, "List of most-followed X accounts" |
| World population | ~8.3B (mid-2026) | UN World Population Prospects 2024 |
| People who have ever lived | ~117B | Population Reference Bureau |
| Netherlands | ~18M | CBS |
| Stars in the Milky Way | 100–400B | NASA |

## How the crowds are drawn

- The first 2,048 people are 3D mannequins (`InstancedMesh`: capsule body + sphere head), each popping in at its own arrival time t = 2 + log2(n).
- The stadium's 65,536 seats and every street in town are `THREE.Points` revealed with `setDrawRange` as the counter grows.
- On Earth, millions are a shader fill of colourful specks over land; clouds part over the crowd.

## Run it

```bash
# from the repo root
node scripts/render.cjs examples/x-followers/src work/xf-frames --frames 2.5,10,20,30,40 && .venv/bin/python scripts/sheet.py work/xf-frames
node scripts/render.cjs examples/x-followers/src work/xf/video-full.mp4 --end 49 --workers 2
.venv/bin/python examples/x-followers/src/sound.py work/xf/draft.wav 49
.venv/bin/python scripts/loudness.py work/xf/draft.wav work/xf/sound-full.wav
bash scripts/mux.sh work/xf/video-full.mp4 work/xf/sound-full.wav work/xf/final.mp4
```

Change the story in `src/video.html` (`CAPS`, `line1()`, the formula) and the set pieces in `src/scenes.js`.
