# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Media notification gotchas

- The installed `@rntp/player` package only exposes `PlayerCommand` values for seek, play/pause, next, previous, stop, skip forward, and skip backward. It does not expose a Like/rating command, so a notification like button requires native package work rather than JS config.
- Notification artwork uses the `artworkUrl` passed to `TrackPlayer.setMediaItem`; UI thumbnail upscaling does not apply automatically.
- `TrackPlayer.registerBackgroundEventHandler` is module-level and must be guarded with a `globalThis` flag because Fast Refresh can re-evaluate `_layout.tsx` and register `TrackPlayerServiceBridge` more than once.
- Share one SQLite open promise for `ethos.db`; opening/preparing through separate helpers during startup can surface native `prepareAsync` null-pointer failures.
- Do not call `playNext()` as a fallback when stream URL resolution fails. That turns transient extraction/load failures into unexpected automatic skips.
