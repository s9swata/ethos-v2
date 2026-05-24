<script lang="ts">
  import { nav, setSearchQuery } from "$lib/stores/navigation.svelte";

  let query = $state(nav.searchQuery);
  let isFocused = $state(false);

  function doSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    console.log("[SearchBar] doSearch called with trimmed=", trimmed);
    setSearchQuery(trimmed);
    console.log("[SearchBar] setSearchQuery done, now navigating");
    nav.navigate("search", { q: trimmed });
  }

  function handleSubmit(e: Event): void {
    e.preventDefault();
    doSearch(query);
  }
</script>

<form onsubmit={handleSubmit} class="w-full">
  <div class="relative group">
    <button
      type="submit"
      class="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 cursor-pointer"
      class:text-accent={isFocused}
      class:text-text-tertiary={!isFocused}
      aria-label="Search"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    </button>
    <input
      id="search-input"
      type="text"
      bind:value={query}
      onfocus={() => (isFocused = true)}
      onblur={() => (isFocused = false)}
      placeholder="Search artists, albums, songs…"
      class="w-full pl-11 pr-14 py-3 rounded-2xl text-sm text-text-primary placeholder:text-text-tertiary/60 border transition-all duration-200 focus:outline-none"
      style="background: rgba(255,255,255,0.05); border-color: {isFocused ? 'rgba(255,42,59,0.35)' : 'rgba(255,255,255,0.07)'}; box-shadow: {isFocused ? '0 0 0 3px rgba(255,42,59,0.10)' : 'none'};"
    />
    {#if !isFocused && !query}
      <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-text-tertiary/40 font-medium pointer-events-none select-none">⌘K</span>
    {/if}
  </div>
</form>
