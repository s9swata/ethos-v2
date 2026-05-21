<script lang="ts">
  import { Heart } from "lucide-svelte";
  import { api } from "$lib/services/api";
  import { nav } from "$lib/stores/navigation.svelte";
  import { playTrack } from "$lib/stores/player.svelte";
  import { toggleLike, library } from "$lib/stores/library.svelte";
  import { upscaleThumbnail } from "$lib/utils";
  import TrackSkeleton from "$lib/components/ui/TrackSkeleton.svelte";
  import type { SearchResult } from "$lib/types";

  let results = $state<SearchResult[]>([]);
  let loading = $state(false);
  let error = $state("");

  $effect(() => {
    const q = nav.searchQuery;
    if (!q) {
      results = [];
      return;
    }

    loading = true;
    error = "";
    results = [];

    api
      .search(q)
      .then((res) => {
        results = res.results;
      })
      .catch((e: unknown) => {
        error = e instanceof Error ? e.message : "Search failed";
      })
      .finally(() => {
        loading = false;
      });
  });

  function handleArtistClick(id: string): void {
    nav.navigate("artist", { browseId: id });
  }

  function handleAlbumClick(id: string): void {
    nav.navigate("album", { browseId: id });
  }

  // Loop over search results directly without grouping
</script>

{#if loading}
  <div class="space-y-0.5 page-enter">
    {#each { length: 8 } as _, i}
      <div style="animation-delay: {i * 30}ms">
        <TrackSkeleton />
      </div>
    {/each}
  </div>
{:else if error}
  <div class="text-center py-24">
    <div class="text-4xl mb-3">⚠️</div>
    <div class="text-sm text-error font-medium">{error}</div>
    <div class="text-xs text-text-tertiary/60 mt-1">Check your API connection and try again</div>
  </div>
{:else if nav.searchQuery && results.length === 0}
  <div class="text-center py-24">
    <div class="text-4xl mb-3">🔍</div>
    <div class="text-sm text-text-secondary font-medium mb-1">No results for "{nav.searchQuery}"</div>
    <div class="text-xs text-text-tertiary/60">Try a different search term</div>
  </div>
{:else if !nav.searchQuery}
  <div class="flex flex-col items-center justify-center py-32 text-center select-none page-enter">
    <h1 class="text-4xl font-semibold tracking-tight text-text-primary/20 max-w-md leading-tight">
      What do you want to listen to?
    </h1>
  </div>
{:else}
  <div class="space-y-0.5 page-enter">
    {#each results as result, i (result.id + result.type)}
      <div
        class="row-animate flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-white/[0.05] transition-all group cursor-pointer"
        style="animation-delay: {i * 25}ms"
        role="button"
        tabindex="0"
        onclick={() => result.type === "track" ? playTrack(result.id) : result.type === "artist" ? handleArtistClick(result.id) : handleAlbumClick(result.id)}
        onkeydown={(e) => e.key === "Enter" && (result.type === "track" ? playTrack(result.id) : result.type === "artist" ? handleArtistClick(result.id) : handleAlbumClick(result.id))}
      >
        <!-- Thumbnail -->
        <div
          class="w-11 h-11 shrink-0 relative overflow-hidden transition-transform duration-200 group-hover:scale-[1.05]"
          class:rounded-full={result.type === "artist"}
          class:rounded-lg={result.type !== "artist"}
        >
          <img
            src={upscaleThumbnail(result.imageUrl, 320)}
            alt={result.name}
            class="w-full h-full object-cover"
          />
          {#if result.type === "track"}
            <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
            </div>
          {:else if result.type === "album"}
            <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          {/if}
        </div>

        <!-- Info -->
        <div class="min-w-0 flex-1">
          <div class="text-sm font-medium truncate text-text-primary group-hover:text-white transition-colors">
            {#if result.type === "track" || result.type === "album"}
              {result.name}
            {:else}
              {result.name}
            {/if}
          </div>
          <div class="text-xs text-text-tertiary truncate mt-0.5 flex items-center gap-1 flex-wrap">
            {#if result.type === "artist"}
              Artist
            {:else if result.type === "playlist"}
              Playlist
            {:else if result.type === "track"}
              Song
              {#if result.artists?.length}
                <span class="text-text-tertiary/40">&bull;</span>
                {#each result.artists as artist, ai}
                  {#if result.artistId}
                    <button
                      onclick={(e: MouseEvent) => { e.stopPropagation(); handleArtistClick(result.artistId!); }}
                      class="hover:text-text-primary transition-colors underline decoration-dotted underline-offset-2 decoration-text-tertiary/30"
                    >{artist}</button>
                  {:else}
                    <span>{artist}</span>
                  {/if}
                  {#if ai < result.artists!.length - 1}<span class="text-text-tertiary/40">,</span>{/if}
                {/each}
              {/if}
              {#if result.album}
                <span class="text-text-tertiary/40">&bull;</span>
                {#if result.albumId}
                  <button
                    onclick={(e: MouseEvent) => { e.stopPropagation(); handleAlbumClick(result.albumId!); }}
                    class="hover:text-text-primary transition-colors underline decoration-dotted underline-offset-2 decoration-text-tertiary/30"
                  >{result.album}</button>
                {:else}
                  <span>{result.album}</span>
                {/if}
              {/if}
            {:else if result.type === "album"}
              Album
              {#if result.artists?.length}
                <span class="text-text-tertiary/40">&bull;</span>
                {#each result.artists as artist, ai}
                  {#if result.artistId}
                    <button
                      onclick={(e: MouseEvent) => { e.stopPropagation(); handleArtistClick(result.artistId!); }}
                      class="hover:text-text-primary transition-colors underline decoration-dotted underline-offset-2 decoration-text-tertiary/30"
                    >{artist}</button>
                  {:else}
                    <span>{artist}</span>
                  {/if}
                  {#if ai < result.artists!.length - 1}<span class="text-text-tertiary/40">,</span>{/if}
                {/each}
              {/if}
            {/if}
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {#if result.duration}
            <span class="text-[11px] text-text-tertiary/60 tabular-nums w-10 text-right">{result.duration}</span>
          {/if}
          {#if result.type === "track"}
            <button
              onclick={(e: MouseEvent) => {
                e.stopPropagation();
                toggleLike(result.id, result.name, result.artists?.[0] || "", result.album || null, result.imageUrl, result.duration || "");
              }}
              class="heart-btn text-text-tertiary hover:text-accent transition-colors p-1"
            >
              <Heart
                size={13}
                class={library.likedIds.has(result.id) ? "fill-accent text-accent" : ""}
              />
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}
