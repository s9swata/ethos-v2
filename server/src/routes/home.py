from __future__ import annotations

import base64
import json
from typing import Any

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from src.logger import logger
from src.services.ytmusic import get_home_feed

router = APIRouter(tags=["Home"])


@router.get(
    "/api/home",
    summary="Home feed (ytmusicapi)",
    description="Personalized home feed with sections from get_home(), get_explore(), and charts. Returns horizontal-scrollable sections.",
)
async def home(profile: str = Query(default="", description="Base64-encoded JSON profile with likedArtists[] and recentTracks[]")):
    logger.info("Home feed requested (profile=%s)", "yes" if profile else "no")
    profile_data: dict[str, Any] | None = None
    if profile:
        try:
            decoded = base64.urlsafe_b64decode(profile)
            profile_data = json.loads(decoded)
        except Exception as e:
            logger.warning("Failed to decode profile: %s", e)
    try:
        sections = await get_home_feed(profile=profile_data)
        return {"sections": sections, "count": len(sections)}
    except Exception as e:
        logger.error("Home feed error: %s", e, exc_info=True)
        return JSONResponse(status_code=502, content={"error": "Failed to fetch home feed"})
