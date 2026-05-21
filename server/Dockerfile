FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libcurl4 \
    curl \
  && pip install --no-cache-dir \
    "yt-dlp @ https://github.com/yt-dlp/yt-dlp/archive/refs/heads/master.tar.gz" \
    ytmusicapi \
    fastapi \
    "uvicorn[standard]" \
    pydantic-settings \
    slowapi \
    diskcache \
    "curl_cffi[curl]" \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY server/src/ ./src/
COPY server/cookies.txt* ./

RUN mkdir -p /data/cache

ENV NODE_ENV=production
ENV CACHE_DIR=/data/cache
ENV HF_HOME=/data/hf

RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app /data
USER appuser

EXPOSE 7860

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "7860"]
