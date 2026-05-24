import { useRouter } from "expo-router";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { Icon } from "@/components/icons";
import { Image } from "expo-image";
import { usePlayerStore } from "@/stores/player-store";
import { upscaleThumbnail } from "@/api/client";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/theme";

export default function QueueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const autoQueue = usePlayerStore((s) => s.autoQueue);
  const playHistory = usePlayerStore((s) => s.playHistory);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);

  const queuedTracks = queueIndex >= 0 && queueIndex < queue.length
    ? queue.slice(queueIndex + 1)
    : queue;

  const upcomingCount = currentTrack ? queuedTracks.length : queue.length;
  const autoUpcoming = autoQueue.slice(autoQueue.length > 0 && autoQueue[autoQueue.length - 1].videoId ? 0 : 1);

  const handleClear = () => {
    Alert.alert("Clear Queue", "Remove all queued tracks?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clearQueue },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Icon name="chevron-down" size={20} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: "700" }}>Up Next</Text>
        {queue.length > 0 ? (
          <Pressable onPress={handleClear} style={{ padding: 8 }}>
            <Text style={{ color: theme.colors.textTertiary, fontSize: 13 }}>Clear</Text>
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Now Playing */}
        {currentTrack && (
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <Text style={{ color: theme.colors.textTertiary, fontSize: 11, fontWeight: "600", letterSpacing: 0.8, marginBottom: 8 }}>NOW PLAYING</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Image
                source={{ uri: upscaleThumbnail(currentTrack.thumbnail || "", 120) }}
                style={{ width: 48, height: 48, borderRadius: 8 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: "600" }} numberOfLines={1}>{currentTrack.title}</Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }} numberOfLines={1}>{currentTrack.artist}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Recently Played */}
        {playHistory.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <Text style={{ color: theme.colors.textTertiary, fontSize: 11, fontWeight: "600", letterSpacing: 0.8, marginBottom: 8 }}>RECENTLY PLAYED</Text>
            {playHistory.slice(0, 10).map((item) => (
              <Pressable
                key={item.id}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}
                onPress={() => playTrack(item.id)}
              >
                <Image
                  source={{ uri: upscaleThumbnail(item.thumbnail, 120) }}
                  style={{ width: 44, height: 44, borderRadius: 6 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>{item.title}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{item.artist}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Divider */}
        <View style={{ marginHorizontal: 16, height: 0.5, backgroundColor: theme.colors.border, marginBottom: 16 }} />

        {/* Queue list */}
        {queue.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 60, gap: 12 }}>
            <Icon name="queue-list" size={36} color={theme.colors.textTertiary} />
            <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>Queue is empty</Text>
            <Text style={{ color: theme.colors.textTertiary, fontSize: 13, textAlign: "center", paddingHorizontal: 32 }}>
              Add songs to play next
            </Text>
          </View>
        ) : (
          <>
            <Text style={{ color: theme.colors.textTertiary, fontSize: 11, fontWeight: "600", letterSpacing: 0.8, paddingHorizontal: 16, marginBottom: 8 }}>
              {queuedTracks.length > 0 && currentTrack ? "UP NEXT" : "QUEUE"}
            </Text>
            {(queuedTracks.length > 0 ? queuedTracks : queue).map((track, idx) => {
              const actualIdx = queuedTracks.length > 0 ? queue.indexOf(track) : idx;
              return (
                <View
                  key={`${track.id}-${idx}`}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 16 }}
                >
                  <Image
                    source={{ uri: upscaleThumbnail(track.thumbnail || "", 120) }}
                    style={{ width: 44, height: 44, borderRadius: 6 }}
                  />
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => {
                      if (track.id !== currentTrack?.id) playTrack(track.id);
                    }}
                  >
                    <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>{track.title}</Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{track.artist}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => removeFromQueue(actualIdx)}
                    hitSlop={8}
                    style={{ padding: 8 }}
                  >
                    <Icon name="xmark" size={14} color={theme.colors.textTertiary} />
                  </Pressable>
                </View>
              );
            })}
          </>
        )}

        {/* Auto-queue (suggested) */}
        {autoQueue.length > 0 && (
          <>
            <View style={{ marginHorizontal: 16, height: 0.5, backgroundColor: theme.colors.border, marginVertical: 16 }} />
            <Text style={{ color: theme.colors.textTertiary, fontSize: 11, fontWeight: "600", letterSpacing: 0.8, paddingHorizontal: 16, marginBottom: 8 }}>SUGGESTED</Text>
            {autoQueue
              .filter((item) => item.videoId && item.videoId !== currentTrack?.id)
              .slice(0, 5)
              .map((item, idx) => (
                <Pressable
                  key={`auto-${item.videoId}-${idx}`}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 16 }}
                  onPress={() => item.videoId && playTrack(item.videoId)}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 6, backgroundColor: theme.colors.surface3, justifyContent: "center", alignItems: "center" }}>
                    <Icon name="music-note" size={18} color={theme.colors.textTertiary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>{item.title || "Unknown"}</Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{item.artists?.join(", ") || ""}</Text>
                  </View>
                  <Icon name="plus" size={14} color={theme.colors.textTertiary} />
                </Pressable>
              ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
