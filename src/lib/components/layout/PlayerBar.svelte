<script lang="ts">
    import { scale } from "svelte/transition";
    import {
        Heart,
        Shuffle,
        SkipBack,
        SkipForward,
        Play,
        Pause,
        Repeat,
        Volume2,
        VolumeX,
        ListMusic,
        Maximize2,
    } from "lucide-svelte";
    import { upscaleThumbnail } from "$lib/utils";
    import { nav, setSearchQuery } from "$lib/stores/navigation.svelte";
    import {
        player,
        togglePlay,
        setPlaying,
        setCurrentTime,
        setDuration,
        setVolume,
        playNext,
        playPrev,
    } from "$lib/stores/player.svelte";
  import { toggleLike, library } from "$lib/stores/library.svelte";
  import ElasticSlider from "$lib/components/svelte-bits/ElasticSlider.svelte";

    let audioEl: HTMLAudioElement;
    let shuffle = $state(false);
    let repeat = $state(false);
    let titleTrackEl: HTMLElement | undefined;
    let artistTrackEl: HTMLElement | undefined;

    function setupMarquee(track: HTMLElement) {
        const container = track.parentElement;
        if (!container) return;
        const copyWidth = track.scrollWidth / 2;
        if (copyWidth > container.offsetWidth) {
            track.classList.add("marquee-active");
        } else {
            track.classList.remove("marquee-active");
        }
    }

    $effect(() => {
        void player.currentTrack;
        requestAnimationFrame(() => {
            if (titleTrackEl) setupMarquee(titleTrackEl);
            if (artistTrackEl) setupMarquee(artistTrackEl);
        });
    });

    function formatTime(s: number): string {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, "0")}`;
    }

    function onTimeUpdate(): void {
        if (audioEl) setCurrentTime(audioEl.currentTime);
    }
    function onLoadedMetadata(): void {
        if (audioEl) setDuration(audioEl.duration || 0);
    }

    function onEnded(): void {
        if (repeat && audioEl) {
            audioEl.currentTime = 0;
            audioEl.play().catch(() => {});
        } else {
            playNext();
        }
    }

    function handleTogglePlay(): void {
        if (!player.currentTrack) return;
        togglePlay();
    }

    function handleMute(): void {
        if (player.volume > 0) {
            audioEl.volume = 0;
            setVolume(0);
        } else {
            audioEl.volume = 1;
            setVolume(1);
        }
    }

    let prevTrackId = $state("");

    function updateMediaSession(): void {
        if (!("mediaSession" in navigator)) return;
        const t = player.currentTrack;
        if (!t) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: t.title,
            artist: t.artist,
            album: "",
            artwork: [
                {
                    src: upscaleThumbnail(t.thumbnail, 320),
                    sizes: "320x320",
                    type: "image/jpeg",
                },
            ],
        });
    }

    $effect(() => {
        if (!audioEl || !player.currentTrack) return;
        const trackId = player.currentTrack.id;
        if (trackId === prevTrackId) return;
        prevTrackId = trackId;
        audioEl.src = player.currentTrack.url;
        updateMediaSession();
    });

    $effect(() => {
        if (!("mediaSession" in navigator)) return;
        navigator.mediaSession.setActionHandler("play", () => {
            if (player.currentTrack) togglePlay();
        });
        navigator.mediaSession.setActionHandler("pause", () => togglePlay());
        navigator.mediaSession.setActionHandler("previoustrack", () =>
            playPrev(),
        );
        navigator.mediaSession.setActionHandler("nexttrack", () => playNext());
    });

    $effect(() => {
        if (!audioEl || !player.currentTrack) return;
        if (player.isPlaying) audioEl.play().catch(() => {});
        else audioEl.pause();
    });
</script>

<footer class="shrink-0 flex flex-col items-center pb-2">
    <audio
        bind:this={audioEl}
        preload="auto"
        ontimeupdate={onTimeUpdate}
        onloadedmetadata={onLoadedMetadata}
        onended={onEnded}
        onplay={() => setPlaying(true)}
        onpause={() => setPlaying(false)}
    ></audio>

    {#if player.currentTrack}
        <div class="flex flex-col items-center gap-1 w-[70vw] max-w-[700px]">
            <!-- Pill wrapper: overflow hidden clips both backdrop and glass -->
            <div
                class="relative w-full"
                style="border-radius: 9999px; overflow: hidden;"
            >
                <!-- Backdrop color sampling layer -->
                <div
                    class="absolute inset-0 pointer-events-none"
                    style="
                        border-radius: 9999px;
                        backdrop-filter: blur(30px) brightness(0.5) saturate(2);
                        -webkit-backdrop-filter: blur(30px) brightness(0.5) saturate(2);
                        z-index: 0;
                    "
                ></div>

                <!-- Glass pill -->
                <div
                    class="flex items-center gap-4 px-5 py-3 rounded-full w-full"
                    style="
                        background: rgba(28,28,30,0.7);
                        backdrop-filter: blur(24px) saturate(1.4);
                        -webkit-backdrop-filter: blur(24px) saturate(1.4);
                        border: 1px solid rgba(255,255,255,0.1);
                        box-shadow:
                            0 0 0 0.5px rgba(255,255,255,0.06) inset,
                            0 8px 32px rgba(0,0,0,0.5);
                    "
                >
                        <!-- Left: track info -->
                        <div class="flex items-center gap-2 shrink-0 min-w-0">
                            <button
                                onclick={() => {
                                    if (player.currentAlbumId) nav.navigate("album", { browseId: player.currentAlbumId });
                                    else nav.navigate("player");
                                }}
                                class="relative shrink-0 cursor-pointer"
                                aria-label="Open album"
                            >
                                <img
                                    src={upscaleThumbnail(
                                        player.currentTrack.thumbnail,
                                        120,
                                    )}
                                    alt={player.currentTrack.title}
                                    class="w-10 h-10 rounded-lg object-cover"
                                    style="box-shadow: 0 2px 8px rgba(0,0,0,0.5);"
                                    onerror={(e: Event) => {
                                        const el = e.target as HTMLImageElement;
                                        if (el.src.includes("maxresdefault"))
                                            el.src = el.src.replace(
                                                "maxresdefault",
                                                "hqdefault",
                                            );
                                    }}
                                />
                                {#if player.isPlaying}
                                    <span
                                        class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent border-[1.5px] border-surface"
                                    ></span>
                                {/if}
                            </button>
                            <div class="min-w-0 max-w-[140px]">
                                <button
                                    onclick={() => {
                                        if (player.currentAlbumId) nav.navigate("album", { browseId: player.currentAlbumId });
                                        else nav.navigate("player");
                                    }}
                                    class="text-sm font-medium leading-tight text-text-primary hover:text-accent transition-colors w-full text-left cursor-pointer overflow-hidden"
                                >
                                    <span
                                        class="marquee-track"
                                        bind:this={titleTrackEl}
                                    >
                                        <span>{player.currentTrack.title}</span>
                                        <span>{player.currentTrack.title}</span>
                                    </span>
                                </button>
                                <button
                                    onclick={() => {
                                        if (player.currentArtistId) nav.navigate("artist", { browseId: player.currentArtistId });
                                    }}
                                    class="text-xs text-text-tertiary leading-tight hover:text-accent transition-colors w-full text-left cursor-pointer overflow-hidden"
                                >
                                    <span
                                        class="marquee-track"
                                        bind:this={artistTrackEl}
                                    >
                                        <span>{player.currentTrack.artist}</span>
                                        <span>{player.currentTrack.artist}</span>
                                    </span>
                                </button>
                            </div>
                        </div>

                        <!-- Heart -->
                        <button
                            onclick={(e: MouseEvent) => {
                                e.stopPropagation();
                                toggleLike(
                                    player.currentTrack!.id,
                                    player.currentTrack!.title,
                                    player.currentTrack!.artist,
                                    null,
                                    player.currentTrack!.thumbnail,
                                    "",
                                );
                            }}
                            class="text-text-tertiary hover:text-accent transition-colors shrink-0"
                            style={player.currentTrack && library.likedIds.has(player.currentTrack.id) ? "color: var(--color-accent);" : ""}
                        >
                            {#key library.likedIds.has(player.currentTrack?.id ?? "")}
                            <div transition:scale={{ duration: 200, start: 0.7 }}>
                                <Heart size={16} fill={player.currentTrack && library.likedIds.has(player.currentTrack.id) ? "currentColor" : "none"} />
                            </div>
                            {/key}
                        </button>

                        <!-- Center: playback controls -->
                        <div
                            class="flex items-center justify-center gap-3 flex-1 min-w-0"
                        >
                            <button
                                onclick={() => (shuffle = !shuffle)}
                                class="text-text-tertiary hover:text-text-secondary transition-colors"
                                aria-label="Shuffle"
                            >
                                <Shuffle
                                    size={16}
                                    class={shuffle ? "text-accent" : ""}
                                />
                            </button>

                            <button
                                onclick={playPrev}
                                disabled={player.queueIndex <= 0 &&
                                    player.autoQueueIndex <= 0}
                                class="text-text-secondary hover:text-text-primary disabled:opacity-25 transition-all"
                                aria-label="Previous track"
                            >
                                <SkipBack size={18} fill="currentColor" />
                            </button>

                            <button
                                onclick={handleTogglePlay}
                                disabled={!player.currentTrack}
                                aria-label={player.isPlaying ? "Pause" : "Play"}
                                class="w-10 h-10 flex items-center justify-center rounded-full disabled:opacity-30 transition-all active:scale-90 hover:bg-white/10"
                            >
                                {#if player.isPlaying}
                                    <Pause
                                        size={18}
                                        fill="white"
                                        color="white"
                                    />
                                {:else}
                                    <Play
                                        size={18}
                                        fill="white"
                                        color="white"
                                        class="ml-0.5"
                                    />
                                {/if}
                            </button>

                            <button
                                onclick={playNext}
                                disabled={player.queueIndex >=
                                    player.queue.length - 1 &&
                                    player.autoQueueIndex >=
                                        player.autoQueue.length - 1}
                                class="text-text-secondary hover:text-text-primary disabled:opacity-25 transition-all"
                                aria-label="Next track"
                            >
                                <SkipForward size={18} fill="currentColor" />
                            </button>

                            <button
                                onclick={() => (repeat = !repeat)}
                                class="text-text-tertiary hover:text-text-secondary transition-colors"
                                aria-label="Repeat"
                            >
                                <Repeat
                                    size={16}
                                    class={repeat ? "text-accent" : ""}
                                />
                            </button>
                        </div>

                        <!-- Right: utilities + volume -->
                        <div class="flex items-center gap-2 shrink-0">
                            <button
                                onclick={() => nav.navigate("player")}
                                class="text-text-tertiary hover:text-text-secondary transition-colors"
                                aria-label="Open player"
                            >
                                <Maximize2 size={16} />
                            </button>
                            <button
                                class="text-text-tertiary hover:text-text-secondary transition-colors"
                                aria-label="Queue"
                            >
                                <ListMusic size={16} />
                            </button>
                            <div class="group flex items-center">
                                <button
                                    onclick={handleMute}
                                    class="text-text-tertiary hover:text-text-secondary transition-colors"
                                    aria-label={player.volume === 0
                                        ? "Unmute"
                                        : "Mute"}
                                >
                                    {#if player.volume === 0}
                                        <VolumeX size={16} />
                                    {:else}
                                        <Volume2 size={16} />
                                    {/if}
                                </button>
                                <div class="w-0 overflow-hidden transition-all duration-200 group-hover:w-16 group-hover:ml-1.5">
                                    <ElasticSlider
                                        value={player.volume}
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        scaleOnHover={false}
                                        onValueChange={(v) => {
                                            audioEl.volume = v;
                                            setVolume(v);
                                        }}
                                    />
                                </div>
                            </div>
                    </div>
                </div>
            </div>

            <!-- Seek bar: outside pill, slim, centered -->
            <div class="flex items-center gap-2 w-[75%]">
                <span
                    class="text-[9px] text-white/30 tabular-nums shrink-0 w-6 text-right"
                >
                    {formatTime(player.currentTime)}
                </span>
                <div class="flex-1">
                    <ElasticSlider
                        value={player.currentTime}
                        min={0}
                        max={player.duration || 0}
                        step={0}
                        scaleOnHover={false}
                        onValueChange={(v) => {
                            audioEl.currentTime = v;
                            setCurrentTime(v);
                        }}
                    />
                </div>
                <span
                    class="text-[9px] text-white/30 tabular-nums shrink-0 w-6"
                >
                    {formatTime(player.duration)}
                </span>
            </div>
        </div>
    {:else}
        <!-- Empty state skeleton -->
        <div class="w-[80vw] max-w-[900px]">
            <div
                class="flex items-center gap-3 px-5 py-4 rounded-full"
                style="
                    background: rgba(255,255,255,0.06);
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                    border: 1px solid rgba(255,255,255,0.12);
                "
            >
                <div class="w-9 h-9 rounded-lg skeleton shrink-0"></div>
                <div class="flex-1 space-y-1.5">
                    <div class="h-2.5 skeleton rounded w-4/5"></div>
                    <div class="h-2 skeleton rounded w-3/5"></div>
                </div>
            </div>
        </div>
    {/if}
</footer>

<style>
  @keyframes marquee-seamless {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  :global(.marquee-track) {
    display: inline-flex;
    white-space: nowrap;
  }
  :global(.marquee-active) {
    animation: marquee-seamless 12s linear infinite;
  }
</style>
