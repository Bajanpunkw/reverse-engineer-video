# 6. Check before showing

Show the user only after every item. In the report say what was checked and what wasn't (sound by ear — never).

## Checklist

1. **Frames:** the per-second sheet of `final.mp4` (`python scripts/pulse.py final.mp4 analysis/pulse-final`) — look at all of it: no blank/black frames, glitches, cut-off text, overlaps.
2. **Style:** the auto-critic on `final.mp4` (`stages/critic.md`), plus 3–5 key moments — our frame next to a similar frame of the original (`scripts/compare.py`), look at the images. Write down what differs.
3. **Pacing:** our pulse vs. the original (cuts/min, still share, longest still, first change). A difference above ~30% — explain or fix. Any `still_runs_ge_1s` longer than 3 s is a dead zone: add motion and re-render only that piece (`stages/4-render.md`). Reference: the original's own wide Earth shot has a 5.7 s still run, so a slow planet shot of that length is within the style.
4. **Readability:** 3 frames downscaled to 360 px wide — the text is readable.
5. **Sound:** `python scripts/loudness.py --check final.mp4` → "ok". Audio length = video length.
6. **File:** format like the original, 30 fps, H.264 yuv420p, AAC, `+faststart`; for X: ≤ 512 MB and ≤ 2:20 on a regular account.
7. Delete draft previews and pieces; keep `video-full.mp4`, `sound-full.wav`, `final.mp4`.

## Showing

Open `final.mp4` + a message: length, format, what was checked (frames, loudness with numbers), what differs from the original, what to watch for. Then the user's edits → a rule in the relevant stage's "Lessons".

## Good runs

- "X followers" episode (mode B, 49 s): zero edits from the user on picture and sound, approved from the first full render. The user decided only the story (≤ 60 s, no time-lapse, "picture OK"); three rounds of control-frame fixes were the agent's own self-check against the original before showing; dead zones were found by `pulse.py` and fixed by re-rendering one piece.
- Fully autonomous runs work: a narrated vertical 3D explainer ("a GPU in a pit → an underground data center", 30 s) and the dice loop were made start to finish while the author was away — channel, story and fixes chosen by the agent, auto-critic as the gate — and the explainer was accepted from the first showing, the loop was posted with one known flaw (the rising die grazes its neighbours, see `stages/3-build.md`).
- For a social post, recognisability of the style matters more than the original's retention: "not viral for YouTube, fine for X".
