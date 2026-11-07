"""Music bed + sound effects + voice -> mix.wav. Everything synthesized in numpy, no samples.

python score.py <timeline.json> <voice.wav> <sfx.json> <out.wav>

sfx.json: {"bpm": 116, "music_db": -21, "events": [
   {"line": "cannon", "word": "firing", "n": 0, "offset": 0.0, "type": "boom", "db": -6}, ...]}
   line "*" = every line start (scene change); word omitted = line start.
types: pop, whoosh, boom, thud, stamp, ding, slide_down, wind, sad_trombone, sting, tick
"""
import json, os, subprocess, sys
import numpy as np

SR = 44100
def _find_ffmpeg():
    import shutil
    from pathlib import Path
    root = Path(__file__).resolve().parents[1]
    for c in (os.environ.get('FFMPEG'), str(root / 'node_modules' / 'ffmpeg-static' / 'ffmpeg'), shutil.which('ffmpeg')):
        if c and os.path.exists(c):
            return c
    raise SystemExit('ffmpeg not found: run scripts/setup.sh or set FFMPEG=/path/to/ffmpeg')


FF = _find_ffmpeg()
rng = np.random.default_rng(7)


def t_(n):
    return np.arange(int(n * SR)) / SR


def env(n, a=0.005, d=0.2):
    t = t_(n)
    return np.minimum(t / a, 1) * np.exp(-t / d)


def db(x):
    return 10 ** (x / 20)


def lowpass(x, k):
    """crude one-pole low-pass, k in (0,1): smaller = darker"""
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += k * (v - acc)
        y[i] = acc
    return y


def noise(n):
    return rng.uniform(-1, 1, int(n * SR))


# ---------------- instruments ----------------
def pluck(f, n=0.35, bright=6):
    t = t_(n)
    s = sum(np.sin(2 * np.pi * f * h * t) / h ** 1.3 * np.exp(-t * (6 + h * bright)) for h in range(1, 7))
    return s * np.minimum(t / 0.003, 1)


def tuba(f, n=0.3):
    t = t_(n)
    s = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(4 * np.pi * f * t) + 0.25 * np.sin(6 * np.pi * f * t)
    return s * np.minimum(t / 0.035, 1) * np.exp(-t / 0.18)


def snare(n=0.16):
    t = t_(n)
    return (lowpass(noise(n), 0.18) * 1.6 + 0.4 * np.sin(2 * np.pi * 190 * t)) * np.exp(-t / 0.04) * np.minimum(t / 0.002, 1)


def kick(n=0.25):
    t = t_(n)
    f = 110 * np.exp(-t * 18) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12)


def glock(f, n=0.6):
    t = t_(n)
    return (np.sin(2 * np.pi * f * t) + 0.12 * np.sin(2 * np.pi * f * 2 * t)) * np.exp(-t / 0.25) * np.minimum(t / 0.003, 1)


NOTE = lambda m: 440 * 2 ** ((m - 69) / 12)


