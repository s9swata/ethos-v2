# AGENTS.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 5. Persist Critical Findings

**Write non-obvious, hard-won knowledge to `AGENTS.md` so future agents don't repeat mistakes.**

When you discover something that:
- Cost significant debugging time to figure out
- Is a subtle gotcha (wrong API, wrong property name, wrong default)
- Would save a future agent hours
- Is specific to this codebase's architecture

Add it to the relevant section of this file. The rule: if it took you more than 5 minutes to debug, it belongs in here.

# ethos — Agent Guide

## Project structure

```
├── server/
│   ├── src/                # Python FastAPI (routes/, services/, middleware/)
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── render.yaml
├── src/                    # Svelte 5 desktop client (Vite + Tailwind)
├── src-tauri/              # Tauri v2 Rust backend
├── package.json
├── vite.config.ts
└── svelte.config.js
```

> **Use `bun` for everything.** Never use `npm`. Install deps with `bun install`, run scripts with `bun run`.

## Server — `/server/`

Python FastAPI server using two services for media resolution:

- **`yt_dlp` library** — in-process Python library (`from yt_dlp import YoutubeDL`) for stream URL extraction, download, and general YouTube playlist/channel extraction. Runs in `ThreadPoolExecutor` behind an `asyncio.Semaphore`.
- **`ytmusicapi`** — in-process Python library for structured YouTube Music data (song/album/artist/playlist search, artist profiles, album tracks). Runs in a separate `ThreadPoolExecutor`.

### Key decisions

- **`server/src/services/ytdlp.py`** — yt-dlp via `YoutubeDL.extract_info()`. Client rotation on 429 via `extractor_args`. Functions: `get_info`, `get_playlist`, `get_artist_uploads`. No `search` — migrated to ytmusicapi.
- **`server/src/services/ytmusic.py`** — wraps `ytmusicapi` in `ThreadPoolExecutor`. Functions: `search_songs`, `search_albums`, `search_artists`, `search_playlists`, `unified_search`, `get_artist`, `get_album`, `get_lyrics`, `get_lyrics_browse_id`, `get_charts`, `get_track_related`, `get_artist_albums`. Single shared `YTMusic` client singleton.
- **`server/src/services/scoring.py`** — relevance scoring for unified search. Text matching (exact→starts→contains→difflib) + subtitle bonus + category boost (track=+15, album/artist=+5, playlist=0).
- **`server/src/services/validate.py`** — input sanitization (query length, suspicious character blocking).
- **Client rotation** — `YT_DLP_CLIENTS` env var defines fallback order (default: android→ios→tv→web). Each client via `player_client` extractor arg.
- **Concurrency** — `asyncio.Semaphore` (max 3 concurrent yt-dlp calls). ytmusicapi `ThreadPoolExecutor` with 2 workers. `asyncio.gather` for parallel search in unified search.

### Endpoints

| Endpoint | Service | Response |
|---|---|---|
| `GET /api/search?q=&limit=` | ytmusicapi `songs` filter | Structured song results |
| `GET /api/search-v2?q=&limit=` | ytmusicapi (all 4 filters) | Unified flat results with relevance score |
| `GET /api/album/search?q=&limit=` | ytmusicapi `albums` filter | Album search results |
| `GET /api/album/:browseId` | ytmusicapi `get_album` | Album details + full track list |
| `GET /api/artist/search?q=&limit=` | ytmusicapi `artists` filter | Structured artist search |
| `GET /api/artist/:browseId` | ytmusicapi `get_artist` | Artist profile + top songs + albums + singles |
| `GET /api/playlist/search?q=&limit=` | ytmusicapi `playlists` filter | Playlist search results |
| `GET /api/playlist?url=&limit=` | yt-dlp `extract_info` | Playlist/album track list |
| `GET /api/artist?url=&limit=` | yt-dlp `extract_info` | Channel uploads (legacy) |
| `GET /api/tracks/:id` | yt-dlp `extract_info` | Track metadata + formats + stream URL |
| `GET /api/tracks/:id/lyrics` | ytmusicapi `get_lyrics` | Lyrics text with optional timestamps |
| `GET /api/tracks/:id/related` | ytmusicapi `get_track_related` | Related songs for the given track |
| `GET /api/charts?country=` | ytmusicapi `get_charts` | Top videos, artists, and genre charts |
| `GET /api/artist/:browseId/albums?params=&limit=&order=` | ytmusicapi `get_artist_albums` | Full album list for artist |

