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


async def search_albums(query: str, limit: int = 10) -> list[dict[str, Any]]:
    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(
        _executor,
        lambda: _get_client().search(query, filter="albums", limit=limit),
    )
    return [_normalize_album_search(r) for r in raw]


def _normalize_album_search(r: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": r.get("browseId"),
        "title": r.get("title", "Unknown"),
        "type": r.get("type"),
        "year": r.get("year"),
        "artists": [a.get("name") for a in r.get("artists", []) if a.get("name")],
        "artistIds": [a.get("id") for a in r.get("artists", []) if a.get("id")],
        "isExplicit": r.get("isExplicit", False),
        "playlistId": r.get("playlistId"),
        "thumbnail": (r.get("thumbnails") or [{}])[0].get("url", ""),
    }


async def search_playlists(query: str, limit: int = 10) -> list[dict[str, Any]]:
    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(
        _executor,
        lambda: _get_client().search(query, filter="playlists", limit=limit),
    )
    return [_normalize_playlist(r) for r in raw]


def _normalize_playlist(r: dict[str, Any]) -> dict[str, Any]:
    bid = r.get("browseId", "")
    playlist_id = bid.removeprefix("VL") if bid else ""
    return {
        "id": playlist_id,
        "title": r.get("title", "Unknown"),
        "author": r.get("author"),
        "itemCount": r.get("itemCount"),
        "thumbnail": (r.get("thumbnails") or [{}])[0].get("url", ""),
        "url": f"https://music.youtube.com/playlist?list={playlist_id}" if playlist_id else None,
        "browseId": bid,
    }


def _normalize_artist_search(r: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": r.get("browseId"),
        "name": r.get("artist", "Unknown"),
        "subscribers": r.get("subscriberCount"),
        "thumbnails": r.get("thumbnails", []),
        "thumbnail": (r.get("thumbnails") or [{}])[0].get("url", ""),
    }


async def unified_search(query: str, limit: int = 10) -> list[dict[str, Any]]:
    from src.services.scoring import score_result

    internal_limit = limit * 2
    loop = asyncio.get_running_loop()

    def _search(f: str, lim: int) -> list[dict[str, Any]]:
        return _get_client().search(query, filter=f, limit=lim)

    songs_raw, albums_raw, artists_raw, playlists_raw = await asyncio.gather(
        loop.run_in_executor(_executor, lambda: _search("songs", internal_limit)),
        loop.run_in_executor(_executor, lambda: _search("albums", internal_limit)),
        loop.run_in_executor(_executor, lambda: _search("artists", internal_limit)),
        loop.run_in_executor(_executor, lambda: _search("playlists", internal_limit)),
    )

    results: list[dict[str, Any]] = []

    for s in songs_raw:
        item = _normalize_song(s)
        item["type"] = "song"
        item["score"] = score_result(query, item["title"], item.get("artist", ""), "song")
        results.append(item)

    for a in albums_raw:
        item = _normalize_album_search(a)
        item["type"] = "album"
        item["score"] = score_result(query, item["title"], (item.get("artists") or [None])[0] or "", "album")
        results.append(item)

    for a in artists_raw:
        item = _normalize_artist_search(a)
        item["type"] = "artist"
        item["title"] = item["name"]
        item["score"] = score_result(query, item["name"], "", "artist")
        results.append(item)

    for p in playlists_raw:
        item = _normalize_playlist(p)
        item["type"] = "playlist"
        item["score"] = score_result(query, item["title"], item.get("author") or "", "playlist")
        results.append(item)

    results.sort(key=lambda r: r.get("score", 0), reverse=True)
    return results[:limit]


async def get_album(browse_id: str) -> dict[str, Any]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        _executor,
        lambda: _get_client().get_album(browse_id),
    )
