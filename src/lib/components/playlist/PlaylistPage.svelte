<script lang="ts">
  import { Heart, Play, Shuffle, ListPlus } from "lucide-svelte";
  import { onMount } from "svelte";
  import { nav } from "$lib/stores/navigation.svelte";
  import { api } from "$lib/services/api";
  import { playTrack, addToQueue } from "$lib/stores/player.svelte";
  import { toggleLike, library } from "$lib/stores/library.svelte";
  import { upscaleThumbnail } from "$lib/utils";
  import TrackSkeleton from "$lib/components/ui/TrackSkeleton.svelte";
  import type { QueueItem } from "$lib/types";

  let playlistThumb = $state("");
  let title = $state("");
  let tracks = $state<{ index: number; videoId: string; title: string; artists: string[]; duration: string; thumbnail: string }[]>([]);
  let loading = $state(true);
  let error = $state("");

  function parseDuration(d: string | undefined): number {
    if (!d) return 0;
    const parts = d.split(":").map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  }

  function getQueueItems(): QueueItem[] {
    return tracks.map((t) => ({
      videoId: t.videoId,
      title: t.title,
      artist: t.artists.join(", "),
      thumbnail: playlistThumb,
      duration: parseDuration(t.duration),
    }));
  }

  onMount(async () => {
    const id = nav.params.id;

    if (id) {
      try {
        const res = await api.getPlaylistV2(id);
        title = res.title;
        tracks = res.tracks;
        playlistThumb = res.thumbnail;
      } catch {
        error = "Failed to load playlist";
      }
    }

    loading = false;
  });

  function handlePlayTrack(videoId: string): void {
    const idx = tracks.findIndex((t) => t.videoId === videoId);
    playTrack(videoId, {
      title: tracks[idx]?.title,
      artistName: tracks[idx]?.artists?.[0],
      thumbnail: playlistThumb,
      queueType: "playlist",
      contextItems: getQueueItems(),
      startIndex: idx,
    });
  }

  function handlePlayAll(): void {
    const first = tracks[0];
    if (!first) return;
    playTrack(first.videoId, {
      title: first.title,
      artistName: first.artists?.[0],
      thumbnail: playlistThumb,
      queueType: "playlist",
      contextItems: getQueueItems(),
      startIndex: 0,
    });
  }

  function handleShuffle(): void {
    if (!tracks.length) return;
    const idx = Math.floor(Math.random() * tracks.length);
    const track = tracks[idx];
    playTrack(track.videoId, {
      title: track.title,
      artistName: track.artists?.[0],
      thumbnail: playlistThumb,
      queueType: "playlist",
      contextItems: getQueueItems(),
      startIndex: idx,
    });
  }
</script>

