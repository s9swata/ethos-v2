# Ethos Design System

## Philosophy

Premium music experience with an editorial, Apple Music-inspired aesthetic. Matte dark surfaces with crimson accents create warmth and sophistication. Spacious layouts prioritize immersion over information density. Playful micro-interactions reward every touch without feeling gimmicky.

---

## Color Palette

### Surfaces (Matte Dark)

| Token | Value | Usage |
|-------|-------|-------|
| `surface` | `#0a0a0a` | App background, deepest layer |
| `surface-elevated` | `#141414` | Cards, sheets, elevated containers |
| `surface-secondary` | `#1c1c1e` | Mini player, input fields, secondary containers |
| `surface-tertiary` | `#242426` | Hover states, pressed states, subtle highlights |

### Accents (Crimson/Cherry)

| Token | Value | Usage |
|-------|-------|-------|
| `accent` | `#e11d48` | Primary actions, active states, like buttons |
| `accent-hover` | `#f43f5e` | Hover/pressed accent states |
| `accent-subtle` | `rgba(225, 29, 72, 0.15)` | Subtle accent backgrounds |

### Text

| Token | Value | Usage |
|-------|-------|-------|
| `text-primary` | `#ffffff` | Headlines, primary content |
| `text-secondary` | `#a1a1aa` | Subtitles, metadata, descriptions |
| `text-tertiary` | `#71717a` | Disabled, hints, timestamps |
| `text-on-image` | `#ffffff` | Text over images (always with scrim) |

### Utility

| Token | Value | Usage |
|-------|-------|-------|
| `border` | `#27272a` | Subtle dividers, hairlines |
| `shadow` | `rgba(0, 0, 0, 0.4)` | Drop shadows |
| `scrim` | `rgba(0, 0, 0, 0.5)` | Image overlays for text legibility |

---

## Typography

**Font Family:** Inter (all weights loaded)

### Type Scale

| Style | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| `hero` | 32px | 700 | 1.1 | -0.02em | Artist names, album titles |
| `title-1` | 24px | 700 | 1.2 | -0.01em | Section headers |
| `title-2` | 20px | 600 | 1.3 | 0 | Card titles, list headers |
| `title-3` | 17px | 600 | 1.3 | 0 | Track titles, prominent labels |
| `body` | 15px | 400 | 1.4 | 0 | Primary body text |
| `body-emphasis` | 15px | 500 | 1.4 | 0 | Emphasized body |
| `caption` | 13px | 400 | 1.3 | 0 | Metadata, subtitles |
| `caption-emphasis` | 13px | 500 | 1.3 | 0 | Emphasized captions |
| `footnote` | 11px | 500 | 1.2 | 0.01em | Timestamps, small labels |
| `label` | 11px | 600 | 1.2 | 0.05em | Uppercase labels, badges |

### Typography Patterns

- **Headlines over images:** Always use `text-shadow: 0 2px 8px rgba(0,0,0,0.5)` or scrim overlay
- **Section headers:** 24px, bold, with 24px spacing above
- **List items:** 15px title + 13px subtitle pattern
- **All caps labels:** 11px, semibold, letter-spacing 0.05em, text-tertiary color

---

## Spacing System

**Base unit:** 4px

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight gaps, icon padding |
| `space-2` | 8px | Small gaps, inline spacing |
| `space-3` | 12px | Card padding, list item gaps |
| `space-4` | 16px | Standard padding, section gaps |
| `space-5` | 20px | Large gaps, hero spacing |
| `space-6` | 24px | Section breaks, major divisions |
| `space-8` | 32px | Hero sections, major spacing |
| `space-10` | 40px | Screen edge padding (with safe areas) |

### Layout Principles

- **Breathable:** Default to more space, never cram
- **Consistent rhythm:** Use 16px as standard, 24px for emphasis
- **Edge padding:** 16px minimum, 20px on larger screens
- **Section spacing:** 32px between major sections
- **Card gaps:** 12px between related items, 16px between sections

---

