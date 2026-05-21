<script lang="ts">
  import { onMount } from "svelte";
  import { initApi, getBaseUrl, setBaseUrl } from "$lib/services/api";
  import { initDb } from "$lib/stores/library.svelte";
  import MainLayout from "$lib/components/layout/MainLayout.svelte";

  let loading = $state(true);

  onMount(() => {
    initApi();
    initDb();
    waitForServer();
  });

  async function waitForServer(): Promise<void> {
    const url = getBaseUrl();
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`${url}/api/health`);
        if (res.ok) {
          loading = false;
          return;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 1000));
    }
    loading = false;
  }
</script>

{#if loading}
  <div
    class="h-screen flex flex-col items-center justify-center gap-3 bg-surface"
  >
    <div class="w-5 h-5 border-[1.5px] border-text-tertiary border-t-transparent rounded-full animate-spin"></div>
    <span class="text-sm text-text-tertiary">Connecting to server...</span>
  </div>
{:else}
  <MainLayout />
{/if}
