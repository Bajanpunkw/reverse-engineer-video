"""Soundtrack for the "data center doubles its power every 2 seconds" example. Everything is synthesized with numpy: no samples, no voice.

python sound.py <out.wav> [duration_s]      then: ../../../scripts/loudness.py <out.wav> <final.wav>

Layers: ambient bed (chords every 8 s, brighter towards 1 GW), a quiet low server hum (no fan noise), town wind,
soft booms on milestones, whooshes on scene cuts, a soft thump and a dip (no click, no dead silence) at the blackout.
Timings match video.html (power starts doubling at 5 s, cuts at 3.2 / 29 / 49.6 / 87 s, blackout at 45.9 s).
"""
import os, subprocess, sys
import numpy as np

SR = 44100
rng = np.random.default_rng(11)

T0 = 5.0
CUTS = [3.2, 29.0, 49.6, 87.0]
HITS = [12.7, 17.0, 21.0, 25.0, 29.0, 39.2, 63.6, 67.4, 72.3, 84.0, 99.0]
END = 103.0
BLACKOUT = 45.9


def P(t):
    return 700 * 2 ** (np.maximum(0, t - T0) / 2)


def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if hi: g *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if lo: g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** 4)
    return np.fft.irfft(X * g, len(x))


def smooth(t, a, b):
    k = np.clip((t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k)



CHORDS = [  # chord frequencies (Hz), change every 8 s: Dm9 → Bbmaj7 → Fmaj7/A → Csus2
    [73.42, 146.83, 174.61, 220.00, 261.63, 329.63],
    [58.27, 116.54, 146.83, 174.61, 220.00, 293.66],
    [55.00, 110.00, 174.61, 220.00, 261.63, 329.63],
    [65.41, 130.81, 196.00, 261.63, 293.66, 392.00],
]


def ambient(t, bright):
    """Ambient bed: chords with soft 2 s crossfades, slight detune, filter opens over time."""
    out = np.zeros_like(t); L = 8.0
    for ci, ch in enumerate(CHORDS):
        # chord weight: on in its own 8-second window of the cycle, with a crossfade
        cyc = (t / L) % len(CHORDS)
        d = np.minimum(np.abs(cyc - ci - 0.5), len(CHORDS) - np.abs(cyc - ci - 0.5))
        w = np.clip(1.25 - d * 1.0, 0, 1) ** 1.5
        for k, f in enumerate(ch):
            a = 1.0 if k == 0 else 0.55 / (1 + 0.15 * k)
            for det in (-0.35, 0.35):
                ph = 2 * np.pi * (f + det) * t + rng.uniform(0, 6)
                out += w * a * (np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph))
    out /= 12
    # "opening up": two filter presets mixed by brightness
    dark, open_ = fft_filter(out, hi=700), fft_filter(out, hi=2600)
    out = dark * (1 - bright) + open_ * bright
    # shimmer on top: quiet high tones with a slow pulse
    sh = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * (0.5 + 0.5 * np.sin(2 * np.pi * t / p + rng.uniform(0, 6)))
             for f, p in [(880, 5.3), (1174.7, 7.1), (1318.5, 6.2)])
    out += sh * 0.035 * (0.4 + 0.6 * bright)
    return out * (0.75 + 0.25 * np.sin(2 * np.pi * t / 11))

def pad(t):
    """Warm minor pad: D2, A2, F3, C4 with slow breathing."""
    out = np.zeros_like(t)
    for f, a in [(73.42, 1.0), (110.0, 0.7), (174.61, 0.45), (261.63, 0.3)]:
        for det in (-0.6, 0.6):
            out += a * np.sin(2 * np.pi * (f + det) * t + rng.uniform(0, 6))
    out *= 0.75 + 0.25 * np.sin(2 * np.pi * t / 9.0)
    return fft_filter(out / 8, hi=900)


def boom(n=2.2):
    t = np.arange(int(n * SR)) / SR
    f = 38 + 34 * np.exp(-t / 0.18)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.75)
    thump = fft_filter(rng.standard_normal(len(t)), hi=180) * np.exp(-t / 0.08) * 0.6
    x = body + thump
    return x * np.minimum(t / 0.004, 1)


