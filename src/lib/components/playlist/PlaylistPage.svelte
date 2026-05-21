<script lang="ts">
  import { onMount } from "svelte";
  import { nav } from "$lib/stores/navigation.svelte";
  import { playTrack } from "$lib/stores/player.svelte";
  import { getPlaylistTracks, renamePlaylist, deletePlaylist } from "$lib/stores/library.svelte";
  import { upscaleThumbnail } from "$lib/utils";
  import type { PlaylistTrack } from "$lib/stores/library.svelte";

  let tracks = $state<PlaylistTrack[]>([]);
  let name = $state("");
  let loading = $state(true);

  onMount(async () => {
    const id = nav.params.id;
    if (!id) return;
    const nameParam = nav.params.name || "Playlist";
    name = nameParam;
    tracks = await getPlaylistTracks(id);
    loading = false;
  });

  function handlePlay(trackId: string): void {
    playTrack(trackId);
  }
</script>

{#if loading}
  <div class="flex items-center justify-center py-24">
    <div class="w-5 h-5 border-[1.5px] border-text-tertiary border-t-transparent rounded-full animate-spin"></div>
  </div>
{:else}
  <div class="p-6">
    <button
      onclick={() => nav.navigate("library")}
      class="text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1 mb-4"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      Back to Library
    </button>
    <h1 class="text-2xl font-bold tracking-tight mb-6">{name}</h1>
    <div class="space-y-0.5">
      {#each tracks as track}
        <button
          onclick={() => handlePlay(track.track_id)}
          class="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-surface-hover/50 transition-all text-left group"
        >
          <img src={upscaleThumbnail(track.thumbnail, 120)} alt={track.title} class="w-11 h-11 rounded-lg object-cover shrink-0 shadow-md" />
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium truncate">{track.title}</div>
            <div class="text-xs text-text-tertiary/60 truncate mt-0.5">{track.artist}</div>
          </div>
          <span class="text-xs text-text-tertiary/40 tabular-nums">{track.duration}</span>
        </button>
      {/each}
    </div>
  </div>
{/if}
