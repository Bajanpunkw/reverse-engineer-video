"""Riddle soundtrack: tense D-minor bed with a soft clock tick + synthesized effects on picture events + voice.
python sound.py <src dir> <out draft.wav>   (then scripts/loudness.py → sound-full.wav). Needs audio/voice.wav: scripts/tts.py src/script.json src/audio en-US-AndrewMultilingualNeural +10%
Same timings as main.js: everything keyed to words in audio/timeline.json.
"""
import json, os, subprocess, sys, wave
import numpy as np

SR = 44100
def _find_ffmpeg():
    import shutil
    from pathlib import Path
    root = Path(__file__).resolve().parents[3]
    for c in (os.environ.get('FFMPEG'), str(root / 'node_modules' / 'ffmpeg-static' / 'ffmpeg'), shutil.which('ffmpeg')):
        if c and os.path.exists(c):
            return c
    raise SystemExit('ffmpeg not found: run scripts/setup.sh or set FFMPEG=/path/to/ffmpeg')


FF = _find_ffmpeg()
SRC, OUT = sys.argv[1], sys.argv[2]
TL = json.load(open(os.path.join(SRC, 'audio/timeline.json')))
L = {l['id']: l for l in TL['lines']}
DUR = 41.6
N = int(DUR * SR) + SR
rng = np.random.default_rng(3)


def wt(line, word=None, n=0):
    l = L[line]
    if not word:
        return l['start']
    ws = [w for w in l['words'] if ''.join(ch for ch in w['w'].lower() if ch.isalpha()) == word]
    return (ws[n] if len(ws) > n else ws[0])['start']


def t_(d): return np.arange(int(d * SR)) / SR
def db(x): return 10 ** (x / 20)
NOTE = lambda m: 440 * 2 ** ((m - 69) / 12)


def ff_filter(x, af):
    p = subprocess.run([FF, '-v', 'error', '-f', 'f64le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', af, '-f', 'f64le', '-'],
                       input=x.astype(np.float64).tobytes(), capture_output=True, check=True)
    y = np.frombuffer(p.stdout, np.float64).copy()
    return np.pad(y, (0, max(0, len(x) - len(y))))[:len(x)]


def add(buf, at, s, gain_db):
    i = int(at * SR)
    if i >= len(buf): return
    s = s / (np.abs(s).max() + 1e-9) * db(gain_db)
    j = min(len(buf), i + len(s)); buf[max(0, i):j] += s[max(0, -i):j - i]


# ---------- instruments ----------
def pluck(f, d=.6, bright=5):
    t = t_(d); s = sum(np.sin(2 * np.pi * f * h * t) / h ** 1.4 * np.exp(-t * (5 + h * bright)) for h in range(1, 6))
    return s * np.minimum(t / .004, 1)


def pad(fs, d, att=.7, rel=.8):
    t = t_(d); s = sum(np.sin(2 * np.pi * f * t + .3 * np.sin(2 * np.pi * .2 * t)) + .25 * np.sin(2 * np.pi * 3 * f * t) for f in fs)
    return s * np.minimum(t / att, 1) * np.minimum((d - t) / rel, 1).clip(0, 1)


def glock(f, d=1.2):
    t = t_(d); return (np.sin(2 * np.pi * f * t) + .15 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t * 6)) * np.exp(-t / .35) * np.minimum(t / .002, 1)


def tick(d=.05):
    t = t_(d); return np.sin(2 * np.pi * 2100 * t) * np.exp(-t / .006) + .5 * np.sin(2 * np.pi * 1300 * t) * np.exp(-t / .01)


def thud(f0=95, d=.45):
    t = t_(d); f = f0 * np.exp(-t * 4) + 35; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .16) * np.minimum(t / .003, 1)


def glide(f0, f1, d, decay=None):
    t = t_(d); f = f0 * (f1 / f0) ** (t / d); e = np.sin(np.pi * t / d) if decay is None else np.exp(-t / decay)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * e


def noise_burst(d, lp, shape='decay'):
    t = t_(d); x = rng.uniform(-1, 1, len(t)); x = ff_filter(x, f'lowpass=f={lp}:p=2,lowpass=f={lp}:p=2')
    e = np.exp(-t / (d / 4)) if shape == 'decay' else (t / d) ** 2
    return x * e * np.minimum(t / .004, 1)


def pop(f=700):
    t = t_(.12); return np.sin(2 * np.pi * np.cumsum(f * (1 + 1.2 * np.exp(-t * 60))) / SR) * np.exp(-t / .03)


# ---------- music bed ----------
BPM = 96; BEAT = 60 / BPM; BAR = 4 * BEAT
music = np.zeros(N)
CH = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]]   # Dm Bb Gm A
PLAN0, AV_HIT, BACK, CARD = 24.25, wt('s13', 'late') - .05, 34.4, wt('s15') - .15
for b in range(int(DUR / BAR) + 1):
    t0 = b * BAR
    if AV_HIT - .1 < t0 < BACK: continue
    ch = CH[b % 4] if t0 < BACK else CH[0]
    lvl = -9 if t0 < PLAN0 else -6
    add(music, t0, pad([NOTE(m) for m in ch], BAR + .6), lvl - 4)
