<script lang="ts">
  import { Heart, Play, Shuffle, ListPlus } from "lucide-svelte";
  import { api } from "$lib/services/api";
  import { nav } from "$lib/stores/navigation.svelte";
  import { playTrack, addToQueue } from "$lib/stores/player.svelte";
  import { toggleLike, library } from "$lib/stores/library.svelte";
  import { upscaleThumbnail } from "$lib/utils";
  import TrackSkeleton from "$lib/components/ui/TrackSkeleton.svelte";
  import type { AlbumInfo, QueueItem } from "$lib/types";

  function parseDuration(d: string | undefined): number {
    if (!d) return 0;
    const parts = d.split(":").map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  }

  let album = $state<AlbumInfo | null>(null);
  let loading = $state(true);
  let error = $state("");

  $effect(() => {
    const browseId = nav.params.browseId;
    if (!browseId) return;

    loading = true;
    error = "";
    album = null;

    api
      .getAlbum(browseId)
      .then((res) => {
        album = res;
      })
      .catch((e: unknown) => {
        error = e instanceof Error ? e.message : "Failed to load album";
      })
      .finally(() => {
        loading = false;
      });
  });

  function getQueueItems(): QueueItem[] {
    if (!album) return [];
    return album.tracks.map((t) => ({
      videoId: t.videoId,
      title: t.title,
      artist: t.artists.join(", "),
      thumbnail: albumThumb,
      duration: parseDuration(t.duration),
    }));
  }

  function trackContext(track?: { title: string }): Record<string, string | undefined> {
    const artist = album?.artists?.[0];
    return {
      artistBrowseId: artist?.id,
      artistName: artist?.name,
      thumbnail: albumThumb,
      title: track?.title,
    };
  }

  function handlePlayTrack(videoId: string): void {
    const track = album?.tracks.find((t) => t.videoId === videoId);
    const idx = album?.tracks.findIndex((t) => t.videoId === videoId) ?? 0;
    playTrack(videoId, {
      ...trackContext(track),
      queueType: "album",
      queueId: album?.audioPlaylistId,
      contextItems: getQueueItems(),
      startIndex: idx,
    });
  }

  let albumThumb = $derived(album ? (album.thumbnails?.at(-1)?.url || album.thumbnails?.[0]?.url || "") : "");

  function handlePlayAll(): void {
    if (!album) return;
    const first = album.tracks[0];
    playTrack(first.videoId, {
      ...trackContext(first),
      queueType: "album",
      queueId: album?.audioPlaylistId,
      contextItems: getQueueItems(),
      startIndex: 0,
    });
  }

  function handleShuffle(): void {
    if (!album?.tracks.length) return;
    const idx = Math.floor(Math.random() * album.tracks.length);
    const track = album.tracks[idx];
    playTrack(track.videoId, {
      ...trackContext(track),
      queueType: "album",
      queueId: album?.audioPlaylistId,
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
{:else if album}
  <div class="page-enter">
    <!-- Header with ambient background -->
    <div class="relative overflow-hidden">
      <!-- Ambient blurred art — full width -->
      {#if albumThumb}
        <img
          src={upscaleThumbnail(albumThumb, 400)}
          alt=""
          aria-hidden="true"
          class="absolute left-1/2 w-screen h-full object-cover blur-3xl opacity-25 pointer-events-none"
          style="transform: translateX(-50%);"
        />
      {/if}
      <div class="absolute inset-0 pointer-events-none" style="background: linear-gradient(to bottom, transparent 0%, var(--color-surface) 100%);"></div>

      <div class="relative flex flex-col md:flex-row items-end gap-7 px-6 pt-10 pb-8">
        <!-- Album art -->
        <div class="shrink-0">
          <img
            src={upscaleThumbnail(albumThumb, 640)}
            alt={album.title}
            class="w-52 h-52 rounded-2xl object-cover"
            style="box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 4px 20px rgba(0,0,0,0.5);"
          />
        </div>

        <!-- Info -->
        <div class="pb-1">
          <span class="text-[10px] uppercase tracking-widest text-text-secondary/60 font-semibold">{album.type}</span>
          <h1 class="text-3xl font-bold tracking-tight mt-1 leading-tight mb-2">{album.title}</h1>
          <div class="flex items-center flex-wrap gap-1.5 text-sm text-text-secondary/80 mb-6">
            {#each album.artists as artist, i}
              <button
                onclick={() => nav.navigate("artist", { browseId: artist.id })}
                class="font-medium text-text-primary hover:underline underline-offset-2 decoration-text-tertiary/30"
              >{artist.name}</button>
              {#if i < album.artists.length - 1}<span class="opacity-30">,</span>{/if}
            {/each}
            <span class="opacity-30">·</span>
            <span>{album.year}</span>
            <span class="opacity-30">·</span>
            <span>{album.trackCount} tracks</span>
            <span class="opacity-30">·</span>
            <span>{album.duration}</span>
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
          {#if album.description}
            <p class="mt-4 text-xs text-text-tertiary/60 leading-relaxed max-w-md line-clamp-3">{album.description}</p>
          {/if}
        </div>
      </div>
    </div>

    <!-- Track list -->
    <div class="px-6 pb-10" style="background: var(--color-surface);">
      <!-- Header row -->
      <div class="flex items-center gap-4 px-3 py-2 text-[10px] uppercase tracking-widest text-text-tertiary/40 font-semibold border-b border-white/[0.04] mb-1">
        <span class="w-7 text-right shrink-0">#</span>
        <span class="flex-1">Title</span>
        <span class="w-20 text-right shrink-0">Duration</span>
      </div>
      <div class="space-y-0.5">
        {#each album.tracks as track}
          <div class="flex items-center gap-4 w-full px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-all group">
            <!-- Number / play -->
            <button
              onclick={() => handlePlayTrack(track.videoId)}
              class="w-7 text-right shrink-0 cursor-pointer"
            >
              <span class="text-sm text-text-tertiary/35 tabular-nums group-hover:hidden">{track.index}</span>
              <span class="text-text-primary hidden group-hover:inline">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="inline"><path d="M8 5v14l11-7z"/></svg>
              </span>
            </button>

            <!-- Info -->
            <button
              onclick={() => handlePlayTrack(track.videoId)}
              class="min-w-0 flex-1 text-left cursor-pointer"
            >
              <div class="text-sm font-medium truncate">{track.title}</div>
              <div class="text-xs text-text-tertiary/50 truncate mt-0.5">{track.artists.join(", ")}</div>
            </button>

            <!-- Actions -->
            <div class="flex items-center gap-1.5 shrink-0">
              <button
                onclick={(e: MouseEvent) => {
                  e.stopPropagation();
                  addToQueue({
                    videoId: track.videoId,
                    title: track.title,
                    artist: track.artists?.[0] ?? "",
                    thumbnail: albumThumb,
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
                  toggleLike(track.videoId, track.title, track.artists?.[0] || "", album?.title || null, albumThumb, track.duration);
                }}
                class="heart-btn text-text-tertiary hover:text-accent transition-colors p-1 opacity-0 group-hover:opacity-100"
              >
                <Heart size={13} class={library.likedIds.has(track.videoId) ? "fill-accent text-accent opacity-100!" : ""} />
              </button>
              {#if track.isExplicit}
                <span class="text-[9px] px-1.5 py-0.5 rounded border border-text-tertiary/20 text-text-tertiary font-bold uppercase tracking-wide shrink-0">E</span>
              {/if}
            </div>

            <!-- Duration -->
            <span class="text-xs text-text-tertiary/40 tabular-nums w-10 text-right shrink-0">{track.duration}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}
