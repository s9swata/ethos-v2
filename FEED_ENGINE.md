# Feed Engine — Implementation Plan

Replace the current static home page sections with a context-aware feed engine.

## Types

```typescript
type HomeBlock =
  | { type: "mood_hero";    mood: string | null; title: string; subtitle: string; tracks: Track[] }
  | { type: "quick_moods";  moods: { label: string; query: string }[] }
  | { type: "loop_insight"; track: Track; count: number }
  | { type: "discovery";    title: string; subtitle: string; tracks: Track[] }
  | { type: "microgenre";   genre: string; tracks: Track[] }
```

## Phase 1 — Tracking + Profile Blob

**`player.svelte.ts`:** on `playNext()`, append `{ videoId, title, artist, count: 1 }` to `localStorage["recentTracks"]`. Increment `count` if `videoId` already exists. Cap at 20 entries.

**`api.ts` `getHome(mood?)`:** build profile blob from:
- `deviceHour: new Date().getHours()`
- `likedArtists: []` (from `library.likedIds`; can be empty for MVP)
- `recentTracks` from `localStorage`

Base64-encode and pass as `?profile=`. When `mood` is set, pass `&mood=<query>`.

## Phase 2 — Feed Engine (`server/src/services/feed_engine.py`)

```python
def generate_home_feed(profile: dict | None, mood: str | None = None) -> list[dict]:
```

1. Fetch raw data: `get_home()`, `get_explore()` (same calls as `get_generic_sections`)
2. Derive context:
   - `hour = (profile or {}).get("deviceHour", 12)`
   - `time_label = "morning" / "afternoon" / "evening" / "night"`
   - `repeated_tracks` from `profile.get("recentTracks", [])`, sorted by count desc
3. Build blocks:
   - **`mood_hero`:** greeting title (e.g. "Good morning"), subtitle tagline, tracks from top songs or mood search
   - **`quick_moods`:** static — `["Chill", "Focus", "Energy", "Late Night", "Nostalgia", "Upbeat"]`
   - **`loop_insight`:** only if `repeated_tracks[0].count >= 3`
   - **`discovery`:** wraps new releases / recommended from explore
   - **`microgenre`:** picks genre from `MOOD_QUERY_MAP` based on mood/time, searches ytmusicapi
4. When `mood` is set:
   - Override `mood_hero.title` + tracks with mood search results
   - Replace `discovery`/`microgenre` with mood-filtered content
   - Omit `loop_insight`

Use `MOOD_QUERY_MAP = { "late_night": "dark ambient late night", "focus": "deep focus instrumental", "chill": "lofi chill beats", ... }` for mood → search query translation.

Rewrite `server/src/routes/home.py` to accept optional `mood` query param, return `{ blocks }`.

## Phase 3 — Block Components (`src/lib/components/blocks/`)

Each gets `in:fly={{ y: 24, duration: 400 }}` on mount.

- **`MoodHero.svelte`:** greeting + horizontal track scroll. Fallback `"What are we feeling?"` when mood is null.
- **`QuickMoods.svelte`:** pill row. `$state activeMood`. Click → `onMoodChange(query)`. Re-click same → `onMoodChange(undefined)`.
- **`LoopInsight.svelte`:** "You've played this X times" card with track + Play.
- **`DiscoveryRail.svelte`:** reuses existing card-scroll pattern. Props: `title`, `subtitle`, `items`.
- **`Microgenre.svelte`:** same card-scroll, genre header.

## Phase 4 — HomePage Rewrite

- Search bar stays at top (not part of blocks)
- Iterate `blocks`, switch on `block.type`, render matching component
- `handleMoodChange(mood)` re-fetches `api.getHome(mood)`, replaces `blocks` state
- Remove old `sections` rendering
- Greeting becomes part of `mood_hero` block

## Removed from Scope

- Genre in profile blob (ytmusicapi has no structured genre per track)
- `likedArtists` can be empty for MVP
