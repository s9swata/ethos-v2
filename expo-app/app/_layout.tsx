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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 2,
    },
  },
});

let setupDone = false;

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
        PlayerCommand.PlayPause,
        PlayerCommand.Next,
        PlayerCommand.Previous,
        PlayerCommand.Seek,
        PlayerCommand.Stop,
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
    init();
  }, [init]);

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