def music(dur, bpm):
    """comic military march: oom-pah tuba + pizzicato chords + snare rolls + light glockenspiel motif"""
    out = np.zeros(int((dur + 2) * SR))
    beat = 60 / bpm
    # C, G, C, F, C, G, Am, G  (one chord per bar, 2/4-ish feel in 4/4)
    prog = [(48, [60, 64, 67]), (43, [59, 62, 67]), (48, [60, 64, 67]), (41, [60, 65, 69]),
            (48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (43, [59, 62, 67])]
    motif = [72, 74, 76, 79, 76, 74, 72, None, 67, 69, 71, 74, 71, 69, 67, None]

    def add(sig, at, g):
        i = int(at * SR)
        if i >= len(out):
            return
        j = min(len(out), i + len(sig))
        out[i:j] += sig[:j - i] * g

    bar = 0
    t = 0.0
    while t < dur:
        root, ch = prog[bar % len(prog)]
        for b in range(4):
            bt = t + b * beat
            if b % 2 == 0:
                add(tuba(NOTE(root if b == 0 else root + 7)), bt, 0.55)
                add(kick(), bt, 0.35)
            else:
                for m in ch:
                    add(pluck(NOTE(m)), bt, 0.16)
                add(sfx('tick'), bt, 0.05)
            # snare ruff on the last 8th of every 2nd bar
            if bar % 2 == 1 and b == 3:
                pass
        # glockenspiel motif every other 2 bars, 8th notes
        if bar % 4 in (2, 3):
            for k in range(8):
                m = motif[(bar % 2) * 8 + k]
                if m:
                    add(glock(NOTE(m)), t + k * beat / 2, 0.06)
        t += 4 * beat
        bar += 1
    return out


# ---------------- sfx (v2: clean tones, noise only through real filters, every sound peak-normalized) ----------------
def ff(x, af):
    """run a signal through an ffmpeg audio filter chain (proper biquads instead of the crude one-pole)"""
    p = subprocess.run([FF, '-v', 'error', '-f', 'f64le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', af, '-f', 'f64le', '-'],
                       input=np.ascontiguousarray(x, np.float64).tobytes(), capture_output=True, check=True)
    y = np.frombuffer(p.stdout, np.float64)
    return np.pad(y, (0, max(0, len(x) - len(y))))[:len(x)].copy()


def sweep(f):
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def att(t, a):
    return np.minimum(t / a, 1)


def soft_note(f, n, decay, harm=3):
    t = t_(n)
    return sum(np.sin(2 * np.pi * f * h * t) / h ** 2 for h in range(1, harm + 1)) * att(t, 0.008) * np.exp(-t / decay)


def _sfx(kind):
    if kind == 'pop':      # soft bloop
        n = 0.1; t = t_(n)
        return sweep(700 * np.exp(-t * 20) + 300) * att(t, 0.003) * np.exp(-t / 0.035)
    if kind == 'blip':     # scene change: soft marimba-ish note
        n = 0.4; t = t_(n); f = NOTE(72)
        return (np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / 0.02)) * att(t, 0.003) * np.exp(-t / 0.12)
    if kind == 'whoosh':   # band-passed air, smooth
        n = 0.45; t = t_(n)
        return ff(noise(n), 'bandpass=f=700:width_type=o:w=1.2,lowpass=f=2000') * np.sin(np.pi * t / n) ** 3
    if kind == 'boom':     # cannon: low body + punch + dark blast + rumble tail
        n = 1.6; t = t_(n)
        body = sweep(55 * np.exp(-t * 3) + 36) * att(t, 0.004) * np.exp(-t / 0.45)
        punch = sweep(130 * np.exp(-t * 30) + 60) * att(t, 0.002) * np.exp(-t / 0.06)
        blast = ff(noise(n), 'lowpass=f=450:p=2,lowpass=f=450:p=2') * att(t, 0.006) * np.exp(-t / 0.25)
        rumble = ff(noise(n), 'lowpass=f=110:p=2,lowpass=f=110:p=2') * att(t, 0.05) * np.exp(-t / 0.7)
        b, r = blast / (np.abs(blast).max() + 1e-9), rumble / (np.abs(rumble).max() + 1e-9)
        return body * 1.0 + punch * 0.6 + b * 0.55 + r * 0.35
    if kind == 'thud':     # landing: pure low thump
        n = 0.3; t = t_(n)
        return sweep(110 * np.exp(-t * 18) + 52) * att(t, 0.003) * np.exp(-t / 0.1)
    if kind == 'stamp':    # wooden thunk instead of noise burst
        n = 0.22; t = t_(n)
        knock = ff(noise(n), 'lowpass=f=1200:p=2,highpass=f=200') * att(t, 0.001) * np.exp(-t / 0.012)
        return sweep(190 * np.exp(-t * 25) + 95) * att(t, 0.002) * np.exp(-t / 0.06) + knock / (np.abs(knock).max() + 1e-9) * 0.25
    if kind == 'ding':     # soft bell, no high inharmonic partials
        n = 1.2; t = t_(n)
        return (np.sin(2 * np.pi * 1046.5 * t) + 0.25 * np.sin(2 * np.pi * 2093 * t) * np.exp(-t / 0.15)) * att(t, 0.003) * np.exp(-t / 0.5)
    if kind == 'slide_down':
        n = 0.8; t = t_(n); f = 1200 * (260 / 1200) ** (t / n) * (1 + 0.02 * np.sin(2 * np.pi * 7 * t))
        return sweep(f) * att(t, 0.02) * np.minimum((n - t) / 0.06, 1)
    if kind == 'wind':
        n = 2.6; t = t_(n)
        return ff(noise(n), 'bandpass=f=420:width_type=o:w=1,lowpass=f=1200') * np.sin(np.pi * t / n) ** 2 * (1 + 0.3 * np.sin(2 * np.pi * 0.8 * t))
    if kind == 'sad_trombone':  # 4 notes down, rounded tone (few harmonics, slow attack), no buzz
        out = []
        for m, d in ((58, .24), (57, .24), (56, .24), (55, .7)):
            t = t_(d); f = NOTE(m) * (1 + (0.01 * np.sin(2 * np.pi * 5.5 * t) if d > .4 else 0))
            ph = 2 * np.pi * np.cumsum(f) / SR
            out.append(sum(np.sin(ph * h) / h ** 2 for h in range(1, 5)) * att(t, 0.04) * np.minimum((d - t) / 0.08, 1))
        return ff(np.concatenate(out), 'lowpass=f=1500:p=2')
    if kind == 'sting':    # soft "ta-da": G chord pick-up, C chord + gentle timpani. no noise
        a = sum(soft_note(NOTE(m), 0.16, 0.08) for m in (55, 59, 62))
        n = 1.4; t = t_(n)
        b = sum(soft_note(NOTE(m), n, 0.55) for m in (48, 60, 64, 67)) + sweep(65 * np.exp(-t * 2) + 60) * att(t, 0.004) * np.exp(-t / 0.4) * 1.2
        return np.concatenate([a, b])
    if kind == 'tick':
        n = 0.04; t = t_(n)
        return np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.008)
    raise ValueError(kind)


