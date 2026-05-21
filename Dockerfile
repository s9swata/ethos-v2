FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
  && pip install --no-cache-dir --upgrade \
    certifi \
    requests \
    urllib3 \
  && pip install --no-cache-dir \
    yt-dlp \
    ytmusicapi \
    fastapi \
    "uvicorn[standard]" \
    pydantic-settings \
    slowapi \
    diskcache \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY src/ ./src/

RUN mkdir -p /data/cache

ENV NODE_ENV=production
ENV CACHE_DIR=/data/cache
ENV HF_HOME=/data/hf
ENV SSL_CERT_FILE=/usr/local/lib/python3.12/site-packages/certifi/cacert.pem
ENV REQUESTS_CA_BUNDLE=/usr/local/lib/python3.12/site-packages/certifi/cacert.pem

RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app /data
USER appuser

EXPOSE 7860

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "7860"]
