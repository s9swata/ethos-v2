<script lang="ts">
  import { onMount } from "svelte";
  import { initApi } from "$lib/services/api";
  import { initDb } from "$lib/stores/library.svelte";
  import MainLayout from "$lib/components/layout/MainLayout.svelte";

  onMount(() => {
    initApi();
    initDb();
  });
</script>

<MainLayout />
