<script lang="ts">
  import { Heart, Play } from "lucide-svelte";
  import { api } from "$lib/services/api";
  import { nav } from "$lib/stores/navigation.svelte";
  import { playTrack } from "$lib/stores/player.svelte";
  import { toggleLike, library } from "$lib/stores/library.svelte";
  import { upscaleThumbnail } from "$lib/utils";
  import TrackSkeleton from "$lib/components/ui/TrackSkeleton.svelte";
  import type { ArtistInfo, SongItem, AlbumItem } from "$lib/types";

  let artist = $state<ArtistInfo | null>(null);
  let loading = $state(true);
  let error = $state("");

  $effect(() => {
    const browseId = nav.params.browseId;
    if (!browseId) return;

    loading = true;
    error = "";
    artist = null;

    api
      .getArtist(browseId)
      .then((res) => {
        artist = res;
      })
      .catch((e: unknown) => {
        error = e instanceof Error ? e.message : "Failed to load artist";
      })
      .finally(() => {
        loading = false;
      });
  });

  function handlePlaySong(song: SongItem): void {
    playTrack(song.videoId, { artistBrowseId: nav.params.browseId });
  }

  function handleAlbumClick(item: AlbumItem): void {
    nav.navigate("album", { browseId: item.browseId });
  }

  function formatListeners(n: number | undefined): string {
    if (!n) return "";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toString();
  }

  let heroThumb = $derived(artist?.thumbnails?.[0]?.url || "");
</script>

