from __future__ import annotations

from fastapi import Request, status
from fastapi.responses import JSONResponse

from src.logger import logger
from src.services.ytdlp import YtDlpError, YtDlpTimeoutError


async def ytdlp_timeout_handler(_request: Request, _exc: YtDlpTimeoutError) -> JSONResponse:
    logger.error("yt-dlp timeout")
    return JSONResponse(
        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        content={"error": "Upstream timed out"},
    )


async def ytdlp_error_handler(_request: Request, exc: YtDlpError) -> JSONResponse:
    logger.error("yt-dlp error: %s", str(exc))
    logger.error("yt-dlp stderr: %s", exc.stderr)
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={"error": f"Upstream service error: {exc}"},
    )


async def generic_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error"},
    )
