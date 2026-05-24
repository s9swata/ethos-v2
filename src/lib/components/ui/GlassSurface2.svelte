<script lang="ts">
    import { onMount } from "svelte";
    import type { Snippet } from "svelte";

    type MixBlend =
        | "normal"
        | "multiply"
        | "screen"
        | "overlay"
        | "darken"
        | "lighten"
        | "color-dodge"
        | "color-burn"
        | "hard-light"
        | "soft-light"
        | "difference"
        | "exclusion"
        | "hue"
        | "saturation"
        | "color"
        | "luminosity"
        | "plus-darker"
        | "plus-lighter";

    type Props = {
        children?: Snippet;
        width?: number | string;
        height?: number | string;
        borderRadius?: number;
        borderWidth?: number;
        brightness?: number;
        opacity?: number;
        blur?: number;
        displace?: number;
        backgroundOpacity?: number;
        saturation?: number;
        distortionScale?: number;
        redOffset?: number;
        greenOffset?: number;
        blueOffset?: number;
        xChannel?: "R" | "G" | "B";
        yChannel?: "R" | "G" | "B";
        mixBlendMode?: MixBlend;
        class?: string;
        style?: string;
    };

    let {
        children,
        width = 200,
        height = 80,
        borderRadius = 20,
        borderWidth = 0.07,
        brightness = 50,
        opacity = 0.93,
        blur = 11,
        displace = 0,
        backgroundOpacity = 0,
        saturation = 1,
        distortionScale = -180,
        redOffset = 0,
        greenOffset = 10,
        blueOffset = 20,
        xChannel = "R",
        yChannel = "G",
        mixBlendMode = "difference",
        class: className = "",
        style: extraStyle = "",
    }: Props = $props();

    const rawUid = $props.id();
    const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, "-");
    const filterId = `glass-filter-${uid}`;
    const redGradId = `red-grad-${uid}`;
    const blueGradId = `blue-grad-${uid}`;

    let containerRef: HTMLDivElement;
    let feImageRef: SVGFEImageElement;
    let redChannelRef: SVGFEDisplacementMapElement;
    let greenChannelRef: SVGFEDisplacementMapElement;
    let blueChannelRef: SVGFEDisplacementMapElement;
    let gaussianBlurRef: SVGFEGaussianBlurElement;

    let isDark = $state(true); // force dark since your app is dark
    let svgSupported = $state(false);

    function generateMap() {
        const rect = containerRef?.getBoundingClientRect();
        const w = rect?.width || (typeof width === "number" ? width : 400);
        const h = rect?.height || (typeof height === "number" ? height : 200);
        const edge = Math.min(w, h) * (borderWidth * 0.5);
        const cx = w / 2;
        const cy = h / 2;

        const svg = `
            <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <!-- Radial gradient: black (no displacement) in center,
                         colored (max displacement) at edges -->
                    <radialGradient id="${redGradId}" cx="50%" cy="50%" r="50%">
                        <stop offset="0%"   stop-color="black"/>
                        <stop offset="60%"  stop-color="black"/>
                        <stop offset="100%" stop-color="red"/>
                    </radialGradient>
                    <radialGradient id="${blueGradId}" cx="50%" cy="50%" r="50%">
                        <stop offset="0%"   stop-color="black"/>
                        <stop offset="60%"  stop-color="black"/>
                        <stop offset="100%" stop-color="blue"/>
                    </radialGradient>
                </defs>

                <!-- Base: black = zero displacement everywhere -->
                <rect x="0" y="0" width="${w}" height="${h}" fill="black"/>

                <!-- Red channel: radial edge displacement (horizontal) -->
                <rect x="0" y="0" width="${w}" height="${h}" rx="${borderRadius}"
                      fill="url(#${redGradId})"/>

                <!-- Blue channel: radial edge displacement (vertical)
                     blended on top -->
                <rect x="0" y="0" width="${w}" height="${h}" rx="${borderRadius}"
                      fill="url(#${blueGradId})"
                      style="mix-blend-mode: ${mixBlendMode}"/>

                <!-- Center clarity zone: bright = less distortion in middle -->
                <rect
                    x="${edge}" y="${edge}"
                    width="${w - edge * 2}" height="${h - edge * 2}"
                    rx="${borderRadius}"
                    fill="hsl(0 0% ${brightness}% / ${opacity})"
                    style="filter:blur(${blur}px)"
                />
            </svg>`;
        return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }

    function updateMap() {
        feImageRef?.setAttribute("href", generateMap());
        const list = [
            { ref: redChannelRef, offset: redOffset },
            { ref: greenChannelRef, offset: greenOffset },
            { ref: blueChannelRef, offset: blueOffset },
        ];
        for (const { ref, offset } of list) {
            if (!ref) continue;
            ref.setAttribute("scale", String(distortionScale + offset));
            ref.setAttribute("xChannelSelector", xChannel);
            ref.setAttribute("yChannelSelector", yChannel);
        }
        gaussianBlurRef?.setAttribute("stdDeviation", String(displace));
    }

    function supportsBackdropFilter() {
        return (
            typeof window !== "undefined" &&
            CSS.supports("backdrop-filter", "blur(10px)")
        );
    }

    $effect(() => {
        void [
            width,
            height,
            borderRadius,
            borderWidth,
            brightness,
            opacity,
            blur,
            displace,
            distortionScale,
            redOffset,
            greenOffset,
            blueOffset,
            xChannel,
            yChannel,
            mixBlendMode,
        ];
        queueMicrotask(updateMap);
    });

    onMount(() => {
        // Always try SVG filters — remove the Safari/Firefox block
        // that was preventing the effect from working
        svgSupported = true;

        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        isDark = true; // force dark for music app
        const ro = new ResizeObserver(() => setTimeout(updateMap, 0));
        if (containerRef) ro.observe(containerRef);
        setTimeout(updateMap, 0);
        return () => {
            ro.disconnect();
        };
    });

    const containerStyle = $derived.by(() => {
        const w = typeof width === "number" ? `${width}px` : width;
        const h = typeof height === "number" ? `${height}px` : height;
        const base = `width:${w};height:${h};border-radius:${borderRadius}px;--glass-frost:${backgroundOpacity};--glass-saturation:${saturation};`;

        if (svgSupported) {
            const bg = `hsl(0 0% 0% / ${backgroundOpacity})`;
            // Dark glass: strong inset highlights for rim lighting
            const shadow = `
                0 0 0 1px rgba(255,255,255,0.06),
                0 0 2px 1px color-mix(in oklch, white, transparent 85%) inset,
                0 0 10px 4px color-mix(in oklch, white, transparent 95%) inset,
                inset 0 1.5px 0 rgba(255,255,255,0.12),
                inset 0 -1px 0 rgba(0,0,0,0.2),
                0 8px 40px rgba(0,0,0,0.5),
                0 2px 8px rgba(0,0,0,0.3)
            `;
            return `${base}background:${bg};backdrop-filter:url(#${filterId}) saturate(${saturation}) blur(${blur * 0.5}px);-webkit-backdrop-filter:url(#${filterId}) saturate(${saturation}) blur(${blur * 0.5}px);box-shadow:${shadow};${extraStyle}`;
        }

        // Fallback for browsers that don't support SVG backdrop filters
        if (!supportsBackdropFilter()) {
            return `${base}background:rgba(0,0,0,0.5);border: 1px solid rgba(255,255,255,0.06); solid rgba(255,255,255,0.15);box-shadow:inset 0 1px 0 0 rgba(255,255,255,0.2), inset 0 -1px 0 0 rgba(255,255,255,0.1);${extraStyle}`;
        }
        return `${base}background:rgba(255,255,255,0.08);backdrop-filter:blur(28px) saturate(1.8) brightness(0.7);-webkit-backdrop-filter:blur(28px) saturate(1.8) brightness(0.7);border:1px solid rgba(255,255,255,0.15);box-shadow:inset 0 1.5px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.2), 0 8px 40px rgba(0,0,0,0.4);${extraStyle}`;
    });

    const focusCls =
        "focus-visible:outline-2 focus-visible:outline-[#0A84FF] focus-visible:outline-offset-2";
