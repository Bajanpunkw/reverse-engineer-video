# 5. Sound

The agent can't hear: every decision is based on a description of the layers, loudness measurements and what the user says. In the end, describe each layer to the user in one line ("where and what plays").

## Two cases

- **With a narrator** (OverSimplified, TED-Ed style): `scripts/tts.py` (edge-tts, word timings → word-by-word subtitles; trims the silence edge-tts adds around phrases) → `scripts/score.py` (synthesized music and effects; events tied to words in `sfx.json`; mixed under the voice). The voice is always the loudest thing; music and effects sit underneath.
- **No voice** (OutwardAnimates style): your own `src/sound.py` driven by the scene table — ambient bed, soft booms on milestones, whooshes on cuts, scene atmosphere. Templates: `examples/*/src/sound.py`.

Sound timings come from the same scene table as the video (the same constants).

## Rules

- Clean effects: sines/tones with envelopes; noise only filtered and short. No broadband noise beds (they read as hiss).
- Nothing sticks out: booms and whooshes stay within ~+6 LU of the bed.
- No clicks and no drops to dead silence inside the video — they sound like a bad edit. "Power-downs" and pauses are soft dips.
- Music: a calm ambient bed (slow chord changes, brighter and denser towards the climax). Avoid gimmicks like an endlessly rising Shepard tone.
- Ending: the bed fades out over the last 1.5–2.5 s.

## Mix and check

1. Synthesize → draft wav: `python src/sound.py draft.wav <duration>`.
2. `python scripts/loudness.py draft.wav sound-full.wav` — linear gain to −26 LUFS + limiter, then checks: no moment louder than −20 LUFS, true peak ≤ −6 dBFS, no drops to silence. "FIX" → change the levels of individual sounds in the mix, not the overall volume.
3. `bash scripts/mux.sh video-full.mp4 sound-full.wav final.mp4` — no video re-render.

## Lessons

- Harsh highs and a deafening final "stamp" → clean tones, effects peak-normalized and set relative to the voice.
- −20 LUFS felt too loud (social apps play at full volume) → −26 LUFS.
- A rising Shepard tone felt out of place.
- A broadband "server fan" noise layer read as plain hiss → removed, kept a quiet low hum.
- A click + one second of silence at a blackout read as a bad edit → a soft low thump at the exact moment + a dip.
- Milestone booms at +8–12 LU over the bed felt jarring → ~3× quieter; thresholds are now enforced by `loudness.py`.
