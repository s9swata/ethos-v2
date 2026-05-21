from __future__ import annotations

import asyncio
import random
import re
import shutil
import tempfile
from pathlib import Path
from typing import Any

from yt_dlp import YoutubeDL

try:
    from yt_dlp import ImpersonateTarget
except ImportError:
    ImpersonateTarget = None  # type: ignore[assignment]

from src.config import settings
from src.logger import logger
from src.services.cache import cache_result


class YtDlpError(Exception):
    def __init__(self, message: str, exit_code: int | None = None, stderr: str = ""):
        self.exit_code = exit_code
        self.stderr = stderr
        super().__init__(message)


class YtDlpTimeoutError(Exception):
    def __init__(self):
        super().__init__(f"yt-dlp timed out after {settings.yt_dlp_timeout_ms}ms")


def _sync_extract(url: str, params: dict[str, Any]) -> dict:
    try:
        with YoutubeDL(params) as ydl:
            return ydl.extract_info(url, download=False)
    except Exception as e:
        msg = str(e)
        if "HTTP Error 429" in msg or "Sign in to confirm" in msg or "bot" in msg:
            raise YtDlpError(f"Rate limited: {e}", stderr=msg)
        raise YtDlpError(f"yt-dlp failed: {e}", stderr=msg)


_COOKIES_COPIED = False


def _ensure_writable_cookies() -> str | None:
    global _COOKIES_COPIED
    path = settings.yt_dlp_cookies_path
    if not path:
        return None
    if _COOKIES_COPIED:
        return str(Path(settings.cache_dir) / "cookies.txt")
    src = Path(path)
    if not src.exists():
        return None
    dest = Path(settings.cache_dir) / "cookies.txt"
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        test = dest.parent / ".write_test"
        test.touch()
        test.unlink()
    except OSError:
        dest = Path(tempfile.mkdtemp()) / "cookies.txt"
    shutil.copy2(src, dest)
    _COOKIES_COPIED = True
    return str(dest)


_CLIENTS = [c.strip() for c in settings.yt_dlp_clients.split(",") if c.strip()]

_CHROME_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


async def _extract_raw(url: str, params: dict[str, Any]) -> dict:
    loop = asyncio.get_running_loop()
    try:
        return await asyncio.wait_for(
            loop.run_in_executor(None, _sync_extract, url, params),
            timeout=settings.yt_dlp_timeout_ms / 1000,
        )
    except asyncio.TimeoutError:
        raise YtDlpTimeoutError()


async def _extract(url: str, params: dict[str, Any] | None = None) -> dict:
    loop = asyncio.get_running_loop()
    merged = {**_base_params(), **(params or {})}
    try:
        return await asyncio.wait_for(
            loop.run_in_executor(None, _sync_extract, url, merged),
            timeout=settings.yt_dlp_timeout_ms / 1000,
        )
    except asyncio.TimeoutError:
        raise YtDlpTimeoutError()


def _parse_proxy_list() -> list[str]:
    """Parse YT_DLP_PROXY_LIST (comma-separated ip:port:user:pass) into HTTP proxy URLs."""
    raw = settings.yt_dlp_proxy_list.strip()
    if not raw:
        return []
    proxies: list[str] = []
    for entry in raw.split(","):
        entry = entry.strip()
        if not entry:
            continue
        parts = entry.split(":")
        if len(parts) == 4:
            ip, port, user, password = parts
            proxies.append(f"http://{user}:{password}@{ip}:{port}")
        elif len(parts) == 2:
            # plain ip:port, no auth
            proxies.append(f"http://{entry}")
        else:
            logger.warning("Skipping malformed proxy entry: %s", entry)
    return proxies


# Parsed once at import time; reloaded on first call via lazy init
_PROXY_LIST: list[str] | None = None


def _pick_proxy() -> str | None:
    """Return a random proxy URL from the list, or fall back to the single proxy setting."""
    global _PROXY_LIST
    if _PROXY_LIST is None:
        _PROXY_LIST = _parse_proxy_list()
    if _PROXY_LIST:
        return random.choice(_PROXY_LIST)
    return settings.yt_dlp_proxy or None


def _base_params() -> dict[str, Any]:
    params: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "simulate": True,
        "format": "bestaudio/best",
        "http_headers": _CHROME_HEADERS,
    }
    if ImpersonateTarget is not None:
        params["impersonate"] = ImpersonateTarget("chrome")
    cookie_path = _ensure_writable_cookies()
    if cookie_path:
        params["cookiefile"] = cookie_path
    proxy = _pick_proxy()
    if proxy:
        params["proxy"] = proxy
    return params


def _merge_extractor_args(client: str, extra_params: dict[str, Any] | None = None) -> dict[str, Any]:
    youtube = {"player_client": [client]}
    if extra_params and "extractor_args" in extra_params:
        ext = extra_params["extractor_args"].get("youtube", {})
        youtube.update(ext)
    return {"extractor_args": {"youtube": youtube}}