## Shapes & Elevation

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 8px | Small buttons, tags |
| `radius-md` | 12px | Cards, album art, lists |
| `radius-lg` | 16px | Sheets, modals, large cards |
| `radius-xl` | 24px | Hero images, prominent containers |
| `radius-full` | 999px | Pills, avatars, circular buttons |

### Elevation (Drop Shadows)

**Principle:** Shadows indicate elevation, not borders. Use sparingly for premium feel.

| Level | Shadow | Usage |
|-------|--------|-------|
| `elevation-1` | `0 2px 8px rgba(0,0,0,0.2)` | Cards at rest |
| `elevation-2` | `0 4px 16px rgba(0,0,0,0.25)` | Elevated cards, hover states |
| `elevation-3` | `0 8px 24px rgba(0,0,0,0.3)` | Modals, floating player |
| `elevation-4` | `0 12px 32px rgba(0,0,0,0.35)` | Maximum elevation |

### Pills (Rounded Buttons)

- Background: `surface-elevated` or `accent`
- Border radius: `radius-full`
- Padding: 12px horizontal, 8px vertical
- Shadow: `elevation-1` when elevated

---

## Components

### Buttons

**Primary Pill**
- Background: `accent`
- Text: white, 13px, semibold
- Padding: 12px 20px
- Border radius: 999px
- Pressed: scale 0.96, darken background

**Secondary Pill**
- Background: `surface-elevated`
- Text: `text-primary`, 13px, semibold
- Border: 1px solid `border`
- Pressed: background `surface-tertiary`

**Ghost Button**
- Background: transparent
- Text: `text-secondary`, 13px, medium
- Pressed: background `surface-elevated`

**Icon Button**
- Size: 44×44px (minimum touch target)
- Border radius: 999px
- Background: transparent or `surface-elevated`
- Pressed: scale 0.92, background `surface-tertiary`

### Cards

**Album Card**
- Image: 1:1 aspect ratio, 12px radius
- Shadow: `elevation-1`
- Title: 13px, medium, 8px top margin
- Subtitle: 12px, `text-secondary`
- Gap between cards: 12px

**Artist Card**
- Image: 1:1, circular (999px radius)
- Shadow: `elevation-1`
- Name: 13px, medium, centered, 8px top margin
- Gap: 16px (more breathing room for circular)

**List Item**
- Height: 64px minimum
- Thumbnail: 48×48px, 8px radius
- Gap between thumb and text: 12px
- Title: 15px, medium
- Subtitle: 13px, `text-secondary`
- Pressed: background `surface-elevated`

### Input Fields

**Search Field**
- Background: `surface-elevated`
- Border radius: 12px
- Height: 44px
- Padding: 0 16px
- Icon: 16px, `text-tertiary`
- Placeholder: `text-tertiary`
- Focus: subtle border color change to `accent` at 30% opacity

### Navigation

**Tab Bar**
- Background: `surface` with 1px top border
- Height: 56px + safe area
- Icons: 22px
- Labels: 10px, semibold
- Active: `accent` color
- Inactive: `text-tertiary`
- Pressed: scale 0.9 on icon

**Filter Pills**
- Horizontal scroll
- Active: `accent` background, white text
- Inactive: `surface-elevated` background, `text-secondary` text
- Padding: 8px 16px
- Gap: 8px

---

## Animation & Motion

### Principles

- **Playful but refined:** Animations should feel responsive, not toy-like
- **Purposeful:** Every motion guides attention or confirms action
- **Performant:** Use transform and opacity only, 60fps target
- **Snappy:** Quick transitions (150-300ms) with easing

### Durations

| Context | Duration | Easing |
|---------|----------|--------|
| Micro-interactions (button press) | 100ms | ease-out |
| State changes (like, play) | 150ms | ease-out |
| Screen transitions | 250ms | ease-in-out |
| Content reveals | 300ms | ease-out |
| Ambient (marquee, pulsing) | 8000ms+ | linear |

### Patterns

**Button Press**
- Scale to 0.96 on press
- Spring back on release
- Haptic: light impact

**Like Animation**
- Heart scales 0.7 → 1.0
- Spring physics (friction: 6, tension: 200)
- Color transition 150ms
- Haptic: medium impact

