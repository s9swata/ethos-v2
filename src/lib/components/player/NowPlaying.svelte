<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { Shuffle, SkipBack, SkipForward, Play, Pause, Repeat, ChevronDown, Music } from "lucide-svelte";
  import { nav } from "$lib/stores/navigation.svelte";
  import {
    player,
    togglePlay,
    seekTo,
    setVolume,
    playNext,
    playPrev,
  } from "$lib/stores/player.svelte";
  import { lyrics, clearLyrics, fetch } from "$lib/stores/lyrics.svelte";
  import { upscaleThumbnail } from "$lib/utils";
  import { findActiveLine } from "$lib/utils/lrc";
  import GlassSurface from "$lib/components/ui/GlassSurface.svelte";
  import ElasticSlider from "$lib/components/svelte-bits/ElasticSlider.svelte";

  let seeking = $state(false);
  let seekValue = $state(0);
  let shuffle = $state(false);
  let repeat = $state(false);
  let lyricsContainer: HTMLDivElement | undefined = $state();
  let lineEls = new Map<number, HTMLElement>();
  let lastActiveLine = $state(-1);
  let syncOffset = $state(0);
  let scrollRaf: number;

  function captureLine(el: HTMLElement, index: number) {
    lineEls.set(index, el);
    return {
      destroy() { lineEls.delete(index); },
    };
  }

  let trackThumb = $derived(player.currentTrack ? upscaleThumbnail(player.currentTrack.thumbnail, 640) : "");

  let timedLines = $derived(lyrics.timedLyrics ?? []);
  let adjustedTime = $derived(player.currentTime + syncOffset + (player.currentTrack?.startTime ?? 0));
  let activeLine = $derived(
    timedLines.length ? findActiveLine(timedLines, adjustedTime) : -1,
  );

  let displayMode = $derived<"synced" | "plain" | "loading" | "none">(
    lyrics.loading ? "loading"
    : timedLines.length ? "synced"
    : lyrics.plainText ? "plain"
    : "none"
  );

  $effect(() => {
    const track = player.currentTrack;
    if (!track) { clearLyrics(); return; }
    clearLyrics();
    fetch(track.id, track.artist, track.title, track.duration);
  });

  $effect(() => {
    if (activeLine < 0 || !lyricsContainer || activeLine === lastActiveLine) return;
    lastActiveLine = activeLine;
    const el = lineEls.get(activeLine);
    if (!el) return;

    const containerTop = lyricsContainer.getBoundingClientRect().top;
    const elTop = el.getBoundingClientRect().top;
    const targetScroll = lyricsContainer.scrollTop + elTop - containerTop - lyricsContainer.clientHeight * 0.35;

    cancelAnimationFrame(scrollRaf);

    let start: number | null = null;
    const from = lyricsContainer.scrollTop;
    const distance = targetScroll - from;
    const duration = 600;

    function step(ts: number) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      lyricsContainer!.scrollTop = from + distance * ease;
      if (progress < 1) scrollRaf = requestAnimationFrame(step);
    }

    scrollRaf = requestAnimationFrame(step);
  });

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

  <!-- Main content: left (art + controls), right (lyrics) -->
  <div class="relative flex-1 flex flex-row items-stretch px-8 pb-6 gap-8 z-10 min-h-0 overflow-hidden">

    <!-- Left: album art + info + controls -->
    <div class="flex flex-col items-center justify-center gap-5 min-w-0 flex-shrink-0" style="flex: 1 1 0%;">
      {#if trackThumb}
        <div class="w-full max-w-[300px] aspect-square" transition:fly={{ duration: 400, y: 30 }}>
          <GlassSurface
            width="100%"
            height="100%"
            borderRadius={20}
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
              style="border-radius: 18px; box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4);"
            />
          </GlassSurface>
        </div>
      {/if}

      <div class="w-full max-w-[300px] text-center">
        <h2 class="text-lg font-bold tracking-tight text-text-primary truncate">
          {player.currentTrack?.title || "No track"}
        </h2>
        <p class="text-sm text-text-secondary mt-0.5 truncate">
          {player.currentTrack?.artist || ""}
        </p>
      </div>

      <!-- Progress -->
      <div class="w-full max-w-[300px]">
        <ElasticSlider
          value={timeDisplay}
          min={0}
          max={player.duration || 0}
          step={0}
          scaleOnHover={false}
          onValueChange={(v) => { seeking = true; seekValue = v; }}
          onValueCommit={(v) => { seekTo(v); seeking = false; }}
        />
        <div class="flex justify-between mt-1">
          <span class="text-[11px] text-text-tertiary/60 tabular-nums">{formatTime(timeDisplay)}</span>
          <span class="text-[11px] text-text-tertiary/60 tabular-nums">{formatTime(player.duration)}</span>
        </div>
      </div>

      <!-- Playback controls -->
      <div class="flex items-center justify-center gap-5 w-full max-w-[300px]">
        <button onclick={() => (shuffle = !shuffle)} class="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
          <Shuffle size={14} class={shuffle ? 'text-accent' : 'text-text-secondary'} />
        </button>
        <button onclick={playPrev} class="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
          <SkipBack size={18} fill="currentColor" class="text-text-primary" />
        </button>
        <button
          onclick={togglePlay}
          disabled={!player.currentTrack}
          class="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 border border-white/10 disabled:opacity-30 transition-all active:scale-90"
        >
          {#if player.isPlaying}
            <Pause size={24} fill="white" color="white" />
          {:else}
            <Play size={24} fill="white" color="white" class="ml-1" />
          {/if}
        </button>
        <button onclick={playNext} class="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
          <SkipForward size={18} fill="currentColor" class="text-text-primary" />
        </button>
        <button onclick={() => (repeat = !repeat)} class="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
          <Repeat size={14} class={repeat ? 'text-accent' : 'text-text-secondary'} />
        </button>
      </div>

      <!-- Volume -->
      <div class="flex items-center gap-2 w-full max-w-[200px]">
        <button
          onclick={() => setVolume(player.volume > 0 ? 0 : 1)}
          class="text-text-tertiary hover:text-text-primary transition-colors shrink-0"
        >
          {#if player.volume === 0}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/>
            </svg>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          {/if}
        </button>
        <div class="flex-1">
          <ElasticSlider
            value={player.volume}
            min={0}
            max={1}
            step={0.01}
            scaleOnHover={false}
            onValueChange={(v) => setVolume(v)}
          />
        </div>
      </div>
    </div>

    <!-- Right: lyrics -->
    <div class="flex flex-col justify-center min-w-0 flex-1" style="flex: 1.4 1 0%;">
      {#if displayMode === "loading"}
        <div class="flex flex-col gap-4 px-4">
          {#each Array(8) as _}
            <div class="h-5 skeleton rounded w-3/4 opacity-30"></div>
          {/each}
        </div>
      {:else if displayMode === "synced"}
        <div
          bind:this={lyricsContainer}
          class="overflow-y-auto h-full py-8 px-4"
          style="
            scrollbar-width: none;
            mask-image: linear-gradient(to bottom, transparent 0%, black 12%, black 75%, transparent 100%);
            -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 12%, black 75%, transparent 100%);
          "
        >
          <div class="flex flex-col">
            {#each timedLines as line, i}
              {@const isActive = i === activeLine}
              {@const isPast = i < activeLine}
              <div
                use:captureLine={i}
                role="button"
                tabindex="-1"
                class="block cursor-pointer select-none py-1"
                onclick={() => seekTo(line.time)}
                onkeydown={(e) => e.key === 'Enter' && seekTo(line.time)}
              >
                <span
                  style="
                    display: block;
                    font-size: 22px;
                    font-weight: 700;
                    line-height: 1.35;
                    word-break: break-word;
                    color: {isActive ? '#fff' : isPast ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.32)'};
                    text-shadow: {isActive ? '0 0 40px rgba(255,255,255,0.35)' : 'none'};
                    transform: {isActive ? 'scale(1.03)' : 'scale(1)'};
                    transform-origin: left center;
                    will-change: transform, color;
                    transition:
                      color 0.45s cubic-bezier(0.4, 0, 0.2, 1),
                      transform 0.45s cubic-bezier(0.34, 1.4, 0.64, 1),
                      text-shadow 0.45s ease;
                  "
                >
                  {line.text || "\u00A0"}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {:else if displayMode === "plain"}
        <div class="overflow-y-auto h-full py-8 px-4" style="scrollbar-width: none;">
          <p class="text-sm text-white/50 leading-relaxed whitespace-pre-line">
            {lyrics.plainText}
          </p>
        </div>
      {:else}
        <div class="flex flex-col items-center justify-center h-full text-white/20 gap-3">
          <Music size={40} />
          <p class="text-sm">No lyrics available</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  @keyframes ambient-pulse {
    0%, 100% { transform: scale(1); opacity: 0.25; }
    50% { transform: scale(1.08); opacity: 0.35; }
  }
</style>
