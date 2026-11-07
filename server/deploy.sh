#!/usr/bin/env bash
# Build context = repo + your video's src/, then deploy. Example for Railway (any Docker host works):
#   RAILWAY_PROJECT=<project id> RAILWAY_SERVICE=render bash server/deploy.sh examples/x-followers/src
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd); SRC=$(cd "$1" && pwd)
CTX=$(mktemp -d); mkdir -p "$CTX/scripts" "$CTX/server"
cp "$ROOT/scripts/render.cjs" "$CTX/scripts/"; cp "$ROOT/server/server.cjs" "$ROOT/server/package.json" "$CTX/server/"
cp "$ROOT/server/Dockerfile" "$CTX/Dockerfile"; rsync -a --exclude '*.mp4' "$SRC/" "$CTX/src/"
cd "$CTX"
if [[ -n ${RAILWAY_SERVICE:-} ]]; then
  [[ -n ${RAILWAY_PROJECT:-} ]] && railway link --project "$RAILWAY_PROJECT" --service "$RAILWAY_SERVICE" >/dev/null
  railway up --service "$RAILWAY_SERVICE" --ci
else docker build -t video-render . && echo "built image video-render — run: docker run -e RENDER_KEY=… -p 8080:8080 video-render"; fi
rm -rf "$CTX"
