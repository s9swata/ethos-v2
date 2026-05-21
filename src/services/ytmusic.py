from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from ytmusicapi import YTMusic

_executor = ThreadPoolExecutor(max_workers=2)
_ytmusic: YTMusic | None = None


def _get_client() -> YTMusic:
    global _ytmusic
    if _ytmusic is None:
        _ytmusic = YTMusic()
    return _ytmusic


async def search_artists(query: str, limit: int = 5) -> list[dict[str, Any]]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        _executor,
        lambda: _get_client().search(query, filter="artists", limit=limit),
    )


async def get_artist(browse_id: str) -> dict[str, Any]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        _executor,
        lambda: _get_client().get_artist(browse_id),
    )


async def search_songs(query: str, limit: int = 10) -> list[dict[str, Any]]:
    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(
        _executor,
        lambda: _get_client().search(query, filter="songs", limit=limit),
    )
    return [_normalize_song(r) for r in raw]


def _normalize_song(r: dict[str, Any]) -> dict[str, Any]:
    artists = [a.get("name", "") for a in r.get("artists", []) if a.get("name")]
    album = r.get("album")
    return {
        "id": r.get("videoId"),
        "title": r.get("title", "Unknown"),
        "artist": artists[0] if artists else "Unknown",
        "artists": artists,
        "album": album.get("name") if album else None,
        "duration": r.get("duration"),
        "thumbnail": (r.get("thumbnails") or [{}])[0].get("url", ""),
        "webpageUrl": f"https://music.youtube.com/watch?v={r.get('videoId')}",
        "isExplicit": r.get("isExplicit", False),
    }


async def get_album(browse_id: str) -> dict[str, Any]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        _executor,
        lambda: _get_client().get_album(browse_id),
    )
