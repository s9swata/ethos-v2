<script lang="ts">
  import { getBaseUrl, setBaseUrl } from "$lib/services/api";

  let { onclose }: { onclose: () => void } = $props();
  let url = $state(getBaseUrl());

  function save(): void {
    setBaseUrl(url);
    onclose();
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center"
  onclick={onclose}
  onkeydown={(e: KeyboardEvent) => e.key === "Escape" && onclose()}
  tabindex="-1"
  role="dialog"
  aria-label="Settings"
>
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick={onclose} onkeydown={(e: KeyboardEvent) => e.key === "Escape" && onclose()}></div>
  <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
  <div
    class="relative bg-surface-2 border border-border rounded-2xl p-7 w-96 shadow-2xl"
    onclick={(e: MouseEvent) => e.stopPropagation()}
  >
    <h2 class="text-xl font-bold tracking-tight mb-5">Settings</h2>

    <label for="api-url" class="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
      API URL
    </label>
    <input
      id="api-url"
      type="text"
      bind:value={url}
      placeholder="http://127.0.0.1:7860"
      class="w-full px-3.5 py-2.5 rounded-xl bg-surface-3 border border-border text-sm text-text-primary placeholder:text-text-tertiary/40 focus:outline-none focus:border-text-tertiary/30 transition-colors mb-1"
    />
    <p class="text-xs text-text-tertiary/60 mb-6">
      The base URL of your running ethos-api instance.
    </p>

    <div class="flex justify-end gap-2">
      <button
        onclick={onclose}
        class="px-5 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors rounded-xl hover:bg-surface-hover"
      >
        Cancel
      </button>
      <button
        onclick={save}
        class="px-5 py-2 text-sm bg-accent text-white rounded-xl font-semibold hover:bg-accent-hover active:scale-[0.97] transition-all"
      >
        Save
      </button>
    </div>
  </div>
</div>
