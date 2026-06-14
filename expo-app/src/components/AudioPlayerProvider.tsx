import { useEffect, useRef } from "react";
import { View, AppState } from "react-native";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { usePlayerStore } from "@/stores/player-store";
import { fetchTrack } from "@/stores/player-actions-next";
import { upscaleThumbnail } from "@/api/client";
import { useMediaControls } from "@/hooks/useMediaControls";
import type { QueueItem } from "@/types";

let seekToGlobal: ((time: number) => void) | null = null;

export function seekTo(time: number) {
  seekToGlobal?.(time);
}

export function AudioPlayerProvider() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying    = usePlayerStore((s) => s.isPlaying);
  const volume       = usePlayerStore((s) => s.volume);
  const repeat       = usePlayerStore((s) => s.repeat);

  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration    = usePlayerStore((s) => s.setDuration);
  const setPlaying     = usePlayerStore((s) => s.setPlaying);
  const pendingSeekTo  = usePlayerStore((s) => s.pendingSeekTo);

  const router = useRouter();
  const prevTrackId = useRef<string | null>(null);
  const pendingPlay = useRef(false);
  const lastSeek = useRef(0);
  const lastReplace = useRef(0);
  const endedRef = useRef(false);
  const establishedRef = useRef(false);

  const player = useVideoPlayer(null, (p) => {
    p.showNowPlayingNotification = true;
    p.staysActiveInBackground = true;
    p.loop = false;
    p.audioMixingMode = "duckOthers";
    p.timeUpdateEventInterval = 0.25;
  });

  useMediaControls();

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        const track = usePlayerStore.getState().currentTrack;
        if (track && usePlayerStore.getState().isPlaying) {
          router.navigate("/player");
        }
      }
    });
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    seekToGlobal = (time: number) => {
      lastSeek.current = Date.now();
      const wasPlaying = usePlayerStore.getState().isPlaying;
      player.currentTime = time;
      if (wasPlaying) player.play();
    };
    return () => { seekToGlobal = null; };
  }, [player]);

  useEffect(() => {
    const sub = player.addListener("playingChange", (e) => {
      if (Date.now() - lastSeek.current < 500) return;
      if (Date.now() - lastReplace.current < 2000) return;
      setPlaying(e.isPlaying);

      if (!e.isPlaying) {
        const state = usePlayerStore.getState();
        if (state.duration > 0 && state.currentTime >= state.duration - 2 && !endedRef.current) {
          endedRef.current = true;
          if (state.repeat === "one") {
            player.currentTime = 0;
            player.play();
          } else {
            state.playNext();
          }
        }
      } else {
        endedRef.current = false;
      }
    });
    return () => sub.remove();
  }, [player, setPlaying]);

  useEffect(() => {
    const sub = player.addListener("playToEnd", () => {
      endedRef.current = true;
      const state = usePlayerStore.getState();
      if (state.repeat === "one" && state.currentTrack) {
        player.currentTime = 0;
        player.play();
      } else {
        state.playNext();
      }
    });
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    const sub = player.addListener("timeUpdate", (e) => {
      setCurrentTime(e.currentTime);
    });
    const subLoad = player.addListener("sourceLoad", (e) => {
      if (isFinite(e.duration) && e.duration >= 0) setDuration(e.duration);
      if (pendingPlay.current) {
        pendingPlay.current = false;
        player.play();
      }
    });
    return () => { sub.remove(); subLoad.remove(); };
  }, [player, setCurrentTime, setDuration]);

  useEffect(() => {
    if (!currentTrack) return;

    if (!currentTrack.url) {
      const item: QueueItem = {
        videoId: currentTrack.id,
        title: currentTrack.title,
        artist: currentTrack.artist,
        thumbnail: currentTrack.thumbnail,
        duration: currentTrack.duration,
      };
      fetchTrack(item)
        .then((info) => {
          const store = usePlayerStore.getState();
          if (!store.currentTrack || store.currentTrack.id !== info.id) return;
          usePlayerStore.setState({
            currentTrack: { ...store.currentTrack, url: info.url, directUrl: info.directUrl, webpageUrl: info.webpageUrl, formats: info.formats, isMuxed: info.isMuxed }
          });
        })
        .catch((err) => console.warn("[AudioPlayerProvider] fetch url failed:", err));
      return;
    }

    if (currentTrack.id !== prevTrackId.current) {
      prevTrackId.current = currentTrack.id;
      establishedRef.current = false;
      setCurrentTime(0);
      lastReplace.current = Date.now();

      const thumb = currentTrack.thumbnail ? upscaleThumbnail(currentTrack.thumbnail, 640) : undefined;

      player.replace({
        uri: currentTrack.url,
        metadata: {
          title: currentTrack.title,
          artist: currentTrack.artist,
          artwork: thumb,
        },
      });

      if (isPlaying) pendingPlay.current = true;
      return;
    }

    if (!establishedRef.current) {
      establishedRef.current = true;
      if (isPlaying) player.play();
      else player.pause();
    }
  }, [currentTrack?.id, currentTrack?.url, isPlaying]);

  useEffect(() => { player.volume = volume; }, [player, volume]);

  useEffect(() => {
    player.loop = repeat === "one";
  }, [player, repeat]);

  useEffect(() => {
    if (pendingSeekTo !== null && pendingSeekTo !== undefined) {
      player.currentTime = pendingSeekTo;
      usePlayerStore.setState({ pendingSeekTo: null });
    }
  }, [player, pendingSeekTo]);

  return (
    <>
      {currentTrack?.isMuxed && (
        <View style={{ width: 0, height: 0, overflow: "hidden" }}>
          <VideoView player={player} style={{ width: 1, height: 1 }} nativeControls={false} />
        </View>
      )}
    </>
  );
}
