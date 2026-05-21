from __future__ import annotations

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from src.logger import logger
from src.services.validate import validate_query
from src.services.ytmusic import search_songs, unified_search

router = APIRouter(tags=["Search"])


@router.get(
    "/api/search",
    summary="Search songs (ytmusicapi)",
    description="Search for songs via YouTube Music API. Returns structured results with artists, album, and videoId for streaming.",
)
async def search_endpoint(q: str = Query(..., description="Search query"), limit: int = Query(default=10, ge=1, le=50, description="Number of results")):
    err = validate_query(q)
    if err:
        return JSONResponse(status_code=400, content={"error": err})

    logger.info("Search request: q=%s limit=%d", q, limit)
    results = await search_songs(q, limit)
    return {"results": results, "count": len(results), "query": q}


@router.get(
    "/api/search-v2",
    summary="Unified search across songs, albums, artists, playlists",
    description="Searches all categories in parallel, scores results by relevance, and returns a flat ranked list. Songs are boosted +15, albums/artists +5, playlists unboosted.",
)
async def search_v2(q: str = Query(..., description="Search query"), limit: int = Query(default=20, ge=1, le=100, description="Total results to return")):
    err = validate_query(q)
    if err:
        return JSONResponse(status_code=400, content={"error": err})

    logger.info("Search-v2 request: q=%s limit=%d", q, limit)
    results = await unified_search(q, limit)
    return {"query": q, "results": results}
