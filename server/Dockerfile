# Optional render server. Build context = the repo root; your video's src/ is copied in by deploy.sh.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg chromium ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV CHROME=/usr/bin/chromium FFMPEG=/usr/bin/ffmpeg SRC=/app/src
WORKDIR /app
COPY server/package.json ./
RUN npm install --omit=dev
COPY scripts/render.cjs server/server.cjs ./
COPY src ./src
CMD ["node", "server.cjs"]