_cache = {}


def sfx(kind):
    """every sound normalized to peak 1, so the db in sfx.json is its real peak level (dBFS)"""
    if kind not in _cache:
        x = _sfx(kind)
        _cache[kind] = x / (np.abs(x).max() + 1e-9)
    return _cache[kind]


def word_time(tl, line, word, n):
    L = next(l for l in tl['lines'] if l['id'] == line)
    if not word:
        return L['start']
    k = 0
    for w in L['words']:
        if ''.join(ch for ch in w['w'].lower() if ch.isalnum()).startswith(word):
            if k == n:
                return w['start']
            k += 1
    raise ValueError(f'{line}: no word {word} #{n}')


def read_wav(path):
    p = subprocess.run([FF, '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(p.stdout, np.float32).astype(np.float64)


def main():
    tl_path, voice_path, spec_path, out = sys.argv[1:5]
    tl, spec = json.load(open(tl_path)), json.load(open(spec_path))
    voice = read_wav(voice_path)
    vaf = spec.get('voice_af')  # e.g. de-esser + soft high cut for harsh TTS sibilants
    if vaf:
        p = subprocess.run([FF, '-v', 'error', '-f', 'f64le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', vaf, '-f', 'f64le', '-'],
                           input=voice.tobytes(), capture_output=True, check=True)
        voice = np.frombuffer(p.stdout, np.float64)[:len(voice)].copy()
    dur = tl['duration']
    n = int(dur * SR)
    mix = np.zeros(n + SR * 3)  # bus: music + sfx (filtered below), voice added after
    # music ducks under the voice a bit (envelope of voice, smoothed)
    m = music(dur, spec.get('bpm', 116))[:len(mix)]
    m = np.pad(m, (0, len(mix) - len(m)))
    a = np.abs(np.pad(voice, (0, len(mix) - len(voice))))
    w = int(0.15 * SR)
    venv = np.convolve(a, np.ones(w) / w, 'same')
    duck = 1 - 0.45 * np.clip(venv / (venv.max() * 0.25 + 1e-9), 0, 1)
    stop = tl['lines'][-1]['end'] + spec.get('music_stop_after', 0.35)
    fade_out = np.clip((stop - np.arange(len(mix)) / SR) / 0.25, 0, 1)  # music stops on the final sting
    mix += m * db(spec.get('music_db', -21)) * duck * fade_out
    times = []
    for ev in spec['events']:
        lines = [l['id'] for l in tl['lines']] if ev['line'] == '*' else [ev['line']]
        for ln in lines:
            if ev['line'] == '*' and ln == tl['lines'][0]['id']:
                continue
            at = (dur + ev['offset']) if ln == 'END' else word_time(tl, ln, ev.get('word'), ev.get('n', 0)) + ev.get('offset', 0)
            s = sfx(ev['type']) * db(ev.get('db', -10))
            i = max(0, int(at * SR))
            j = min(len(mix), i + len(s))
            mix[i:j] += s[:j - i]
            times.append((round(at, 2), ev['type']))
    lp = spec.get('bus_lowpass')
    if lp:  # cut harsh highs on music+sfx: 2x 2-pole lowpass (24 dB/oct) + soft de-ess shelf
        af = f'lowpass=f={lp}:p=2,lowpass=f={lp}:p=2,highshelf=f={lp // 2}:g=-4'
        p = subprocess.run([FF, '-v', 'error', '-f', 'f64le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', af, '-f', 'f64le', '-'],
                           input=mix.astype(np.float64).tobytes(), capture_output=True, check=True)
        mix = np.frombuffer(p.stdout, np.float64)[:len(mix)].copy()
    voice = voice / (np.abs(voice).max() + 1e-9) * db(-3.0)
    mix[:len(voice)] += voice
    peak = np.abs(mix).max()
    if peak > db(-0.5):
        print('warning: peak', round(20 * np.log10(peak), 1), 'dBFS -> scaled down')
        mix = mix / peak * db(-0.5)
    end = int((dur + spec.get('extra_tail', 0.0)) * SR)
    mix = mix[:end]
    pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    import wave
    with wave.open(out, 'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm.tobytes())
    print('mix', round(len(mix) / SR, 2), 's; events', sorted(times))


if __name__ == '__main__':
    main()
