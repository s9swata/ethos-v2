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

  // Group results by type
  type GroupedResults = {
    tracks: SearchResult[];
    artists: SearchResult[];
    albums: SearchResult[];
    playlists: SearchResult[];
  };

  let grouped = $derived<GroupedResults>({
    tracks: results.filter((r) => r.type === "track"),
    artists: results.filter((r) => r.type === "artist"),
    albums: results.filter((r) => r.type === "album"),
    playlists: results.filter((r) => r.type === "playlist"),
  });

  const sections: { key: keyof GroupedResults; label: string }[] = [
    { key: "tracks", label: "Tracks" },
    { key: "artists", label: "Artists" },
    { key: "albums", label: "Albums" },
    { key: "playlists", label: "Playlists" },
  ];

  const typeColors: Record<string, string> = {
    track: "bg-accent/10 text-accent",
    artist: "bg-purple-500/10 text-purple-400",
    album: "bg-blue-500/10 text-blue-400",
    playlist: "bg-orange-500/10 text-orange-400",
  };
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
  <div class="text-center py-24">
    <div class="text-5xl mb-4">🎵</div>
    <div class="text-sm text-text-secondary font-medium">Search for music</div>
    <div class="text-xs text-text-tertiary/60 mt-1">Artists, albums, songs — all in one place</div>
  </div>
{:else}
  <div class="space-y-6 page-enter">
    {#each sections as section}
      {#if grouped[section.key].length > 0}
        <div>
          <h2 class="text-[11px] uppercase tracking-widest text-text-tertiary font-semibold mb-2 px-1">{section.label}</h2>
          <div class="space-y-0.5">
            {#each grouped[section.key] as result, i (result.id + result.type)}
              <div
                class="row-animate flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-white/[0.05] transition-all group cursor-pointer"
                style="animation-delay: {i * 25}ms"
                role="button"
                tabindex="0"
                onclick={() => result.type === "track" ? playTrack(result.id) : result.type === "artist" ? handleArtistClick(result.id) : handleAlbumClick(result.id)}
                onkeydown={(e) => e.key === "Enter" && (result.type === "track" ? playTrack(result.id) : result.type === "artist" ? handleArtistClick(result.id) : handleAlbumClick(result.id))}
              >
                <!-- Thumbnail -->
                <div class="w-11 h-11 rounded-xl shrink-0 relative overflow-hidden transition-transform duration-200 group-hover:scale-[1.05]">
                  <img
                    src={upscaleThumbnail(result.imageUrl, 320)}
                    alt={result.name}
                    class="w-full h-full object-cover"
                    class:rounded-full={result.type === "artist"}
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
                    {result.name}
                  </div>
                  {#if result.artists?.length || result.album}
                    <div class="text-xs text-text-tertiary truncate mt-0.5">
                      {result.artists?.join(", ")}
                      {#if result.album}
                        <span class="mx-1 opacity-40">·</span>{result.album}
                      {/if}
                    </div>
                  {/if}
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

                <!-- Always-visible type badge -->
                <span class="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide {typeColors[result.type] || 'bg-surface-3 text-text-tertiary'}">
                  {result.type}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  </div>
{/if}