async def _extract_with_clients(url: str, extra_params: dict[str, Any] | None = None) -> dict:
    last_err: YtDlpError | None = None
    base = _base_params()
    has_cookies = "cookiefile" in base
    has_impersonate = "impersonate" in base

    for client in _CLIENTS:
        proxy = _pick_proxy()
        if proxy:
            base["proxy"] = proxy
            logger.debug("yt-dlp using proxy %s with client=%s", proxy.split("@")[-1], client)
        params = {**base, **_merge_extractor_args(client, extra_params)}
        if extra_params:
            for k, v in extra_params.items():
                if k != "extractor_args":
                    params[k] = v
        try:
            return await _extract_raw(url, params)
        except YtDlpError as e:
            last_err = e
            logger.warning("yt-dlp with client=%s proxy=%s failed: %s", client, proxy.split("@")[-1] if proxy else "none", e)

    # Fallback: retry android without cookies, then without impersonate
    fallbacks = []
    if has_cookies:
        fallbacks.append(("cookies", "cookiefile"))
    if has_impersonate:
        fallbacks.append(("impersonate", "impersonate"))

    for label, strip_key in fallbacks:
        params = {k: v for k, v in base.items() if k != strip_key}
        params.update(_merge_extractor_args("android", extra_params))
        if extra_params:
            for k, v in extra_params.items():
                if k != "extractor_args":
                    params[k] = v
        proxy = _pick_proxy()
        if proxy:
            params["proxy"] = proxy
        try:
            result = await _extract_raw(url, params)
            logger.info("yt-dlp succeeded after removing %s", label)
            return result
        except YtDlpError as e:
            last_err = e
            logger.warning("yt-dlp fallback (no %s) failed: %s", label, e)

    raise last_err or YtDlpError("All clients exhausted")


def _parse_track(d: dict, fallback_artist: str | None = None) -> dict:
    return {
        "id": d.get("id"),
        "title": d.get("title", "Unknown"),
        "artist": d.get("uploader") or d.get("channel") or d.get("playlist_uploader") or fallback_artist or "Unknown",
        "duration": d.get("duration", 0),
        "url": d.get("url") or d.get("webpage_url"),
        "thumbnail": d.get("thumbnail") or "",
        "webpageUrl": d.get("webpage_url") or d.get("url"),
    }


async def search(query: str, limit: int = 10) -> list[dict]:
    info = await _extract(
        f"ytsearch{limit}:{query}",
        {"extract_flat": "in_playlist", "noplaylist": True},
    )
    return [_parse_track(e) for e in info.get("entries", []) if e]


@cache_result(ttl=1800, namespace="ytdlp")
async def get_info(url_or_id: str) -> dict:
    url = f"https://www.youtube.com/watch?v={url_or_id}" if not url_or_id.startswith("http") else url_or_id
    info = await _extract_with_clients(url)
    best_url = info.get("url") or ""
    if not best_url:
        formats = info.get("formats") or []
        for f in reversed(formats):
            if f.get("url") and ("audio only" in (f.get("format") or "") or f.get("vcodec") == "none"):
                best_url = f["url"]
                break
    if not best_url and formats:
        best_url = formats[-1].get("url", "")
    return {
        "id": info.get("id"),
        "title": info.get("title", "Unknown"),
        "artist": info.get("uploader") or info.get("channel") or "Unknown",
        "duration": info.get("duration", 0),
        "url": best_url,
        "thumbnail": info.get("thumbnail") or "",
        "webpageUrl": info.get("webpage_url") or info.get("url"),
        "formats": [
            {"url": f.get("url"), "ext": f.get("ext"), "format": f.get("format"), "bitrate": f.get("tbr")}
            for f in (info.get("formats") or [])[:50]
        ],
        "directUrl": best_url,
    }


@cache_result(ttl=1800, namespace="ytdlp")
async def get_playlist(url: str) -> dict:
    info = await _extract(
        url,
        {"extract_flat": "in_playlist", "playlistend": 100},
    )
    entries = info.get("entries") or []
    playlist_title = info.get("title") or info.get("playlist_title") or info.get("chapter")
    playlist_uploader = info.get("uploader") or info.get("playlist_uploader")
    tracks = [
        _parse_track(e, playlist_uploader)
        for e in entries
        if e and e.get("title") and "/watch?v=" in (e.get("url") or e.get("webpage_url") or "")
    ]
    return {"title": playlist_title, "tracks": tracks}


@cache_result(ttl=1800, namespace="ytdlp")
async def get_artist_uploads(url: str, limit: int = 20) -> dict:
    info = await _extract(
        url,
        {"extract_flat": "in_playlist", "playlistend": limit},
    )
    entries = info.get("entries") or []
    name = info.get("uploader") or info.get("channel") or info.get("playlist_title") or "Unknown"
    name = re.sub(r" - (Videos|Uploads|Live)$", "", name)
    playlist_uploader = info.get("uploader") or info.get("playlist_uploader")

    section_headers = [e for e in entries if e and e.get("_type") == "playlist"]
    if section_headers:
        video_tab = next((e for e in section_headers if "videos" in (e.get("webpage_url") or e.get("url") or "").lower()), section_headers[0])
        video_url = video_tab.get("webpage_url") or video_tab.get("url")
        if video_url:
            info = await _extract(
                video_url,
                {"extract_flat": "in_playlist", "playlistend": limit},
            )
            entries = info.get("entries") or []

    tracks = [
        _parse_track(e, playlist_uploader)
        for e in entries
        if e and e.get("title") and ("/watch?v=" in (e.get("url") or e.get("webpage_url") or "") or e.get("duration"))
    ]
    return {"name": name, "tracks": tracks}
