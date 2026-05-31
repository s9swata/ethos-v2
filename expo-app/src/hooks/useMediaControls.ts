import { useEffect } from "react";
import { addLikeListener } from "expo-music-controls";
import { usePlayerStore } from "@/stores/player-store";
import { setLikeState } from "expo-music-controls";

export function useMediaControls() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const toggleLike = usePlayerStore((s) => s.toggleLike);

  const isLiked = currentTrack ? likedTrackIds.has(currentTrack.id) : false;

  useEffect(() => {
    const sub = addLikeListener(() => {
      toggleLike();
      const track = usePlayerStore.getState().currentTrack;
      if (!track) return;
      const nextLiked = usePlayerStore.getState().likedTrackIds.has(track.id);
      setLikeState(track.id, nextLiked);
    });
    return () => sub.remove();
  }, [toggleLike]);

  useEffect(() => {
    if (currentTrack) {
      setLikeState(currentTrack.id, isLiked);
    }
  }, [currentTrack?.id, isLiked]);

  return { isLiked, toggleLike };
}