{#if loading}
  <div class="p-6 page-enter">
    <div class="flex gap-7 mb-8">
      <div class="w-52 h-52 rounded-2xl skeleton shrink-0"></div>
      <div class="flex-1 pt-4 space-y-3">
        <div class="h-3 skeleton rounded w-16"></div>
        <div class="h-8 skeleton rounded w-3/4"></div>
        <div class="h-3 skeleton rounded w-2/5"></div>
        <div class="h-9 skeleton rounded-full w-28 mt-6"></div>
      </div>
    </div>
    <div class="space-y-0.5">
      {#each { length: 8 } as _}
        <TrackSkeleton />
      {/each}
    </div>
  </div>
{:else if error}
  <div class="flex flex-col items-center justify-center py-24 gap-3">
    <div class="text-4xl">⚠️</div>
    <div class="text-sm text-error font-medium">{error}</div>
  </div>
{:else if tracks.length > 0 || title}
  <div class="page-enter">
    <!-- Header with ambient background -->
    <div class="relative overflow-hidden">
      {#if playlistThumb}
        <img
          src={upscaleThumbnail(playlistThumb, 400)}
          alt=""
          aria-hidden="true"
          class="absolute left-1/2 w-screen h-full object-cover blur-3xl opacity-25 pointer-events-none"
          style="transform: translateX(-50%);"
        />
      {/if}
      <div class="absolute inset-0 pointer-events-none" style="background: linear-gradient(to bottom, transparent 0%, var(--color-surface) 100%);"></div>

      <div class="relative flex flex-col md:flex-row items-end gap-7 px-6 pt-10 pb-8">
        <div class="shrink-0">
          {#if playlistThumb}
            <img
              src={upscaleThumbnail(playlistThumb, 640)}
              alt={title}
              class="w-52 h-52 rounded-2xl object-cover"
              style="box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 4px 20px rgba(0,0,0,0.5);"
            />
          {:else}
            <div class="w-52 h-52 rounded-2xl flex items-center justify-center" style="background: rgba(255,255,255,0.06);">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-text-tertiary/30"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
          {/if}
        </div>

        <div class="pb-1">
          <span class="text-[10px] uppercase tracking-widest text-text-secondary/60 font-semibold">Playlist</span>
          <h1 class="text-3xl font-bold tracking-tight mt-1 leading-tight mb-2">{title}</h1>
          <div class="flex items-center flex-wrap gap-1.5 text-sm text-text-secondary/80 mb-6">
            <span>{tracks.length} tracks</span>
          </div>
          <div class="flex items-center gap-3">
            <button
              onclick={handlePlayAll}
              class="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all active:scale-[0.97] hover:scale-[1.02]"
              style="background: linear-gradient(135deg, #ff4755 0%, #cc1a2b 100%); box-shadow: 0 4px 16px rgba(255,42,59,0.35);"
            >
              <Play size={14} fill="white" />
              Play
            </button>
            <button
              onclick={handleShuffle}
              class="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:bg-white/10 border border-white/10"
            >
              <Shuffle size={13} />
              Shuffle
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Track list -->
    <div class="px-6 pb-10" style="background: var(--color-surface);">
      <div class="flex items-center gap-4 px-3 py-2 text-[10px] uppercase tracking-widest text-text-tertiary/40 font-semibold border-b border-white/[0.04] mb-1">
        <span class="w-7 text-right shrink-0">#</span>
        <span class="flex-1">Title</span>
        <span class="w-20 text-right shrink-0">Duration</span>
      </div>
      <div class="space-y-0.5">
        {#each tracks as track}
          <div class="flex items-center gap-4 w-full px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-all group">
            <button
              onclick={() => handlePlayTrack(track.videoId)}
              class="w-7 text-right shrink-0 cursor-pointer"
            >
              <span class="text-sm text-text-tertiary/35 tabular-nums group-hover:hidden">{track.index}</span>
              <span class="text-text-primary hidden group-hover:inline">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="inline"><path d="M8 5v14l11-7z"/></svg>
              </span>
            </button>

            <button
              onclick={() => handlePlayTrack(track.videoId)}
              class="min-w-0 flex-1 text-left cursor-pointer"
            >
              <div class="text-sm font-medium truncate">{track.title}</div>
              {#if track.artists.length}
                <div class="text-xs text-text-tertiary/50 truncate mt-0.5">{track.artists.join(", ")}</div>
              {/if}
            </button>

            <div class="flex items-center gap-1.5 shrink-0">
              <button
                onclick={(e: MouseEvent) => {
                  e.stopPropagation();
                  addToQueue({
                    videoId: track.videoId,
                    title: track.title,
                    artist: track.artists?.[0] ?? "",
                    thumbnail: playlistThumb,
                    duration: parseDuration(track.duration),
                  });
                }}
                class="text-text-tertiary hover:text-accent transition-colors p-1 opacity-0 group-hover:opacity-100"
                aria-label="Add to queue"
              >
                <ListPlus size={14} />
              </button>
              <button
                onclick={(e: MouseEvent) => {
                  e.stopPropagation();
                  toggleLike(track.videoId, track.title, track.artists?.[0] || "", null, playlistThumb, track.duration);
                }}
                class="heart-btn text-text-tertiary hover:text-accent transition-colors p-1 opacity-0 group-hover:opacity-100"
              >
                <Heart size={13} class={library.likedIds.has(track.videoId) ? "fill-accent text-accent opacity-100!" : ""} />
              </button>
            </div>

            <span class="text-xs text-text-tertiary/40 tabular-nums w-10 text-right shrink-0">{track.duration}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}