</script>

<div
    bind:this={containerRef}
    class={`relative flex items-center justify-center overflow-hidden transition-opacity duration-[260ms] ease-out ${focusCls} ${className}`}
    style={containerStyle}
>
    <svg
        class="w-full h-full pointer-events-none absolute inset-0 opacity-0 -z-10"
        xmlns="http://www.w3.org/2000/svg"
    >
        <defs>
            <filter
                id={filterId}
                color-interpolation-filters="sRGB"
                x="0%"
                y="0%"
                width="100%"
                height="100%"
            >
                <feImage
                    bind:this={feImageRef}
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    preserveAspectRatio="none"
                    result="map"
                />
                <feDisplacementMap
                    bind:this={redChannelRef}
                    in="SourceGraphic"
                    in2="map"
                    result="dispRed"
                />
                <feColorMatrix
                    in="dispRed"
                    type="matrix"
                    values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
                    result="red"
                />
                <feDisplacementMap
                    bind:this={greenChannelRef}
                    in="SourceGraphic"
                    in2="map"
                    result="dispGreen"
                />
                <feColorMatrix
                    in="dispGreen"
                    type="matrix"
                    values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
                    result="green"
                />
                <feDisplacementMap
                    bind:this={blueChannelRef}
                    in="SourceGraphic"
                    in2="map"
                    result="dispBlue"
                />
                <feColorMatrix
                    in="dispBlue"
                    type="matrix"
                    values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
                    result="blue"
                />
                <feBlend in="red" in2="green" mode="screen" result="rg" />
                <feBlend in="rg" in2="blue" mode="screen" result="output" />
                <feGaussianBlur
                    bind:this={gaussianBlurRef}
                    in="output"
                    stdDeviation="0.7"
                />
            </filter>
        </defs>
    </svg>
    <div
        class="w-full h-full flex items-center justify-center p-2 relative z-10"
        style="border-radius:inherit;"
    >
        {@render children?.()}
    </div>
</div>
