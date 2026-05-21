<script lang="ts">
  import { Shuffle, SkipBack, SkipForward, Play, Pause, Repeat, Volume2, VolumeX } from "lucide-svelte";
  import { upscaleThumbnail } from "$lib/utils";
  import { nav, setSearchQuery } from "$lib/stores/navigation.svelte";
  import {
    player,
    togglePlay,
    setPlaying,
    setCurrentTime,
    setDuration,
    setVolume,
    playNext,
    playPrev,
  } from "$lib/stores/player.svelte";

  let audioEl: HTMLAudioElement;
  let shuffle = $state(false);
  let repeat = $state(false);

  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  function onTimeUpdate(): void {
    if (audioEl) setCurrentTime(audioEl.currentTime);
  }

  function onLoadedMetadata(): void {
    if (audioEl) setDuration(audioEl.duration || 0);
  }

  function onEnded(): void {
    if (repeat && audioEl) {
      audioEl.currentTime = 0;
      audioEl.play().catch(() => {});
    } else {
      playNext();
    }
  }

  function handleSeek(e: Event): void {
    const t = parseFloat((e.target as HTMLInputElement).value);
    audioEl.currentTime = t;
    setCurrentTime(t);
  }

  function handleVolume(e: Event): void {
    const v = parseFloat((e.target as HTMLInputElement).value);
    audioEl.volume = v;
    setVolume(v);
  }

  function handleTogglePlay(): void {
    if (!player.currentTrack) return;
    togglePlay();
  }

  function handleMute(): void {
    if (player.volume > 0) {
      audioEl.volume = 0;
      setVolume(0);
    } else {
      audioEl.volume = 1;
      setVolume(1);
    }
  }

  function handleArtistClick(): void {
    if (!player.currentTrack?.artist) return;
    setSearchQuery(player.currentTrack.artist);
    nav.navigate("search", { q: player.currentTrack.artist });
  }

  let seekFill = $derived(player.duration > 0 ? (player.currentTime / player.duration) * 100 : 0);
  let volFill = $derived(player.volume * 100);

  let prevTrackId = $state("");

  $effect(() => {
    if (!audioEl || !player.currentTrack) return;
    const trackId = player.currentTrack.id;
    if (trackId === prevTrackId) return;
    prevTrackId = trackId;
    audioEl.src = player.currentTrack.url;
  });

  $effect(() => {
    if (!audioEl || !player.currentTrack) return;
    if (player.isPlaying) {
      audioEl.play().catch(() => {});
    } else {
      audioEl.pause();
    }
  });
</script>

<footer
  class="h-[76px] shrink-0 border-t border-white/[0.05]"
  style="background: rgba(8,8,8,0.75); backdrop-filter: blur(24px) saturate(1.6); -webkit-backdrop-filter: blur(24px) saturate(1.6); box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);"
