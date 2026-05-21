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


async def get_album(browse_id: str) -> dict[str, Any]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        _executor,
        lambda: _get_client().get_album(browse_id),
    )
