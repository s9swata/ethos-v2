FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
  && pip install --no-cache-dir \
    yt-dlp \
    ytmusicapi \
    fastapi \
    "uvicorn[standard]" \
    pydantic-settings \
    slowapi \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY src/ ./src/

RUN mkdir -p /data/cache

ENV NODE_ENV=production
ENV CACHE_DIR=/data/cache

EXPOSE 3000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "3000"]
