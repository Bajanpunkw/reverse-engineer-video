# Example: "What if a data center doubled its power every 2 seconds?"

Mode A (the first recreation of the style) — style: [OutwardAnimates](https://www.youtube.com/@outwardanimates), spec in `../outwardanimates-style.md`. 107 s, vertical 1080×1920, no narration. Made before the "vertical ≤ 60 s" rule, so it uses TIME-LAPSE tags to compress story time.

## Formula

P(t) = 700 W × 2^((t − 5)/2) — one GPU at 700 W, held until 5 s, then doubling every 2 s. After 74 s, story time is compressed (TIME-LAPSE 2.5× and 5× tags, like the original); the mapping is the `SEG` table in `src/video.html`.

## Scenes

| Video time | Power | Scene |
|---|---|---|
| 0–3 s | — | Earth from orbit, title |
| 3–29 s | 700 W → 3 MW | one continuous pull-back: a GPU → an 8-GPU server → a rack → a row → the hall |
| 29–49.6 s | → 1 GW | rooftop chillers and steam → the suburb from above → dusk → the town goes dark in a wave from the data center |
| 49.6–74 s | → ~19 TW | night Earth: lights go out in a patch, then everywhere ("all of America's electricity", "every power plant on Earth", "all the energy humans use") |
| 74–87 s | TIME-LAPSE → 1.7×10¹⁷ W | to the day side: "all the sunlight that hits Earth" |
| 87–103 s | TIME-LAPSE → 3.8×10²⁶ W | the Sun |
| 103–107.5 s | — | "So what should we power next?" |

## Facts used (checked November 2026)

| Fact | Value | Source |
|---|---|---|
| NVIDIA H100 SXM | up to 700 W | NVIDIA datasheet |
| DGX H100 server (8 GPUs) | 10.2 kW max | NVIDIA DGX H100 User Guide |
| Average US home | 865 kWh/month (2024) ≈ 1.2 kW | US EIA |
| US electricity, 2024 | ≈ 4,086 TWh ≈ 466 GW average | US EIA STEO |
| World electricity, 2024 | 30,856 TWh ≈ 3.5 TW | Ember, Global Electricity Review 2025 |
| Total human energy supply, 2024 | 592 EJ ≈ 18.8 TW | Energy Institute, Statistical Review 2025 |
| Sunlight hitting Earth | 1361 W/m² × π·(6371 km)² ≈ 1.74×10¹⁷ W | solar constant (Kopp & Lean 2011) |
| Solar luminosity | 3.828×10²⁶ W | IAU 2015 Resolution B3 |

## Run it

```bash
node scripts/render.cjs examples/data-center/src work/dc-frames --frames 4,15,25,40,47,60,90,100 && .venv/bin/python scripts/sheet.py work/dc-frames
node scripts/render.cjs examples/data-center/src work/dc/video-full.mp4 --end 107.5 --workers 2
.venv/bin/python examples/data-center/src/sound.py work/dc/draft.wav 107.5
.venv/bin/python scripts/loudness.py work/dc/draft.wav work/dc/sound-full.wav
bash scripts/mux.sh work/dc/video-full.mp4 work/dc/sound-full.wav work/dc/final.mp4
```
