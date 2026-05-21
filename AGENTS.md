# ethos-api — Agent Guide

## Architecture

Python FastAPI server using two services for media resolution:

- **`yt_dlp` library** — in-process Python library (`from yt_dlp import YoutubeDL`) for stream URL extraction, download, and general YouTube playlist/channel extraction. Runs in `ThreadPoolExecutor` behind an `asyncio.Semaphore`.
- **`ytmusicapi`** — in-process Python library for structured YouTube Music data (song/album/artist/playlist search, artist profiles, album tracks). Runs in a separate `ThreadPoolExecutor`.

## Key decisions

- **`src/services/ytdlp.py`** — yt-dlp via `YoutubeDL.extract_info()`. Client rotation on 429 via `extractor_args`. Functions: `get_info`, `get_stream_url`, `get_desktop_stream_url`, `download_audio`, `get_playlist`, `get_artist_uploads`. No `search` — migrated to ytmusicapi.
- **`src/services/ytmusic.py`** — wraps `ytmusicapi` in `ThreadPoolExecutor`. Functions: `search_songs`, `search_albums`, `search_artists`, `search_playlists`, `unified_search`, `get_artist`, `get_album`. Single shared `YTMusic` client singleton.
- **`src/services/scoring.py`** — relevance scoring for unified search. Text matching (exact→starts→contains→difflib) + subtitle bonus + category boost (track=+15, album/artist=+5, playlist=0).
- **`src/services/validate.py`** — input sanitization (query length, suspicious character blocking).
- **Client rotation** — `YT_DLP_CLIENTS` env var defines fallback order (default: android→ios→tv→web). Each client via `player_client` extractor arg.
- **HLS desktop mode** — `player_skip=webpage,configs` returns an m3u8. Used by `/api/stream/:id/desktop`.
- **Concurrency** — `asyncio.Semaphore` (max 3 concurrent yt-dlp calls). ytmusicapi `ThreadPoolExecutor` with 2 workers. `asyncio.gather` for parallel search in unified search.

## Endpoints

| Endpoint | Service | Response |
|---|---|---|
| `GET /api/search?q=&limit=` | ytmusicapi `songs` filter | Structured song results with artists, album, videoId |
| `GET /api/search-v2?q=&limit=` | ytmusicapi (all 4 filters) | Unified flat results with relevance score (name, type, imageUrl, id, score) |
| `GET /api/album/search?q=&limit=` | ytmusicapi `albums` filter | Album search results with browseIds |
| `GET /api/album/:browseId` | ytmusicapi `get_album` | Album details + full track list with videoIds |
| `GET /api/artist/search?q=&limit=` | ytmusicapi `artists` filter | Structured artist search |
| `GET /api/artist/:browseId` | ytmusicapi `get_artist` | Artist profile + top songs + albums + singles |
| `GET /api/playlist/search?q=&limit=` | ytmusicapi `playlists` filter | Playlist search results |
| `GET /api/playlist?url=&limit=` | yt-dlp `extract_info` | Playlist/album track list |
| `GET /api/artist?url=&limit=` | yt-dlp `extract_info` | Channel uploads (legacy) |
| `GET /api/tracks/:id` | yt-dlp `extract_info` | Track metadata + available formats |
| `GET /api/stream/:id` | yt-dlp `extract_info` | 307 redirect to bestaudio URL |
| `GET /api/stream/:id/desktop` | yt-dlp (desktop client) | 307 redirect to HLS m3u8 |
| `GET /api/stream/:id?download=true` | yt-dlp `download` | Downloaded MP3 file |

## Adding a new ytmusicapi feature

1. Add function in `src/services/ytmusic.py`
2. Run in `ThreadPoolExecutor` (ytmusicapi is synchronous)
3. Add route in `src/routes/`

## Adding a new search type

1. Add filter to `_to_unified()` in `ytmusic.py`
2. Add category key to `CATEGORY_BOOST` in `scoring.py`
3. Add `loop.run_in_executor` call in `unified_search()` `asyncio.gather`

## Error handling

- `YtDlpError` (exception from yt-dlp) → 502
- `YtDlpTimeoutError` (asyncio.TimeoutError) → 504
- Validation errors → 400
- All other exceptions → 500 (message stripped)

## Deployment

Dockerfile installs `python:3.12-slim` + ffmpeg + pip packages. Render Blueprint via `render.yaml`.
