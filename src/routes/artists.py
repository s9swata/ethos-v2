from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from src.logger import logger
from src.services.ytmusic import search_artists, search_albums, get_artist, get_album

router = APIRouter(tags=["Artists / Albums"])


@router.get(
    "/api/artist/search",
    summary="Search artists (ytmusicapi)",
    description="Structured artist search via YouTube Music API. Returns artists with browseIds for detailed lookup.",
)
async def artist_search(q: str = Query(..., description="Artist name to search"), limit: int = Query(default=5, ge=1, le=20, description="Number of results")):
    if not q or not q.strip():
        return JSONResponse(status_code=400, content={"error": "Query is required"})
    logger.info("Artist search: q=%s limit=%d", q, limit)
    results = await search_artists(q, limit)
    return {"results": results, "count": len(results), "query": q}


@router.get(
    "/api/artist/{browse_id}",
    summary="Get artist details (ytmusicapi)",
    description="Get full artist profile: subscriber count, monthly listeners, top songs, albums, and singles.",
)
async def artist_detail(browse_id: str):
    logger.info("Artist detail: browseId=%s", browse_id)
    info = await get_artist(browse_id)
    return _serialize_artist(info)


@router.get(
    "/api/album/search",
    summary="Search albums by name (ytmusicapi)",
    description="Search YouTube Music for albums matching a query. Returns structured album results with browseIds for detail lookup.",
)
async def album_search(q: str = Query(..., description="Search query"), limit: int = Query(default=10, ge=1, le=50, description="Number of results")):
    if not q or not q.strip():
        return JSONResponse(status_code=400, content={"error": "Query is required"})
    logger.info("Album search: q=%s limit=%d", q, limit)
    results = await search_albums(q, limit)
    return {"results": results, "count": len(results), "query": q}


@router.get(
    "/api/album/{browse_id}",
    summary="Get album details (ytmusicapi)",
    description="Get full album track list with videoIds, durations, and metadata via YouTube Music API.",
)
async def album_detail(browse_id: str):
    logger.info("Album detail: browseId=%s", browse_id)
    info = await get_album(browse_id)
    return _serialize_album(info)


def _serialize_artist(info: dict[str, Any]) -> dict[str, Any]:
    songs_raw = info.get("songs", {}).get("results", [])
    albums_raw = info.get("albums", {}).get("results", [])
    singles_raw = info.get("singles", {}).get("results", [])

    return {
        "name": info.get("name"),
        "description": info.get("description"),
        "subscribers": info.get("subscribers"),
        "monthlyListeners": info.get("monthlyListeners"),
        "views": info.get("views"),
        "channelId": info.get("channelId"),
        "thumbnails": info.get("thumbnails", []),
        "topSongs": [
            {
                "videoId": s.get("videoId"),
                "title": s.get("title"),
                "artists": [a.get("name") for a in s.get("artists", [])],
                "album": s.get("album", {}).get("name") if s.get("album") else None,
                "thumbnails": s.get("thumbnails", []),
                "isExplicit": s.get("isExplicit", False),
            }
            for s in songs_raw
        ],
        "albums": [
            {
                "title": a.get("title"),
                "browseId": a.get("browseId"),
                "audioPlaylistId": a.get("audioPlaylistId"),
                "thumbnails": a.get("thumbnails", []),
                "year": a.get("year"),
                "isExplicit": a.get("isExplicit", False),
            }
            for a in albums_raw
        ],
        "singles": [
            {
                "title": s.get("title"),
                "browseId": s.get("browseId"),
                "audioPlaylistId": s.get("audioPlaylistId"),
                "thumbnails": s.get("thumbnails", []),
                "year": s.get("year"),
                "isExplicit": s.get("isExplicit", False),
            }
            for s in singles_raw
        ],
        "related": info.get("related", {}).get("results", []),
    }


def _serialize_album(info: dict[str, Any]) -> dict[str, Any]:
    return {
        "title": info.get("title"),
        "type": info.get("type"),
        "description": info.get("description"),
        "year": info.get("year"),
        "artists": [{"name": a.get("name"), "id": a.get("id")} for a in info.get("artists", [])],
        "thumbnails": info.get("thumbnails", []),
        "isExplicit": info.get("isExplicit", False),
        "trackCount": info.get("trackCount"),
        "duration": info.get("duration"),
        "durationSeconds": info.get("duration_seconds"),
        "audioPlaylistId": info.get("audioPlaylistId"),
        "tracks": [
            {
                "index": t.get("index"),
                "title": t.get("title"),
                "artists": [a.get("name") for a in t.get("artists", [])],
                "videoId": t.get("videoId"),
                "duration": t.get("duration"),
                "isExplicit": t.get("isExplicit", False),
            }
            for t in info.get("tracks", [])
        ],
    }
