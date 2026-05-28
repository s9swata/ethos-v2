from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from src.logger import logger
from src.services.validate import validate_track_id
from src.services.ytdlp import get_info
from src.services.ytmusic import get_lyrics, get_lyrics_browse_id, get_track_related, get_watch_playlist

router = APIRouter(tags=["Tracks"])


@router.get(
    "/api/tracks/{track_id}",
    summary="Get track metadata",
    description="Get detailed metadata for a YouTube video, including available formats and a direct streamable URL.",
)
async def track_info(track_id: str):
    err = validate_track_id(track_id)
    if err:
        return JSONResponse(status_code=400, content={"error": err})

    logger.info("Track info request: id=%s", track_id)
    info = await get_info(track_id)
    return {
        "id": info["id"],
        "title": info["title"],
        "artist": info["artist"],
        "duration": info["duration"],
        "startTime": info.get("startTime", 0),
        "endTime": info.get("endTime", 0),
        "url": info.get("url", ""),
        "thumbnail": info["thumbnail"],
        "webpageUrl": info["webpageUrl"],
        "directUrl": info.get("directUrl", ""),
        "formats": [
            {"url": f.get("url"), "ext": f["ext"], "format": f["format"], "bitrate": f.get("bitrate")}
            for f in info["formats"]
        ],
    }


@router.get(
    "/api/tracks/{track_id}/lyrics",
    summary="Get lyrics for a track",
    description="Fetch lyrics for a track via ytmusicapi. Returns timed lyrics if available, plain text otherwise.",
)
async def track_lyrics(track_id: str):
    err = validate_track_id(track_id)
    if err:
        return JSONResponse(status_code=400, content={"error": err})

    logger.info("Track lyrics request: id=%s", track_id)
    browse_id = await get_lyrics_browse_id(track_id)
    if not browse_id:
        return {"lyrics": "", "source": "", "hasTimestamps": False}
    return await get_lyrics(browse_id)


@router.get(
    "/api/tracks/{track_id}/related",
    summary="Get related content for a track",
    description="Fetch related songs, playlists, and artists for a track via ytmusicapi.",
)
async def track_related(track_id: str):
    err = validate_track_id(track_id)
    if err:
        return JSONResponse(status_code=400, content={"error": err})

    logger.info("Track related request: id=%s", track_id)
    related = await get_track_related(track_id)
    return {"results": related, "count": len(related)}


@router.get(
    "/api/watch/{video_id}",
    summary="Get watch playlist",
    description="Fetch recommended tracks and continuation playlist for a given video via ytmusicapi. Used for queue refill.",
)
async def watch_playlist(video_id: str, playlist_id: str | None = None, limit: int = 25):
    err = validate_track_id(video_id)
    if err:
        return JSONResponse(status_code=400, content={"error": err})

    logger.info("Watch playlist request: videoId=%s playlistId=%s", video_id, playlist_id)
    result = await get_watch_playlist(video_id, playlist_id, limit)
    return result