{#if loading}
  <div class="p-6 space-y-0.5 page-enter">
    <!-- Hero skeleton -->
    <div class="h-72 rounded-2xl skeleton mb-8"></div>
    {#each { length: 6 } as _}
      <TrackSkeleton />
    {/each}
  </div>
{:else if error}
  <div class="flex flex-col items-center justify-center py-24 gap-3">
    <div class="text-4xl">⚠️</div>
    <div class="text-sm text-error font-medium">{error}</div>
  </div>
{:else if artist}
  <div class="page-enter">
    <!-- Hero -->
    <div class="relative h-72 overflow-hidden">
      <!-- Ambient blurred background -->
      {#if heroThumb}
        <img
          src={upscaleThumbnail(heroThumb, 400)}
          alt=""
          aria-hidden="true"
          class="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-30 pointer-events-none"
        />
      {/if}
      <!-- Hero image -->
      <img
        src={upscaleThumbnail(heroThumb, 800)}
        alt={artist.name}
        class="w-full h-full object-cover"
        style="mask-image: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 60%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 60%, transparent 100%);"
      />
      <div class="absolute inset-0" style="background: linear-gradient(to top, var(--color-surface) 0%, rgba(3,3,3,0.5) 50%, transparent 100%);"></div>
      <div class="absolute bottom-0 left-0 p-7">
        <span class="text-[10px] uppercase tracking-widest text-text-secondary/60 font-semibold mb-2 block">Artist</span>
        <h1 class="text-4xl font-bold tracking-tight leading-none mb-3">{artist.name}</h1>
        <div class="flex items-center gap-2 flex-wrap">
          {#if artist.subscribers}
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1);">
              {artist.subscribers} subscribers
            </span>
          {/if}
          {#if artist.monthlyListeners}
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1);">
              {formatListeners(artist.monthlyListeners)} monthly listeners
            </span>
          {/if}
        </div>
      </div>
    </div>

    <div class="px-6 pb-8">
      <!-- Top Songs -->
      {#if artist.topSongs?.length}
        <section class="mb-10">
          <h2 class="text-[11px] uppercase tracking-widest text-text-tertiary font-semibold mb-3">Top Songs</h2>
          <div class="space-y-0.5">
            {#each artist.topSongs as song, i}
              <div class="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-white/[0.05] transition-all group">
                <!-- Number / play icon -->
                <button
                  onclick={() => handlePlaySong(song)}
                  class="w-7 text-right shrink-0 cursor-pointer"
                >
                  <span class="text-sm text-text-tertiary/40 tabular-nums group-hover:hidden">{i + 1}</span>
                  <span class="text-text-primary hidden group-hover:inline">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="inline"><path d="M8 5v14l11-7z"/></svg>
                  </span>
                </button>

                <!-- Thumbnail -->
                <div class="w-10 h-10 rounded-lg shrink-0 overflow-hidden">
                  <img
                    src={upscaleThumbnail(song.thumbnails?.at(-1)?.url || song.thumbnails?.[0]?.url || "", 120)}
                    alt={song.title}
                    class="w-full h-full object-cover"
                  />
                </div>

                <!-- Info -->
                <button
                  onclick={() => handlePlaySong(song)}
                  class="min-w-0 flex-1 text-left cursor-pointer"
                >
                  <div class="text-sm font-medium truncate">{song.title}</div>
                  {#if song.album}
                    <div class="text-xs text-text-tertiary/50 truncate mt-0.5">{song.album}</div>
                  {/if}
                </button>

                <!-- Actions -->
                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    onclick={(e: MouseEvent) => {
                      e.stopPropagation();
                      toggleLike(song.videoId, song.title, song.artists?.[0] || "", song.album || null, (song.thumbnails?.at(-1)?.url || song.thumbnails?.[0]?.url || ""), "");
                    }}
                    class="heart-btn text-text-tertiary hover:text-accent transition-colors p-1"
                  >
                    <Heart size={13} class={library.likedIds.has(song.videoId) ? "fill-accent text-accent" : ""} />
                  </button>
                  {#if song.isExplicit}
                    <span class="text-[9px] px-1.5 py-0.5 rounded border border-text-tertiary/20 text-text-tertiary font-bold uppercase tracking-wide">E</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <!-- Albums -->
      {#if artist.albums?.length}
        <section class="mb-10">
          <h2 class="text-[11px] uppercase tracking-widest text-text-tertiary font-semibold mb-4">Albums</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {#each artist.albums as album}
              <button onclick={() => handleAlbumClick(album)} class="text-left group">
                <div class="relative rounded-xl overflow-hidden">
                  <img
                    src={upscaleThumbnail(album.thumbnails?.[0]?.url || "", 320)}
                    alt={album.title}
                    class="w-full aspect-square object-cover transition-all duration-300 group-hover:brightness-60 group-hover:scale-[1.03]"
                  />
                  <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-xl" style="background: rgba(255,255,255,0.9);">
                      <Play size={14} class="text-black ml-0.5" fill="black" />
                    </div>
                  </div>
                </div>
                <div class="mt-2 px-0.5">
                  <div class="text-sm font-medium truncate leading-tight">{album.title}</div>
                  {#if album.year}
                    <div class="text-xs text-text-tertiary/50 mt-0.5">{album.year}</div>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        </section>
      {/if}

      <!-- Singles -->
      {#if artist.singles?.length}
        <section class="pb-8">
          <h2 class="text-[11px] uppercase tracking-widest text-text-tertiary font-semibold mb-4">Singles</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {#each artist.singles as single}
              <button onclick={() => handleAlbumClick(single)} class="text-left group">
                <div class="relative rounded-xl overflow-hidden">
                  <img
                    src={upscaleThumbnail(single.thumbnails?.[0]?.url || "", 320)}
                    alt={single.title}
                    class="w-full aspect-square object-cover transition-all duration-300 group-hover:brightness-60 group-hover:scale-[1.03]"
                  />
                  <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-xl" style="background: rgba(255,255,255,0.9);">
                      <Play size={14} class="text-black ml-0.5" fill="black" />
                    </div>
                  </div>
                </div>
                <div class="mt-2 px-0.5">
                  <div class="text-sm font-medium truncate leading-tight">{single.title}</div>
                  {#if single.year}
                    <div class="text-xs text-text-tertiary/50 mt-0.5">{single.year}</div>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        </section>
      {/if}
    </div>
  </div>
{/if}
