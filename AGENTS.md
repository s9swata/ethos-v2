# ethos-api — Agent Guide

## Architecture

Python FastAPI server using two services for media resolution:

- **`yt-dlp`** — subprocess for stream URL extraction, download, and generic YouTube search
- **`ytmusicapi`** — in-process Python library for structured YouTube Music data (artist search, albums, singles, top songs, album tracks)

## Key decisions

- **`src/services/ytdlp.py`** — all yt-dlp interaction via `asyncio.create_subprocess_exec`. `_exec_with_rotation` adds client rotation on 429. Functions: `search`, `get_info`, `get_stream_url`, `get_desktop_stream_url`, `download_audio`, `get_playlist`, `get_artist_uploads`.
- **`src/services/ytmusic.py`** — wraps `ytmusicapi` (in-process, runs in `ThreadPoolExecutor` to avoid blocking the event loop). Functions: `search_artists`, `get_artist`, `get_album`.
- **`src/services/validate.py`** — input sanitization (query length, suspicious character blocking).
- **Client rotation** — `YT_DLP_CLIENTS` env var defines fallback order (default: android→ios→tv→web). Each client has a separate YouTube rate-limit bucket.
- **HLS desktop mode** — `player_skip=webpage,configs` returns an m3u8. Used by `/api/stream/:id/desktop`.
- **Concurrency** — `asyncio.Semaphore` (max 3 concurrent yt-dlp spawns). Shared across all endpoints.

## Endpoints

| Endpoint | Service | Response |
|---|---|---|
| `GET /api/search?q=&limit=` | yt-dlp | Flat YouTube search results |
| `GET /api/tracks/:id` | yt-dlp | Track metadata + available formats |
| `GET /api/stream/:id` | yt-dlp | 307 redirect to progressive MP4 |
| `GET /api/stream/:id/desktop` | yt-dlp | 307 redirect to HLS m3u8 |
| `GET /api/playlist?url=` | yt-dlp | Playlist track list |
| `GET /api/artist?url=` | yt-dlp | Channel uploads (legacy, yt-dlp) |
| `GET /api/artist/search?q=` | ytmusicapi | Structured artist search results |
| `GET /api/artist/:browseId` | ytmusicapi | Artist profile + top songs + albums + singles |
| `GET /api/album/:browseId` | ytmusicapi | Album details + full track list |

## Adding a new ytmusicapi feature

1. Add function in `src/services/ytmusic.py`
2. Run in `ThreadPoolExecutor` (ytmusicapi is synchronous)
3. Add route in `src/routes/`

## Error handling

- `YtDlpError` (exit code ≠ 0) → 502
- `YtDlpTimeoutError` (asyncio.TimeoutError) → 504
- Validation errors → 400
- All other exceptions → 500 (message stripped)

## Deployment

Dockerfile installs `python:3.12-slim` + ffmpeg + yt-dlp + ytmusicapi + fastapi + uvicorn. Render Blueprint via `render.yaml`.

## Switching away from yt-dlp

If you want pure Python (no subprocess):

1. Use `ytmusicapi` for discovery (already in-process)
2. Replace yt-dlp stream URLs with `yt-dlp` Python API or `pytubefix`
3. Remove subprocess pool (`asyncio.Semaphore`)
