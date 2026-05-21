from fastapi import APIRouter, HTTPException
from ytmusicapi import YTMusic

router = APIRouter()
_yt = YTMusic()


def _best_thumb(thumbnails):
    if not thumbnails:
        return ""
    return thumbnails[-1].get("url", "")


@router.get("/search")
def search(q: str, limit: int = 10):
    if not q:
        raise HTTPException(status_code=400, detail="Query is required")
    raw = _yt.search(q, filter="songs", limit=limit)
    return [
        {
            "id": r.get("videoId"),
            "name": r.get("title", "Unknown"),
            "artist": (r.get("artists") or [{}])[0].get("name", "Unknown") if r.get("artists") else "Unknown",
            "artists": [a.get("name", "") for a in r.get("artists", []) if a.get("name")],
            "album": (r.get("album") or {}).get("name") if r.get("album") else None,
            "duration": r.get("duration"),
            "thumbnail": _best_thumb(r.get("thumbnails")),
            "webpageUrl": f"https://music.youtube.com/watch?v={r.get('videoId')}",
            "isExplicit": r.get("isExplicit", False),
        }
        for r in raw
    ]


@router.get("/search-v2")
def search_v2(q: str, limit: int = 20):
    if not q:
        raise HTTPException(status_code=400, detail="Query is required")
    internal = limit * 2
    songs = _yt.search(q, filter="songs", limit=internal)
    albums = _yt.search(q, filter="albums", limit=internal)
    artists = _yt.search(q, filter="artists", limit=internal)
    playlists = _yt.search(q, filter="playlists", limit=internal)

    results = []
    for r in songs:
        raw_artists = r.get("artists") or []
        artists_list = [a.get("name", "") for a in raw_artists if a.get("name")]
        first_artist_id = raw_artists[0].get("id") if raw_artists else None
        raw_album = r.get("album") or {}
        results.append({
            "name": r.get("title", "Unknown"),
            "type": "track",
            "imageUrl": _best_thumb(r.get("thumbnails")),
            "id": r.get("videoId"),
            "artists": artists_list,
            "artistId": first_artist_id,
            "album": raw_album.get("name") if raw_album else None,
            "albumId": raw_album.get("id") if raw_album else None,
            "duration": r.get("duration"),
            "year": None,
            "isExplicit": r.get("isExplicit", False),
            "score": _score(q, r.get("title", ""), artists_list[0] if artists_list else "", "track"),
        })
    for r in albums:
        raw_artists = r.get("artists") or []
        artists_list = [a.get("name") for a in raw_artists if a.get("name")]
        results.append({
            "name": r.get("title", "Unknown"),
            "type": "album",
            "imageUrl": _best_thumb(r.get("thumbnails")),
            "id": r.get("browseId"),
            "artists": artists_list,
            "artistId": raw_artists[0].get("id") if raw_artists else None,
            "album": None,
            "duration": None,
            "year": r.get("year"),
            "isExplicit": r.get("isExplicit", False),
            "score": _score(q, r.get("title", ""), artists_list[0] if artists_list else "", "album"),
        })
    for r in artists:
        results.append({
            "name": r.get("artist", "Unknown"),
            "type": "artist",
            "imageUrl": _best_thumb(r.get("thumbnails")),
            "id": r.get("browseId"),
            "artists": [],
            "album": None,
            "duration": None,
            "year": None,
            "isExplicit": False,
            "score": _score(q, r.get("artist", ""), "", "artist"),
        })
    for r in playlists:
        bid = r.get("browseId", "")
        playlist_id = bid.removeprefix("VL") if bid else ""
        results.append({
            "name": r.get("title", "Unknown"),
            "type": "playlist",
            "imageUrl": _best_thumb(r.get("thumbnails")),
            "id": playlist_id,
            "artists": [],
            "album": None,
            "duration": None,
            "year": None,
            "isExplicit": False,
            "score": _score(q, r.get("title", ""), "", "playlist"),
        })

    results.sort(key=lambda r: r.get("score", 0), reverse=True)
    return {"query": q, "results": results[:limit]}


@router.get("/artist/search")
def search_artists(q: str, limit: int = 5):
    if not q:
        raise HTTPException(status_code=400, detail="Query is required")
    raw = _yt.search(q, filter="artists", limit=limit)
    return {
        "results": [
            {
                "id": r.get("browseId"),
                "name": r.get("artist", "Unknown"),
                "subscribers": r.get("subscriberCount"),
                "thumbnails": r.get("thumbnails", []),
                "thumbnail": _best_thumb(r.get("thumbnails")),
            }
            for r in raw
        ],
        "count": len(raw),
        "query": q,
    }


@router.get("/playlist/search")
def search_playlists(q: str, limit: int = 10):
    if not q:
        raise HTTPException(status_code=400, detail="Query is required")
    raw = _yt.search(q, filter="playlists", limit=limit)
    return {
        "results": [
            {
                "id": (r.get("browseId") or "").removeprefix("VL"),
                "name": r.get("title", "Unknown"),
                "author": r.get("author"),
                "itemCount": r.get("itemCount"),
                "thumbnail": _best_thumb(r.get("thumbnails")),
                "url": f"https://music.youtube.com/playlist?list={(r.get('browseId') or '').removeprefix('VL')}" if r.get("browseId") else None,
                "browseId": r.get("browseId"),
            }
            for r in raw
        ],
        "count": len(raw),
        "query": q,
    }


@router.get("/artist/{browse_id}")
def get_artist(browse_id: str):
    info = _yt.get_artist(browse_id)
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


@router.get("/album/{browse_id}")
def get_album(browse_id: str):
    info = _yt.get_album(browse_id)
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


@router.get("/tracks/{track_id}")
def get_track_info(track_id: str):
    url = f"https://www.youtube.com/watch?v={track_id}"
    yt = _resolve_ytdlp(url)
    best = yt.get("url") or ""
    if not best:
        fmts = yt.get("formats") or []
        for f in reversed(fmts):
            fu = f.get("url")
            if fu:
                fs = f.get("format", "")
                vc = f.get("vcodec", "none")
                if "audio only" in fs or vc == "none":
                    best = fu
                    break
        if not best and fmts:
            best = fmts[-1].get("url", "")
    return {
        "id": yt.get("id"),
        "title": yt.get("title", "Unknown"),
        "artist": yt.get("uploader") or yt.get("channel") or "Unknown",
        "duration": yt.get("duration", 0),
        "url": best,
        "thumbnail": yt.get("thumbnail") or "",
        "webpageUrl": yt.get("webpage_url") or url,
        "directUrl": best,
        "formats": [
            {"url": f.get("url"), "ext": f.get("ext"), "format": f.get("format"), "bitrate": f.get("tbr")}
            for f in (yt.get("formats") or [])[:50]
        ],
    }


def _resolve_ytdlp(url: str) -> dict:
    import yt_dlp
    ydl_opts = {"quiet": True, "no_download": True, "noplaylist": True}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            return ydl.extract_info(url, download=False)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


def _score(query: str, name: str, subtitle: str, typ: str) -> int:
    q = query.lower()
    s = 0
    if typ == "track":
        s += 15
    elif typ in ("artist", "album"):
        s += 5
    for text in [name, subtitle]:
        if text.lower().startswith(q):
            s += 70
        elif q in text.lower():
            s += 50
    return s
