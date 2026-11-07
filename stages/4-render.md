# 4. Full render

## Locally

```bash
node scripts/render.cjs work/<name>/src work/<name>/video-full.mp4 --end 49 --workers 2
```

- Workers = parallel headless Chromes. Default = half the CPU cores, max 4. On a laptop start with 2.
- Frames are cached in `.frames_*` next to the output; re-running the same range after a crash resumes.
- Don't pass `--audio`: sound is muxed separately (`stages/5-sound.md`). While the render runs — make the sound.
- Run it in the background and wait for it to finish instead of polling every minute.

## On a server

`server/README.md`: deploy the video's `src/`, `remote.sh frames` for control frames, `remote.sh start <end>` + `remote.sh wait <out.mp4>`.

## Re-rendering one piece

Render only the broken range (`--start 24.5 --end 41`), then splice it into `video-full.mp4` frame-exactly (frame = seconds × fps):

```bash
ffmpeg -i video-full.mp4 -i piece.mp4 -filter_complex \
 "[0:v]trim=start_frame=0:end_frame=735,setpts=PTS-STARTPTS[a];[1:v]trim=start_frame=0:end_frame=495,setpts=PTS-STARTPTS[b];[0:v]trim=start_frame=1230,setpts=PTS-STARTPTS[c];[a][b][c]concat=n=3:v=1:a=0,format=yuv420p[v]" \
 -map "[v]" -r 30 -c:v libx264 -crf 17 -movflags +faststart video-new.mp4
```

## Numbers (8 vCPU / 8 GB cloud box)

- 6 workers is the max that starts reliably; ~0.65 s per frame → a 49 s vertical 3D video with crowds ≈ 18 min, 107 s ≈ 35 min.
- 4 workers ≈ 1.2 s per frame.

## Lessons

- An hour of CPU WebGL on a laptop overheats it — that's what the server is for.
