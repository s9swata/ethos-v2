import { Platform } from "react-native";
import TrackPlayer, { Event, PlaybackState } from "@rntp/player";
import type { BackgroundEvent } from "@rntp/player";
import { usePlayerStore } from "@/stores/player-store";

const { setLikeState, emitLikePressed } = Platform.select({
  ios: () => require("expo-music-controls"),
  default: () => ({ setLikeState: () => {}, emitLikePressed: () => {} }),
})();

const g = globalThis as typeof globalThis & {
  __ethosServiceRegistered?: boolean;
};

if (!g.__ethosServiceRegistered) {
  g.__ethosServiceRegistered = true;

  TrackPlayer.registerBackgroundEventHandler(() => async (event: BackgroundEvent) => {
    switch (event.type) {
      case Event.RemotePlay:
        TrackPlayer.play();
        break;
      case Event.RemotePause:
        TrackPlayer.pause();
        break;
      case Event.RemoteStop:
        TrackPlayer.stop();
        break;
      case Event.RemoteNext:
        usePlayerStore.getState().playNext();
        break;
      case Event.RemotePrevious:
        usePlayerStore.getState().playPrev();
        break;
      case Event.RemoteSeek:
        TrackPlayer.seekTo(event.position);
        break;
      case Event.PlaybackStateChanged:
        if (event.state === PlaybackState.Ended) {
          const state = usePlayerStore.getState();
          if (state.repeat === "one" && state.currentTrack) {
            TrackPlayer.seekTo(0);
            TrackPlayer.play();
          } else {
            state.playNext();
          }
        }
        break;
      case Event.RemoteLike: {
        const store = usePlayerStore.getState();
        store.toggleLike();
        const track = store.currentTrack;
        if (track) {
          const nextLiked = !store.likedTrackIds.has(track.id);
          setLikeState(track.id, nextLiked);
        }
        emitLikePressed();
        break;
      }
    }
  });
}
