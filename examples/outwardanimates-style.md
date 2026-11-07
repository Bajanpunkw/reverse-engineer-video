# Style spec: OutwardAnimates

Reference channel: **[OutwardAnimates](https://www.youtube.com/@outwardanimates)** — "takes one small *what if* and follows it all the way out". At the time of this breakdown (November 2026) the channel was a few weeks old, with ~27 Shorts and ~24M views; its biggest hit ("What if you dropped 10kg of tungsten from space?") had 8M+ views.

This is a description of the *visual language*, measured from 5 of the channel's videos (1080×1920, 30 fps). No frames, footage, audio or assets of the channel are included in this repository; both example videos are original stories rendered entirely from code.

## Story formula

One quantity grows in steps (speed, temperature, magnitude, power…) from the everyday to the cosmic; the number never stops climbing; the video ends on a black screen with a question: "So what should we drop next?" / "Which scale should we break next?".

## Recognizable in one second (must match)

1. **Serif typography everywhere** — closest free match: **Cormorant Garamond** (old-style figures in small lines, long italic descenders). Confirmed by overlay.
2. **Crimson tag** `#AF0F2B` (sampled #AD0F2B…#B40C2A), ~8 px radius, white small caps with wide tracking: "TIME-LAPSE 18X", "SLOW MOTION 1/20X", "REAL TIME", "PAST THE MAX".
3. **Metric block on the left** — small-caps label → large number → unit → two small-caps lines.
4. **Centered italic caption** — one sentence, changes every ~3–5 s.
5. **Simplified 3D in haze** — soft light, muted colours, fog / depth of field, few small details.

## Frame layout (1080×1920)

| Element | Position and size | Colour and type |
|---|---|---|
| Tag | x 86, y 596, 330×48, r 8 | bg #AF0F2B; white small caps 28 px, tracking .22em, weight 500 |
| Label ("SPEED") | x 87, top 700 | small caps 29 px, tracking .23em, #EDEBE5 |
| Big number | x 87, top 735, 88 px | #EDEBE5, lining tabular figures (`lnum`, `tnum`) |
| Unit | right after the number, 56 px | same |
| Line 1 | x 87, top 844 | small caps 29 px, tracking .255em |
| Line 2 | x 87, top 886 | small caps 27 px, tracking .228em, 80% brightness, "·" separators |
| Italic caption | centered, top 1148 | italic 49 px, white, soft shadow |
| Ruler | x 33, y 268 … 1460, log scale | thin line 40% white, ticks 75%, labels 17 px small caps |
| Ruler marker | red dot r 9 | #AE112A with a glow |
| Backdrop | behind the metric block | blurred dark radial gradient so text reads on any background |
| Intro title | centered, top 356 | 97 px, line height 104 px |
| Ending | black screen, centered | 62 px, two lines |

The overlay in the examples matches the original's element boxes within 0–5 px. Sizes drift slightly between the channel's own videos (~7%); the biggest hit was used as the reference.

## 3D scenes

- Earth from orbit with clouds and a warm atmospheric rim; cloud layers; desert, coast, suburbs as a street grid.
- Simple objects: white houses with coloured pitched roofs, ball trees on sticks, faceless mannequin people.
- Light: soft, often dusk or overcast; muted saturation; strong aerial perspective and fog; depth of field blurs the background.
- Effects: glowing hot noses, cone shock waves, sparks, particle dust clouds, debris, fireballs.
- Camera: always moving — slow push-ins, orbits, tracking. "Scale" stories are one long continuous shot (4 cuts in 90 s); "drop" stories cut every ~2.6 s.

## Pacing (pulse.py)

| | "Tungsten 10 kg" (67 s) | "Earthquake M18" (90 s) |
|---|---|---|
| Cuts per minute | 22.4 | 2.7 |
| Average shot | 2.6 s | 18 s |
| Still-frame share | 32% | 19% |
| Longest still run | 5.0 s | 5.7 s |
| First visual change | 0.5 s | 0.1 s |

- **No narration** — the story is told only by on-screen text. Captions and the number change every ~3–5 s; the number runs all the time.
- Sound: music and effects (described by ear by a human; the agent can't hear).
