<script lang="ts">
    import {
        Shuffle,
        SkipBack,
        SkipForward,
        Play,
        Pause,
        Repeat,
        Volume2,
        VolumeX,
        ListMusic,
        MicVocal,
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
    import ElasticSlider from "$lib/components/svelte-bits/ElasticSlider.svelte";

    let audioEl: HTMLAudioElement;
    let shuffle = $state(false);
    let repeat = $state(false);

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

    function handleArtistClick(): void {
        if (player.currentArtistId) {
            nav.navigate("artist", { browseId: player.currentArtistId });
        } else if (player.currentTrack?.artist) {
            setSearchQuery(player.currentTrack.artist);
            nav.navigate("search", { q: player.currentTrack.artist });
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
        navigator.mediaSession.setActionHandler("pause", () => {
            togglePlay();
        });
        navigator.mediaSession.setActionHandler("previoustrack", () =>
            playPrev(),
        );
        navigator.mediaSession.setActionHandler("nexttrack", () => playNext());
    });

    $effect(() => {
        if (!audioEl || !player.currentTrack) return;
        if (player.isPlaying) {
            audioEl.play().catch(() => {});
        } else {
            audioEl.pause();
        }
    });
</script>

<footer class="shrink-0 px-4 py-3 flex justify-center">
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
        <div class="w-full max-w-[500px]">
            <!-- Thin seek bar above the glass pill -->
            <div class="mb-1.5 px-1">
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

            <div
                class="flex items-center gap-3 px-5 py-3 rounded-full"
                style="
        background: rgba(255,255,255,0.06);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255,255,255,0.12);
        box-shadow:
          0 0 0 0.5px rgba(255,255,255,0.08) inset,
          0 8px 32px rgba(0,0,0,0.4);
      "
            >
                <!-- Left: track info -->
                <button
                    onclick={() => nav.navigate("player")}
                    class="flex items-center gap-2.5 shrink-0 min-w-0 cursor-pointer text-left"
                    aria-label="Open player"
                >
                    <div class="relative shrink-0">
                        <img
                            src={upscaleThumbnail(
                                player.currentTrack.thumbnail,
                                120,
                            )}
                            alt={player.currentTrack.title}
                            class="w-9 h-9 rounded-lg object-cover"
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
                    </div>
                    <div class="min-w-0 max-w-[120px]">
                        <div
                            class="text-xs font-medium truncate leading-tight text-text-primary"
                        >
                            {player.currentTrack.title}
                        </div>
                        <div
                            class="text-[10px] text-text-tertiary truncate mt-0.5 leading-tight"
                        >
                            {player.currentTrack.artist}
                        </div>
                    </div>
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
                            size={13}
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
                        <SkipBack size={14} fill="currentColor" />
                    </button>

                    <button
                        onclick={handleTogglePlay}
                        disabled={!player.currentTrack}
                        aria-label={player.isPlaying ? "Pause" : "Play"}
                        class="w-8 h-8 flex items-center justify-center rounded-full disabled:opacity-30 transition-all active:scale-90 hover:bg-white/10"
                    >
                        {#if player.isPlaying}
                            <Pause size={13} fill="white" color="white" />
                        {:else}
                            <Play
                                size={13}
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
                        <SkipForward size={14} fill="currentColor" />
                    </button>

                    <button
                        onclick={() => (repeat = !repeat)}
                        class="text-text-tertiary hover:text-text-secondary transition-colors"
                        aria-label="Repeat"
                    >
                        <Repeat size={13} class={repeat ? "text-accent" : ""} />
                    </button>
                </div>

                <!-- Right: volume + utilities -->
                <div class="flex items-center gap-2 shrink-0">
                    <button
                        class="text-text-tertiary hover:text-text-secondary transition-colors"
                        aria-label="Lyrics"
                    >
                        <MicVocal size={14} />
                    </button>
                    <button
                        class="text-text-tertiary hover:text-text-secondary transition-colors"
                        aria-label="Queue"
                    >
                        <ListMusic size={14} />
                    </button>
                    <div class="flex items-center gap-1.5">
                        <button
                            onclick={handleMute}
                            class="text-text-tertiary hover:text-text-secondary transition-colors"
                            aria-label={player.volume === 0 ? "Unmute" : "Mute"}
                        >
                            {#if player.volume === 0}
                                <VolumeX size={13} />
                            {:else}
                                <Volume2 size={13} />
                            {/if}
                        </button>
                        <div class="w-16">
                            <ElasticSlider
                                value={player.volume}
                                min={0}
                                max={1}
                                step={0.01}
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
    {:else}
        <div class="w-full max-w-[500px]">
            <div
                class="flex items-center gap-3 px-4 py-2.5 rounded-full"
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