def whoosh(n=0.9):
    t = np.arange(int(n * SR)) / SR
    x = rng.standard_normal(len(t))
    x = fft_filter(x, lo=300, hi=3500)
    e = np.sin(np.pi * np.clip(t / n, 0, 1)) ** 2 * (t / n) ** 0.8
    return x * e


def place(buf, x, at, gain):
    i = int(at * SR); j = min(len(buf), i + len(x))
    if i < len(buf): buf[i:j] += x[:j - i] * gain


def main():
    out = sys.argv[1]; D = float(sys.argv[2]) if len(sys.argv) > 2 else 107.5
    t = np.arange(int(D * SR)) / SR
    lp = np.log10(P(t))

    # blackout: tone and hum drop down and fade, then quiet wind
    drop = np.where(t < BLACKOUT, 1.0, np.maximum(0.25, 1 - 0.75 * smooth(t, BLACKOUT, BLACKOUT + 1.1)))
    after = 1 - smooth(t, BLACKOUT - 0.2, BLACKOUT + 1.5)        # hum and grid buzz fade out together with the lights
    recover = smooth(t, BLACKOUT + 2.2, BLACKOUT + 4.0)

    # ambient: brighter and denser towards a gigawatt, quieter in the intro
    bright = smooth(t, 3, 44)
    amb_gain = (0.45 + 0.55 * smooth(t, 2.5, 6)) * (0.8 + 0.5 * smooth(t, 30, BLACKOUT))
    bright = np.maximum(bright, smooth(t, 74, 99))
    pd = ambient(t, bright) * amb_gain * np.maximum(np.maximum(after, 0.45), recover * (0.7 + 0.3 * smooth(t, 49, 55)))
    pd *= 1 - 0.85 * smooth(t, END, END + 2.5)

    # server hum: low 100/120 Hz tone, grows with power; fades into the distance outdoors (after 29 s)
    hum_lvl = smooth(lp, np.log10(700), np.log10(5e5)) * (1 - 0.65 * smooth(t, 28.5, 31))
    hf = 100 * drop
    hum = 0.6 * np.sin(2 * np.pi * np.cumsum(hf) / SR) + 0.35 * np.sin(2 * np.pi * np.cumsum(hf * 1.2) / SR) + 0.2 * np.sin(2 * np.pi * np.cumsum(hf * 3) / SR)
    # no broadband fan noise on purpose: it reads as hiss, keep only a quiet low hum
    servers = fft_filter(hum, hi=300) * 0.5 * hum_lvl * after

    # town wind (from 29 s), quieter at night, returns after the blackout
    wind = fft_filter(rng.standard_normal(len(t)), lo=80, hi=700)
    wind *= (0.6 + 0.4 * np.sin(2 * np.pi * t / 6.3)) * smooth(t, 28.8, 30.5) * (1 - smooth(t, 49.0, 50.2)) * np.maximum(np.maximum(after, 0.5), recover * 0.7) * 0.7

    # overloaded-grid buzz before the blackout: 60 Hz with harmonics, rises 40→45.9 s
    ph = 2 * np.pi * np.cumsum(60 * drop) / SR
    buzz = np.tanh(3 * np.sin(ph)) * 0.5 + 0.25 * np.sin(3 * ph)
    buzz = fft_filter(buzz, hi=2200) * smooth(t, 40, BLACKOUT) * after
    mix = 0.75 * pd + 0.12 * servers + 0.25 * wind + 0.12 * buzz
    for c in CUTS: place(mix, whoosh(), c - 0.75, 0.12)
    for h in HITS: place(mix, boom(), h, 0.2)   # keep booms within ~+6 LU of the bed; louder ones feel jarring
    # soft low thump exactly when the town goes dark; a click + silence here sounds like a bad edit
    place(mix, boom(1.6) * 0.8, BLACKOUT, 0.15)
    # fades
    mix *= smooth(t, 0, 0.4) * (1 - smooth(t, D - 1.5, D))

    import wave
    pcm = (np.clip(mix / (np.abs(mix).max() + 1e-9) * 0.9, -1, 1) * 32767).astype(np.int16)
    with wave.open(out, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('ok', out)


if __name__ == '__main__':
    main()
