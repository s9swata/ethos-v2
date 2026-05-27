# Ethos

Music streaming app — desktop (Tauri v2 + Svelte 5) and mobile (Expo/React Native), powered by yt-dlp and a FastAPI server.

## Structure

```
├── server/                # Python FastAPI server (Docker/cloud)
│   ├── src/routes/        # API routes
│   ├── src/services/      # yt-dlp, ytmusicapi, scoring
│   └── Dockerfile
├── src/                   # Svelte 5 desktop client (Vite + Tailwind)
├── src-tauri/             # Tauri v2 Rust backend
├── expo-app/              # React Native / Expo mobile app
│   └── app/               # Expo Router pages
├── packages/
│   └── expo-youtube-audio-stream/  # Custom Kotlin native module
└── package.json
```

## Desktop App

The desktop app runs **yt-dlp locally** via a Tauri shell plugin to extract track stream URLs — no remote server needed for playback. Falls back to the API server for search, artist, album, and playlist data.

### Prerequisites

- [Bun](https://bun.sh)
- [Rust](https://rustup.rs) (for Tauri)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (`brew install yt-dlp` or `pip install yt-dlp`)

### Running

```bash
bun install

# Terminal 1 — API server (for search/browse data)
bun --cwd server run dev

# Terminal 2 — desktop client
bun run tauri dev
```

### Building

```bash
bun run tauri build
```

Outputs in `src-tauri/target/release/bundle/` — `.app` (macOS), `.msi`/`.exe` (Windows), `.deb`/`.AppImage` (Linux).

## Mobile App

React Native / Expo app with on-device YouTube audio extraction via a custom Kotlin native module (`expo-youtube-audio-stream`). Uses NewPipeExtractor under the hood.

```bash
cd expo-app && bun install
bun expo run:android
```

## API Server

Standalone FastAPI server for search, artist/album metadata, and playlist resolution. Used as a data source by both the desktop and mobile apps.

```bash
docker build -t ethos-api -f server/Dockerfile .
docker run -p 3000:3000 ethos-api
```

Or deploy to Render / HuggingFace Spaces via `server/render.yaml`.

## Endpoints

| Method | Path | Source |
|--------|------|--------|
| `GET` | `/api/search-v2?q=&limit=` | Server |
| `GET` | `/api/artist/{browseId}` | Server |
| `GET` | `/api/artist/{browseId}/albums` | Server |
| `GET` | `/api/album/{browseId}` | Server |
| `GET` | `/api/artist/search?q=&limit=` | Server |
| `GET` | `/api/playlist/search?q=&limit=` | Server |
| `GET` | `/api/album/search?q=&limit=` | Server |
| `GET` | `/api/tracks/{id}/lyrics` | Server |
| `GET` | `/api/tracks/{id}/related` | Server |
| `GET` | `/api/charts` | Server |
| `GET` | `/api/home` | Server |
