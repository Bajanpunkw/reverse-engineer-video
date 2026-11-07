"""Beat grid of a music track: tempo, where the beats fall, which beat is the downbeat, where the drop is.

python beatgrid.py <track.mp3|wav> [--from 0 --to 0] [--bpm 70:200]

Prints: BPM (0.01 precision), the time of the first beat, average bass energy for each of the 4 beat positions
(the strongest one is usually the downbeat — check by ear or by the drop), the biggest loudness jump (the drop)
and per-beat loudness, so you can see intros, breaks and outros.

Used for "edit"-style videos cut to one track: measure the track, stretch it to the tempo of your scene cuts
(ffmpeg rubberband=tempo=<target/bpm>, pitch is kept; ±5% is inaudible), start it on a downbeat (usually the drop),
then run this again on the result and check that the BPM matches and the first beat is at ~0 s.
"""
import argparse, os, shutil, subprocess
from pathlib import Path
import numpy as np


def _find_ffmpeg():
    root = Path(__file__).resolve().parents[1]
    for c in (os.environ.get("FFMPEG"), str(root / "node_modules" / "ffmpeg-static" / "ffmpeg"), shutil.which("ffmpeg")):
        if c and os.path.exists(c):
            return c
    raise SystemExit("ffmpeg not found: run scripts/setup.sh or set FFMPEG=/path/to/ffmpeg")


SR, HOP, WIN = 22050, 128, 1024


def load(path):
    raw = subprocess.run([_find_ffmpeg(), '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16) / 32768.0


def flux(S, f, lo, hi):
    b = (f >= lo) & (f < hi)
    e = np.log1p(S[:, b] * 10)
    d = np.r_[0, np.maximum(0, np.diff(e, axis=0)).sum(1)]
    return d / (d.max() + 1e-9)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('track'); ap.add_argument('--from', dest='t0', type=float, default=0)
    ap.add_argument('--to', dest='t1', type=float, default=0); ap.add_argument('--bpm', default='70:200')
    a = ap.parse_args()
    x = load(a.track); dur = len(x) / SR
    t0, t1 = a.t0, (a.t1 or dur)
    fps = SR / HOP
    fr = np.lib.stride_tricks.sliding_window_view(x, WIN)[::HOP]
    S = np.abs(np.fft.rfft(fr * np.hanning(WIN), axis=1)); f = np.fft.rfftfreq(WIN, 1 / SR)
    on, low = flux(S, f, 30, 8000), flux(S, f, 30, 150)
    t = np.arange(len(on)) / fps

    def score(bpm, ph):
        P = 60 / bpm
        k = np.arange(np.ceil((t0 - ph) / P), np.floor((t1 - ph) / P))
        idx = np.round((ph + k * P) * fps).astype(int); idx = idx[(idx >= 0) & (idx < len(on))]
        return on[idx].mean() if len(idx) else 0

    lo_b, hi_b = map(float, a.bpm.split(':'))
    # coarse: autocorrelation of the onset curve, then fine search of tempo and phase around the best candidates
    o = on - np.convolve(on, np.ones(16) / 16, 'same'); m = (t >= t0) & (t <= t1); o = o[m]
    ac = np.correlate(o, o, 'full')[len(o) - 1:]
    cands = sorted(((ac[int(round(60 / b * fps))], b) for b in np.arange(lo_b, hi_b, 0.5)
                    if int(round(60 / b * fps)) < len(ac)), reverse=True)[:3]
    best = (0, 0, 0)
    for _, c in cands:
        for bpm in np.arange(c - 0.6, c + 0.6, 0.01):
            P = 60 / bpm
            for ph in np.arange(0, P, 0.005):
                v = score(bpm, ph)
                if v > best[0]: best = (v, bpm, ph)
    v, bpm, ph = best; P = 60 / bpm
    beats = ph + np.arange(int(dur / P) + 1) * P; beats = beats[beats < dur]
    print(f'tempo {bpm:.2f} BPM (beat {P:.4f} s), first beat {ph:.3f} s, grid fit {v:.2f}')
    inside = beats[(beats >= t0) & (beats <= t1)]
    for r in range(4):
        sel = [b for i, b in enumerate(beats) if i % 4 == r and t0 <= b <= t1]
        e = np.mean([low[min(len(low) - 1, int(round(b * fps)))] for b in sel]) if sel else 0
        print(f'  beat position {r}: bass {e:.2f}, first at {sel[0] if sel else 0:.3f} s')
    rms = [20 * np.log10(np.sqrt(np.mean(x[int(b * SR):int((b + P) * SR)] ** 2)) + 1e-9) for b in beats]
    jumps = np.diff(rms); j = int(np.argmax(jumps))
    print(f'drop (biggest loudness jump): beat {j + 1} at {beats[j + 1]:.3f} s ({rms[j]:.1f} → {rms[j + 1]:.1f} dB)')
    print('loudness per beat, dB (4 per row):')
    for i in range(0, len(beats), 4):
        print(f'  {beats[i]:6.2f} s  ' + '  '.join(f'{r:6.1f}' for r in rms[i:i + 4]))


if __name__ == '__main__':
    main()
