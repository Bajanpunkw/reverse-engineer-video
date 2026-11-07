"""Final loudness of the soundtrack: linear gain to −26 LUFS + limiter, then a per-second check.

python loudness.py <in.wav> <out.wav>      — normalize and check
python loudness.py --check <file.wav|mp4>  — check only

Thresholds: integrated −26 ±0.5 LUFS (X and phones play at full volume; −20 felt too loud);
no moment (momentary, 400 ms) louder than −20 LUFS; true peak ≤ −6 dBFS;
a drop to silence (< −50 LUFS momentary) inside the video is flagged — it sounds like a bad edit.
Linear gain on purpose: one-pass loudnorm pumps the dynamics and misses the target by ~1 LU.
"""
import os, re, subprocess, sys

def _find_ffmpeg():
    import shutil
    from pathlib import Path
    root = Path(__file__).resolve().parents[1]
    for c in (os.environ.get("FFMPEG"), str(root / "node_modules" / "ffmpeg-static" / "ffmpeg"), shutil.which("ffmpeg")):
        if c and os.path.exists(c):
            return c
    raise SystemExit("ffmpeg not found: run scripts/setup.sh or set FFMPEG=/path/to/ffmpeg")


FF = _find_ffmpeg()
TARGET, MAX_M, MAX_TP, SILENT = -26.0, -20.0, -6.0, -50.0


def ebur(path):
    r = subprocess.run([FF, '-hide_banner', '-nostats', '-i', path, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    summ = r.split('Summary:')[-1]
    I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summ).group(1))
    tp = float(re.search(r'Peak:\s+(-?[\d.inf]+) dBFS', summ).group(1))
    per = {}
    for t, m in re.findall(r't:\s*([\d.]+)\s+TARGET.*?M:\s*(-?[\d.]+)', r):
        s = int(float(t)); per[s] = max(per.get(s, -999), float(m))
    return I, tp, per


def check(path):
    I, tp, per = ebur(path)
    dur = max(per) if per else 0
    loud = [(s, m) for s, m in per.items() if m > MAX_M]
    holes = [s for s, m in per.items() if 1 < s < dur - 2 and m < SILENT]
    ok = abs(I - TARGET) <= 0.5 and tp <= MAX_TP and not loud and not holes
    print(f'integrated {I:.1f} LUFS (target {TARGET}) | true peak {tp:.1f} dBFS (≤ {MAX_TP}) | loudest moment '
          f'{max(per.values()):.1f} LUFS at {max(per, key=per.get)} s (≤ {MAX_M})')
    if loud: print('TOO LOUD:', ', '.join(f'{s} s {m:.1f}' for s, m in sorted(loud)))
    if holes: print('DROP TO SILENCE:', ', '.join(f'{s} s' for s in sorted(holes)))
    print('ok' if ok else 'FIX: lower the levels of individual sounds in the mix, not the overall volume')
    return ok


def main():
    if sys.argv[1] == '--check':
        sys.exit(0 if check(sys.argv[2]) else 1)
    src, out = sys.argv[1:3]
    I, _, _ = ebur(src)
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', src, '-af', f'volume={TARGET - I:.2f}dB,alimiter=limit=0.5:level=disabled',
                    '-ar', '44100', '-ac', '2', out], check=True)
    sys.exit(0 if check(out) else 1)


if __name__ == '__main__':
    main()
