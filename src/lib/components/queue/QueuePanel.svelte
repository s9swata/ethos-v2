<script lang="ts">
  import { X, Music, Play } from "lucide-svelte";
  import { player, playTrack } from "$lib/stores/player.svelte";
  import { upscaleThumbnail } from "$lib/utils";
  import type { QueueItem } from "$lib/types";

  let { onClose }: { onClose: () => void } = $props();

  let MAX_VISIBLE = 50;

  let userItems = $derived(player.userQueue.slice(0, MAX_VISIBLE));
  let contextItems = $derived(player.contextQueue.slice(0, MAX_VISIBLE));

  function handlePlayItem(item: QueueItem): void {
    playTrack(item.videoId, {
      title: item.title,
      artistName: item.artist,
      thumbnail: item.thumbnail,
    });
  }

  function formatDuration(s: number): string {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
<div
  class="fixed inset-0 z-50 flex justify-end"
  onclick={onClose}
  onkeydown={(e) => e.key === 'Escape' && onClose()}
  role="dialog"
  aria-label="Queue"
  tabindex="-1"
>
  <!-- Backdrop -->
  <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    onclick={(e) => e.stopPropagation()}
    class="relative w-full max-w-[420px] h-full flex flex-col"
    style="background: #0a0a0a; border-left: 1px solid rgba(255,255,255,0.06);"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-5 pt-14 pb-3 shrink-0">
      <h2 class="text-sm font-semibold tracking-tight">Queue</h2>
      <button
        onclick={onClose}
        class="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
        aria-label="Close queue"
      >
        <X size={16} class="text-text-secondary" />
      </button>
    </div>

    <!-- Current track -->
    {#if player.currentTrack}
      <div class="px-5 pb-4 shrink-0">
        <div class="text-[10px] uppercase tracking-widest text-text-tertiary/40 font-semibold mb-2">Now Playing</div>
        <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.06]">
          <img
            src={upscaleThumbnail(player.currentTrack.thumbnail, 120)}
            alt={player.currentTrack.title}
            class="w-10 h-10 rounded-lg object-cover shrink-0"
          />
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium truncate text-text-primary">{player.currentTrack.title}</div>
            <div class="text-xs text-text-tertiary/60 truncate mt-0.5">{player.currentTrack.artist}</div>
          </div>
          <Play size={14} class="text-accent shrink-0" fill="currentColor" />
        </div>
      </div>
    {/if}

    <!-- Queue list -->
    <div class="flex-1 overflow-y-auto px-5 pb-6" style="scrollbar-width: thin;">
      <!-- User Queue (Up Next) -->
      {#if userItems.length > 0}
        <div class="text-[10px] uppercase tracking-widest text-text-tertiary/40 font-semibold mb-2 mt-1">Up Next</div>
        <div class="space-y-0.5 mb-5">
          {#each userItems as item, i}
            <button
              onclick={() => handlePlayItem(item)}
              class="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-white/[0.05] transition-all text-left group"
            >
              <span class="text-xs text-text-tertiary/30 tabular-nums w-5 text-right shrink-0">{i + 1}</span>
              <img
                src={upscaleThumbnail(item.thumbnail, 120)}
                alt={item.title}
                class="w-9 h-9 rounded-md object-cover shrink-0"
              />
              <div class="min-w-0 flex-1">
                <div class="text-sm font-medium truncate">{item.title}</div>
                <div class="text-xs text-text-tertiary/50 truncate">{item.artist}</div>
              </div>
              <span class="text-xs text-text-tertiary/30 tabular-nums shrink-0">{formatDuration(item.duration)}</span>
            </button>
          {/each}
        </div>
      {/if}

      <!-- Context Queue (Next Up) -->
      {#if contextItems.length > 0}
        <div class="text-[10px] uppercase tracking-widest text-text-tertiary/40 font-semibold mb-2 mt-1">
          {#if userItems.length > 0}Next Up{:else}Up Next{/if}
        </div>
        <div class="space-y-0.5">
          {#each contextItems as item, i}
            <button
              onclick={() => handlePlayItem(item)}
              class="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-white/[0.05] transition-all text-left group"
            >
              <span class="text-xs text-text-tertiary/30 tabular-nums w-5 text-right shrink-0">{i + 1}</span>
              <img
                src={upscaleThumbnail(item.thumbnail, 120)}
                alt={item.title}
                class="w-9 h-9 rounded-md object-cover shrink-0"
              />
              <div class="min-w-0 flex-1">
                <div class="text-sm font-medium truncate">{item.title}</div>
                <div class="text-xs text-text-tertiary/50 truncate">{item.artist}</div>
              </div>
              <span class="text-xs text-text-tertiary/30 tabular-nums shrink-0">{formatDuration(item.duration)}</span>
            </button>
          {/each}
        </div>
      {/if}

      <!-- Empty state -->
      {#if userItems.length === 0 && contextItems.length === 0}
        <div class="flex flex-col items-center justify-center py-16 gap-2 text-text-tertiary/40">
          <Music size={32} />
          <p class="text-sm">Queue is empty</p>
          <p class="text-xs">Search and play a track to get started</p>
        </div>
      {/if}
    </div>
  </div>
</div>
