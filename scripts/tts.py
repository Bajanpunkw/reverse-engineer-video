"""Voice + word timings.
python tts.py script.json outdir [voice] [rate]
script.json: [{"id": "s1", "text": "...", "gap": 0.3}, ...]  or  {"lead": 0.1, "tail": 1.4, "trim": true, "lines": [...]}
-> outdir/voice.wav, outdir/timeline.json {"duration", "lines": [{id,start,end,text,words:[{w,start,end}]}]}
"""
import asyncio, json, os, subprocess, sys, wave

def _find_ffmpeg():
    import shutil
    from pathlib import Path
    root = Path(__file__).resolve().parents[1]
    for c in (os.environ.get('FFMPEG'), str(root / 'node_modules' / 'ffmpeg-static' / 'ffmpeg'), shutil.which('ffmpeg')):
        if c and os.path.exists(c):
            return c
    raise SystemExit('ffmpeg not found: run scripts/setup.sh or set FFMPEG=/path/to/ffmpeg')


FF = _find_ffmpeg()
SR = 24000


async def synth(text, voice, rate, mp3):
    import edge_tts
    c = edge_tts.Communicate(text, voice, rate=rate, boundary='WordBoundary')
    words = []
    with open(mp3, 'wb') as f:
        async for ch in c.stream():
            if ch['type'] == 'audio':
                f.write(ch['data'])
            elif ch['type'] == 'WordBoundary':
                words.append({'w': ch['text'], 'start': ch['offset'] / 1e7, 'end': (ch['offset'] + ch['duration']) / 1e7})
    return words


def to_pcm(mp3):
    return subprocess.run([FF, '-loglevel', 'error', '-i', mp3, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout


def trim(a, words, thr=400, pad=0.03):
    """Cut edge-tts leading/trailing silence; shift word timings accordingly."""
    import numpy as np
    s = np.frombuffer(a, np.int16)
    loud = np.nonzero(np.abs(s) > thr)[0]
    if not len(loud):
        return a, words
    i0 = max(0, loud[0] - int(pad * SR))
    i1 = min(len(s), loud[-1] + int(pad * SR))
    sh = i0 / SR
    return s[i0:i1].tobytes(), [{**w, 'start': max(0, w['start'] - sh), 'end': max(0, w['end'] - sh)} for w in words]


async def main():
    # script.json: either a list of lines (v1) or {"lead", "tail", "trim", "lines": [...]} (v2)
    spec, out = json.load(open(sys.argv[1])), sys.argv[2]
    if isinstance(spec, list):
        spec = {'lines': spec}
    script = spec['lines']
    voice = sys.argv[3] if len(sys.argv) > 3 else 'en-US-AndrewMultilingualNeural'
    rate = sys.argv[4] if len(sys.argv) > 4 else '+8%'
    os.makedirs(out, exist_ok=True)
    pcm, t, lines = b'', spec.get('lead', 0.35), []
    pcm += b'\0\0' * int(SR * t)
    for i, ln in enumerate(script):
        mp3 = os.path.join(out, f'line{i:02d}.mp3')
        cache = mp3 + '.json'  # reuse a line if text/voice/rate unchanged
        key = [ln['text'], voice, ln.get('rate', rate)]
        if os.path.exists(cache) and json.load(open(cache))['key'] == key:
            words = json.load(open(cache))['words']
        else:
            for attempt in range(6):  # edge-tts drops requests under load: back off
                try:
                    words = await synth(ln['text'], voice, ln.get('rate', rate), mp3)
                    break
                except Exception as e:
                    print('retry', ln['id'], e)
                    await asyncio.sleep(5 * (attempt + 1))
            else:
                raise SystemExit('tts failed: ' + ln['id'])
            json.dump({'key': key, 'words': words}, open(cache, 'w'))
            await asyncio.sleep(1.5)
        a = to_pcm(mp3)
        if spec.get('trim'):
            a, words = trim(a, words)
        dur = len(a) / 2 / SR
        lines.append({'id': ln['id'], 'text': ln['text'], 'start': round(t, 3), 'end': round(t + dur, 3),
                      'words': [{'w': w['w'], 'start': round(t + w['start'], 3), 'end': round(t + w['end'], 3)} for w in words]})
        gap = ln.get('gap', 0.25)
        pcm += a + b'\0\0' * int(SR * gap)
        t += dur + gap
    pcm += b'\0\0' * int(SR * spec.get('tail', 0.6))
    with wave.open(os.path.join(out, 'voice.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm)
    tl = {'duration': round(len(pcm) / 2 / SR, 3), 'lines': lines}
    json.dump(tl, open(os.path.join(out, 'timeline.json'), 'w'), indent=1)
    print('duration', tl['duration'])
    for l in lines:
        print(f"{l['start']:6.2f}-{l['end']:6.2f} {l['id']}: {l['text'][:70]}")


asyncio.run(main())
