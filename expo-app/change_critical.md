# Change Critical: Prefetch Serialization

## Problem

The prefetch loop in both `playTrackAction` (player-actions-playback.ts:73-76) and `playNextAction` (player-actions-next.ts:128-131) fires **2 concurrent `fetchTrack` calls** immediately after every track play. Combined with the actual playback extraction, this creates **3 simultaneous YouTube page fetches** via NewPipe Extractor (on Android) or the iOS native module.

YouTube sees a burst of rapid page scrapes from the same IP and starts returning captcha/blocker pages. The NewPipe extractor cannot distinguish a block page from a valid video page — it just finds 0 audio streams and returns empty. `fetchTrack` catches this silently (`.catch(() => {}` on prefetch) and throws `"No stream available"` on the primary path.

Result: first track plays, but subsequent tracks fail because:
- Prefetching consumes your YouTube quota/speed-bumps the IP
- The primary `fetchTrack` call for auto-advance hits a rate-limited state

## Fix

1. **Serialize extraction calls** — Add a module-level promise chain in `player-actions-next.ts` so all `getBestAudioStream` calls fire one at a time (never concurrently). Each call awaits the previous one's completion, naturally spacing requests ~1-2s apart.

2. **Reduce prefetch from 2 to 1** — Only prefetch the immediate next track.

3. **Delay prefetch by 5 seconds** — Wait until the current track has been playing stably before starting prefetch traffic.

4. **Log prefetch failures** — Change `.catch(() => {})` to `.catch((e) => console.warn(...))` so failures are observable.

## Verification

- Rapidly tap 5+ search results → all load without silent failures
- Check console — zero prefetch failures under normal use
- Auto-advance across 10+ tracks → all play with timestamp updates
- No new TS errors (`npx tsc --noEmit`)
