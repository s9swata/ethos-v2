from __future__ import annotations

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from src.logger import logger
from src.services.ytdlp import get_playlist, get_artist_uploads

router = APIRouter(tags=["Playlist"])


@router.get(
    "/api/playlist",
    summary="Get YouTube playlist tracks",
    description="Extract track list from a YouTube or YouTube Music playlist URL.",
)
async def playlist(url: str = Query(..., description="Full YouTube/YT Music playlist URL"), limit: int = Query(default=100, ge=1, le=200, description="Max tracks to return")):
    if not url:
        return JSONResponse(status_code=400, content={"error": "Query parameter 'url' is required"})
    logger.info("Playlist request: url=%s limit=%d", url, limit)
    result = await get_playlist(url)
    return {
        "title": result["title"],
        "tracks": result["tracks"][:limit],
        "count": min(len(result["tracks"]), limit),
    }


@router.get(
    "/api/artist",
    summary="Get channel/artist uploads (yt-dlp)",
    description="Get recent uploads from a YouTube channel or artist. Legacy endpoint using yt-dlp. Prefer /api/artist/{browseId} for structured results.",
)
async def artist_uploads(url: str = Query(..., description="Channel URL (e.g. https://youtube.com/@kanyewest)"), limit: int = Query(default=20, ge=1, le=100, description="Max uploads to return")):
    if not url:
        return JSONResponse(status_code=400, content={"error": "Query parameter 'url' is required"})
    logger.info("Artist/Channel request: url=%s limit=%d", url, limit)
    result = await get_artist_uploads(url, limit)
    return {
        "name": result["name"],
        "tracks": result["tracks"],
        "count": len(result["tracks"]),
    }
