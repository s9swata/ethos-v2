# ethos-api — Agent Guide

## Architecture

Fastify server that shells out to `yt-dlp` as a subprocess to resolve streamable audio URLs. No Python bindings — all communication is via JSON stdout.

## Key decisions

- **`src/services/ytdlp.ts`** — all yt-dlp interaction lives here. `execYtDlp` is the low-level spawn wrapper. `execYtDlpWithRotation` adds client rotation on 429. New features that need yt-dlp calls should go through one of these.
- **Client rotation** — `YT_DLP_CLIENTS` env var defines the fallback order (default: android→ios→tv→web). Each client has a separate YouTube rate-limit bucket.
- **HLS desktop mode** — `player_skip=webpage,configs` skips heavy extraction and returns an m3u8. Used by `/api/stream/:id/desktop`.
- **Pool (`src/services/pool.ts`)** — simple semaphore, max 3 concurrent spawns. Not per-route — shared across all endpoints.
- **Subprocess safety** — args are passed as arrays, not shell strings. No injection risk. `AbortController` handles timeouts.

## Adding a new source platform

yt-dlp supports many sites out of the box. To add e.g. SoundCloud search:

1. Add a route in `src/routes/`
2. Call `execYtDlp` with appropriate yt-dlp flags
3. Parse JSON output — format varies per extractor

## Error handling

- `YtDlpError` (exit code ≠ 0) → mapped to 502
- `YtDlpTimeoutError` (AbortController) → mapped to 504
- Validation errors → 400
- Internal errors → 500 (message stripped in production)

## Deployment

Dockerfile uses multi-stage build. Final image is `node:20-slim` + python3 + ffmpeg + yt-dlp. Render Blueprint auto-detected via `render.yaml`.

## Switching away from yt-dlp binary

If you want pure JS (no Python):

1. Replace `ytdlp.ts` with `@distube/ytdl-core` calls
2. Remove python3/yt-dlp from Dockerfile
3. Keep ffmpeg for audio conversion if still needed
4. Remove pool.ts (ytdl-core is async JS, no spawn overhead)

Trade-off: YouTube only, loses SoundCloud/Bandcamp/etc.
