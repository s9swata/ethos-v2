from __future__ import annotations

from fastapi import APIRouter, Query

from src.logger import logger
from src.services.validate import validate_query
from src.services.ytdlp import search

router = APIRouter(tags=["Search"])


@router.get(
    "/api/search",
    summary="Search YouTube videos",
    description="Search YouTube for videos matching a query. Returns flat search results from yt-dlp.",
)
async def search_endpoint(q: str = Query(..., description="Search query"), limit: int = Query(default=10, ge=1, le=50, description="Number of results")):
    err = validate_query(q)
    if err:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=400, content={"error": err})

    logger.info("Search request: q=%s limit=%d", q, limit)
    results = await search(q, limit)
    return {"results": results, "count": len(results), "query": q}
