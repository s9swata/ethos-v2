# ethos-api

Music streaming API powered by [yt-dlp](https://github.com/yt-dlp/yt-dlp). Accepts a search query or track ID and returns a streamable audio URL (302 redirect). Works with YouTube, SoundCloud, Bandcamp, and other yt-dlp supported sources.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/search?q={query}&limit=10` | Search tracks (YouTube) |
| `GET` | `/api/tracks/{id}` | Track metadata + available formats |
| `GET` | `/api/stream/{id}` | Redirect to progressive MP4 audio URL |
| `GET` | `/api/stream/{id}/desktop` | Redirect to HLS m3u8 manifest |
| `GET` | `/api/stream/{id}?download=true` | Download cached MP3 file |

### Stream behaviour

- Standard (`/api/stream/:id`) redirects to a progressive MP4 — works in `<audio>` tags, mobile, VLC
- Desktop (`/api/stream/:id/desktop`) redirects to an HLS m3u8 — lighter on YouTube's side, ideal for web players that support HLS natively

## Quick start

```bash
npm install
npm run dev
```

Requires `yt-dlp` and `ffmpeg` on `PATH`:

```bash
pip install yt-dlp
brew install ffmpeg        # macOS
apt install ffmpeg         # Linux
```

## Environment

Copy `.env.example` to `.env`. Key vars:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `YT_DLP_MAX_CONCURRENT` | `3` | Max parallel yt-dlp processes |
| `YT_DLP_TIMEOUT_MS` | `30000` | Per-process timeout |
| `YT_DLP_CLIENTS` | `android,ios,tv,web` | YouTube client rotation order |
| `YT_DLP_COOKIES_FILE` | — | Path to cookies.txt (bypasses bot detection) |

## Deploy to Render

Push to GitHub, create a new Web Service → select repo → Render auto-detects `render.yaml` and `Dockerfile`.

The Docker image bundles `node`, `python3`, `ffmpeg`, and `yt-dlp`.

### Cookies (recommended for production)

YouTube may rate-limit the Render IP. Export cookies from a browser:

```bash
yt-dlp --cookies-from-browser chrome --cookies cookies.txt
```

Upload `cookies.txt` as a Render secret file and set `YT_DLP_COOKIES_FILE`.

## Rate limiting

Built-in: 60 requests/minute per IP. Configurable via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`.

## Concurrency

Max 3 concurrent yt-dlp processes queue excess requests. On 429, automatically rotates through configured YouTube clients.
