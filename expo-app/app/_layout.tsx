import "expo-sqlite/localStorage/install";
import { useEffect } from "react";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import TrackPlayer, { Event, PlayerCommand } from "@rntp/player";
import type { BackgroundEvent } from "@rntp/player";
import { AudioPlayerProvider } from "@/components/AudioPlayerProvider";
import { stop as stopAudioProxy } from "expo-youtube-audio-stream";
import { MiniPlayer } from "@/components/MiniPlayer";
import { useLibraryStore } from "@/stores/library-store";
import { usePlayerStore } from "@/stores/player-store";
import { initLyricsStoreListener } from "@/utils/lyrics-cache";
import { initTaste } from "@/utils/taste";
import { saveQueue } from "@/utils/queue-store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 2,
    },
  },
});

let setupDone = false;

const trackPlayerGlobals = globalThis as typeof globalThis & {
  __ethosTrackPlayerBackgroundHandlerRegistered?: boolean;
};

if (!trackPlayerGlobals.__ethosTrackPlayerBackgroundHandlerRegistered) {
  trackPlayerGlobals.__ethosTrackPlayerBackgroundHandlerRegistered = true;
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
    }
  });
}

export default function RootLayout() {
  const init = useLibraryStore((s) => s.init);

  useEffect(() => {
    if (setupDone) return;
    setupDone = true;

    try {
      TrackPlayer.setupPlayer({
        contentType: "music",
        android: {
          notification: {
            channelId: "ethos-music",
            channelName: "Ethos",
            smallIcon: "ic_launcher",
          },
        },
      });
    } catch {}

    TrackPlayer.setCommands({
      capabilities: [
        PlayerCommand.Previous,
        PlayerCommand.PlayPause,
        PlayerCommand.Next,
        PlayerCommand.Seek,
      ],
      handling: "hybrid",
      perCommandHandling: {
        [PlayerCommand.Next]: "js",
        [PlayerCommand.Previous]: "js",
      },
    });
     return () => { stopAudioProxy().catch(() => {}); };
   }, []);

  useEffect(() => {
    initLyricsStoreListener();
  }, []);

   useEffect(() => {
    init().catch((err) => console.warn("[library] init failed:", err));
    initTaste().catch((err) => console.warn("[taste] init failed:", err));
  }, [init]);

  useEffect(() => {
    const player = usePlayerStore.getState();
    player.restoreQueue().catch((err) => console.warn("[queue] restore failed:", err));

    const unsub = usePlayerStore.subscribe((state) => {
      saveQueue({
        queue: state.queue.map((t) => ({ id: t.id, title: t.title, artist: t.artist, duration: t.duration, thumbnail: t.thumbnail })),
        queueIndex: state.queueIndex,
        autoQueue: state.autoQueue,
        autoQueueIndex: state.autoQueueIndex,
        currentTrack: state.currentTrack ? { id: state.currentTrack.id, title: state.currentTrack.title, artist: state.currentTrack.artist, duration: state.currentTrack.duration, thumbnail: state.currentTrack.thumbnail } : null,
        currentTime: state.currentTime,
        duration: state.duration,
        repeat: state.repeat,
        isShuffled: state.isShuffled,
        volume: state.volume,
        currentArtistId: state.currentArtistId,
        currentAlbumId: state.currentAlbumId,
        currentAutoQueueSource: state.currentAutoQueueSource,
        playHistory: state.playHistory,
        recentAlbumIds: state.recentAlbumIds,
      }).catch(() => {});
    });

    return () => unsub();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AudioPlayerProvider />
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="artist/[browseId]"
            options={{
              headerShown: true,
              headerTransparent: true,
              headerBlurEffect: "dark",
              headerTintColor: "#fff",
              title: "",
            }}
          />
          <Stack.Screen
            name="album/[browseId]"
            options={{
              headerShown: true,
              headerTransparent: true,
              headerBlurEffect: "dark",
              headerTintColor: "#fff",
              title: "",
            }}
          />
          <Stack.Screen
            name="playlist/[id]"
            options={{
              headerShown: true,
              headerTransparent: true,
              headerBlurEffect: "dark",
              headerTintColor: "#fff",
              title: "",
            }}
          />
          <Stack.Screen
            name="player"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="queue"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="lyrics"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
        </Stack>
        <MiniPlayer />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
