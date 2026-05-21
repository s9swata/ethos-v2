import json
import os
import re
import shutil
import subprocess
import sys
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

HOST = os.environ.get("ETHOS_HOST", "127.0.0.1")
PORT = int(os.environ.get("ETHOS_PORT", "7860"))

_ytdlp_path: str | None = None
_ytmusic_instance = None


def get_ytmusic():
    global _ytmusic_instance
    if _ytmusic_instance is None:
        from ytmusicapi import YTMusic
        _ytmusic_instance = YTMusic()
    return _ytmusic_instance


def find_ytdlp() -> str | None:
    p = shutil.which("yt-dlp")
    if p:
        return p
    bundled = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent)) / "yt-dlp"
    if bundled.exists():
        return str(bundled)
    bundled_exe = bundled.with_suffix(".exe")
    if bundled_exe.exists():
        return str(bundled_exe)
    return None


class Handler(BaseHTTPRequestHandler):

    def _send(self, data: dict, status: int = 200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode())

    def _error(self, msg: str, status: int = 400):
        self._send({"error": msg}, status)

    def do_OPTIONS(self):
        self._send({})

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        params = dict(urllib.parse.parse_qsl(parsed.query))

        try:
            if path == "/api/health":
                return self._send({"status": "ok"})

            if path == "/api/search-v2":
                q = params.get("q", "")
                limit = int(params.get("limit", 20))
                if not q:
                    return self._error("Query is required")
                raw = get_ytmusic().search(q, limit=limit * 2)
                results = _to_unified(raw, q)
                results.sort(key=lambda r: r.get("score", 0), reverse=True)
                return self._send({"query": q, "results": results[:limit]})

            if path == "/api/artist/search":
                q = params.get("q", "")
                limit = int(params.get("limit", 5))
                if not q:
                    return self._error("Query is required")
                raw = get_ytmusic().search(q, filter="artists", limit=limit)
                return self._send({
                    "results": [_normalize_artist(r) for r in raw],
                    "count": len(raw),
                    "query": q,
                })

            m = re.match(r"^/api/artist/(.+)$", path)
            if m:
                info = get_ytmusic().get_artist(m.group(1))
                return self._send(_serialize_artist(info))

            m = re.match(r"^/api/album/(.+)$", path)
            if m:
                info = get_ytmusic().get_album(m.group(1))
                return self._send(_serialize_album(info))

            m = re.match(r"^/api/tracks/(.+)$", path)
            if m:
                return self._send(_get_track(m.group(1)))

            self._error("Not found", 404)

        except Exception as e:
            self._error(str(e), 500)

    def log_message(self, fmt, *args):
        pass


def _get_track(track_id: str) -> dict:
    url = f"https://www.youtube.com/watch?v={track_id}"
    yt = _resolve_ytdlp(url)
    best = yt.get("url") or ""
    if not best:
        fmts = yt.get("formats") or []
        for f in reversed(fmts):
            url_f = f.get("url")
            if url_f:
                fmt_str = f.get("format", "")
                vcodec = f.get("vcodec", "none")
                if "audio only" in fmt_str or vcodec == "none":
                    best = url_f
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
    global _ytdlp_path
    if _ytdlp_path is None:
        _ytdlp_path = find_ytdlp()
    if not _ytdlp_path:
        return {"error": "yt-dlp not found"}
    cmd = [_ytdlp_path, "--dump-json", "--no-download", "--no-playlist", url]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if r.returncode != 0:
            raise RuntimeError(r.stderr.strip() or f"exit code {r.returncode}")
        return json.loads(r.stdout)
    except subprocess.TimeoutExpired:
        raise RuntimeError("Upstream timed out")


def _normalize_artist(r: dict) -> dict:
    thumbs = r.get("thumbnails") or []
    return {
        "id": r.get("browseId"),
        "name": r.get("artist", "Unknown"),
        "subscribers": r.get("subscriberCount"),
        "thumbnails": thumbs,
        "thumbnail": thumbs[-1].get("url", "") if thumbs else "",
    }


def _to_unified(raw: list, query: str = "") -> list:
    results = []
    for r in raw:
        typ = r.get("resultType", "song")
        thumbs = r.get("thumbnails") or []
        img = thumbs[-1].get("url", "") if thumbs else ""
        artists = [a.get("name", "") for a in r.get("artists", []) if a.get("name")]
        album = r.get("album")
        item = {
            "name": r.get("title", r.get("artist", "Unknown")),
            "type": typ,
            "imageUrl": img,
            "id": r.get("videoId") or r.get("browseId") or r.get("playlistId", ""),
            "artists": artists,
            "album": album.get("name") if album else None,
            "duration": r.get("duration"),
            "year": r.get("year"),
            "isExplicit": r.get("isExplicit", False),
        }
        subtitle = artists[0] if artists else ""
        item["score"] = _score(r.get("title", ""), r.get("artist", ""), subtitle, typ, query)
        results.append(item)
    return results


def _score(name: str, fallback: str, subtitle: str, typ: str, query: str = "") -> int:
    q = query.lower()
    s = 0
    if typ == "song":
        s += 15
    elif typ in ("artist", "album"):
        s += 5
    for text in [name, subtitle]:
        if text.lower().startswith(q.lower()):
            s += 70
        elif q.lower() in text.lower():
            s += 50
    return s


def _serialize_artist(info: dict) -> dict:
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


def _serialize_album(info: dict) -> dict:
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


def main():
    import sys
    try:
        server = HTTPServer((HOST, PORT), Handler)
    except Exception as e:
        with open("/tmp/ethos-server-error.log", "w") as f:
            f.write(f"Failed to start: {e}\n")
        return
    with open("/tmp/ethos-server-error.log", "w") as f:
        f.write(f"Listening on {HOST}:{PORT}\n")
    server.serve_forever()


if __name__ == "__main__":
    main()
