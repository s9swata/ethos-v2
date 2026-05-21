# ethos-api

Music streaming API. Uses **yt-dlp** (Python library) for stream URL extraction and **ytmusicapi** for structured music discovery.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/search?q=&limit=` | Search tracks (ytmusicapi) |
| `GET` | `/api/search-v2?q=&limit=` | Unified search across tracks, albums, artists, playlists with relevance scoring |
| `GET` | `/api/album/search?q=&limit=` | Search albums by name |
| `GET` | `/api/album/{browseId}` | Album details + full track list |
| `GET` | `/api/artist/search?q=&limit=` | Search artists by name |
| `GET` | `/api/artist/{browseId}` | Artist profile (subscribers, monthly listeners, albums, singles, top songs) |
| `GET` | `/api/artist?url=&limit=` | Channel uploads (legacy, yt-dlp) |
| `GET` | `/api/playlist/search?q=&limit=` | Search playlists by name |
| `GET` | `/api/playlist?url=&limit=` | Resolve playlist URL into tracks |
| `GET` | `/api/tracks/{id}` | Track metadata + available formats |
| `GET` | `/api/stream/{id}` | 307 redirect to audio stream URL |
| `GET` | `/api/stream/{id}/desktop` | 307 redirect to HLS m3u8 |
| `GET` | `/api/stream/{id}?download=true` | Download cached MP3 |

### /api/search-v2 response shape

All results normalized to:

```json
{
  "name": "Reminder",
  "type": "track",        // "track" | "album" | "artist" | "playlist"
  "imageUrl": "https://...",
  "id": "a40tAP5MC6M",    // videoId / browseId / playlistId
  "score": 95,
  "artists": ["The Weeknd"],
  "album": "Starboy",
  "duration": "3:39",
  "year": null,
  "isExplicit": true
}
```

Client constructs URLs from `type` + `id`:
- `type=track` → `/api/stream/{id}`
- `type=album` → `/api/album/{id}`
- `type=artist` → `/api/artist/{id}`
- `type=playlist` → `/api/playlist?url=https://music.youtube.com/playlist?list={id}`

## Quick start

```bash
PYTHONPATH=. python3.12 -m uvicorn src.main:app --host 0.0.0.0 --port 3000 --reload
```

Open http://localhost:3000/docs for Swagger UI.

### Dependencies

```bash
pip install yt-dlp ytmusicapi fastapi uvicorn pydantic-settings slowapi
brew install ffmpeg        # macOS (for audio download)
```

## Environment

Copy `.env.example` to `.env`. Key vars:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `YT_DLP_MAX_CONCURRENT` | `3` | Max parallel yt-dlp extractions |
| `YT_DLP_TIMEOUT_MS` | `30000` | Per-extraction timeout |
| `YT_DLP_CLIENTS` | `android,ios,tv,web` | YouTube client rotation order |
| `RATE_LIMIT_MAX` | `60` | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate-limit window in ms |

## Rate limiting

Built-in via slowapi: 60 requests/minute per IP. Configurable.

## Concurrency

- yt-dlp: `asyncio.Semaphore` (max 3 concurrent extractions)
- ytmusicapi: `ThreadPoolExecutor` (max 2 workers) — calls auto-queued
- On 429, yt-dlp rotates through configured YouTube clients

## Deploy to Render

Push to GitHub → create Web Service → Render auto-detects `render.yaml` and `Dockerfile`.

The Docker image bundles `python3.12`, `ffmpeg`, `yt-dlp`, `ytmusicapi`, `fastapi`, `uvicorn`.
