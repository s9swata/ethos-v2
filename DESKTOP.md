## design

| Token | Value |
|---|---|
| `--color-surface` | `#0a0a0a` |
| `--color-accent` | `#ff2a3b` |
| `--color-text-primary` | `#ffffff` |
| `--color-text-secondary` | `#a1a1a1` |
| `--color-text-tertiary` | `#6b6b6b` |

Defined in `src/app.css` via Tailwind `@theme`. The accent red drives the active/hover state across all interactive elements.

## layout

```
h-full flex flex-row
├── drag region (absolute, h-9, z-50)
├── Sidebar (w-60, floating, rounded-xl, mt-9 mb-3 ml-3)
└── main (flex-1, flex-col, overflow-hidden)
    ├── scrollable content (flex-1, overflow-y-auto, pb-28)
    └── PlayerBar (absolute bottom-0, z-30)
```

The sidebar is a floating frosted glass panel with rounded corners, placed below the macOS traffic light region. The main content fills the remaining width. The player bar overlays the bottom of the main content.

## sidebar (`src/lib/components/layout/Sidebar.svelte`)

Floating frosted glass navigation panel. Contains nav items, a "Now Playing" card, and a back button that appears when navigating to non-home pages.

- **background**: `rgba(10,10,10,0.65)` with `backdrop-filter: blur(30px) saturate(1.4)`
- **active tab**: accent red text, no background fill
- **hover**: accent red text
- **album art ambient**: when a track is playing, the album art is blurred (`blur(50px) brightness(0.25)`) behind the glass

## mini player (`src/lib/components/layout/PlayerBar.svelte`)

Apple Music-style pill at the bottom center (`w-[70vw] max-w-[700px]`). Floats above page content via absolute positioning.

```
pill (frosted glass, rounded-full, py-3, px-5)
├── left: album art (40px) + title (click → album page) + artist (click → artist page)
├── heart (liked → solid accent red, scale pop transition)
├── center: shuffle / prev / play-pause / next / repeat (compact, no button backgrounds)
├── right: fullscreen (Maximize2 → hero player) / queue (ListMusic) / volume (mute icon + hover-expandable slider)
```

- **glass**: `background: rgba(28,28,30,0.7)` + `backdrop-filter: blur(24px) saturate(1.4)`
- **backdrop layer**: `backdrop-filter: blur(30px) brightness(0.5) saturate(2)` inside pill wrapper for depth
- **seek bar**: below the pill, `w-[75%]` centered, ElasticSlider with time labels
- **volume slider**: hidden by default, expands on hover via `group-hover:w-16 group-hover:ml-1.5`

## hero player (`src/lib/components/player/NowPlaying.svelte`)

Full-screen overlay (z-50) opened by clicking album art or fullscreen button in mini player.

```
fixed inset-0 z-50
├── animated ambient bg (blurred album art, pulse animation)
├── close button (ChevronDown, top-left)
├── large album art (max-w-[360px], GlassSurface wrapped)
├── track info (title + artist)
├── ElasticSlider seek bar
├── glass-effect playback controls (GlassSurface wrapped buttons: prev, play/pause, next, shuffle, repeat)
└── volume slider (ElasticSlider)
```

## glass surface (`src/lib/components/ui/GlassSurface2.svelte`)

SVG filter-based chromatic glass effect with displacement maps. Used in the hero player for button controls. Falls back to standard `backdrop-filter` blur on unsupported browsers (WebKit, Firefox).

Key props: `opacity`, `blur`, `brightness`, `saturation`, `distortionScale`, `borderRadius`.

## elastic slider (`src/lib/components/svelte-bits/ElasticSlider.svelte`)

Custom slider with stretch-on-overscroll physics using `motion` library. Used for seek bar and volume in both mini player and hero player.

- **seeking**: `onValueChange` fires continuously, `onValueCommit` on release
- **scale on hover**: controlled via `scaleOnHover` prop (disabled on seek bar)
- **overflow clipped**: `overflow: hidden` on slider container to prevent adjacent element overlap

## heart / like animation

Heart icon uses lucide-svelte's `Heart` component with `fill="currentColor"` for liked state, `fill="none"` for outline. A `{#key}` block wraps the heart, destroying and recreating the SVG on each toggle. `transition:scale` (0.7→1.0, 200ms) provides the pop effect. The `color` is set via inline `style` on the parent button to `var(--color-accent)` when liked.

## navigation

History stack in `src/lib/stores/navigation.svelte.ts`. Each `navigate()` call pushes the current page onto a stack; `goBack()` pops it. Sidebar navigation uses `replace=true` to avoid polluting history. Back button appears in the sidebar when `canGoBack` is true and the current page is not "home".

## search

Search triggers only on form submit (Enter key or clicking the magnifying glass icon). No debounced auto-search. The icon is a `<button type="submit">` inside the form.

## pages and their routes

| Page | Route param | Component |
|---|---|---|
| home | — | `HomePage.svelte` |
| search | `q` (query string) | `SearchBar` + `SearchResults` |
| artist | `browseId` | `ArtistPage.svelte` |
| album | `browseId` | `AlbumPage.svelte` |
| playlist | `id`, `source` | `PlaylistPage.svelte` |
| player | — | `NowPlaying.svelte` (overlay) |

## API config

The API base URL is set via `VITE_API_URL` environment variable (read from `.env` by Vite). Defaults to `http://127.0.0.1:7860` during development.
