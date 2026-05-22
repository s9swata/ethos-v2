# Ethos

Music streaming desktop app + API server.

## Structure

```
├── api/              # FastAPI sidecar (PyInstaller-bundled for desktop)
├── server/src/       # Full FastAPI server (Docker/cloud deployment)
├── src/              # Svelte 5 desktop client
├── src-tauri/        # Tauri v2 Rust backend
└── package.json
```

## Desktop App

```bash
# Install deps
bun install
bun run tauri icon src-tauri/ethos-cat.png

# Build the sidecar server (Python → single binary)
bash api/build.sh

# Run in development mode
bun run tauri dev

# Build for distribution
bun run tauri build
```

Outputs: `src-tauri/target/release/bundle/` — `.app` (macOS), `.msi`/`.exe` (Windows), `.deb`/`.AppImage` (Linux).

No Docker or Python required on the user's machine — the server is bundled inside the app.

## API Server

For standalone web deployment (Docker, Render, HuggingFace Spaces):

```bash
# From the root directory
docker build -t ethos-api -f server/Dockerfile .
docker run -p 7860:7860 ethos-api
```

See `server/src/` for full FastAPI server with rate limiting, caching, yt-dlp client rotation, and all endpoints.

## Endpoints

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/api/health` | Sidecar + Server |
| `GET` | `/api/search-v2?q=&limit=` | Sidecar + Server |
| `GET` | `/api/artist/{browseId}` | Sidecar + Server |
| `GET` | `/api/album/{browseId}` | Sidecar + Server |
| `GET` | `/api/tracks/{trackId}` | Sidecar + Server |
| `GET` | `/api/artist/search?q=&limit=` | Sidecar + Server |

The sidecar (`api/`) exposes a subset of endpoints needed by the desktop client. The full server (`server/src/`) includes additional endpoints for playlist resolution, song search, streaming, and download.
