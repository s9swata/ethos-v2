# Queue System — Ethos Implementation Plan

> **Context:** Ethos is a Tauri v2 desktop app with a Svelte 5 frontend and a Python FastAPI server running ytmusicapi. Stream URLs come from the yt-dlp Rust crate (via Tauri invoke), not from ytmusicapi. State management uses Svelte 5 runes (`$state` in `.svelte.ts` files).

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Frontend (Tauri WebView)                           │
│  ┌─────────────────────────────────────────────┐   │
│  │  player.svelte.ts (Svelte 5 runes)          │   │
│  │  ┌─────────────────┐  ┌──────────────────┐  │   │
│  │  │  userQueue       │  │  contextQueue    │  │   │
│  │  │  (Layer 1, pri)  │  │  (Layer 2, auto) │  │   │
│  │  └─────────────────┘  └──────────────────┘  │   │
│  └─────────────────────────────────────────────┘   │
│           │                            │            │
│           ▼ HTTP                        ▼ Tauri     │
│  ┌──────────────┐          ┌─────────────────────┐ │
│  │  Python      │          │  Rust yt-dlp crate  │ │
│  │  FastAPI     │          │  fetch_track_info() │ │
│  │  ytmusicapi  │          │  (stream URL)       │ │
│  └──────────────┘          └─────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

- **Layer 1 (userQueue):** User-initiated — "Add to Queue" / "Play Next". Drained first.
- **Layer 2 (contextQueue):** Auto-populated from `get_watch_playlist()` or from album/playlist track lists. Drained when Layer 1 is empty.
- **ytmusicapi:** Runs on Python server. Used for track discovery, playlist/album data, and watch playlist continuation.
- **yt-dlp (Rust crate):** Runs in-process via Tauri invoke. Used ONLY for extracting the playable stream URL + format metadata for the next track. Called just-in-time ~30s before playback.

---

## 2. Existing Infrastructure

### 2.1 Server Endpoints

| Endpoint | Source | Returns |
|---|---|---|
| `GET /api/album/:browseId` | ytmusicapi `get_album()` | Album metadata + tracks + `audioPlaylistId` |
| `GET /api/playlist/v2?id=&limit=` | ytmusicapi `get_playlist()` | Playlist title + track list |
| `GET /api/playlist?url=&limit=` | yt-dlp `extract_info` | Playlist tracks (legacy) |

### 2.2 Current Player Store (`player.svelte.ts`)

Already has a two-layer structure but with limitations:

```
queue: TrackInfo[]       // explicit queue (from album/playlist selection)
queueIndex: number       // index into queue
autoQueue: AutoQueueItem[]  // seeded from artist top songs (poor substitute)
autoQueueIndex: number
```