# pulse: low eighths on the root (16ths during the plan time-lapse), stops at the white-out, sparse after
t = 0.0
while t < DUR:
    b = int(t / BAR); root = CH[b % 4][0] - 12
    if t < AV_HIT:
        dense = PLAN0 < t
        add(music, t, pluck(NOTE(root + (7 if int(t / (BEAT / 2)) % 4 == 2 else 0)), .3, 7), -12 if not dense else -9)
        t += BEAT / 4 if dense and t > 29 else BEAT / 2
    else:
        t = max(t, BACK); add(music, t, pluck(NOTE(38), .5, 6), -16); t += BEAT
# clock tick on every beat until the white-out
t = BEAT
while t < AV_HIT:
    add(music, t, tick(), -24 if t < PLAN0 else -20); t += BEAT
# final card: soft rising arpeggio
for k, m in enumerate([62, 65, 69, 74]): add(music, CARD + .2 + k * .32, glock(NOTE(m)), -14)
add(music, CARD, pad([NOTE(m) for m in (50, 57, 62, 64)], DUR - CARD + .3, att=.4, rel=.3), -3)  # held chord under the card, fades with the end
# duck the music under the voice region; fade at the very end
fade = np.clip((DUR - .1 - np.arange(N) / SR) / 1.3, 0, 1)
music *= fade

# ---------- effects ----------
fx = np.zeros(N)
add(fx, .3, thud(110, .5), -8); add(fx, .3, noise_burst(.35, 900), -14)                 # cornice cracks
add(fx, .5, noise_burst(2.6, 160, 'swell')[::-1].copy(), -16)                             # low rumble that fades
add(fx, .95, pop(900), -22)                                                                # timer appears
for k in range(4): add(fx, wt('s2', 'hikers') - .15 + k * .07, pop(1200 + k * 120), -26)  # eyes blink on
lt = wt('s2', 'lantern'); add(fx, lt - .1, glide(250, 800, .45), -18); add(fx, lt + .1, glock(NOTE(81)), -18)
so = wt('s3', 'old'); add(fx, so, noise_burst(.06, 2500), -24); add(fx, so + .05, glide(900, 250, 1.1), -30)  # plank snaps, falls
add(fx, 11.3, glide(190, 130, .55) * (1 + .3 * np.sin(2 * np.pi * 18 * t_(.55))), -16)  # bridge creaks
add(fx, wt('s4', 'two'), pluck(NOTE(69)), -16)
dk = wt('s4', 'dark') - .2; add(fx, dk, glide(140, 45, .7, .3), -12)                       # light swallowed
add(fx, 13.3, pop(1500), -24)
names = [('s5', 'mia', 'one', 62), ('s6', 'leo', 'two', 65), ('s7', 'sam', 'five', 69), ('s8', 'rose', 'ten', 74)]
for line, nm, lw, m in names:
    add(fx, wt(line, nm) - .15, thud(160, .25), -18)                                       # spotlight clunk
    add(fx, wt(line, lw) - .05, pluck(NOTE(m)), -14)                                       # label
add(fx, wt('s9', 'slower') - .1, pluck(NOTE(74 - 12)), -16)
sums = [wt('s11', 'ten'), wt('s11', 'one'), wt('s11', 'five'), wt('s11', 'one', 1), wt('s11', 'two')]
for k, ts in enumerate(sums): add(fx, ts, pop(800 + k * 90), -18)
nt = wt('s12', 'nineteen'); add(fx, nt, sum(pluck(NOTE(m), .9, 3) for m in (38, 45, 50, 53)), -10)
z = wt('s11', 'one', 1) + .5
for k in range(2): add(fx, z + k * .22, glock(NOTE(86), .4), -20)                          # timer hits 0:00
av0 = nt - 1.2; add(fx, av0, noise_burst(AV_HIT - av0 + .1, 220, 'swell'), -9)               # avalanche roar
add(fx, AV_HIT, thud(70, 1.2), -7)
add(fx, BACK, glide(200, 1100, .45), -20)                                                   # rewind
s17 = wt('s14', 'seventeen'); add(fx, s17, glock(NOTE(74)), -14); add(fx, s17 + .18, glock(NOTE(81)), -16)
add(fx, CARD + 1.6, glock(NOTE(86), 1.6), -18)

# ---------- mix ----------
bus = music * db(-6) + fx * db(-3)
bus = ff_filter(bus, 'lowpass=f=7000:p=2,highshelf=f=3500:g=-4')
with wave.open(os.path.join(SRC, 'audio/voice.wav')) as w:
    v = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768; vsr = w.getframerate()
v = np.interp(np.arange(int(len(v) * SR / vsr)) / SR, np.arange(len(v)) / vsr, v)
v = np.pad(v, (0, max(0, N - len(v))))[:N] / (np.abs(v).max() + 1e-9)
v = ff_filter(v, 'acompressor=threshold=-18dB:ratio=3:attack=5:release=120:makeup=1'); v /= np.abs(v).max() + 1e-9  # even out line-to-line loudness
env = np.convolve(np.abs(v), np.ones(int(.15 * SR)) / int(.15 * SR), 'same')
duck = 1 - .4 * np.clip(env / (env.max() * .25), 0, 1)
mix = v * db(-3) + bus * duck * db(-9)
mix = mix[:int(DUR * SR)]
mix /= np.abs(mix).max() / .7
with wave.open(OUT, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('ok', OUT, round(len(mix) / SR, 2), 's')
