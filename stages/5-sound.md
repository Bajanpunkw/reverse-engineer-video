# 5. Sound

The agent can't hear: every decision is based on a description of the layers, loudness measurements and what the user says. In the end, describe each layer to the user in one line ("where and what plays").

## Two cases

- **With a narrator** (OverSimplified, TED-Ed style): `scripts/tts.py` (edge-tts, word timings → word-by-word subtitles; trims the silence edge-tts adds around phrases) → `scripts/score.py` (synthesized music and effects; events tied to words in `sfx.json`; mixed under the voice). The voice is always the loudest thing; music and effects sit underneath.
- **No voice** (OutwardAnimates style): your own `src/sound.py` driven by the scene table — ambient bed, soft booms on milestones, whooshes on cuts, scene atmosphere. Templates: `examples/*/src/sound.py`.

- **Edit cut to one track** (Simply Animated style): a real royalty-free track of the same genre — not synthesized (synth phonk was rejected). Pixabay and similar libraries block bots: ask the user to download it. `scripts/beatgrid.py track.mp3` → BPM, first beat, drop; stretch it to the tempo of your cuts with `rubberband=tempo=<cut_bpm/track_bpm>` (pitch kept, ±5% is inaudible), start on the drop / a downbeat, run `beatgrid.py` on the result (the first beat should be at ~0 s). Template: `examples/simply-animated/src/music.sh`. Never the channel's own track: its licence (e.g. YouTube's Shorts library) doesn't cover your platform.

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
- An edit-style video with numpy-synthesized phonk: "the music sucks" → a real royalty-free track fitted to the bars.
- Milestone booms at +8–12 LU over the bed felt jarring → ~3× quieter; thresholds are now enforced by `loudness.py`.
- A narrator voice sounded "slightly robotic and hoarse": the edge-tts voice (24 kHz) was stretched to 44.1 kHz with linear `np.interp` (metallic artefacts) and a hard compressor. Fix: resample with ffmpeg `aresample=…:resampler=soxr`, compressor 2:1, a gentle top cut (lowpass 9.5 kHz, high shelf −2.5 dB at 6 kHz). Never load a voice into your own `sound.py` through `np.interp`.
- A loop gets a sound per cycle tied to the same timing constants as the picture (`examples/dice-loop/src/sound.py`: a bell when the new layer appears, a scatter of quiet clicks as the wave lands, a clack at the end), and the tail that runs past the end is wrapped to the start, so the loop has no gap.
