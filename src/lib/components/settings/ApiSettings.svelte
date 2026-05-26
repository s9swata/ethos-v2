<script lang="ts">
  let { onclose }: { onclose: () => void } = $props();
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center"
  onclick={onclose}
  onkeydown={(e: KeyboardEvent) => e.key === "Escape" && onclose()}
  tabindex="-1"
  role="dialog"
  aria-label="Settings"
>
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
  <div
    class="relative bg-surface-2 border border-border rounded-2xl p-7 w-96 shadow-2xl"
    onclick={(e: MouseEvent) => e.stopPropagation()}
    onkeydown={(e: KeyboardEvent) => { if (e.key === "Escape") onclose(); }}
  >
    <h2 class="text-xl font-bold tracking-tight mb-5">Ethos</h2>

    <div class="space-y-3 text-sm text-text-secondary">
      <p>Desktop music player built with <span class="font-medium text-text-primary">Electrobun</span> + <span class="font-medium text-text-primary">Svelte 5</span>.</p>
      <p>Powered by <span class="font-medium text-text-primary">ytmusicapi</span> on the backend server.</p>
      <div class="pt-2 text-xs text-text-tertiary/60">
        <p>v0.1.0</p>
      </div>
    </div>

    <div class="flex justify-end mt-6">
      <button
        onclick={onclose}
        class="px-5 py-2 text-sm bg-accent text-white rounded-xl font-semibold hover:bg-accent-hover active:scale-[0.97] transition-all"
      >
        Close
      </button>
    </div>
  </div>
</div>