>
  <audio
    bind:this={audioEl}
    preload="auto"
    ontimeupdate={onTimeUpdate}
    onloadedmetadata={onLoadedMetadata}
    onended={onEnded}
  ></audio>

  <div class="h-full flex items-center px-5 gap-4">
    <!-- Track info -->
    <div class="flex items-center gap-3 w-56 shrink-0">
      {#if player.currentTrack}
        <div class="relative shrink-0">
          <img
            src={upscaleThumbnail(player.currentTrack.thumbnail, 180)}
            alt={player.currentTrack.title}
            class="w-11 h-11 rounded-xl object-cover"
            style="box-shadow: 0 4px 16px rgba(0,0,0,0.6);"
          />
          {#if player.isPlaying}
            <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent border-2 border-surface"></span>
          {/if}
        </div>
        <div class="min-w-0">
          <div class="text-sm font-medium truncate leading-tight text-text-primary">{player.currentTrack.title}</div>
          <button
            onclick={handleArtistClick}
            class="text-[11px] text-text-tertiary truncate mt-0.5 hover:text-accent transition-colors cursor-pointer text-left block w-full"
          >
            {player.currentTrack.artist}
          </button>
        </div>
      {:else}
        <div class="w-11 h-11 rounded-xl bg-surface-3 shrink-0 skeleton"></div>
        <div class="flex-1 space-y-1.5 min-w-0">
          <div class="h-3 skeleton rounded w-4/5"></div>
          <div class="h-2.5 skeleton rounded w-3/5"></div>
        </div>
      {/if}
    </div>

    <!-- Center controls -->
    <div class="flex-1 flex flex-col justify-center items-center min-w-0 max-w-[560px] mx-auto gap-1">
      <div class="flex items-center justify-center gap-5">
        <!-- Shuffle -->
        <button
          onclick={() => (shuffle = !shuffle)}
          class="transition-all {shuffle ? 'text-accent' : 'text-text-tertiary hover:text-text-secondary'}"
          aria-label="Shuffle"
        >
          <Shuffle size={14} />
        </button>

        <!-- Prev -->
        <button
          onclick={() => playPrev()}
          disabled={player.queueIndex <= 0 && player.autoQueueIndex <= 0}
          class="text-text-secondary hover:text-text-primary disabled:opacity-25 transition-all"
          aria-label="Previous track"
        >
          <SkipBack size={16} fill="currentColor" />
        </button>

        <!-- Play/Pause -->
        <button
          onclick={handleTogglePlay}
          disabled={!player.currentTrack}
          aria-label={player.isPlaying ? "Pause" : "Play"}
          class="w-9 h-9 flex items-center justify-center rounded-full disabled:opacity-30 transition-all active:scale-90"
          style="background: linear-gradient(135deg, #ff4755 0%, #cc1a2b 100%); box-shadow: 0 4px 16px rgba(255,42,59,0.4), 0 2px 4px rgba(0,0,0,0.4);"
        >
          {#if player.isPlaying}
            <Pause size={14} fill="white" color="white" />
          {:else}
            <Play size={14} fill="white" color="white" class="ml-0.5" />
          {/if}
        </button>

        <!-- Next -->
        <button
          onclick={() => playNext()}
          disabled={player.queueIndex >= player.queue.length - 1 && player.autoQueueIndex >= player.autoQueue.length - 1}
          class="text-text-secondary hover:text-text-primary disabled:opacity-25 transition-all"
          aria-label="Next track"
        >
          <SkipForward size={16} fill="currentColor" />
        </button>

        <!-- Repeat -->
        <button
          onclick={() => (repeat = !repeat)}
          class="transition-all {repeat ? 'text-accent' : 'text-text-tertiary hover:text-text-secondary'}"
          aria-label="Repeat"
        >
          <Repeat size={14} />
        </button>
      </div>

      <!-- Seek bar -->
      <div class="flex items-center gap-2 w-full">
        <span class="text-[10px] text-text-tertiary/50 w-8 text-right tabular-nums leading-none shrink-0">
          {formatTime(player.currentTime)}
        </span>
        <input
          type="range"
          min="0"
          max={player.duration || 0}
          value={player.currentTime}
          oninput={handleSeek}
          class="flex-1 cursor-pointer"
          style="background: linear-gradient(to right, rgba(255,255,255,0.9) {seekFill}%, rgba(255,255,255,0.12) {seekFill}%)"
        />
        <span class="text-[10px] text-text-tertiary/50 w-8 tabular-nums leading-none shrink-0">
          {formatTime(player.duration)}
        </span>
      </div>
    </div>

    <!-- Volume -->
    <div class="w-36 shrink-0 flex items-center justify-end gap-2">
      <button
        onclick={handleMute}
        class="text-text-tertiary hover:text-text-secondary transition-colors shrink-0"
        aria-label={player.volume === 0 ? "Unmute" : "Mute"}
      >
        {#if player.volume === 0}
          <VolumeX size={14} />
        {:else}
          <Volume2 size={14} />
        {/if}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={player.volume}
        oninput={handleVolume}
        class="w-24 cursor-pointer"
        style="background: linear-gradient(to right, rgba(255,255,255,0.7) {volFill}%, rgba(255,255,255,0.1) {volFill}%)"
      />
    </div>
  </div>
</footer>
