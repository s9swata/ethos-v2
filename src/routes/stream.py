from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse

from src.logger import logger
from src.services.validate import validate_track_id
from src.services.ytdlp import get_desktop_stream_url, get_stream_url, download_audio

router = APIRouter()


@router.get("/api/stream/{track_id}")
async def stream(track_id: str, proxy: bool = False, download: bool = False):
    err = validate_track_id(track_id)
    if err:
        return JSONResponse(status_code=400, content={"error": err})

    logger.info("Stream request: id=%s proxy=%s download=%s", track_id, proxy, download)

    if download:
        file_path = await download_audio(track_id)
        return FileResponse(
            path=file_path,
            media_type="audio/mpeg",
            filename=f"{track_id}.mp3",
        )

    url = await get_stream_url(track_id)
    return RedirectResponse(url=url)


@router.get("/api/stream/{track_id}/desktop")
async def stream_desktop(track_id: str):
    err = validate_track_id(track_id)
    if err:
        return JSONResponse(status_code=400, content={"error": err})

    logger.info("Desktop stream request: id=%s", track_id)
    url = await get_desktop_stream_url(track_id)
    return RedirectResponse(url=url)
