# yt-dlp Removal Plan

Goal: remove `yt-dlp` as a server dependency to reduce package size, build time, and runtime resource usage.

## Audit Summary

| yt-dlp function | Endpoint | Desktop client | Mobile client (master) | Status |
|---|---|---|---|---|
| `get_info()` | `GET /api/tracks/{track_id}` | Uses metadata + stream URL | Only `addToQueueAction` calls it for metadata; primary playback uses expo module | **Blocked** — desktop needs alternative |
| `get_playlist()` | `GET /api/playlist?url=` | Uses it | Uses it (fallback) | **Blocked** — both clients need migration to `/api/playlist-v2` |
| `get_artist_uploads()` | `GET /api/artist?url=` | No | No | **Can remove now** |
| `search()` | N/A (standalone) | No | No | **Can remove now** |

---

## Phase 1 — Immediate (safe, dead code)

- [ ] Remove `GET /api/artist?url=` route + `get_artist_uploads()`
- [ ] Remove `search()` from `ytdlp.py`
- [ ] Remove `YtDlpError`, `YtDlpTimeoutError` and their handlers (if phase 2-3 also done)

## Phase 2 — Migrate playlist to ytmusicapi

- [ ] Desktop client: switch `getPlaylist()` from `/api/playlist?url=` to `/api/playlist-v2?id=`
- [ ] Mobile client: switch `getPlaylist()` from `/api/playlist?url=` to `/api/playlist-v2?id=`
- [ ] Remove `get_playlist()` from `ytdlp.py`
- [ ] Remove `GET /api/playlist?url=` route

## Phase 3 — Migrate track metadata/stream URL

- [ ] Desktop client: add local stream extraction (bundled yt-dlp, Rust library, or call into a lightweight service)
- [ ] Mobile client: remove `api.getTrack()` from `addToQueueAction` — accept metadata from caller or use ytmusicapi
- [ ] Remove `get_info()` from `ytdlp.py`
- [ ] Remove `GET /api/tracks/{track_id}` route

## Phase 4 — Remove dependency

- [ ] Delete `server/src/services/ytdlp.py`
- [ ] Remove `yt-dlp>=2026` from `server/pyproject.toml`
- [ ] Remove `from src.services.ytdlp` imports from `routes/tracks.py`, `routes/playlist.py`, `middleware/error_handler.py`, `main.py`
- [ ] Remove error handler registrations in `main.py`
- [ ] Verify `pip install` no longer pulls in yt-dlp or its transitive deps
