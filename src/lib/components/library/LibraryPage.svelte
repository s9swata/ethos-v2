<script lang="ts">
  import { onMount } from "svelte";
  import { Music2, ListMusic, Plus, Trash2, ChevronLeft, ListPlus } from "lucide-svelte";
  import { nav } from "$lib/stores/navigation.svelte";
  import { playTrack, addToQueue } from "$lib/stores/player.svelte";
  import {
    library,
    getLikedSongs,
    getPlaylistTracks,
    createPlaylist,
    deletePlaylist,
  } from "$lib/stores/library.svelte";
  import { upscaleThumbnail } from "$lib/utils";
  import TrackSkeleton from "$lib/components/ui/TrackSkeleton.svelte";
  import type { LikedSong, PlaylistTrack } from "$lib/stores/library.svelte";

  function parseDuration(d: string | undefined): number {
    if (!d) return 0;
    const parts = d.split(":").map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  }

  let likedSongs = $state<LikedSong[]>([]);
  let selectedPlaylist = $state<{ id: string; name: string; tracks: PlaylistTrack[] } | null>(null);
  let showCreate = $state(false);
  let newName = $state("");
  let tab = $state<"songs" | "playlists">("songs");
  let loadingSongs = $state(true);

  onMount(async () => {
    likedSongs = await getLikedSongs();
    loadingSongs = false;
  });

  async function handleCreate(): Promise<void> {
    if (!newName.trim()) return;
    await createPlaylist(newName.trim());
    newName = "";
    showCreate = false;
  }

  async function handleDeletePlaylist(id: string): Promise<void> {
    if (selectedPlaylist?.id === id) selectedPlaylist = null;
    await deletePlaylist(id);
  }

  async function handleViewPlaylist(id: string, name: string): Promise<void> {
    const tracks = await getPlaylistTracks(id);
    selectedPlaylist = { id, name, tracks };
  }

  function handlePlayTrack(trackId: string): void {
    playTrack(trackId);
  }

  // Deterministic gradient per playlist based on name
  function playlistGradient(name: string): string {
    const gradients = [
      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
      "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
      "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
      "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return gradients[Math.abs(hash) % gradients.length];
  }
</script>

<div class="p-6 page-enter">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Library</h1>
      {#if tab === "songs"}
        <p class="text-xs text-text-tertiary mt-0.5">{likedSongs.length} liked song{likedSongs.length !== 1 ? "s" : ""}</p>
      {:else}
        <p class="text-xs text-text-tertiary mt-0.5">{library.playlists.length} playlist{library.playlists.length !== 1 ? "s" : ""}</p>
      {/if}
    </div>
    <div class="flex items-center gap-1 p-1 rounded-xl" style="background: rgba(255,255,255,0.05);">
      <button
        onclick={() => (tab = "songs")}
        class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
        style={tab === "songs" ? "background: rgba(255,42,59,0.15); color: var(--color-accent);" : "color: var(--color-text-secondary);"}
      >
        <Music2 size={13} />
        Songs
      </button>
      <button
        onclick={() => (tab = "playlists")}
        class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
        style={tab === "playlists" ? "background: rgba(255,42,59,0.15); color: var(--color-accent);" : "color: var(--color-text-secondary);"}
      >
        <ListMusic size={13} />
        Playlists
      </button>
    </div>
  </div>

  <!-- Playlist detail view -->
  {#if selectedPlaylist}
    <div class="page-enter">
      <button
        onclick={() => (selectedPlaylist = null)}
        class="flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary transition-colors mb-4"
      >
        <ChevronLeft size={16} />
        Back
      </button>
      <h2 class="text-xl font-bold tracking-tight mb-4">{selectedPlaylist.name}</h2>
      {#if selectedPlaylist.tracks.length === 0}
        <div class="text-center py-20">
          <ListMusic size={40} class="mx-auto text-text-tertiary/30 mb-3" />
          <div class="text-sm text-text-secondary">This playlist is empty</div>
          <div class="text-xs text-text-tertiary/60 mt-1">Add tracks from search</div>
        </div>
      {:else}
        <div class="space-y-0.5">
          {#each selectedPlaylist.tracks as track}
            <div class="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-all text-left group">
              <button
                onclick={() => handlePlayTrack(track.track_id)}
                class="flex items-center gap-3 min-w-0 flex-1"
              >
                <img
                  src={upscaleThumbnail(track.thumbnail, 120)}
                  alt={track.title}
                  onerror={(e: Event) => { const img = e.target as HTMLImageElement; img.style.display = "none"; }}
                  class="w-10 h-10 rounded-lg object-cover shrink-0 shadow-md"
                />
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium truncate">{track.title}</div>
                  <div class="text-xs text-text-tertiary/50 truncate mt-0.5">{track.artist}</div>
                </div>
              </button>
              <button
                onclick={() => addToQueue({
                  videoId: track.track_id,
                  title: track.title,
                  artist: track.artist,
                  thumbnail: track.thumbnail,
                  duration: parseDuration(track.duration),
                  album: track.album ?? undefined,
                })}
                class="text-text-tertiary hover:text-accent transition-colors p-1 shrink-0 opacity-0 group-hover:opacity-100"
                aria-label="Add to queue"
              >
                <ListPlus size={14} />
              </button>
              <span class="text-xs text-text-tertiary/40 tabular-nums shrink-0">{track.duration}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  {:else if tab === "songs"}
    {#if loadingSongs}
      <div class="space-y-0.5">
        {#each { length: 6 } as _}
          <TrackSkeleton />
        {/each}
      </div>
    {:else if likedSongs.length === 0}
      <div class="text-center py-24">
        <div class="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style="background: rgba(255,42,59,0.1);">
          <Music2 size={28} class="text-accent" />
        </div>
        <div class="text-sm font-medium text-text-secondary mb-1">No liked songs yet</div>
        <div class="text-xs text-text-tertiary/60">Heart a track from search or artist pages to save it here</div>
      </div>
    {:else}
      <div class="space-y-0.5">
        {#each likedSongs as song, i}
          <div
            class="row-animate flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-all text-left group"
            style="animation-delay: {Math.min(i * 20, 300)}ms"
          >
            <button
              onclick={() => handlePlayTrack(song.id)}
              class="flex items-center gap-3 min-w-0 flex-1"
            >
              <img
                src={upscaleThumbnail(song.thumbnail, 120)}
                alt={song.title}
                onerror={(e: Event) => { const img = e.target as HTMLImageElement; img.style.display = "none"; }}
                class="w-10 h-10 rounded-lg object-cover shrink-0 shadow-md"
              />
              <div class="min-w-0 flex-1">
                <div class="text-sm font-medium truncate">{song.title}</div>
                <div class="text-xs text-text-tertiary/50 truncate mt-0.5">{song.artist}</div>
              </div>
            </button>
            <button
              onclick={() => addToQueue({
                videoId: song.id,
                title: song.title,
                artist: song.artist,
                thumbnail: song.thumbnail,
                duration: parseDuration(song.duration),
                album: song.album ?? undefined,
              })}
              class="text-text-tertiary hover:text-accent transition-colors p-1 shrink-0 opacity-0 group-hover:opacity-100"
              aria-label="Add to queue"
            >
              <ListPlus size={14} />
            </button>
            <span class="text-xs text-text-tertiary/40 tabular-nums shrink-0">{song.duration}</span>
          </div>
        {/each}
      </div>
    {/if}

  {:else}
    <!-- Playlists tab -->
    <div class="flex items-center justify-between mb-4">
      {#if showCreate}
        <div class="flex items-center gap-2">
          <input
            type="text"
            bind:value={newName}
            placeholder="Playlist name…"
            onkeydown={(e: KeyboardEvent) => e.key === "Enter" && handleCreate()}
            class="px-3 py-2 rounded-xl text-sm text-text-primary placeholder:text-text-tertiary/40 focus:outline-none border transition-all"
            style="background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); focus:border-color: rgba(255,42,59,0.35);"
          />
          <button
            onclick={handleCreate}
            class="px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
            style="background: linear-gradient(135deg, #ff4755 0%, #cc1a2b 100%);"
          >
            Create
          </button>
          <button
            onclick={() => (showCreate = false)}
            class="px-3 py-2 text-sm text-text-tertiary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      {:else}
        <button
          onclick={() => (showCreate = true)}
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary transition-all border border-white/[0.07] hover:border-white/[0.13] hover:bg-white/[0.05]"
        >
          <Plus size={14} />
          New Playlist
        </button>
      {/if}
    </div>

    {#if library.playlists.length === 0}
      <div class="text-center py-24">
        <div class="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style="background: rgba(255,255,255,0.05);">
          <ListMusic size={28} class="text-text-tertiary/50" />
        </div>
        <div class="text-sm font-medium text-text-secondary mb-1">No playlists yet</div>
        <div class="text-xs text-text-tertiary/60">Create one to start organizing your music</div>
      </div>
    {:else}
      <div class="grid gap-2">
        {#each library.playlists as pl, i}
          <div
            role="button"
            tabindex="0"
            onclick={() => handleViewPlaylist(pl.id, pl.name)}
            onkeydown={(e: KeyboardEvent) => e.key === "Enter" && handleViewPlaylist(pl.id, pl.name)}
            class="row-animate flex items-center gap-4 w-full px-4 py-3 rounded-2xl transition-all text-left cursor-pointer border border-transparent hover:border-white/[0.07]"
            style="background: rgba(255,255,255,0.04); animation-delay: {i * 30}ms;"
          >
            <!-- Gradient icon -->
            <div
              class="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center"
              style="background: {playlistGradient(pl.name)};"
            >
              <ListMusic size={18} class="text-white/80" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold truncate">{pl.name}</div>
              <div class="text-xs text-text-tertiary/50 mt-0.5">{pl.track_count} track{pl.track_count !== 1 ? "s" : ""}</div>
            </div>
            <button
              onclick={(e: MouseEvent) => { e.stopPropagation(); handleDeletePlaylist(pl.id); }}
              class="text-text-tertiary/40 hover:text-error transition-colors p-1.5 rounded-lg hover:bg-red-500/10 shrink-0"
              aria-label="Delete playlist"
            >
              <Trash2 size={14} />
            </button>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
