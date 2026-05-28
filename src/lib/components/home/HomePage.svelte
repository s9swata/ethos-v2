<script lang="ts">
  import { api } from "$lib/services/api";
  import { nav, setSearchQuery } from "$lib/stores/navigation.svelte";
  import { playTrack } from "$lib/stores/player.svelte";
  import { upscaleThumbnail } from "$lib/utils";
  import type { HomeSection, HomeItem } from "$lib/types";

  let sections = $state<HomeSection[]>([]);
  let loading = $state(true);
  let error = $state("");
  let searchQuery = $state("");
  let isFocused = $state(false);

  $effect(() => {
    loading = true;
    error = "";
    api
      .getHome()
      .then((res) => {
        sections = res.sections;
      })
      .catch((e: unknown) => {
        error = e instanceof Error ? e.message : "Failed to load home";
      })
      .finally(() => {
        loading = false;
      });
  });

  function greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }

  function handleSearch(e: Event): void {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearchQuery(q);
    nav.navigate("search", { q });
  }

  function navId(item: HomeItem): string {
    return item.browseId || item.id;
  }

  function handleItemClick(item: HomeItem): void {
    const tid = navId(item);
    if (!tid) return;
    if (item.type === "track") {
      playTrack(tid, { title: item.title, artistName: item.subtitle, thumbnail: item.imageUrl });
    } else if (item.type === "artist") {
      nav.navigate("artist", { browseId: tid });
    } else if (item.type === "album") {
      nav.navigate("album", { browseId: tid });
    } else if (item.type === "playlist") {
      const isTrack = /^[a-zA-Z0-9_-]{11}$/.test(tid);
      if (isTrack) { playTrack(tid, { title: item.title, artistName: item.subtitle, thumbnail: item.imageUrl }); return; }
      nav.navigate("playlist", { id: tid });
    }
  }

  function itemShape(type: string): string {
    if (type === "artist") return "rounded-full";
    return "rounded-xl";
  }
</script>

{#if loading}
  <div class="p-6 space-y-6 page-enter">
    <div class="h-8 w-56 skeleton rounded mb-6"></div>
    <div class="h-11 rounded-2xl skeleton mb-8"></div>
    {#each { length: 3 } as _}
      <div class="space-y-4">
        <div class="h-5 w-36 skeleton rounded"></div>
        <div class="flex gap-4 overflow-hidden">
          {#each { length: 6 } as _}
            <div class="shrink-0 w-[160px] space-y-2">
              <div class="w-[160px] h-[160px] skeleton rounded-xl"></div>
              <div class="h-3 w-24 skeleton rounded"></div>
              <div class="h-2.5 w-16 skeleton rounded"></div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
{:else if error}
  <div class="flex flex-col items-center justify-center py-24 gap-3">
    <div class="text-sm text-text-tertiary">{error}</div>
  </div>
{:else}
  <div class="page-enter">
    <div class="px-8 pt-12 pb-4">
      <h1 class="text-4xl font-bold tracking-tight mb-6">{greeting()}</h1>

      <form onsubmit={handleSearch}>
        <div class="relative group max-w-xl">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none {isFocused ? 'text-accent' : 'text-text-tertiary'}"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            bind:value={searchQuery}
            onfocus={() => (isFocused = true)}
            onblur={() => (isFocused = false)}
            placeholder="Search artists, albums, songs…"
            class="w-full pl-11 pr-4 py-3 rounded-2xl text-sm text-text-primary placeholder:text-text-tertiary/60 border transition-all duration-200 focus:outline-none"
            style="background: rgba(255,255,255,0.05); border-color: {isFocused ? 'rgba(255,42,59,0.35)' : 'rgba(255,255,255,0.07)'}; box-shadow: {isFocused ? '0 0 0 3px rgba(255,42,59,0.10)' : 'none'};"
          />
        </div>
      </form>
    </div>

    <div class="px-8 pb-8 space-y-10">
      {#each sections.filter(s => !s.title.toLowerCase().includes("community")) as section}
        <section>
          <h2 class="text-lg font-bold tracking-tight mb-4">{section.title}</h2>
          <div class="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth" style="scrollbar-width: none;">
            {#each section.items as item}
              <button
                onclick={() => handleItemClick(item)}
                class="shrink-0 w-[160px] snap-start text-left group"
              >
                <div class="relative mb-2.5">
                  <img
                    src={upscaleThumbnail(item.imageUrl, 320)}
                    alt={item.title}
                    class="w-full aspect-square object-cover transition-all duration-300 group-hover:brightness-60 group-hover:scale-[1.02] {itemShape(item.type)}"
                    style="background: rgba(255,255,255,0.04);"
                    loading="lazy"
                  />
                  <div class="absolute top-1.5 left-1.5">
                    <span class="text-[9px] font-semibold uppercase tracking-widest px-1.5 py-[2px] rounded-full backdrop-blur-sm" style="background: rgba(0,0,0,0.5); color: rgba(255,255,255,0.75);">
                      {item.type === "track" ? "Song" : item.type === "album" ? "Album" : item.type === "artist" ? "Artist" : item.type === "playlist" ? "Playlist" : item.type}
                    </span>
                  </div>
                  <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-xl translate-y-2 group-hover:translate-y-0 transition-transform duration-200" style="background: rgba(255,255,255,0.9);">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="black" class="ml-0.5"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                </div>
                <div class="px-0.5">
                  <div class="text-sm font-medium truncate leading-tight">{item.title}</div>
                  {#if item.subtitle}
                    <div class="text-xs text-text-tertiary truncate mt-0.5 leading-relaxed">{item.subtitle}</div>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  </div>
{/if}