**Card Press**
- Scale to 0.98
- Shadow increases one level
- Background shifts to `surface-tertiary`

**List Item Press**
- Background fades to `surface-elevated` in 100ms
- No scale (prevents scroll jank)

**Image Loading**
- Fade in from 0 to 1 opacity
- 300ms ease-out
- Skeleton placeholder during load

**Screen Transitions**
- Slide from bottom: player, queue, lyrics
- Fade + slight scale: modal presentations
- Push from right: navigation stacks

**Progress Indicators**
- Smooth width transitions on progress bars
- 100ms ease-out for scrubbing
- No animation for natural playback progress

---

## Layout Patterns

### Home Screen

- Greeting: 32px bold, 40px top padding (with safe area)
- Section headers: 20px semibold, 24px top margin
- Horizontal scrolls: 16px edge padding, 12px item gap
- Card size: 150px (albums), 120px (artists)
- Section spacing: 32px

### Search

- Search bar: 44px height, 16px horizontal padding
- Results: full width, 64px row height
- Section headers in results: 11px uppercase, `text-tertiary`
- Empty state: centered, icon 52px, 16px title

### Artist Screen

- Hero: 320px height, full-bleed image
- Scrim: gradient from transparent to `surface`
- Artist name: 32px bold, bottom aligned
- Content: 16px horizontal padding
- Section spacing: 32px

### Album Screen

- Hero: 280px height, album art centered
- Album title: 24px bold
- Artist name: 15px, `text-secondary`
- Track list: 64px rows, 12px gap

### Library

- Filter pills: 8px gap, horizontal scroll
- Grid: 2 columns for artists, 16px gap
- List: full width, 64px rows
- Empty states: centered, 48px icon

---

## Images & Thumbnails

### Aspect Ratios

- Album art: 1:1 (square)
- Artist photos: 1:1 (circular crop)
- Playlist covers: 1:1 (square)
- Hero images: 16:9 or 3:4 (portrait artists)

### Treatment

- Border radius: 12px (square), 999px (circular)
- Shadow: `elevation-1` on elevated cards
- Loading: Skeleton with `surface-elevated` background
- Error: Fallback icon on `surface-tertiary` background

### Overlays

- Text over images: Always use scrim gradient
- Gradient: `linear-gradient(to top, rgba(0,0,0,0.7), transparent)`
- Minimum contrast ratio: 4.5:1

---

## Accessibility

### Touch Targets

- Minimum: 44×44px
- Preferred: 48×48px for primary actions
- Spacing: 8px minimum between targets

### Color Contrast

- Text primary on surface: 21:1 (exceeds AAA)
- Text secondary on surface: 7:1 (exceeds AA)
- Accent on surface: 5.5:1 (exceeds AA)
- Text on images: Always with scrim, target 7:1

### Motion

- Respect `prefers-reduced-motion`
- Disable non-essential animations when enabled
- Keep functional animations (progress bars, loading)

### Screen Readers

- All icon buttons: `accessibilityLabel` describing action
- Images: `accessibilityLabel` with content description
- Lists: `accessibilityRole="list"` and `listitem`
- Active states: `accessibilityState` updates

---

## Platform Notes

### iOS

- Use system safe areas
- Support dynamic type (scale typography)
- Respect notch and home indicator
- Use SF Symbols as fallback if needed

### Android

- Same visual treatment as iOS (iOS-like aesthetic)
- Use Inter font explicitly (loaded in app)
- Support system back gesture
- Respect status bar and navigation bar

---

## Implementation Notes

### Font Loading

```typescript
// Load Inter in layout
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
```

### Shadow Implementation

```typescript
// iOS shadows
shadowColor: '#000',
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.25,
shadowRadius: 16,

// Android elevation
elevation: 4,
```

### Animation Libraries

- Use `react-native-reanimated` for complex gestures
- Use `Animated` API for simple transitions
- Use `react-native-haptic-feedback` for haptics

---

## Exceptions

**Player Screen:** Already implemented, do not modify. Maintain existing design as reference for other screens.

---

*Last updated: 2026-06-01*
