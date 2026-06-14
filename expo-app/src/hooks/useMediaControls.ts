import { useEffect, useCallback } from "react";
import { addLikeListener, setLikeState } from "expo-music-controls";
import { usePlayerStore } from "@/stores/player-store";
import { useLibraryStore } from "@/stores/library-store";

export function useMediaControls() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const toggleLikeInStore = useLibraryStore((s) => s.toggleLike);
  const isLiked = useLibraryStore((s) => currentTrack ? s.likedIds.has(currentTrack.id) : false);

  const handleLike = useCallback(async () => {
    if (!currentTrack) return;
    const nextLiked = await toggleLikeInStore({
      id: currentTrack.id,
      title: currentTrack.title,
      artist: currentTrack.artist,
      thumbnail: currentTrack.thumbnail,
    });
    setLikeState(currentTrack.id, nextLiked);
  }, [currentTrack, toggleLikeInStore]);

  useEffect(() => {
    const sub = addLikeListener(handleLike);
    return () => sub.remove();
  }, [handleLike]);

  useEffect(() => {
    if (currentTrack) {
      setLikeState(currentTrack.id, isLiked);
    }
  }, [currentTrack?.id, isLiked]);
}
