<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { Shuffle, SkipBack, SkipForward, Play, Pause, Repeat, ChevronDown } from "lucide-svelte";
  import { nav } from "$lib/stores/navigation.svelte";
  import {
    player,
    togglePlay,
    setCurrentTime,
    setVolume,
    playNext,
    playPrev,
  } from "$lib/stores/player.svelte";
  import { upscaleThumbnail } from "$lib/utils";
  import GlassSurface from "$lib/components/ui/GlassSurface.svelte";
  import ElasticSlider from "$lib/components/svelte-bits/ElasticSlider.svelte";

  let seeking = $state(false);
  let seekValue = $state(0);
  let shuffle = $state(false);
  let repeat = $state(false);

  let trackThumb = $derived(player.currentTrack ? upscaleThumbnail(player.currentTrack.thumbnail, 640) : "");

  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  let timeDisplay = $derived(seeking ? seekValue : player.currentTime);
</script>

<div
  class="fixed inset-0 z-50 flex flex-col overflow-hidden"
  style="background: #080808;"
  transition:fade={{ duration: 200 }}
>
  <!-- Animated ambient background -->
  {#if trackThumb}
    <div
      class="absolute inset-0 opacity-30 pointer-events-none"
      style="
        background-image: url({trackThumb});
        background-size: cover;
        background-position: center;
        filter: blur(60px) saturate(1.4);
        animation: ambient-pulse 8s ease-in-out infinite;
      "
    ></div>
  {/if}

  <!-- Top bar -->
  <div class="relative flex items-center justify-between px-6 pt-14 pb-4 z-10">
    <button
      onclick={() => nav.navigate(nav.currentPage === "player" ? "home" : nav.currentPage)}
      class="w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-90"
      style="background: rgba(255,255,255,0.08);"
      aria-label="Close"
    >
      <ChevronDown size={20} class="text-text-primary" />
    </button>
    <span class="text-xs font-medium text-text-secondary/60 tracking-wider uppercase">Now Playing</span>
    <div class="w-9"></div>
  </div>

  <!-- Main content -->
  <div class="relative flex-1 flex flex-col items-center justify-center px-8 gap-8 z-10 min-h-0">
    <!-- Artwork with glass effect -->
    {#if trackThumb}
      <div class="w-full max-w-[360px] aspect-square" transition:fly={{ duration: 400, y: 30 }}>
        <GlassSurface
          width="100%"
          height="100%"
          borderRadius={24}
          opacity={0}
          brightness={100}
          blur={0}
          displace={0}
          class="w-full h-full"
        >
          <img
            src={trackThumb}
            alt={player.currentTrack?.title}
            class="w-full h-full object-cover"
            style="border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4);"
          />
        </GlassSurface>
      </div>
    {/if}

    <!-- Track info -->
    <div class="w-full max-w-[360px] text-center px-2">
      <h2 class="text-xl font-bold tracking-tight text-text-primary truncate">
        {player.currentTrack?.title || "No track"}
      </h2>
      <p class="text-sm text-text-secondary mt-1.5 truncate">
        {player.currentTrack?.artist || ""}
      </p>
    </div>

    <!-- Progress bar -->
    <div class="w-full max-w-[360px]">
      <ElasticSlider
        value={timeDisplay}
        min={0}
        max={player.duration || 0}
        step={0}
        scaleOnHover={false}
        onValueChange={(v) => { seeking = true; seekValue = v; }}
        onValueCommit={(v) => { setCurrentTime(v); seeking = false; }}
      />
      <div class="flex justify-between mt-1.5">
        <span class="text-[11px] text-text-tertiary/60 tabular-nums">{formatTime(timeDisplay)}</span>
        <span class="text-[11px] text-text-tertiary/60 tabular-nums">{formatTime(player.duration)}</span>
      </div>
    </div>

    <!-- Playback controls -->
    <div class="flex items-center justify-center gap-6 w-full max-w-[360px]">
      <GlassSurface width={44} height={44} borderRadius={22} opacity={0.25} blur={8} displace={0} class="!flex !items-center !justify-center">
        <button
          onclick={() => (shuffle = !shuffle)}
          class="w-full h-full flex items-center justify-center"
        >
          <Shuffle size={16} class={shuffle ? 'text-accent' : 'text-text-secondary'} />
        </button>
      </GlassSurface>

      <GlassSurface width={44} height={44} borderRadius={22} opacity={0.25} blur={8} displace={0} class="!flex !items-center !justify-center">
        <button onclick={playPrev} class="w-full h-full flex items-center justify-center">
          <SkipBack size={20} fill="currentColor" class="text-text-primary" />
        </button>
      </GlassSurface>

      <GlassSurface width={64} height={64} borderRadius={32} opacity={0.3} blur={10} displace={0} class="!flex !items-center !justify-center">
        <button
          onclick={togglePlay}
          disabled={!player.currentTrack}
          class="w-full h-full flex items-center justify-center disabled:opacity-30"
        >
          {#if player.isPlaying}
            <Pause size={26} fill="white" color="white" />
          {:else}
            <Play size={26} fill="white" color="white" class="ml-1" />
          {/if}
        </button>
      </GlassSurface>

      <GlassSurface width={44} height={44} borderRadius={22} opacity={0.25} blur={8} displace={0} class="!flex !items-center !justify-center">
        <button onclick={playNext} class="w-full h-full flex items-center justify-center">
          <SkipForward size={20} fill="currentColor" class="text-text-primary" />
        </button>
      </GlassSurface>

      <GlassSurface width={44} height={44} borderRadius={22} opacity={0.25} blur={8} displace={0} class="!flex !items-center !justify-center">
        <button
          onclick={() => (repeat = !repeat)}
          class="w-full h-full flex items-center justify-center"
        >
          <Repeat size={16} class={repeat ? 'text-accent' : 'text-text-secondary'} />
        </button>
      </GlassSurface>
    </div>

    <!-- Volume -->
    <div class="w-full max-w-[360px] flex items-center gap-3 pb-4">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-text-tertiary shrink-0"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
      <ElasticSlider
        value={player.volume}
        min={0}
        max={1}
        step={0.01}
        onValueChange={(v) => setVolume(v)}
      />
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-text-tertiary shrink-0"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
    </div>
  </div>
</div>

<style>
  @keyframes ambient-pulse {
    0%, 100% { transform: scale(1); opacity: 0.25; }
    50% { transform: scale(1.08); opacity: 0.35; }
  }
</style>
