from __future__ import annotations

import base64
import os
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from src.config import settings
from src.logger import logger
from src.middleware.error_handler import (
    generic_error_handler,
    ytdlp_error_handler,
    ytdlp_timeout_handler,
)
from src.routes.artists import router as artists_router
from src.routes.playlist import router as playlist_router
from src.routes.search import router as search_router
from src.routes.stream import router as stream_router
from src.routes.tracks import router as tracks_router
from src.services.ytdlp import YtDlpError, YtDlpTimeoutError


_COOKIES_PATH = Path("/tmp/yt-cookies.txt")


def _init_cookies() -> None:
    raw = os.environ.get("YT_DLP_COOKIES", "") or os.environ.get("YT_COOKIES", "")
    if raw:
        try:
            decoded = base64.b64decode(raw).decode("utf-8")
            _COOKIES_PATH.write_text(decoded)
            settings.yt_dlp_cookies_file = str(_COOKIES_PATH)
            logger.info("Wrote cookies from env var to %s", _COOKIES_PATH)
        except Exception as e:
            logger.warning("Failed to decode cookies from env var: %s", e)


_init_cookies()

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.rate_limit_max}/{settings.rate_limit_window_ms // 1000}second"],
)

app = FastAPI(
    title="ethos-api",
    description="Music streaming API. yt-dlp for stream URL extraction, ytmusicapi for structured artist/album discovery.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

app.add_exception_handler(YtDlpTimeoutError, ytdlp_timeout_handler)
app.add_exception_handler(YtDlpError, ytdlp_error_handler)
app.add_exception_handler(Exception, generic_error_handler)

app.include_router(search_router)
app.include_router(tracks_router)
app.include_router(stream_router)
app.include_router(playlist_router)
app.include_router(artists_router)


@app.get("/api/health", tags=["Health"])
async def health():
    return {"status": "ok", "timestamp": None}


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info("%s %s", request.method, request.url.path)
    response = await call_next(request)
    return response


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.node_env != "production",
    )
