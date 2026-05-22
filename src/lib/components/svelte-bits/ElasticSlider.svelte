<script lang="ts">
  import { onMount } from "svelte";
  import { motionValue, animate } from "motion";

  type Props = {
    value: number;
    min?: number;
    max?: number;
    step?: number;
    scaleOnHover?: boolean;
    onValueChange?: (v: number) => void;
    onValueCommit?: (v: number) => void;
    class?: string;
  };

  let {
    value,
    min = 0,
    max = 100,
    step = 0.1,
    scaleOnHover = true,
    onValueChange,
    onValueCommit,
    class: className = "",
  }: Props = $props();

  const MAX_OVERFLOW = 50;
  let internalValue = $state(value);
  let sliderRef: HTMLDivElement;
  let outerEl: HTMLDivElement;
  let trackWrapperEl: HTMLDivElement;

  const overflow = motionValue(0);
  const scale = motionValue(1);

  $effect(() => { internalValue = value; });

  function decay(v: number, maxV: number): number {
    if (maxV === 0) return 0;
    const entry = v / maxV;
    const sigmoid = 2 * (1 / (1 + Math.exp(-entry)) - 0.5);
    return sigmoid * maxV;
  }

  function applyTransforms() {
    if (!sliderRef || !trackWrapperEl || !outerEl) return;
    const o = overflow.get();
    const s = scale.get();
    const { left, width } = sliderRef.getBoundingClientRect();
    const sx = 1 + o / Math.max(width, 1);
    const origin = o < 0 ? "right" : "left";
    trackWrapperEl.style.transform = `scaleX(${sx})`;
    trackWrapperEl.style.transformOrigin = origin;
    outerEl.style.transform = `scale(${s})`;
    outerEl.style.opacity = String(0.7 + ((s - 1) / 0.2) * 0.3);
  }

  onMount(() => {
    const unsubs = [
      overflow.on("change", applyTransforms),
      scale.on("change", applyTransforms),
    ];
    applyTransforms();
    return () => unsubs.forEach((u) => u());
  });

  function onPointerMove(e: PointerEvent) {
    if (e.buttons > 0 && sliderRef) {
      const { left, width } = sliderRef.getBoundingClientRect();
      let v = min + ((e.clientX - left) / width) * (max - min);
      if (step > 0) v = Math.round(v / step) * step;
      v = Math.min(Math.max(v, min), max);
      internalValue = v;
      onValueChange?.(v);

      const relX = e.clientX;
      const { left: sl, right: sr } = sliderRef.getBoundingClientRect();
      let newOverflow = 0;
      if (relX < sl) newOverflow = sl - relX;
      else if (relX > sr) newOverflow = relX - sr;
      overflow.jump(decay(newOverflow, MAX_OVERFLOW));
      applyTransforms();
    }
  }

  function onPointerDown(e: PointerEvent) {
    onPointerMove(e);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerUp() {
    animate(overflow, 0, { type: "spring", bounce: 0.5 });
    onValueCommit?.(internalValue);
  }

  function onEnter() { if (scaleOnHover) animate(scale, 1.1); }
  function onLeave() { animate(scale, 1); }

  const pct = $derived(max > min ? ((internalValue - min) / (max - min)) * 100 : 0);
</script>

<div
  bind:this={outerEl}
  class={className}
  onmouseenter={onEnter}
  onmouseleave={onLeave}
  ontouchstart={onEnter}
  ontouchend={onLeave}
  role="presentation"
  style="touch-action: none; user-select: none;"
>
  <div
    bind:this={sliderRef}
    onpointermove={onPointerMove}
    onpointerdown={onPointerDown}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
    onlostpointercapture={onPointerUp}
    role="slider"
    tabindex="0"
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={value}
    style="position: relative; width: 100%; cursor: grab; touch-action: none; user-select: none; padding: 12px 0; overflow: hidden;"
  >
    <div
      bind:this={trackWrapperEl}
      style="height: 4px; border-radius: 2px; background: rgba(255,255,255,0.12); overflow: hidden;"
    >
      <div
        style="height: 100%; width: {pct}%; background: rgba(255,255,255,0.85); border-radius: 2px; transition: width 0.05s linear;"
      ></div>
    </div>
  </div>
</div>
