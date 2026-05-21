<script lang="ts">
  import { onMount } from "svelte";
  import { initApi, setUsingSidecar } from "$lib/services/api";
  import { initDb } from "$lib/stores/library.svelte";
  import { isTauri, startApi } from "$lib/services/sidecar";
  import MainLayout from "$lib/components/layout/MainLayout.svelte";

  let loading = $state(true);
  let loadError = $state("");

  onMount(async () => {
    initApi();
    initDb();

    if (isTauri()) {
      try {
        await startApi();
        setUsingSidecar(true);
      } catch (e: unknown) {
        loadError = e instanceof Error ? e.message : "Failed to start server";
        loading = false;
        return;
      }
    }

    loading = false;
  });
</script>

{#if loading}
  <div class="h-screen flex flex-col items-center justify-center gap-3 bg-surface">
    <div class="w-5 h-5 border-[1.5px] border-text-tertiary border-t-transparent rounded-full animate-spin"></div>
    <span class="text-sm text-text-tertiary">Starting server...</span>
  </div>
{:else if loadError}
  <div class="h-screen flex flex-col items-center justify-center gap-3 bg-surface">
    <div class="text-sm text-accent">{loadError}</div>
  </div>
{:else}
  <MainLayout />
{/if}
