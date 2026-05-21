from __future__ import annotations

import asyncio
from typing import Any

from ytmusicapi import YTMusic

from src.services.cache import cache_result

_ytmusic: YTMusic | None = None


def _best_thumb(thumbnails: list[dict[str, Any]] | None) -> str:
    if not thumbnails:
        return ""
    return thumbnails[-1].get("url", "")


def _get_client() -> YTMusic:
    global _ytmusic
    if _ytmusic is None:
        _ytmusic = YTMusic()
    return _ytmusic


@cache_result(ttl=300, namespace="ytmusic")
async def search_artists(query: str, limit: int = 5) -> list[dict[str, Any]]:
    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(
        None,
        lambda: _get_client().search(query, filter="artists", limit=limit),
    )
    return [_normalize_artist_search(r) for r in raw]


@cache_result(ttl=3600, namespace="ytmusic")
async def get_artist(browse_id: str) -> dict[str, Any]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None,
        lambda: _get_client().get_artist(browse_id),
    )


@cache_result(ttl=300, namespace="ytmusic")
async def search_songs(query: str, limit: int = 10) -> list[dict[str, Any]]:
    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(
        None,
        lambda: _get_client().search(query, filter="songs", limit=limit),
    )
    return [_normalize_song(r) for r in raw]


def _normalize_song(r: dict[str, Any]) -> dict[str, Any]:
    artists = [a.get("name", "") for a in r.get("artists", []) if a.get("name")]
    album = r.get("album")
    return {
        "id": r.get("videoId"),
        "name": r.get("title", "Unknown"),
        "artist": artists[0] if artists else "Unknown",
        "artists": artists,
        "album": album.get("name") if album else None,
        "duration": r.get("duration"),
        "thumbnail": _best_thumb(r.get("thumbnails")),
        "webpageUrl": f"https://music.youtube.com/watch?v={r.get('videoId')}",
        "isExplicit": r.get("isExplicit", False),
    }


@cache_result(ttl=300, namespace="ytmusic")
async def search_albums(query: str, limit: int = 10) -> list[dict[str, Any]]:
    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(
        None,
        lambda: _get_client().search(query, filter="albums", limit=limit),
    )
    return [_normalize_album_search(r) for r in raw]


def _normalize_album_search(r: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": r.get("browseId"),
        "name": r.get("title", "Unknown"),
        "type": r.get("type"),
        "year": r.get("year"),
        "artists": [a.get("name") for a in r.get("artists", []) if a.get("name")],
        "artistIds": [a.get("id") for a in r.get("artists", []) if a.get("id")],
        "isExplicit": r.get("isExplicit", False),
        "playlistId": r.get("playlistId"),
        "thumbnail": _best_thumb(r.get("thumbnails")),
    }


@cache_result(ttl=300, namespace="ytmusic")
async def search_playlists(query: str, limit: int = 10) -> list[dict[str, Any]]:
    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(
        None,
        lambda: _get_client().search(query, filter="playlists", limit=limit),
    )
    return [_normalize_playlist(r) for r in raw]


def _normalize_playlist(r: dict[str, Any]) -> dict[str, Any]:
    bid = r.get("browseId", "")
    playlist_id = bid.removeprefix("VL") if bid else ""
    return {
        "id": playlist_id,
        "name": r.get("title", "Unknown"),
        "author": r.get("author"),
        "itemCount": r.get("itemCount"),
        "thumbnail": _best_thumb(r.get("thumbnails")),
        "url": f"https://music.youtube.com/playlist?list={playlist_id}" if playlist_id else None,
        "browseId": bid,
    }


def _normalize_artist_search(r: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": r.get("browseId"),
        "name": r.get("artist", "Unknown"),
        "subscribers": r.get("subscriberCount"),
        "thumbnails": r.get("thumbnails", []),
        "thumbnail": _best_thumb(r.get("thumbnails")),
    }


def _to_unified(raw: dict[str, Any], category: str) -> dict[str, Any]:
    if category == "track":
        artists = [a.get("name", "") for a in raw.get("artists", []) if a.get("name")]
        album = raw.get("album")
        return {
            "name": raw.get("title", "Unknown"),
            "type": "track",
            "imageUrl": _best_thumb(raw.get("thumbnails")),
            "id": raw.get("videoId"),
            "artists": artists,
            "album": album.get("name") if album else None,
            "duration": raw.get("duration"),
            "year": None,
            "isExplicit": raw.get("isExplicit", False),
        }

    if category == "album":
        artists = [a.get("name") for a in raw.get("artists", []) if a.get("name")]
        return {
            "name": raw.get("title", "Unknown"),
            "type": "album",
            "imageUrl": _best_thumb(raw.get("thumbnails")),
            "id": raw.get("browseId"),
            "artists": artists,
            "album": None,
            "duration": None,
            "year": raw.get("year"),
            "isExplicit": raw.get("isExplicit", False),
        }

    if category == "artist":
        return {
            "name": raw.get("artist", "Unknown"),
            "type": "artist",
            "imageUrl": _best_thumb(raw.get("thumbnails")),
            "id": raw.get("browseId"),
            "artists": [],
            "album": None,
            "duration": None,
            "year": None,
            "isExplicit": False,
        }

    bid = raw.get("browseId", "")
    playlist_id = bid.removeprefix("VL") if bid else ""
    return {
        "name": raw.get("title", "Unknown"),
        "type": "playlist",
        "imageUrl": _best_thumb(raw.get("thumbnails")),
        "id": playlist_id,
        "artists": [],
        "album": None,
        "duration": None,
        "year": None,
        "isExplicit": False,
    }


@cache_result(ttl=300, namespace="ytmusic")
async def unified_search(query: str, limit: int = 10) -> list[dict[str, Any]]:
    from src.services.scoring import score_result

    internal_limit = limit * 2
    loop = asyncio.get_running_loop()

    def _search(f: str, lim: int) -> list[dict[str, Any]]:
        return _get_client().search(query, filter=f, limit=lim)

    songs_raw, albums_raw, artists_raw, playlists_raw = await asyncio.gather(
        loop.run_in_executor(None, lambda: _search("songs", internal_limit)),
        loop.run_in_executor(None, lambda: _search("albums", internal_limit)),
        loop.run_in_executor(None, lambda: _search("artists", internal_limit)),
        loop.run_in_executor(None, lambda: _search("playlists", internal_limit)),
    )

    results: list[dict[str, Any]] = []

    for s in songs_raw:
        item = _to_unified(s, "track")
        subtitle = (item.get("artists") or [None])[0] or ""
        item["score"] = score_result(query, item["name"], subtitle, "track")
        results.append(item)

    for a in albums_raw:
        item = _to_unified(a, "album")
        subtitle = (item.get("artists") or [None])[0] or ""
        item["score"] = score_result(query, item["name"], subtitle, "album")
        results.append(item)

    for a in artists_raw:
        item = _to_unified(a, "artist")
        item["score"] = score_result(query, item["name"], "", "artist")
        results.append(item)

    for p in playlists_raw:
        item = _to_unified(p, "playlist")
        item["score"] = score_result(query, item["name"], "", "playlist")
        results.append(item)

    results.sort(key=lambda r: r.get("score", 0), reverse=True)
    return results[:limit]


@cache_result(ttl=3600, namespace="ytmusic")
async def get_album(browse_id: str) -> dict[str, Any]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None,
        lambda: _get_client().get_album(browse_id),
    )
