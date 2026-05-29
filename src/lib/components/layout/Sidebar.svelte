<script lang="ts">
  import { ArrowLeft } from "lucide-svelte";
  import { nav } from "$lib/stores/navigation.svelte";
  import { player } from "$lib/stores/player.svelte";
  import { upscaleThumbnail } from "$lib/utils";
  import type { Page } from "$lib/types";

  type NavItem = { id: Page; label: string; icon: string };

  const navItems: NavItem[] = [
    {
      id: "home",
      label: "Home",
      icon: `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
    },
    {
      id: "search",
      label: "Search",
      icon: `<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>`,
    },
    {
      id: "library",
      label: "Library",
      icon: `<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>`,
    },
  ];
</script>

<nav class="fixed left-3 top-9 bottom-3 w-60 flex flex-col select-none rounded-xl overflow-hidden" style="z-index: 10;">
  <!-- Ambient album art background -->
  {#if player.currentTrack?.thumbnail}
    <div
    class="absolute inset-0 pointer-events-none"
      style="
        background-image: url({upscaleThumbnail(player.currentTrack.thumbnail, 400)});
        background-size: cover;
        background-position: center;
        filter: blur(50px) brightness(0.25) saturate(1.2);
      "
    ></div>
  {/if}

  <!-- Frosted glass surface -->
  <div
    class="relative z-10 flex flex-col h-full rounded-xl"
    style="
      background: rgba(10,10,10,0.65);
      backdrop-filter: blur(30px) saturate(1.4);
      -webkit-backdrop-filter: blur(30px) saturate(1.4);
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow:
        0 0 0 0.5px rgba(255,255,255,0.08) inset,
        0 8px 32px rgba(0,0,0,0.5);
    "
  >
    <!-- Back button -->
    {#if nav.canGoBack && nav.currentPage !== "home"}
      <div class="px-3 pt-3">
        <button
          onclick={nav.goBack}
          class="w-8 h-8 flex items-center justify-center rounded-full transition-all hover:bg-white/10 active:scale-90 text-text-secondary hover:text-text-primary"
          aria-label="Go back"
        >
          <ArrowLeft size={16} />
        </button>
      </div>
    {/if}

    <!-- Nav Items -->
    <div class="px-2 pt-3 flex flex-col gap-0.5">
      {#each navItems as item}
        {@const isActive = nav.currentPage === item.id}
        <button
          onclick={() => nav.navigate(item.id, {}, true)}
          class="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 hover:text-accent"
          class:text-accent={isActive}
          class:text-text-secondary={!isActive}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="shrink-0 {isActive ? 'text-accent' : ''}"
          >
            {@html item.icon}
          </svg>
          {item.label}
        </button>
      {/each}
    </div>

    <!-- Divider -->
    <div class="mx-4 mt-5 mb-4 h-px" style="background: rgba(255,255,255,0.06);"></div>

    <!-- Now Playing card -->
    <div class="mx-2 px-3 py-3 rounded-xl min-h-[64px]" style="background: rgba(255,255,255,0.06);">
      {#if player.currentTrack}
        <div class="text-[10px] uppercase tracking-widest text-text-tertiary font-semibold mb-2">Now Playing</div>
        <div class="flex items-center gap-2.5">
          <img
            src={upscaleThumbnail(player.currentTrack.thumbnail, 120)}
            alt={player.currentTrack.title}
            class="w-9 h-9 rounded-lg object-cover shrink-0"
            style="box-shadow: 0 2px 8px rgba(0,0,0,0.5);"
            onerror={(e: Event) => { const el = e.target as HTMLImageElement; if (el.src.includes('maxresdefault')) el.src = el.src.replace('maxresdefault', 'hqdefault'); }}
          />
          <div class="min-w-0">
            <div class="text-xs font-medium truncate leading-snug text-text-primary">{player.currentTrack.title}</div>
            <div class="text-[11px] text-text-tertiary truncate mt-0.5">{player.currentTrack.artist}</div>
          </div>
        </div>
      {:else}
        <div class="text-[10px] uppercase tracking-widest text-text-tertiary font-semibold mb-2">Now Playing</div>
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-lg shrink-0 skeleton"></div>
          <div class="flex-1 space-y-1.5">
            <div class="h-2.5 skeleton rounded w-4/5"></div>
            <div class="h-2 skeleton rounded w-3/5"></div>
          </div>
        </div>
      {/if}
    </div>

    <div class="mt-auto px-2 pb-4"></div>
  </div>
</nav>
