<div align="center">

<h1>🎵 Ethos</h1>

<p><strong>The open-source Spotify alternative powered by YouTube Music.</strong><br/>
Stream any song, album, or playlist — free, forever, no subscription required.</p>

[![Android](https://img.shields.io/badge/Android-supported-3DDC84?logo=android&logoColor=white)](https://github.com/)
[![macOS](https://img.shields.io/badge/macOS-supported-000000?logo=apple&logoColor=white)](https://github.com/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Built with Tauri](https://img.shields.io/badge/desktop-Tauri%20v2-FFC131?logo=tauri&logoColor=black)](https://tauri.app)

</div>

---

## What is Ethos?

**Ethos is a free, open-source music streaming app** that gives you full Spotify-like functionality — search, artist pages, albums, playlists, lyrics, charts, and recommendations — without a subscription.

It uses **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** and **[ytmusicapi](https://github.com/sigma67/ytmusicapi)** under the hood to fetch and stream audio directly from YouTube Music's catalog. You get access to hundreds of millions of tracks, completely free.

| Feature | Ethos | Spotify Free |
|---|---|---|
| Unlimited skips | ✅ | ❌ |
| No ads | ✅ | ❌ |
| Offline-capable | ✅ | ❌ (Premium) |
| Open source | ✅ | ❌ |
| Cost | Free | $11.99/mo |

---

## Platforms

- **macOS** — Native desktop app (Tauri v2 + Svelte 5), runs yt-dlp locally. No server needed for playback.
- **Android** — React Native / Expo app with on-device audio extraction via a custom Kotlin native module. No root required.
- **Windows / Linux** — Desktop builds supported (`.msi`, `.exe`, `.deb`, `.AppImage`).

---

## Features

- 🔍 **Full search** — tracks, artists, albums, playlists
- 👤 **Artist pages** — discography, top tracks, related artists
- 💿 **Album & playlist browsing**
- 📝 **Lyrics** — synced lyrics for supported tracks
- 📻 **Charts** — trending music by region
- 🏠 **Home feed** — personalized recommendations
- 🔗 **Related tracks** — discover music like what you're playing
- 📱 **Android** — native audio extraction, no server dependency
- 🖥️ **Desktop** — local yt-dlp, no cloud needed for playback

---

## Architecture

Ethos is a monorepo with three independently deployable pieces:

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
│   └── expo-youtube-audio-stream/  # Custom Kotlin native module (NewPipeExtractor)
└── package.json
```

**How it works:**
- The **desktop app** runs `yt-dlp` locally via Tauri's shell plugin — track stream URLs are resolved on your machine, not a remote server.
- The **mobile app** uses a custom Kotlin native module wrapping [NewPipeExtractor](https://github.com/TeamNewPipe/NewPipeExtractor) for fully on-device YouTube audio extraction.
- The **FastAPI server** handles search, metadata, and browse data for both clients. Self-host it or use the Docker image.

---

## Quick Start

### Desktop (macOS / Windows / Linux)

**Prerequisites:** [Bun](https://bun.sh), [Rust](https://rustup.rs), [yt-dlp](https://github.com/yt-dlp/yt-dlp)

```bash
# Install yt-dlp (macOS)
brew install yt-dlp

# Clone and install
git clone https://github.com/your-org/ethos
cd ethos && bun install

# Terminal 1 — API server
bun --cwd server run dev

# Terminal 2 — desktop app
bun run tauri dev
```

**Build a distributable:**
```bash
bun run tauri build
# Output: src-tauri/target/release/bundle/
# → .app (macOS), .msi/.exe (Windows), .deb/.AppImage (Linux)
```

## API Reference

The FastAPI server exposes the following endpoints, consumed by both the desktop and mobile clients:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/search-v2?q=&limit=` | Full-text track/artist/album search |
| `GET` | `/api/artist/{browseId}` | Artist profile and top tracks |
| `GET` | `/api/artist/{browseId}/albums` | Artist discography |
| `GET` | `/api/album/{browseId}` | Album details and tracklist |
| `GET` | `/api/artist/search?q=&limit=` | Artist-only search |
| `GET` | `/api/playlist/search?q=&limit=` | Playlist search |
| `GET` | `/api/album/search?q=&limit=` | Album search |
| `GET` | `/api/tracks/{id}/lyrics` | Track lyrics |
| `GET` | `/api/tracks/{id}/related` | Related track recommendations |
| `GET` | `/api/charts` | Regional music charts |
| `GET` | `/api/home` | Home feed / recommendations |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop UI | Svelte 5 + Vite + Tailwind CSS |
| Desktop shell | Tauri v2 (Rust) |
| Mobile | React Native + Expo + Expo Router |
| Mobile audio | Custom Kotlin module (NewPipeExtractor) |
| API server | Python FastAPI |
| Audio source | yt-dlp |
| Music metadata | ytmusicapi |
| Deployment | Docker |

---

## Contributing

PRs are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Issues, feature requests, and bug reports → [GitHub Issues](https://github.com/your-org/ethos/issues)

---

## Legal

Ethos is an open-source project and does not host, store, or redistribute any audio content. It interfaces with publicly accessible streams via yt-dlp in the same way a browser would. Use responsibly and in accordance with YouTube's Terms of Service.

---

<div align="center">
<sub>Built with yt-dlp · ytmusicapi · Tauri · Svelte · React Native · FastAPI</sub>
</div>
