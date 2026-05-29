<script lang="ts">
  import { onMount } from "svelte";
  import MainLayout from "$lib/components/layout/MainLayout.svelte";
  import SetupScreen from "$lib/components/SetupScreen.svelte";

  let ready = $state(false);

  onMount(async () => {
    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("wait_for_downloader");
      }
    } catch (e) {
      console.error("Setup failed, proceeding without yt-dlp:", e);
    }
    ready = true;
  });
</script>

{#if ready}
  <MainLayout />
{:else}
  <SetupScreen />
{/if}
