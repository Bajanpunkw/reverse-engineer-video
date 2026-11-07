# Optional render server

Rendering a 1-minute 3D video is ~1,500 headless-Chrome screenshots. On a laptop that means a hot, busy machine for 30–90 minutes. If that's a problem, run the same renderer on any Docker host.

**Measured on a cloud box with 8 vCPU / 8 GB, 6 workers:** ~0.65 s per frame → a 49 s vertical video with crowds of 3D people renders in ~18 min. Eight browsers at once didn't start; 6 is the practical maximum there.

## Deploy

```bash
# any Docker host
bash server/deploy.sh examples/x-followers/src        # builds image "video-render"
docker run -e RENDER_KEY=$(openssl rand -hex 16) -p 8080:8080 video-render

# Railway (railway CLI logged in; a service named "render" with a RENDER_KEY variable)
RAILWAY_PROJECT=<project id> RAILWAY_SERVICE=render bash server/deploy.sh examples/x-followers/src
```

Redeploy after every change to the scenes (the video's `src/` is baked into the image).

## Use

```bash
export RENDER_URL=https://your-render-host RENDER_KEY=…     # keep the key out of git and chat logs
bash server/remote.sh frames work/frames 2.5 10 20 35        # control frames + work/frames/sheet.jpg
bash server/remote.sh start 49                               # full render, 6 workers
bash server/remote.sh wait work/video-full.mp4               # waits, then downloads
```

Re-rendering only a broken piece: `remote.sh start 41 24.5`, then splice it into the full video with ffmpeg (frame-exact: seconds × fps).
