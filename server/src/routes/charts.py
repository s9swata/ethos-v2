from __future__ import annotations

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from src.logger import logger
from src.services.ytmusic import get_charts

router = APIRouter(tags=["Charts"])


@router.get(
    "/api/charts",
    summary="Get music charts (ytmusicapi)",
    description="Get latest charts data from YouTube Music: top songs, artists, and genre playlists per country.",
)
async def charts(country: str = Query(default="ZZ", description="ISO 3166-1 Alpha-2 country code (ZZ = Global)")):
    if country and len(country) != 2:
        return JSONResponse(status_code=400, content={"error": "Country code must be 2 characters (ISO 3166-1 Alpha-2)"})
    logger.info("Charts request: country=%s", country)
    result = await get_charts(country)
    return result
