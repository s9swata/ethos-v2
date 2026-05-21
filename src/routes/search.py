from __future__ import annotations

from fastapi import APIRouter, Query

from src.logger import logger
from src.services.validate import validate_query
from src.services.ytmusic import search_songs

router = APIRouter(tags=["Search"])


@router.get(
    "/api/search",
    summary="Search songs (ytmusicapi)",
    description="Search for songs via YouTube Music API. Returns structured results with artists, album, and videoId for streaming.",
)
async def search_endpoint(q: str = Query(..., description="Search query"), limit: int = Query(default=10, ge=1, le=50, description="Number of results")):
    err = validate_query(q)
    if err:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=400, content={"error": err})

    logger.info("Search request: q=%s limit=%d", q, limit)
    results = await search_songs(q, limit)
    return {"results": results, "count": len(results), "query": q}
