FROM node:20-slim AS build

WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY src/ ./src/
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    pip \
  && pip install --break-system-packages yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./

RUN mkdir -p /data/cache && chown -R node:node /data

USER node
ENV NODE_ENV=production
ENV CACHE_DIR=/data/cache

EXPOSE 3000

CMD ["node", "dist/index.js"]
