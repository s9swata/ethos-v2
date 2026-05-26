<script lang="ts">
    import Sidebar from "./Sidebar.svelte";
    import PlayerBar from "./PlayerBar.svelte";
    import HomePage from "../home/HomePage.svelte";
    import SearchBar from "../search/SearchBar.svelte";
    import SearchResults from "../search/SearchResults.svelte";
    import ArtistPage from "../artist/ArtistPage.svelte";
    import AlbumPage from "../album/AlbumPage.svelte";
    import LibraryPage from "../library/LibraryPage.svelte";
    import PlaylistPage from "../playlist/PlaylistPage.svelte";
    import NowPlaying from "../player/NowPlaying.svelte";
    import { nav } from "$lib/stores/navigation.svelte";
</script>

<div class="h-full flex relative">
    <div
        class="electrobun-webkit-app-region-drag absolute top-0 left-0 right-0 h-9 z-50"
    ></div>
    <Sidebar />

    <main class="flex-1 flex flex-col min-w-0 relative">
        <div class="flex-1 overflow-y-auto overflow-x-visible pb-28">
            {#key nav.currentPage}
                {#if nav.currentPage === "home"}
                    <HomePage />
                {:else if nav.currentPage === "search"}
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

        <div class="absolute bottom-0 left-0 right-0 z-30">
            <PlayerBar />
        </div>
    </main>
</div>

{#if nav.currentPage === "player"}
    <NowPlaying />
{/if}
