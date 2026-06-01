import { useEffect, useRef } from "react";
import TrackPlayer from "@rntp/player";
import { Event, RepeatMode, PlayerCommand } from "@rntp/player";
import { usePlayerStore } from "@/stores/player-store";
import { fetchTrack } from "@/stores/player-actions-next";
import { upscaleThumbnail } from "@/api/client";
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

  const prevTrackId         = useRef<string | null>(null);
  const isSyncingFromNative = useRef(false);
  const commandsSet         = useRef(false);

  useEffect(() => {
    seekToGlobal = (time: number) => { TrackPlayer.seekTo(time); };
    return () => { seekToGlobal = null; };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const { position, duration } = TrackPlayer.getProgress();
        if (isFinite(position) && position >= 0 && position < 1000000) setCurrentTime(position);
        if (isFinite(duration) && duration >= 0 && duration < 1000000) setDuration(duration);
      } catch {}
    }, 250);
    return () => clearInterval(interval);
  }, [setCurrentTime, setDuration]);

  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.IsPlayingChanged, (event: { playing: boolean }) => {
      isSyncingFromNative.current = true;
      setPlaying(event.playing);
      setTimeout(() => { isSyncingFromNative.current = false; }, 0);
    });
    return () => sub.remove();
  }, [setPlaying]);

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
            currentTrack: { ...store.currentTrack, url: info.url, directUrl: info.directUrl, webpageUrl: info.webpageUrl, formats: info.formats }
          });
        })
        .catch((err) => console.warn("[AudioPlayerProvider] fetch url failed:", err));
      return;
    }

    const trackChanged = currentTrack.id !== prevTrackId.current;

    const run = async () => {
      if (trackChanged) {
        prevTrackId.current = currentTrack.id;

        try {
          const thumb = currentTrack.thumbnail ? upscaleThumbnail(currentTrack.thumbnail, 640) : undefined;

          if (!commandsSet.current) {
            TrackPlayer.setCommands({
              capabilities: [PlayerCommand.Previous, PlayerCommand.PlayPause, PlayerCommand.Next, PlayerCommand.Seek, PlayerCommand.Like],
              handling: "hybrid",
              perCommandHandling: { [PlayerCommand.Next]: "js", [PlayerCommand.Previous]: "js" },
            });
            commandsSet.current = true;
          }

          await TrackPlayer.setMediaItem({
            mediaId:    currentTrack.id,
            url:        currentTrack.url,
            title:      currentTrack.title,
            artist:     currentTrack.artist,
            artworkUrl: thumb,
            duration:   currentTrack.duration,
          });
        } catch (err) {
          console.warn("[AudioPlayerProvider] setMediaItem failed:", err);
          return;
        }

        setCurrentTime(0);
      }

      if (isSyncingFromNative.current) return;

      try {
        if (isPlaying) await TrackPlayer.play();
        else await TrackPlayer.pause();
      } catch (err) {
        console.warn("[AudioPlayerProvider] play/pause failed:", err);
      }
    };

    run();
  }, [currentTrack?.id, currentTrack?.url, isPlaying]);

  useEffect(() => { TrackPlayer.setVolume(volume); }, [volume]);

  useEffect(() => {
    TrackPlayer.setRepeatMode(repeat === "one" ? RepeatMode.One : repeat === "all" ? RepeatMode.All : RepeatMode.Off);
  }, [repeat]);

  useEffect(() => {
    if (pendingSeekTo !== null && pendingSeekTo !== undefined) {
      TrackPlayer.seekTo(pendingSeekTo);
      usePlayerStore.setState({ pendingSeekTo: null });
    }
  }, [pendingSeekTo]);

  return null;
}
