"""Soundtrack for the "X followers double every second" example. Everything is synthesized with numpy: no samples, no voice.

python sound.py <out.wav> [duration_s]      then: ../../../scripts/loudness.py <out.wav> <final.wav>

Layers: ambient bed (chords every 8 s, brighter towards "every human on Earth", an airy pad in the galaxy),
a soft notification "pop" on every doubling from 2 to 17 s (same pitch every time — no rising tone),
soft booms on milestones, whooshes on the cuts at 24.5 and 41 s, the bed fades out at the end.
Timings match video.html.
"""
import os, subprocess, sys
import numpy as np

SR = 44100
rng = np.random.default_rng(11)

CUTS = [24.5, 41.0]
HITS = [7, 12, 18, 22, 26, 31, 35, 39, 42]
END = 45.2


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


def pop(n=0.35, f=1320.0):
    """Soft notification: a clean tone plus its octave, fast decay."""
    t = np.arange(int(n * SR)) / SR
    x = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t / 0.07)
    return x * np.minimum(t / 0.003, 1)


def main():
    out = sys.argv[1]; D = float(sys.argv[2]) if len(sys.argv) > 2 else 49.0
    t = np.arange(int(D * SR)) / SR
    bright = smooth(t, 2, 35)
    amb = ambient(t, bright) * (0.5 + 0.5 * smooth(t, 1.5, 5)) * (0.85 + 0.15 * smooth(t, 26, 35))
    amb *= 1 - 0.35 * smooth(t, 41, 42.5)                      # galaxy: quieter and airier
    amb *= 1 - 0.9 * smooth(t, END, END + 3)
    air = pad(t) * smooth(t, 40.5, 42.5) * (1 - smooth(t, END, END + 3))
    mix = 0.75 * amb + 0.35 * air
    for s_ in range(2, 18):                                     # one "pop" per doubling, quieter towards the stadium
        place(mix, pop(), s_, 0.10 * (1 - 0.8 * (s_ - 2) / 15))
    for c in CUTS: place(mix, whoosh(), c - 0.75, 0.10)
    for h in HITS: place(mix, boom(), h, 0.15)
    mix *= smooth(t, 0, 0.4) * (1 - smooth(t, D - 1.5, D))
    import wave
    pcm = (np.clip(mix / (np.abs(mix).max() + 1e-9) * 0.9, -1, 1) * 32767).astype(np.int16)
    with wave.open(out, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('ok', out)


if __name__ == '__main__':
    main()
