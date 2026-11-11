"""Kurzgesagt-like bed: airy synth pads + soft bell arpeggio + sub, gentle whooshes and blips. Voice on top.
python -I sound.py <timeline.json> <voice.wav> <out.wav>
Effects reuse the clean synths from the skill's score.py (sfx()); music is our own ambient, not the channel's track.
"""
import json, os, sys, wave
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'scripts'))  # the skill's scripts/
import score as S  # noqa: E402

SR = S.SR
NOTE = lambda m: 440 * 2 ** ((m - 69) / 12)


def t_(n):
    return np.arange(int(n * SR)) / SR


def pad(notes, n, a=1.6, r=1.8):
    """detuned soft pad: few harmonics, slow attack/release, slow shimmer"""
    t = t_(n)
    out = np.zeros_like(t)
    for m in notes:
        f = NOTE(m)
        for det in (-0.0018, 0.0, 0.0021):
            ph = 2 * np.pi * f * (1 + det) * t
            out += (np.sin(ph) + 0.28 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)) * (1 + 0.12 * np.sin(2 * np.pi * 0.3 * t + m))
    envl = np.minimum(t / a, 1) * np.clip((n - t) / r, 0, 1)
    return out * envl / (len(notes) * 3)


def bell(f, n=1.6):
    t = t_(n)
    return (np.sin(2 * np.pi * f * t) + 0.18 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.25)) * np.minimum(t / 0.004, 1) * np.exp(-t / 0.55)


def add(out, sig, at, g):
    i = int(at * SR)
    if i >= len(out) or i < 0:
        return
    j = min(len(out), i + len(sig))
    out[i:j] += sig[:j - i] * g


def main():
    tl_path, voice_path, out_path = sys.argv[1:4]
    tl = json.load(open(tl_path)); L = {l['id']: l for l in tl['lines']}
    dur = tl['duration']; n = int(dur * SR)
    wt = lambda lid, w, k=0: S.word_time(tl, lid, w, k)
    music = np.zeros(n + SR * 4)
    # chords every 4 s: Fmaj9, Am7, Cmaj7, G6 ... (dreamy, slowly brightening)
    prog = [[53, 57, 60, 64, 67], [57, 60, 64, 67, 71], [48, 55, 59, 64, 67], [55, 59, 62, 64, 71]]
    step = 4.0
    t = 0.0; k = 0
    while t < dur + 1:
        ch = prog[k % 4]
        add(music, pad(ch, step + 2.2), t, 1.0)
        add(music, pad([ch[0] - 12], step + 2.2, 1.0, 1.5), t, 0.9)  # sub
        t += step; k += 1
    # bell arpeggio: enters with the network, densest in the data centre, gone for "one token", back for the chat
    arp_on = [(L['l4']['start'], L['l9']['start'] - .2, .25), (L['l10']['start'], L['l11']['start'] + 1.0, .5)]
    for a0, a1, every in arp_on:
        tt = a0; i = 0
        while tt < a1:
            ch = prog[int(tt // step) % 4]
            m = ch[(i * 2) % len(ch)] + 12
            add(music, bell(NOTE(m)), tt, 0.10 * (1.25 if L['l8']['start'] < tt < L['l9']['start'] else 1))
            tt += every; i += 1
    # final warm chord on "warmer"
    add(music, pad([45, 52, 57, 60, 64, 69], 4.5, .3, 2.5), wt('l11', 'warmer') - .1, 1.2)
    # duck music under voice
    voice = S.read_wav(voice_path)
    voice = S.ff(voice, 'lowpass=f=9500,highshelf=f=6000:g=-2.5')
    a = np.abs(np.pad(voice, (0, len(music) - len(voice))))
    w = int(0.2 * SR); venv = np.convolve(a, np.ones(w) / w, 'same')
    duck = 1 - 0.35 * np.clip(venv / (venv.max() * 0.25 + 1e-9), 0, 1)
    fade = np.clip((dur - np.arange(len(music)) / SR) / 2.0, 0, 1)
    mix = music / (np.abs(music).max() + 1e-9) * S.db(-16) * duck * fade
    # effects
    ev = []
    for lid in ['l2', 'l4', 'l7', 'l8', 'l9', 'l10']:
        ev.append((L[lid]['start'] - .25, 'whoosh', -27))
    ev += [(wt('l0', 'enter'), 'pop', -22), (wt('l2', 'chopped') + .05, 'pop', -24), (wt('l2', 'tokens'), 'blip', -26),
           (wt('l3', 'numbers'), 'blip', -27), (wt('l4', 'web'), 'blip', -26), (wt('l5', 'seventy'), 'blip', -25),
           (wt('l6', 'one'), 'pop', -24), (wt('l7', 'gpu'), 'blip', -25), (wt('l8', 'thousands'), 'blip', -26),
           (wt('l9', 'answer'), 'ding', -27), (wt('l10', 'every'), 'pop', -24), (wt('l10', 'single'), 'pop', -24),
           (wt('l10', 'word'), 'pop', -24), (wt('l11', 'chatbot'), 'pop', -24), (wt('l11', 'somewhere') - .2, 'whoosh', -28)]
    # typing ticks
    for i in range(10):
        ev.append((0.35 + i * (wt('l0', 'enter') - .6) / 10, 'tick', -34))
    for at, kind, d in ev:
        add(mix, S.sfx(kind) * S.db(d), at, 1.0)
    voice = voice / (np.abs(voice).max() + 1e-9) * S.db(-3.0)
    mix[:len(voice)] += voice
    mix = mix[:n]
    pk = np.abs(mix).max()
    if pk > S.db(-0.5):
        mix = mix / pk * S.db(-0.5)
    with wave.open(out_path, 'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
    print('ok', round(len(mix) / SR, 2), 's, events', len(ev))


if __name__ == '__main__':
    main()
