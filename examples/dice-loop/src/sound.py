# Sound for the dice loop: per cycle (1.86 s) a bright bell as the new die appears from the hole,
# a scatter of quiet clicks while the wave lands, a short clack when the field settles. All synthesized, no noise bed.
# Timings use the same constants as video.html (CYCLE, wave delays 0.62…1.37 + 0.26).
# python sound.py draft.wav  →  then scripts/loudness.py draft.wav sound-full.wav
import sys, wave, numpy as np

SR = 48000; CYCLE = 1.86; NCYC = 3; TOTAL = CYCLE * NCYC
out = np.zeros(int(SR * TOTAL) + SR, dtype=np.float64)
rng = np.random.default_rng(11)

def add(sig, t):
    i = int(t * SR); n = min(len(sig), len(out) - i); out[i:i + n] += sig[:n]

def env(n, a, d):  # attack a s, exponential decay d s
    t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)

def bell(f, dur=1.5, amp=1.0):
    # soft bell: fundamental + inharmonic partials (like a metallophone), no harsh highs
    n = int(SR * dur); t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * f * t) + .45 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / .25)
         + .22 * np.sin(2 * np.pi * f * 5.40 * t) * np.exp(-t / .12))
    return amp * s * env(n, .004, .45)

def click(f=2600, dur=.035, amp=.25):
    # plastic die click: a short tone with a fast decay + a little smoothed noise
    n = int(SR * dur); t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * f * t) * np.exp(-t / .006)
    nz = np.convolve(rng.standard_normal(n), np.ones(12) / 12, 'same') * np.exp(-t / .004) * .5
    return amp * (tone + nz)

def clack(amp=.55):
    n = int(SR * .12); t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * 1180 * t) * np.exp(-t / .018) + .6 * np.sin(2 * np.pi * 620 * t) * np.exp(-t / .03))
    return amp * s

NOTES = [523.25, 659.25, 783.99]  # C5, E5, G5 — one note per colour, the loop plays an arpeggio
N = 30; cells = [(i, j) for i in range(-N, N + 1) for j in range(-N, N + 1)]
for k in range(NCYC):
    t0 = k * CYCLE
    add(bell(NOTES[k], amp=.9), t0 + .02)
    # the wave: clicks at landing times (a sample of on-screen cells, otherwise it's mush)
    lands = []
    for (i, j) in cells:
        if abs(i) > 7 or abs(j) > 7: continue
        w = min(1, max(0, (i + 9) / 18)); r = rng.random()
        d = .62 + (1 - w) * .45 + r * .3 - (.3 if r < .05 else 0)
        lands.append(d + .26)
    lands = np.sort(rng.choice(lands, 70, replace=False))
    for x in lands:
        add(click(f=2200 + rng.random() * 1400, amp=.05 + rng.random() * .05), t0 + x)
    add(clack(), t0 + 1.62)

# loop: wrap the tail past the end to the start, so the replay has no gap
tail = out[int(SR * TOTAL):].copy(); out = out[:int(SR * TOTAL)]; out[:len(tail)] += tail
out = out / (np.max(np.abs(out)) + 1e-9) * .5
st = np.stack([out, out], 1)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(st, -1, 1) * 32767).astype('<i2').tobytes())
print('ok', TOTAL)
