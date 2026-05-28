from __future__ import annotations

import asyncio
import hashlib
import json
import time
from typing import Any

from ytmusicapi import YTMusic

from src.services.cache import cache_result

_ytmusic: YTMusic | None = None

_personalized_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}
PERSONALIZED_CACHE_TTL = 60


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
        raw_artists = raw.get("artists") or []
        artists = [a.get("name", "") for a in raw_artists if a.get("name")]
        first_artist_id = raw_artists[0].get("id") if raw_artists else None
        raw_album = raw.get("album") or {}
        return {
            "name": raw.get("title", "Unknown"),
            "type": "track",
            "imageUrl": _best_thumb(raw.get("thumbnails")),
            "id": raw.get("videoId"),
            "artists": artists,
            "artistId": first_artist_id,
            "album": raw_album.get("name") if raw_album else None,
            "albumId": raw_album.get("id") if raw_album else None,
            "duration": raw.get("duration"),
            "year": None,
            "isExplicit": raw.get("isExplicit", False),
        }

    if category == "album":
        raw_artists = raw.get("artists") or []
        artists = [a.get("name") for a in raw_artists if a.get("name")]
        first_artist_id = raw_artists[0].get("id") if raw_artists else None
        return {
            "name": raw.get("title", "Unknown"),
            "type": "album",
            "imageUrl": _best_thumb(raw.get("thumbnails")),
            "id": raw.get("browseId"),
            "artists": artists,
            "artistId": first_artist_id,
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


@cache_result(ttl=3600, namespace="ytmusic")
async def get_playlist_v2(playlist_id: str, limit: int = 100) -> dict[str, Any]:
    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(
        None,
        lambda: _get_client().get_playlist(playlist_id, limit=limit),
    )

    def _parse_duration(d: str | None) -> int:
        if not d or not isinstance(d, str):
            return 0
        parts = d.split(":")
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        return 0

    return {
        "title": raw.get("title", ""),
        "thumbnail": _best_thumb(raw.get("thumbnails")),
        "count": len(raw.get("tracks", [])),
        "tracks": [
            {
                "id": t.get("videoId", ""),
                "title": t.get("title", ""),
                "artist": ", ".join(a.get("name", "") for a in (t.get("artists") or [])),
                "duration": _parse_duration(t.get("duration")),
                "thumbnail": _best_thumb(t.get("thumbnails")),
                "url": None,
                "webpageUrl": "",
            }
            for t in (raw.get("tracks") or [])
        ],
    }


def _normalize_home_item(item: dict[str, Any]) -> dict[str, Any]:
    title = item.get("title", "Unknown")
    subtitle = item.get("subtitle") or ""
    thumbnails = item.get("thumbnails") or []
    if not thumbnails:
        thumbnail_field = item.get("thumbnail")
        if isinstance(thumbnail_field, str):
            thumbnails = [{"url": thumbnail_field}]
        elif isinstance(thumbnail_field, dict):
            thumbnails = thumbnail_field.get("thumbnails", [])
        elif isinstance(thumbnail_field, list):
            thumbnails = thumbnail_field
    browse_id = item.get("browseId") or ""
    playlist_id = item.get("playlistId") or ""
    video_id = item.get("videoId") or ""

    page_type = item.get("pageType", "")
    if not page_type and browse_id:
        if browse_id.startswith("UC"):
            page_type = "MUSIC_PAGE_TYPE_ARTIST"
        elif browse_id.startswith("MPRE"):
            page_type = "MUSIC_PAGE_TYPE_ALBUM"
        elif browse_id.startswith("VL") or browse_id.startswith("RD"):
            page_type = "MUSIC_PAGE_TYPE_PLAYLIST"

    if "ARTIST" in page_type:
        item_type = "artist"
        item_id = browse_id
    elif "ALBUM" in page_type or (playlist_id and browse_id and not video_id):
        item_type = "album"
        item_id = browse_id
    elif video_id and not playlist_id:
        item_type = "track"
        item_id = video_id
    else:
        item_type = "playlist"
        item_id = browse_id or playlist_id

    return {
        "id": item_id,
        "title": title,
        "subtitle": subtitle,
        "imageUrl": _best_thumb(thumbnails),
        "type": item_type,
        "browseId": browse_id if item_type in ("album", "artist", "playlist") else None,
    }


@cache_result(ttl=3600, namespace="ytmusic")
async def get_home(limit: int = 20) -> list[dict[str, Any]]:
    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(
        None,
        lambda: _get_client().get_home(limit=limit),
    )
    sections: list[dict[str, Any]] = []
    for section in raw:
        title = section.get("title", "")
        contents = section.get("contents", [])
        if not title or not contents:
            continue
        sections.append({
            "title": title,
            "items": [_normalize_home_item(c) for c in contents],
        })
    return sections


async def get_generic_sections() -> list[dict[str, Any]]:
    loop = asyncio.get_running_loop()

    def _fetch_home():
        return _get_client().get_home(limit=20)

    def _fetch_explore():
        return _get_client().get_explore()

    raw_home, raw_explore = await asyncio.gather(
        loop.run_in_executor(None, _fetch_home),
        loop.run_in_executor(None, _fetch_explore),
    )

    sections: list[dict[str, Any]] = []

    for section in raw_home:
        title = section.get("title", "")
        contents = section.get("contents", [])
        if not title or not contents:
            continue
        sections.append({
            "title": title,
            "items": [_normalize_home_item(c) for c in contents],
        })

    new_releases = raw_explore.get("new_releases")
    if new_releases:
        sections.append({
            "title": "New Releases",
            "items": [_normalize_home_item(a) for a in new_releases],
        })

    moods = raw_explore.get("moods_and_genres")
    if moods:
        sections.append({
            "title": "Moods & Genres",
            "items": [
                {"id": m.get("params", ""), "title": m.get("title", ""), "subtitle": "", "imageUrl": "", "type": "mood", "browseId": None}
                for m in moods
            ],
        })

    trending = raw_explore.get("trending", {})
    trending_items = trending.get("items") if isinstance(trending, dict) else None
    if trending_items:
        sections.append({
            "title": "Trending",
            "items": [_normalize_home_item(t) for t in trending_items],
        })

    top_songs = raw_explore.get("top_songs", {})
    top_items = top_songs.get("items") if isinstance(top_songs, dict) else None
    if top_items:
        sections.append({
            "title": "Top Songs",
            "items": [_normalize_home_item(s) for s in top_items],
        })

    return sections


def _profile_key(profile: dict[str, Any]) -> str:
    raw = json.dumps(profile, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode()).hexdigest()


async def get_home_feed(profile: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    if not profile:
        return await get_generic_sections()

    key = _profile_key(profile)
    now = time.monotonic()
    cached = _personalized_cache.get(key)
    if cached and (now - cached[0]) < PERSONALIZED_CACHE_TTL:
        return cached[1]

    sections = await get_generic_sections()

    liked_ids = (profile.get("likedArtists") or [])[:3]
    if liked_ids:
        loop = asyncio.get_running_loop()
        artist_results = await asyncio.gather(
            *[
                loop.run_in_executor(
                    None,
                    lambda bid=b: _get_client().get_artist(bid),
                )
                for b in liked_ids
            ],
            return_exceptions=True,
        )
        for i, result in enumerate(artist_results):
            if isinstance(result, Exception):
                continue
            name = result.get("name", "Artist")
            albums = result.get("albums", {}).get("results", [])[:5]
            if albums:
                sections.insert(0, {
                    "title": f"New albums from {name}",
                    "items": [_normalize_home_item(a) for a in albums],
                })
            singles = result.get("singles", {}).get("results", [])[:5]
            if singles:
                sections.insert(0, {
                    "title": f"Latest from {name}",
                    "items": [_normalize_home_item(s) for s in singles],
                })

    recent_ids = (profile.get("recentTracks") or [])[:2]
    if recent_ids:
        loop = asyncio.get_running_loop()
        watch_results = await asyncio.gather(
            *[
                loop.run_in_executor(
                    None,
                    lambda vid=v: _get_client().get_watch_playlist(videoId=vid, limit=15),
                )
                for v in recent_ids
            ],
            return_exceptions=True,
        )
        for result in watch_results:
            if isinstance(result, Exception):
                continue
            tracks = result.get("tracks", [])
            if not tracks:
                continue
            section_title = "Recommended for you"
            sections.insert(0, {
                "title": section_title,
                "items": [_normalize_home_item(t) for t in tracks if isinstance(t, dict)],
            })

    _personalized_cache[key] = (now, sections)
    return sections


@cache_result(ttl=3600, namespace="ytmusic")
async def get_lyrics(browse_id: str) -> dict[str, Any]:
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None,
        lambda: _get_client().get_lyrics(browse_id),
    )
    if result is None:
        return {"lyrics": "", "source": "", "hasTimestamps": False}
    if result.get("hasTimestamps"):
        return {
            "lyrics": [
                {"text": line.get("text"), "startTime": line.get("start_time"), "endTime": line.get("end_time")}
                for line in result.get("lyrics", [])
            ],
            "source": result.get("source", ""),
            "hasTimestamps": True,
        }
    return {
        "lyrics": result.get("lyrics", ""),
        "source": result.get("source", ""),
        "hasTimestamps": False,
    }


async def get_lyrics_browse_id(track_id: str) -> str | None:
    loop = asyncio.get_running_loop()
    try:
        result = await loop.run_in_executor(
            None,
            lambda: _get_client().get_watch_playlist(videoId=track_id, limit=1),
        )
        return result.get("lyrics") or None
    except Exception:
        return None


@cache_result(ttl=3600, namespace="ytmusic")
async def get_charts(country: str = "ZZ") -> dict[str, Any]:
    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(
        None,
        lambda: _get_client().get_charts(country=country),
    )
    return {
        "countries": raw.get("countries", {}),
        "videos": [
            {"title": v.get("title"), "playlistId": v.get("playlistId"), "thumbnails": v.get("thumbnails", [])}
            for v in raw.get("videos", [])
        ],
        "artists": [
            {"title": a.get("title"), "browseId": a.get("browseId"), "subscribers": a.get("subscribers"), "thumbnails": a.get("thumbnails", []), "rank": a.get("rank"), "trend": a.get("trend")}
            for a in raw.get("artists", [])
        ],
        "genres": [
            {"title": g.get("title"), "playlistId": g.get("playlistId"), "thumbnails": g.get("thumbnails", [])}
            for g in raw.get("genres", [])
        ],
    }


async def get_track_related(track_id: str) -> list[dict[str, Any]]:
    loop = asyncio.get_running_loop()
    try:
        watch = await loop.run_in_executor(
            None,
            lambda: _get_client().get_watch_playlist(videoId=track_id, limit=1),
        )
    except Exception:
        return []
    related_browse_id = watch.get("related")
    if not related_browse_id:
        return []
    try:
        return await loop.run_in_executor(
            None,
            lambda: _get_client().get_song_related(related_browse_id),
        )
    except Exception:
        return []


@cache_result(ttl=3600, namespace="ytmusic")
async def get_artist_albums(channel_id: str, params: str, limit: int = 100, order: str | None = None) -> list[dict[str, Any]]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None,
        lambda: _get_client().get_artist_albums(channel_id, params, limit=limit, order=order),
    )


async def get_watch_playlist(
    video_id: str,
    playlist_id: str | None = None,
    limit: int = 25,
) -> dict:
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None,
        lambda: _get_client().get_watch_playlist(
            videoId=video_id,
            playlistId=playlist_id,
            limit=limit,
        ),
    )
    tracks = result.get("tracks", [])

    def _parse_length(length: str | None) -> int:
        if not length:
            return 0
        parts = length.split(":")
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        return 0

    parsed = [
        {
            "videoId": t.get("videoId", ""),
            "title": t.get("title", ""),
            "artist": ", ".join(
                a.get("name", "") for a in (t.get("artists") or [])
            ),
            "artistId": (t.get("artists") or [{}])[0].get("id"),
            "album": (t.get("album") or {}).get("name"),
            "albumId": (t.get("album") or {}).get("id"),
            "thumbnail": _best_thumb(t.get("thumbnail")),
            "duration": _parse_length(t.get("length")),
        }
        for t in tracks
        if t.get("videoId")
    ]
    return {
        "tracks": parsed[:limit],
        "playlistId": result.get("playlistId", ""),
    }
