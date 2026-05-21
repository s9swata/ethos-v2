from __future__ import annotations

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from src.logger import logger
from src.services.ytdlp import get_playlist, get_artist_uploads

router = APIRouter()


@router.get("/api/playlist")
async def playlist(url: str = Query(...), limit: int = Query(default=100, ge=1, le=200)):
    if not url:
        return JSONResponse(status_code=400, content={"error": "Query parameter 'url' is required"})
    logger.info("Playlist request: url=%s limit=%d", url, limit)
    result = await get_playlist(url)
    return {
        "title": result["title"],
        "tracks": result["tracks"][:limit],
        "count": min(len(result["tracks"]), limit),
    }


@router.get("/api/artist")
async def artist_uploads(url: str = Query(...), limit: int = Query(default=20, ge=1, le=100)):
    if not url:
        return JSONResponse(status_code=400, content={"error": "Query parameter 'url' is required"})
    logger.info("Artist/Channel request: url=%s limit=%d", url, limit)
    result = await get_artist_uploads(url, limit)
    return {
        "name": result["name"],
        "tracks": result["tracks"],
        "count": len(result["tracks"]),
    }
