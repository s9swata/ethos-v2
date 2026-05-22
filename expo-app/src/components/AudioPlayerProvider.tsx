import { useEffect, useRef } from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { usePlayerStore } from "@/stores/player-store";

let seekToGlobal: ((time: number) => void) | null = null;

export function seekTo(time: number) {
  seekToGlobal?.(time);
}

export function AudioPlayerProvider() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const repeat = usePlayerStore((s) => s.repeat);
  const setPlaying = usePlayerStore((s) => s.setPlaying);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const playNext = usePlayerStore((s) => s.playNext);
  const prevTrackId = useRef<string | null>(null);

  const player = useAudioPlayer(
    currentTrack?.url ? { uri: currentTrack.url } : undefined,
    { updateInterval: 250 }
  );
  const status = useAudioPlayerStatus(player);

  seekToGlobal = (time: number) => {
    player.seekTo(time);
  };

  useEffect(() => {
    if (!currentTrack?.url) return;
    if (currentTrack.id === prevTrackId.current) return;
    prevTrackId.current = currentTrack.id;
    player.replace({ uri: currentTrack.url });
    player.play();
    setPlaying(true);
  }, [currentTrack?.url, currentTrack?.id, player, setPlaying]);

  useEffect(() => {
    if (status.playing !== isPlaying) {
      if (isPlaying) {
        player.play();
      } else {
        player.pause();
      }
    }
  }, [isPlaying, player, status.playing]);

  useEffect(() => {
    player.volume = volume;
  }, [volume, player]);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        if (player.volume !== undefined) {
          const actual = Number(player.volume);
          if (!isNaN(actual) && Math.abs(actual - volume) > 0.05) {
            setVolume(actual);
          }
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [player, volume, setVolume]);

  useEffect(() => {
    setCurrentTime(status.currentTime);
    setDuration(status.duration);
  }, [status.currentTime, status.duration, setCurrentTime, setDuration]);

  useEffect(() => {
    if (status.didJustFinish) {
      if (repeat === "one") {
        player.seekTo(0);
        player.play();
      } else {
        playNext();
      }
    }
  }, [status.didJustFinish, repeat, player, playNext]);

  return null;
}