Problems:
- `autoQueue` is seeded from artist top songs (not YTM's recommendation engine)
- `playNext()` calls `api.getTrack()` (yt-dlp) **synchronously at transition time** — causes playback gap
- No `get_watch_playlist()` integration
- `prevTrack` uses `queueIndex` — doesn't handle cross-layer navigation
- `history` array doesn't exist for proper back-navigation

### 2.3 Existing Track Cache (`ytdlp.ts`)

In-memory `Map<string, TrackInfo>` — caches yt-dlp results for the session. Already implemented.

---

## 3. Queue Data Model

```typescript
// Lightweight — no stream URL. Fetched from ytmusicapi endpoints.
interface QueueItem {
  videoId: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  thumbnail: string;
  duration: number;
}

// Full — includes stream URL from yt-dlp. Used only for currentTrack
// and prefetched next track. (Existing TrackInfo type — unchanged.)

interface QueueState {
  // Currently playing (full TrackInfo with stream URL)
  current: TrackInfo | null;

  // LAYER 1: User-added, played first
  userQueue: QueueItem[];

  // LAYER 2: Context tracks from get_watch_playlist() or album/playlist
  contextQueue: QueueItem[];

  // Continuation handle for get_watch_playlist()
  watchPlaylistId: string | null;

  // Playback context (where we came from)
  context: {
    type: "album" | "playlist" | "radio" | "single";
    id?: string;       // album.audioPlaylistId, playlist.id, etc.
  };

  // Playback history (for prev-track)
  history: QueueItem[];

  // Settings
  shuffle: boolean;
  repeat: "none" | "one" | "all";
}
```

---

## 4. New Server Endpoint

Add to `server/src/routes/tracks.py` (or a new `server/src/routes/queue.py`):

```
GET /api/watch/{videoId}?playlistId=&limit=25

Response:
{
  "tracks": [
    {
      "videoId": "...",
      "title": "...",
      "artist": "...",
      "artistId": "...",
      "album": "...",
      "albumId": "...",
      "thumbnail": "...",
      "duration": 225
    }
  ],
  "playlistId": "RDAMVM...",
}
```

Implementation in `ytmusic.py`:

```python
async def get_watch_playlist(
    video_id: str,
    playlist_id: str | None = None,
    limit: int = 25,
) -> dict:
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None,
        lambda: _get_client().get_watch_playlist(
            videoId=video_id,
            playlistId=playlist_id,
            limit=limit,
        ),
    )
    tracks = result.get("tracks", [])
    return {
        "tracks": [
            {
                "videoId": t.get("videoId", ""),
                "title": t.get("title", ""),
                "artist": ", ".join(
                    a.get("name", "") for a in (t.get("artists") or [])
                ),
                "artistId": (t.get("artists") or [{}])[0].get("id"),
                "album": (t.get("album") or {}).get("name"),
                "albumId": (t.get("album") or {}).get("id"),
                "thumbnail": _best_thumb(t.get("thumbnails")),
                "duration": t.get("duration_seconds", 0),
            }
            for t in tracks
            if t.get("videoId") and t.get("isPlayable") is not False
        ],
        "playlistId": result.get("playlistId", ""),
    }
```

---

## 5. Queue Operations

### 5.1 Play a Track (entry point)

```
playTrack(videoId, context?):
  → if current?.videoId === videoId: toggle play, return

  → set current = null (triggers PlayerBar to clear audio src)

  → fetch TrackInfo via yt-dlp (Tauri invoke) for videoId
  → set current = { queueItem metadata + streamUrl + formats }

  → if context.type === "album" or "playlist":
      pre-fill contextQueue from album.tracks or playlist tracks
      call GET /api/watch/{videoId}?playlistId={audioPlaylistId}
      append new tracks (dedup by videoId)
  → else:
      call GET /api/watch/{videoId} (radio mode)
      set contextQueue = result.tracks

  → set watchPlaylistId = result.playlistId
  → clear userQueue + history
  → trigger prefetch for contextQueue[0]
```

### 5.2 Next Track

```
playNext():
  → if repeat === "one": re-seek current to 0, return
  → push current metadata to history (truncate to 50)

  → if userQueue.length > 0:
      next = userQueue.shift()
  → else if contextQueue.length > 0:
      next = contextQueue.shift()
  → else:
      if repeat === "all": restart from beginning of context
      else: stop playback, return

  → fetch TrackInfo via yt-dlp for next.videoId
  → set current = { next metadata + streamUrl + formats }

  → if contextQueue.length < REFILL_THRESHOLD (3):
      trigger background refill

  → trigger prefetch for contextQueue[0]
```

### 5.3 Previous Track

```
playPrev():
  → if currentTime > 3: seek current to 0, return
  → if history.length === 0: return

  → prev = history.pop()
  → push current metadata back to front of contextQueue
  → fetch TrackInfo via yt-dlp for prev.videoId
  → set current = { prev metadata + streamUrl + formats }
```

### 5.4 Add to Queue / Play Next

```
addToQueue(item):     → userQueue = [...userQueue, item]
playNextInline(item): → userQueue = [item, ...userQueue]
```

No API calls — metadata is already available from search/browse/playlist results.

### 5.5 Context Queue Refill (background)

```
refillContextQueue():
  → if contextQueue.length >= REFILL_THRESHOLD (3): return
  → if !watchPlaylistId && contextQueue.length === 0: return

  → GET /api/watch/{current.videoId}?playlistId={watchPlaylistId}
  → deduplicate: skip videoIds already in userQueue + contextQueue + history
  → append new tracks to contextQueue
  → update watchPlaylistId = result.playlistId
```

### 5.6 Set Queue (playing from album/playlist)

Replaces current `setQueue()`:

```
setQueue(items: QueueItem[], startIndex = 0, context?):
  → contextQueue = items.slice(startIndex + 1)  // everything after current
  → if context.type === "album" or "playlist":
      background-fetch watch playlist for continuation
  → clear userQueue + history
  → trigger prefetch for contextQueue[0]
```

### 5.7 Toggle Shuffle

```
shuffle toggle:
  → if enabling: randomize contextQueue order (Fisher-Yates)
  → if disabling: re-fetch from get_watch_playlist() to restore order
  → userQueue stays untouched either way
```

---

## 6. yt-dlp Prefetch Strategy

The yt-dlp Rust call takes 1–3s per track. Current code calls it synchronously at transition — causing a playback gap.

```
ON TRACK START:
  → prefetch yt-dlp for contextQueue[0]  → cache as TrackInfo
  → prefetch yt-dlp for contextQueue[1]  → cache as TrackInfo (metadata only, URL will be refreshed)

ON NEXT TRACK:
  → contextQueue[0].TrackInfo is already cached → instant transition
  → kick off prefetch for the new contextQueue[0] (was previously at index 1)

URL EXPIRY:
  → YouTube stream URLs expire ~6h. Since we cache in memory for the session,
    trust the in-memory cache. If a 403 occurs on playback, invalidate and
    re-fetch that specific track.
```

The existing `Map<string, TrackInfo>` cache in `ytdlp.ts` handles this — the key change is calling `getTrackInfo()` earlier (on track start, not on next-track).

---

## 7. State on Track Change ($effect)

In `NowPlaying.svelte` (already exists — lyrics effect):

```
$effect(() => {
  const track = player.currentTrack;
  if (!track) return;

  // Already exists: clearLyrics() + fetch() for lyrics

  // NEW: trigger prefetch for upcoming tracks
  prefetchNext();
});
```

---

## 8. Merged Queue View (UI)

```
visibleQueue = [...userQueue, ...contextQueue]
              ─── "Up Next" ───   ─── "Next Up" ───
```

Show max 50 items. Visually separate the two sections with a label/divider.

Implement as a new component `QueuePanel.svelte` or integrated into `NowPlaying.svelte` as a side panel.

---

## 9. What Stays Unchanged

| Piece | Reason |
|---|---|
| `TrackInfo` type | Already has everything needed |
| `seekTarget` / `seekTo` | Seek mechanism is correct |
| `setCurrentTime` / `clearSeekTarget` | Split is already correct |
| `PlayerBar.svelte` audio flow | Audio element, seek effect, play/pause — unchanged |
| `lyrics.svelte.ts` | Unrelated to queue |
| `ytdlp.ts` cache | Already correct, just called earlier |
| Album/playlist server endpoints | Used as queue seed data |
| Artist/album browse pages | Unchanged |

---

## 10. Files to Create/Modify

| File | Action |
|---|---|
| `server/src/routes/tracks.py` | Add `GET /api/watch/{videoId}` endpoint |
| `server/src/services/ytmusic.py` | Add `get_watch_playlist()` async wrapper |
| `src/lib/types.ts` | Add `QueueItem` interface |
| `src/lib/services/api.ts` | Add `api.getWatchPlaylist()` method |
| `src/lib/stores/player.svelte.ts` | Full queue rewrite — new data model + operations |
| `src/lib/components/player/NowPlaying.svelte` | Add prefetch `$effect` for upcoming tracks |
| `src/lib/components/queue/QueuePanel.svelte` | New component — merged queue view |

---

## 11. Implementation Order

```
Phase 1: Server
  → Add get_watch_playlist() to ytmusic.py
  → Add GET /api/watch/{videoId} to routes

Phase 2: Frontend types + API
  → Add QueueItem to types.ts
  → Add api.getWatchPlaylist() to api.ts

Phase 3: Player store rewrite
  → Replace queue + autoQueue with userQueue + contextQueue
  → Add watchPlaylistId, history, context state
  → Rewrite playNext() with prefetch-aware logic
  → Rewrite playPrev() with history
  → Rewrite playTrack() with watch playlist seeding
  → Rewrite setQueue() to accept QueueItem[] + context
  → Add addToQueue(), playNextInline(), refillContextQueue()

Phase 4: Prefetch
  → Add prefetchNext() to player store
  → Wire into NowPlaying $effect

Phase 5: UI
  → Build QueuePanel.svelte (merged queue view)
