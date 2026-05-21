from __future__ import annotations

import asyncio
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

from yt_dlp import YoutubeDL

from src.config import settings
from src.logger import logger
from src.services.cache import cache_result

_pool_semaphore = asyncio.Semaphore(settings.yt_dlp_max_concurrent)
_executor = ThreadPoolExecutor(max_workers=5)


class YtDlpError(Exception):
    def __init__(self, message: str, exit_code: int | None = None, stderr: str = ""):
        self.exit_code = exit_code
        self.stderr = stderr
        super().__init__(message)


class YtDlpTimeoutError(Exception):
    def __init__(self):
        super().__init__(f"yt-dlp timed out after {settings.yt_dlp_timeout_ms}ms")


def _base_params() -> dict[str, Any]:
    return {
        "quiet": True,
        "no_warnings": True,
        "simulate": True,
    }


def _client_params(client: str, use_desktop: bool = False) -> dict[str, Any]:
    args: dict[str, list[str]] = {"player_client": [client]}
    if use_desktop:
        args["player_skip"] = ["webpage", "configs"]
    return {"extractor_args": {"youtube": args}}


def _sync_extract(url: str, params: dict[str, Any]) -> dict:
    try:
        with YoutubeDL(params) as ydl:
            return ydl.extract_info(url, download=False)
    except Exception as e:
        msg = str(e)
        if "HTTP Error 429" in msg or "Sign in to confirm" in msg or "bot" in msg:
            raise YtDlpError(f"Rate limited: {e}", stderr=msg)
        raise YtDlpError(f"yt-dlp failed: {e}", stderr=msg)


async def _extract(url: str, params: dict[str, Any] | None = None) -> dict:
    loop = asyncio.get_running_loop()
    try:
        return await asyncio.wait_for(
            loop.run_in_executor(_executor, _sync_extract, url, params or _base_params()),
            timeout=settings.yt_dlp_timeout_ms / 1000,
        )
    except asyncio.TimeoutError:
        raise YtDlpTimeoutError()


async def _extract_with_rotation(url: str, use_desktop: bool = False, extra_params: dict[str, Any] | None = None) -> dict:
    clients = settings.yt_dlp_clients_list
    for client in clients:
        params = {**_base_params(), **_client_params(client, use_desktop), **(extra_params or {})}
        try:
            async with _pool_semaphore:
                return await _extract(url, params)
        except YtDlpError as e:
            if "Rate limited" in (e.stderr or "") and client != clients[-1]:
                logger.warning("Rate-limited on %s, rotating to next client", client)
                continue
            raise
    raise YtDlpError("All YouTube clients exhausted")


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
        {**_base_params(), "extract_flat": "in_playlist", "noplaylist": True},
    )
    return [_parse_track(e) for e in info.get("entries", []) if e]


@cache_result(ttl=1800, namespace="ytdlp")
async def get_info(url_or_id: str) -> dict:
    info = await _extract_with_rotation(url_or_id)
    formats = info.get("formats") or []
    best_url = info.get("url", "")
    if not best_url:
        rf = info.get("requested_formats") or []
        for f in rf:
            if f.get("url"):
                best_url = f["url"]
                break
    if not best_url:
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
            for f in formats[:50]
        ],
        "directUrl": best_url,
    }


async def get_stream_url(url_or_id: str) -> str:
    info = await _extract_with_rotation(url_or_id)
    url = info.get("url") or ""
    if url and not url.startswith("http"):
        url = ""
    if not url:
        rf = info.get("requested_formats") or []
        for f in rf:
            if f.get("url") and ("audio only" in (f.get("format") or "") or f.get("vcodec") == "none"):
                url = f["url"]
                break
    if not url:
        formats = info.get("formats") or []
        for f in reversed(formats):
            if f.get("url") and ("audio only" in (f.get("format") or "") or f.get("vcodec") == "none"):
                url = f["url"]
                break
    if not url and formats:
        url = formats[-1].get("url", "")
    if not url:
        raise YtDlpError("No playable URL found")
    return url


async def get_desktop_stream_url(url_or_id: str) -> str:
    info = await _extract_with_rotation(url_or_id, use_desktop=True)
    url = info.get("url") or ""
    if url and not url.startswith("http"):
        url = ""
    if not url:
        rf = info.get("requested_formats") or []
        for f in rf:
            if f.get("url") and ("audio only" in (f.get("format") or "") or f.get("vcodec") == "none"):
                url = f["url"]
                break
    if not url:
        formats = info.get("formats") or []
        for f in reversed(formats):
            if f.get("url") and ("audio only" in (f.get("format") or "") or f.get("vcodec") == "none"):
                url = f["url"]
                break
    if not url and formats:
        url = formats[-1].get("url", "")
    if not url:
        raise YtDlpError("No playable URL found")
    return url


@cache_result(ttl=1800, namespace="ytdlp")
async def get_playlist(url: str) -> dict:
    info = await _extract(
        url,
        {**_base_params(), "extract_flat": "in_playlist", "playlistend": 100},
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
        {**_base_params(), "extract_flat": "in_playlist", "playlistend": limit},
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
                {**_base_params(), "extract_flat": "in_playlist", "playlistend": limit},
            )
            entries = info.get("entries") or []

    tracks = [
        _parse_track(e, playlist_uploader)
        for e in entries
        if e and e.get("title") and ("/watch?v=" in (e.get("url") or e.get("webpage_url") or "") or e.get("duration"))
    ]
    return {"name": name, "tracks": tracks}


async def download_audio(url_or_id: str) -> str:
    cache = Path(settings.cache_dir)
    cache.mkdir(parents=True, exist_ok=True)

    info_params = {**_base_params()}
    info = await _extract(url_or_id, info_params)
    video_id = info.get("id", url_or_id)
    ext = "mp3"
    dest = cache / f"{video_id}.{ext}"

    if dest.exists():
        logger.info("Cache hit for %s", video_id)
        return str(dest)

    logger.info("Downloading audio for %s", video_id)

    async with _pool_semaphore:
        loop = asyncio.get_running_loop()

        def _dl():
            dl_params = {
                "quiet": True,
                "no_warnings": True,
                "format": "bestaudio/best",
                "outtmpl": str(cache / "%(id)s.%(ext)s"),
                "postprocessors": [{
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": ext,
                }],
            }
            with YoutubeDL(dl_params) as ydl:
                ydl.download([url_or_id])

        await loop.run_in_executor(_executor, _dl)

    return str(dest)
