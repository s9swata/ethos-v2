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
  let titleTrackEl: HTMLElement | undefined;
  let artistTrackEl: HTMLElement | undefined;

  let trackThumb = $derived(player.currentTrack ? upscaleThumbnail(player.currentTrack.thumbnail, 640) : "");

  function setupMarquee(track: HTMLElement) {
    const container = track.parentElement;
    if (!container) return;
    const copyWidth = track.scrollWidth / 2;
    if (copyWidth > container.offsetWidth) {
      track.classList.add("marquee-active");
    } else {
      track.classList.remove("marquee-active");
    }
  }

  $effect(() => {
    void player.currentTrack;
    requestAnimationFrame(() => {
      if (titleTrackEl) setupMarquee(titleTrackEl);
      if (artistTrackEl) setupMarquee(artistTrackEl);
    });
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
      <h2 class="text-xl font-bold tracking-tight text-text-primary overflow-hidden">
        <span class="marquee-track" bind:this={titleTrackEl}>
          <span>{player.currentTrack?.title || "No track"}</span>
          <span>{player.currentTrack?.title || "No track"}</span>
        </span>
      </h2>
      <p class="text-sm text-text-secondary mt-1.5 overflow-hidden">
        <span class="marquee-track" bind:this={artistTrackEl}>
          <span>{player.currentTrack?.artist || ""}</span>
          <span>{player.currentTrack?.artist || ""}</span>
        </span>
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
      <div
        class="flex items-center justify-center"
        style="
          width: 44px; height: 44px; border-radius: 22px; overflow: hidden;
          background: rgba(28,28,30,0.7);
          backdrop-filter: blur(24px) saturate(1.4);
          -webkit-backdrop-filter: blur(24px) saturate(1.4);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 0 0 0.5px rgba(255,255,255,0.06) inset, 0 8px 32px rgba(0,0,0,0.5);
        "
      >
        <button
          onclick={() => (shuffle = !shuffle)}
          class="w-full h-full flex items-center justify-center"
        >
          <Shuffle size={16} class={shuffle ? 'text-accent' : 'text-text-secondary'} />
        </button>
      </div>

      <div
        class="flex items-center justify-center"
        style="
          width: 44px; height: 44px; border-radius: 22px; overflow: hidden;
          background: rgba(28,28,30,0.7);
          backdrop-filter: blur(24px) saturate(1.4);
          -webkit-backdrop-filter: blur(24px) saturate(1.4);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 0 0 0.5px rgba(255,255,255,0.06) inset, 0 8px 32px rgba(0,0,0,0.5);
        "
      >
        <button onclick={playPrev} class="w-full h-full flex items-center justify-center">
          <SkipBack size={20} fill="currentColor" class="text-text-primary" />
        </button>
      </div>

      <div
        class="flex items-center justify-center"
        style="
          width: 64px; height: 64px; border-radius: 32px; overflow: hidden;
          background: rgba(28,28,30,0.8);
          backdrop-filter: blur(24px) saturate(1.4);
          -webkit-backdrop-filter: blur(24px) saturate(1.4);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 0 0 0.5px rgba(255,255,255,0.06) inset, 0 8px 32px rgba(0,0,0,0.5);
        "
      >
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
      </div>

      <div
        class="flex items-center justify-center"
        style="
          width: 44px; height: 44px; border-radius: 22px; overflow: hidden;
          background: rgba(28,28,30,0.7);
          backdrop-filter: blur(24px) saturate(1.4);
          -webkit-backdrop-filter: blur(24px) saturate(1.4);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 0 0 0.5px rgba(255,255,255,0.06) inset, 0 8px 32px rgba(0,0,0,0.5);
        "
      >
        <button onclick={playNext} class="w-full h-full flex items-center justify-center">
          <SkipForward size={20} fill="currentColor" class="text-text-primary" />
        </button>
      </div>

      <div
        class="flex items-center justify-center"
        style="
          width: 44px; height: 44px; border-radius: 22px; overflow: hidden;
          background: rgba(28,28,30,0.7);
          backdrop-filter: blur(24px) saturate(1.4);
          -webkit-backdrop-filter: blur(24px) saturate(1.4);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 0 0 0.5px rgba(255,255,255,0.06) inset, 0 8px 32px rgba(0,0,0,0.5);
        "
      >
        <button
          onclick={() => (repeat = !repeat)}
          class="w-full h-full flex items-center justify-center"
        >
          <Repeat size={16} class={repeat ? 'text-accent' : 'text-text-secondary'} />
        </button>
      </div>
    </div>

    <!-- Volume hover slider -->
    <div class="absolute right-8 bottom-8 z-20">
      <div
        class="group relative flex flex-col items-center"
      >
        <!-- Vertical slider popover -->
        <div
          class="absolute bottom-full mb-3 flex flex-col items-center opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto"
        >
          <div
            class="rounded-lg p-3"
            style="
              background: rgba(28,28,30,0.8);
              backdrop-filter: blur(24px) saturate(1.4);
              -webkit-backdrop-filter: blur(24px) saturate(1.4);
              border: 1px solid rgba(255,255,255,0.1);
              box-shadow: 0 0 0 0.5px rgba(255,255,255,0.06) inset, 0 8px 32px rgba(0,0,0,0.5);
            "
          >
            <div
              class="relative"
              style="width: 4px; height: 96px; border-radius: 2px; cursor: pointer; background: rgba(255,255,255,0.12);"
              role="slider"
              tabindex="0"
              aria-valuemin={0}
              aria-valuemax={1}
              aria-valuenow={player.volume}
              onpointerdown={(e) => {
                e.stopPropagation();
                const el = e.currentTarget as HTMLElement;
                const rect = el.getBoundingClientRect();
                const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
                setVolume(Math.round(y / 0.01) * 0.01);
                const onMove = (ev: PointerEvent) => {
                  const r = el.getBoundingClientRect();
                  const vy = Math.max(0, Math.min(1, 1 - (ev.clientY - r.top) / r.height));
                  setVolume(Math.round(vy / 0.01) * 0.01);
                };
                const onUp = () => {
                  window.removeEventListener("pointermove", onMove);
                  window.removeEventListener("pointerup", onUp);
                };
                window.addEventListener("pointermove", onMove);
                window.addEventListener("pointerup", onUp);
                el.setPointerCapture(e.pointerId);
              }}
              onkeydown={(ev) => {
                if (ev.key === "ArrowUp") setVolume(Math.min(1, player.volume + 0.05));
                if (ev.key === "ArrowDown") setVolume(Math.max(0, player.volume - 0.05));
              }}
            >
              <div
                style="position: absolute; bottom: 0; width: 100%; height: {player.volume * 100}%; background: rgba(255,255,255,0.85); border-radius: 2px; transition: height 0.05s linear;"
              ></div>
            </div>
          </div>
        </div>

        <!-- Volume icon button -->
        <button
          onclick={() => setVolume(player.volume > 0 ? 0 : 1)}
          class="w-10 h-10 flex items-center justify-center rounded-full transition-all text-text-tertiary hover:text-text-primary hover:bg-white/[0.08]"
          aria-label={player.volume > 0 ? "Mute" : "Unmute"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            {#if player.volume === 0}
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/>
            {:else if player.volume < 0.5}
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            {:else}
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            {/if}
          </svg>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes ambient-pulse {
    0%, 100% { transform: scale(1); opacity: 0.25; }
    50% { transform: scale(1.08); opacity: 0.35; }
  }
  @keyframes marquee-seamless {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  :global(.marquee-track) {
    display: inline-flex;
    white-space: nowrap;
  }
  :global(.marquee-active) {
    animation: marquee-seamless 12s linear infinite;
  }
</style>
