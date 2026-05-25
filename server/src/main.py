from __future__ import annotations

import socket
import subprocess
import time

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from src.config import settings
from src.logger import logger


def _wait_for_port(host: str, port: int, timeout: int = 30) -> bool:
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection((host, port), timeout=2):
                return True
        except OSError:
            time.sleep(1)
    return False


from src.middleware.error_handler import (
    generic_error_handler,
    ytdlp_error_handler,
    ytdlp_timeout_handler,
)
from src.routes.artists import router as artists_router
from src.routes.charts import router as charts_router
from src.routes.home import router as home_router
from src.routes.playlist import router as playlist_router
from src.routes.search import router as search_router

from src.routes.tracks import router as tracks_router
from src.services.ytdlp import YtDlpError, YtDlpTimeoutError

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[
        f"{settings.rate_limit_max}/{settings.rate_limit_window_ms // 1000}second"
    ],
)

app = FastAPI(
    title="ethos-api",
    description="Music streaming API. yt-dlp for stream URL extraction, ytmusicapi for structured artist/album discovery.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

app.add_exception_handler(YtDlpTimeoutError, ytdlp_timeout_handler)
app.add_exception_handler(YtDlpError, ytdlp_error_handler)
app.add_exception_handler(Exception, generic_error_handler)

app.include_router(home_router)
app.include_router(search_router)
app.include_router(tracks_router)
app.include_router(playlist_router)
app.include_router(artists_router)
app.include_router(charts_router)


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
