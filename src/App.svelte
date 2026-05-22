<script lang="ts">
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { initApi, setUsingSidecar } from "$lib/services/api";
  import { initDb } from "$lib/stores/library.svelte";
  import { isTauri, startApi } from "$lib/services/sidecar";
  import MainLayout from "$lib/components/layout/MainLayout.svelte";

  let loading = $state(true);
  let ready = $state(false);
  let loadError = $state("");
  let status = $state("Starting server");
  let readyStatus = $state("");

  onMount(async () => {
    initApi();
    initDb();

    if (isTauri()) {
      status = "Starting server";
      await sleep(400);
      try {
        status = "Connecting";
        await startApi();
        setUsingSidecar(true);
        readyStatus = "Connected";
        await sleep(350);
      } catch (e: unknown) {
        loadError = e instanceof Error ? e.message : "Failed to start server";
        loading = false;
        return;
      }
    }

    loading = false;
    await sleep(80);
    ready = true;
  });

  function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
</script>

{#if !ready}
  <div
    class="h-screen flex flex-col items-center justify-center bg-surface overflow-hidden"
    transition:fade={{ duration: 200 }}
  >
    <!-- Logo -->
    <div class="flex flex-col items-center gap-2 mb-16">
      <div class="w-14 h-14 rounded-2xl flex items-center justify-center" style="background: rgba(255,42,59,0.12);">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff2a3b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="23 7 16 12 23 17 23 7"/>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
      </div>
      <h1 class="text-xl font-bold tracking-tight text-text-primary">Ethos</h1>
    </div>

    <!-- Status text -->
    <div class="text-xs text-text-tertiary font-medium mb-5 h-4">
      {#if loadError}
        {loadError}
      {:else if readyStatus}
        {readyStatus}
      {:else}
        {status}
      {/if}
    </div>

    <!-- Loading bar -->
    {#if !loadError}
      <div class="w-40 h-0.5 rounded-full overflow-hidden relative" style="background: rgba(255,255,255,0.06);">
        <div
          class="absolute inset-y-0 left-0 rounded-full"
          style="background: #ff2a3b; width: 40%; animation: loading-slide 1.2s ease-in-out infinite;"
        ></div>
      </div>
    {/if}
  </div>
{:else}
  <div transition:fade={{ duration: 300 }} class="h-full">
    <MainLayout />
  </div>
{/if}

<style>
  @keyframes loading-slide {
    0% {
      left: -40%;
    }
    100% {
      left: 100%;
    }
  }
</style>
