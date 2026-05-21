from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from src.logger import logger
from src.services.validate import validate_track_id
from src.services.ytdlp import get_info

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
        "url": info.get("url", ""),
        "thumbnail": info["thumbnail"],
        "webpageUrl": info["webpageUrl"],
        "directUrl": info.get("directUrl", ""),
        "formats": [
            {"url": f.get("url"), "ext": f["ext"], "format": f["format"], "bitrate": f.get("bitrate")}
            for f in info["formats"]
        ],
    }
