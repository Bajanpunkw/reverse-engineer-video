# Style auto-critic

A separate judge agent with a clean context compares our frames with the original's and decides whether the work is ready to show. It never saw how the video was built, so it doesn't forgive "but we tried".

When: stage 3, step 4 (control frames, before showing) and stage 6 (the finished video). Levels (`critic.py score`):
- **STOP** (mean < 3): the style isn't there. Don't show it; small fixes won't save it. Change the base: character model, renderer, palette.
- **FIX** (3–7): first every defect from the judge's list (overlapping text, cropped edges, blank frames, unreadable scenes), then the 2–3 biggest style fixes. Run again, 3 rounds at most. Then show the user with the score and what still differs.
- **PASS** (mean ≥ 7, no axis < 5, every frame readable).

The thresholds are provisional. Videos the author accepted scored 4.5–6.7, so FIX is the normal result; PASS is rare. To tune them for your own taste, ask the user for a 0–10 "is this the same channel?" score when you show a video (don't reveal the critic's score before they answer), log both numbers, and after 5–8 videos move PASS to the critic score above which the user reliably accepts.

## Run

1. Pairs: `python scripts/critic.py prep --orig <originals.mp4> --ours <ours.mp4 | frames.png> --out <work>/analysis/critic-<N> [--hide x0,y0,x1,y1]`. Use `--hide` for watermark and handle zones (fractions of the frame, applied to both frames); otherwise the judge spots our frame by the handle instead of the craft.
2. The judge: a general-purpose subagent with the prompt below. Fill in `<DIR>` and, if you have it, the path to `style.md`.
3. Result: `python scripts/critic.py score <DIR>` → PASS / FIX / STOP, per-axis scores and fixes.

Limits. Our story is different on purpose, so the topic almost always gives our frame away; the blind guess is for information only and doesn't affect the verdict. The judge sees no motion and hears nothing: pacing stays with `pulse.py`, sound with the user.

## Judge prompt

```
You are a strict art director. You check whether our video recreates another channel's visual style so well that a viewer would think it's the same channel. Our story is different on purpose. Don't judge the topic, caption text or story — only the craft.

Folder: <DIR>
- ref-sheet.jpg — 16 different frames of the original; this is the style. It's a sample, not the whole channel.
- pair-1.jpg … pair-N.jpg — each pair has A and B: one original frame and one of ours, in random order. The magenta A/B tags and the magenta strip between the frames are ours. Flat rectangles over watermarks are ours too; ignore them.
<if available: The style spec from analysing the channel: <path to style.md>. Read the sections on recognition, graphics and layout. If an element of our frame isn't in the samples but the spec says the channel has it (e.g. a coloured accent at the end), don't penalise it. If it's in neither, write "not visible in the samples", not "the original doesn't do this". Where the spec and the images disagree, trust the images.>

Step 1, blind. Look carefully at ref-sheet.jpg and every pair (with the Read tool). For each pair decide which one is the original, rate your confidence 1–5 and list the tells: visible differences in craft, not topic, that give one frame away. Write <DIR>/blind.json: {"pairs":[{"pair":1,"original":"A","confidence":4,"tells":["..."]}]}. Don't open key.json until blind.json is written.

Step 2. Open <DIR>/key.json (field ours = which letter is ours). Score each of our frames against the original's style (ref-sheet + the frame in the pair) on these axes, 0–10:
- palette: background and accent colours, saturation, contrast, tone;
- shapes: forms, lines, outlines, thicknesses, roundness, level of detail;
- characters: how characters and objects are built (proportions, heads, faces, limbs, materials). No characters — judge the scene objects;
- typography: font, size, weight, colour, glow and placement of text, look of tags and interface;
- light: light, shadows, volume, glow, textures, background, haze, grain;
- composition: layout, scale, camera angle, where the main thing sits, how much empty space.
Scale: 10 — indistinguishable from the channel; 8 — same style, only an attentive fan would notice; 6 — clearly in the channel's spirit but a viewer would hesitate; 4 — similar idea, different style; 2 — little in common; 0 — another world. If an axis doesn't apply (no text in the frame), score what the frame lacks compared with the original; don't skip it.
Also for each of our frames: readable — will a viewer understand within 1 second what's happening, without a caption (yes/no) — and reads_as — one phrase describing what you see.

Separately, hunt for defects even if the style is close overall: overlapping lines of text, cropped edges, visible glow or mask rectangles, blank or black frames, characters cut by the frame edge. Defects always come first in the fix list.

Step 3. Fixes: up to 7 of the most important, from biggest to smallest. Each one concrete and checkable: what, where, by how many times or px, which hex colour. Bad: "make it closer to the original". Good: "character outline 2 px → the original has ~6 px dark brown #2b1d14".

Write <DIR>/verdict.json:
{"pairs":[{"pair":1,"original":"A","confidence":4,"tells":[...],"scores":{"palette":7,"shapes":6,"characters":5,"typography":8,"light":7,"composition":6},"readable":"yes","reads_as":"..."}],
 "fixes":["..."], "summary":"2–3 sentences: how much this is the same channel and what hurts most"}
The field original is your step-1 answer, unchanged. Reply briefly: the summary and the file path.
```

## Calibration on known cases

| Case | Author's verdict | Critic |
|---|---|---|
| Control: one style judged against a different channel | wrong style | 1.1 |
| A 2D history explainer whose characters didn't match | "the style wasn't recreated" | 1.6 (characters 1.0) |
| `examples/x-followers` vs OutwardAnimates | accepted from the first render | 4.8 |
| `examples/simply-animated` | accepted after one scene fix | 5.6 |
| A narrated 2D comic-style short | "perfect", only the voice was fixed | 6.5 → 7.7 after FIX |
| `examples/dice-loop` vs the original loop | posted | 6.4 → 6.4 → 6.7 (3 rounds) |

The ranking matched the author's. In the blind test the judge spotted our frame in every pair, by craft and not only by topic.

What the judge found beyond the author (checked by eye): overlapping HUD lines on a bright background, an empty last frame, a stadium cut by the frame edge, a character cut by the edge. Remarks repeat across independent runs.

Practical notes:
- Use a fresh, empty folder for control frames: stale frames from an earlier video in the same folder ended up in the pairs.
- On a finished video `prep` may pick several transition frames (white flashes) as "most different". If that happens, pass one frame per scene by hand (`--ours f3.jpg f9.jpg …`). Make sure the frames you pass are distinct — identical inputs make identical pairs.
- Rounds can contradict each other (blur the rays → bring back the hard edges). Check each fix against the original frame by eye before applying it.

Judge mistakes to watch for: v1 demanded removing an accent that wasn't in its 12 sample frames although the channel uses it → fixed with the spec + the "not visible in the samples ≠ the original doesn't do this" rule. v1 also got pairs of black fade frames; `prep` now skips them. It can miscount small details (pips on a die: 2 → 6) — verify such fixes by eye before applying them.
