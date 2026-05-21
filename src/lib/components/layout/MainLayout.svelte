<script lang="ts">
  import Sidebar from "./Sidebar.svelte";
  import PlayerBar from "./PlayerBar.svelte";
  import SearchBar from "../search/SearchBar.svelte";
  import SearchResults from "../search/SearchResults.svelte";
  import ArtistPage from "../artist/ArtistPage.svelte";
  import AlbumPage from "../album/AlbumPage.svelte";
  import LibraryPage from "../library/LibraryPage.svelte";
  import PlaylistPage from "../playlist/PlaylistPage.svelte";
  import { nav } from "$lib/stores/navigation.svelte";
</script>

<div class="h-screen flex" style="background: var(--color-surface);">
  <Sidebar />

  <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
    <div class="flex-1 overflow-y-auto">
      {#key nav.currentPage}
        {#if nav.currentPage === "search"}
          <div class="page-enter">
            <div class="px-6 pt-6 pb-0 max-w-2xl">
              <SearchBar />
            </div>
            <div class="p-6">
              <SearchResults />
            </div>
          </div>
        {:else if nav.currentPage === "artist"}
          <ArtistPage />
        {:else if nav.currentPage === "album"}
          <AlbumPage />
        {:else if nav.currentPage === "library"}
          <LibraryPage />
        {:else if nav.currentPage === "playlist"}
          <PlaylistPage />
        {/if}
      {/key}
    </div>

    <PlayerBar />
  </main>
</div>
