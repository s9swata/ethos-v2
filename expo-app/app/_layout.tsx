import "expo-sqlite/localStorage/install";
import { useEffect } from "react";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AudioPlayerProvider } from "@/components/AudioPlayerProvider";
import { MiniPlayer } from "@/components/MiniPlayer";
import { ErrorToast } from "@/components/ErrorToast";
import { useLibraryStore } from "@/stores/library-store";
import { usePlayerStore } from "@/stores/player-store";
import { initLyricsStoreListener } from "@/utils/lyrics-cache";
import { initTaste } from "@/utils/taste";
import { saveQueue, serializeQueue } from "@/utils/queue-store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 2,
    },
  },
});

let setupDone = false;

export default function RootLayout() {
  const init = useLibraryStore((s) => s.init);

  useEffect(() => {
    if (setupDone) return;
    setupDone = true;

    return () => { import("expo-youtube-audio-stream").then((m) => m.stop().catch(() => {})); };
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
      saveQueue(serializeQueue({
        userQueue: state.userQueue,
        contextQueue: state.contextQueue,
        watchPlaylistId: state.watchPlaylistId,
        context: state.context,
        currentTrack: state.currentTrack,
        currentTime: state.currentTime,
        duration: state.duration,
        repeat: state.repeat,
        isShuffled: state.isShuffled,
        volume: state.volume,
        currentArtistId: state.currentArtistId,
        currentAlbumId: state.currentAlbumId,
        history: state.history,
      })).catch(() => {});
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
        <ErrorToast />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