### Adding a new ytmusicapi feature

1. Add function in `server/src/services/ytmusic.py`
2. Run in `ThreadPoolExecutor` (ytmusicapi is synchronous)
3. Add route in `server/src/routes/`

### Adding a new search type

1. Add filter to `_to_unified()` in `ytmusic.py`
2. Add category key to `CATEGORY_BOOST` in `scoring.py`
3. Add `loop.run_in_executor` call in `unified_search()` `asyncio.gather`

### Error handling

- `YtDlpError` (exception from yt-dlp) → 502
- `YtDlpTimeoutError` (asyncio.TimeoutError) → 504
- Validation errors → 400
- All other exceptions → 500 (message stripped)

### Deployment

`server/Dockerfile` installs `python:3.12-slim` + ffmpeg + pip packages. Render Blueprint via `server/render.yaml`.

## Queue System (player.svelte.ts)

Two-layer queue: **userQueue** (Layer 1, user-initiated) drained first, then **contextQueue** (Layer 2, auto-populated from album/playlist/watch playlist).

- **QueueItem** is lightweight (no stream URL). Stream URLs come from yt-dlp via `api.getTrack()`, fetched JIT and cached in `ytdlp.ts`.
- `playTrack(videoId, options?)` — single entry point. Pass `options.queueType + queueId` for queue context, `options.contextItems + startIndex` to pre-fill contextQueue from album/playlist tracks.
- `playNext()` — drains userQueue → contextQueue. Fires `refillFromWatch()` when contextQueue < 3 items. Skips failed tracks recursively.
- `playPrev()` — checks `currentTime > 3` for seek-back. Pops from history, pushes current to front of contextQueue.
- `refillFromWatch()` — calls GET `/api/watch/{videoId}?playlistId=` with dedup against userQueue + contextQueue + history.
- `prefetchNext()` — prefetches yt-dlp for first 2 upcoming tracks (fire-and-forget, cached).
- `setQueue(items, startIndex, context?)` — replaces old `queue`/`autoQueue` pattern. Sets contextQueue + background refill.
- `player.visibleQueue` — derived getter: `[...userQueue, ...contextQueue]`.
- `player.hasNext` / `player.hasPrev` — derived booleans for PlayerBar button states.
- `addToQueue(item)` / `playNextInline(item)` — Layer 1 operations, no API calls.

### Server

`GET /api/watch/{videoId}?playlistId=&limit=25` in `tracks.py` → `ytmusic.get_watch_playlist()` wraps ytmusicapi's `get_watch_playlist()`. Returns `{ tracks: QueueItem[], playlistId }`.

### Tech stack

- **Frontend**: Svelte 5 + Vite + Tailwind CSS v4
- **Desktop**: Tauri v2 (Rust)
- **State**: Svelte 5 runes (`$state` in `.svelte.ts` files)
- **Audio**: HTML5 `<audio>` element

### Key files

- `src/lib/services/api.ts` — API client (fetch, configurable base URL stored in localStorage)
- `src/lib/stores/player.svelte.ts` — Player state (current track, queue, play/pause)
- `src/lib/stores/navigation.svelte.ts` — Page routing (search/artist/album)
- `src/lib/components/layout/PlayerBar.svelte` — Persistent bottom player with `<audio>`
- `src/lib/components/search/SearchResults.svelte` — Consumes `/api/search-v2`
- `src/lib/components/artist/ArtistPage.svelte` — Consumes `/api/artist/{browseId}`
- `src/lib/components/album/AlbumPage.svelte` — Consumes `/api/album/{browseId}`

### Running

```bash
# Terminal 1 — API server
bun --cwd server run dev

# Terminal 2 — desktop client
bun run tauri dev
```
