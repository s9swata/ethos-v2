# Findings

Hard-won debugging discoveries and subtle gotchas that cost time to figure out.

## LRCLIB `/api/get` duration mismatch

`/api/get?artist_name=...&track_name=...&duration=...` requires exact match on all three params. yt-dlp's duration (what we pass) often differs from LRCLIB's recorded duration by 1-3 seconds, causing the exact match to miss. This silently falls through to `/api/search`, which may return a result without synced lyrics.

**Fix:** Skip `/get` entirely and go straight to `/api/search`, or if using `/get` for speed, only accept the result if it has `syncedLyrics` — if it only has `plainLyrics`, fall through to `/search` which might find a different version with timestamps.

## Thumbnail key inconsistency in ytmusicapi

ytmusicapi returns `"thumbnails"` (plural, `list[dict]`) on almost every endpoint (search, artist, album, playlist, home, charts).

**Exception:** `get_watch_playlist()` returns `"thumbnail"` (singular, same shape — a list of dicts with `url`/`width`/`height`).

yt-dlp returns `"thumbnail"` (singular) as a **raw string URL** — completely different shape.

Always check the actual key from the response before applying `_best_thumb()`. Watch playlist needs `t.get("thumbnail")`, while most other endpoints use `t.get("thumbnails")`.

## yt-dlp Rust crate gotchas (src-tauri)

### `Format::url()` is a method, not a field

`Format::url()` returns `Result<&String>`, not a direct field access. Clone the result to avoid borrow conflicts.

### `Format::rates_info.audio_rate` is `Option<OrderedFloat<f64>>`

Access via `.map(|r| r.0)`.

### `Video::best_audio_format()` returns `Option<&Format>`

Clone it to avoid borrow conflicts when moving `Video` fields.

### `Downloader` initialization

`Downloader::with_new_binaries()` auto-downloads yt-dlp + ffmpeg to a directory. Use in `setup` via `tauri::async_runtime::spawn`. Store the `Downloader` in `Arc<tokio::sync::Mutex<Option<Downloader>>>` for lazy init during setup. Use `use tauri::Manager;` trait for `app.path()` and `app.state()` in setup.

### yt-dlp crate pin

Version `2.7.2` on crates.io has a yanked dependency `lofty ^0.23.2`. Use the fork `Guilherme-j10/yt-dlp.git` at `rev = "acfed53..."` (develop branch, updates to lofty 0.24.0). Pin to a specific `rev`, not a branch, to prevent supply-chain risk.

### Option injection vulnerability

The yt-dlp crate uses `tokio::process::Command::arg()` (not shell), so shell injection is impossible. But a user-supplied string starting with `--` could be interpreted by yt-dlp's Python argument parser as an option flag. Sanitize IDs to reject `--` prefixed and control-character inputs.

### ffmpeg source caveat

`Downloader::with_new_binaries()` downloads ffmpeg from `boul2gom/ffmpeg-builds` (the original crate author's repo), not the official FFmpeg project. SHA256 checksums are self-hosted in the same repo. For production, provide a system ffmpeg path via `Libraries::new()` instead. The yt-dlp binary itself is downloaded from the official `yt-dlp/yt-dlp` GitHub releases.

### `aws-lc-sys` compilation cost

Pulled in via `yt-dlp → reqwest → rustls → aws-lc-rs → aws-lc-sys`. It's AWS-LC (AWS's C crypto library) compiled from source — used for HTTPS/TLS by reqwest. Not malicious, but adds significant C compilation time.

### Capabilities file

`src-tauri/capabilities/default.json` must be valid JSON (no trailing commas).

### Tauri commands

Replace old shell `Command.create("yt-dlp", ...)` calls with `invoke` from `@tauri-apps/api/core`.
