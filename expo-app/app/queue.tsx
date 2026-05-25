import { useState, useRef } from "react";
import { useRouter } from "expo-router";
import { View, Text, Pressable, Alert } from "react-native";
import { Swipeable, TouchableOpacity, ScrollView } from "react-native-gesture-handler";
import { Icon } from "@/components/icons";
import { Image } from "expo-image";
import { usePlayerStore } from "@/stores/player-store";
import { upscaleThumbnail } from "@/api/client";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/theme";

export default function QueueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"queue" | "recents">("queue");

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const autoQueue = usePlayerStore((s) => s.autoQueue);
  const autoQueueIndex = usePlayerStore((s) => s.autoQueueIndex);
  const artistTrackPool = usePlayerStore((s) => s.artistTrackPool);
  const playedVideoIds = usePlayerStore((s) => s.playedVideoIds);
  const currentAutoQueueSource = usePlayerStore((s) => s.currentAutoQueueSource);
  const playHistory = usePlayerStore((s) => s.playHistory);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);

  const queuedTracks = queueIndex >= 0 && queueIndex < queue.length
    ? queue.slice(queueIndex + 1)
    : queue;

  const queuedIds = new Set(queuedTracks.map((t) => t.id));
  const currentId = currentTrack?.id;

  const displayAutoQueue = autoQueue.slice(autoQueueIndex + 1).filter(
    (item) => item.videoId && !queuedIds.has(item.videoId) && item.videoId !== currentId
  );

  function SwipeableRow({ onRemove, children }: { onRemove: () => void; children: React.ReactNode }) {
  const ref = useRef<Swipeable>(null);

  return (
    <Swipeable
      ref={ref}
      renderRightActions={() => (
        <View style={{ width: 80, backgroundColor: "#ef4444", justifyContent: "center", alignItems: "center" }}>
          <Pressable
            onPress={() => { ref.current?.close(); onRemove(); }}
            style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center", paddingVertical: 18 }}
          >
            <View style={{ alignItems: "center", gap: 4 }}>
              <Icon name="trash" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "600" }}>Remove</Text>
            </View>
          </Pressable>
        </View>
      )}
      overshootRight={false}
    >
      {children}
    </Swipeable>
  );
}

const displayPool = artistTrackPool.filter(
    (item) => item.videoId
      && !queuedIds.has(item.videoId)
      && !displayAutoQueue.some((aq) => aq.videoId === item.videoId)
      && !playedVideoIds.includes(item.videoId)
      && item.videoId !== currentId
  );

  const hasUpcoming = queuedTracks.length > 0 || displayAutoQueue.length > 0 || displayPool.length > 0;

  const handleClear = () => {
    Alert.alert("Clear Queue", "Remove all queued tracks?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clearQueue },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Icon name="chevron-down" size={20} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: "700" }}>
          {activeTab === "queue" ? "Up Next" : "History"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {activeTab === "queue" && (queue.length > 0 || autoQueue.length > 0 || artistTrackPool.length > 0) ? (
            <Pressable onPress={handleClear} style={{ padding: 8 }}>
              <Text style={{ color: theme.colors.textTertiary, fontSize: 13 }}>Clear</Text>
            </Pressable>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>
      </View>

      <View style={{ flexDirection: "row", marginHorizontal: 16, marginBottom: 16, borderRadius: 10, backgroundColor: theme.colors.surface2, padding: 2 }}>
        <Pressable
          onPress={() => setActiveTab("queue")}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: activeTab === "queue" ? theme.colors.surface3 : "transparent",
            alignItems: "center",
          }}
        >
          <Text style={{ color: activeTab === "queue" ? theme.colors.textPrimary : theme.colors.textSecondary, fontSize: 13, fontWeight: "600" }}>Queue</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("recents")}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: activeTab === "recents" ? theme.colors.surface3 : "transparent",
            alignItems: "center",
          }}
        >
          <Text style={{ color: activeTab === "recents" ? theme.colors.textPrimary : theme.colors.textSecondary, fontSize: 13, fontWeight: "600" }}>Recents</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {activeTab === "queue" ? (
          <>
            {currentTrack && (
              <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
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

            {hasUpcoming && (
              <>
                <View style={{ marginHorizontal: 16, height: 0.5, backgroundColor: theme.colors.border, marginBottom: 16 }} />
                <Text style={{ color: theme.colors.textTertiary, fontSize: 11, fontWeight: "600", letterSpacing: 0.8, paddingHorizontal: 16, marginBottom: 8 }}>
                  {currentTrack ? "UP NEXT" : "QUEUE"}
                </Text>

                {queuedTracks.map((track, idx) => {
                  const actualIdx = queue.indexOf(track);
                  return (
                    <SwipeableRow key={`q-${track.id}-${idx}`} onRemove={() => removeFromQueue(actualIdx)}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => { if (track.id !== currentTrack?.id) playTrack(track.id); }}
                        style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 16 }}
                      >
                        <Image
                          source={{ uri: upscaleThumbnail(track.thumbnail || "", 120) }}
                          style={{ width: 44, height: 44, borderRadius: 6 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>{track.title}</Text>
                          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{track.artist}</Text>
                        </View>
                      </TouchableOpacity>
                    </SwipeableRow>
                  );
                })}

                {displayAutoQueue.map((item, idx) => (
                  <Pressable
                    key={`aq-${item.videoId}-${idx}`}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 16 }}
                    onPress={() => item.videoId && playTrack(item.videoId, { title: item.title ?? undefined, artist: item.artists?.join(", "), thumbnail: item.thumbnail ?? undefined })}
                  >
                    {item.thumbnail ? (
                      <Image source={{ uri: upscaleThumbnail(item.thumbnail, 120) }} style={{ width: 44, height: 44, borderRadius: 6 }} />
                    ) : (
                      <View style={{ width: 44, height: 44, borderRadius: 6, backgroundColor: theme.colors.surface3, justifyContent: "center", alignItems: "center" }}>
                        <Icon name="music-note" size={18} color={theme.colors.textTertiary} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>{item.title || "Unknown"}</Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{item.artists?.join(", ") || ""}</Text>
                    </View>
                  </Pressable>
                ))}

                {currentAutoQueueSource && displayPool.length > 0 && (
                  <>
                    <View style={{ marginHorizontal: 16, height: 0.5, backgroundColor: theme.colors.border, marginTop: 8, marginBottom: 8 }} />
                    <Text style={{ color: theme.colors.textTertiary, fontSize: 11, fontWeight: "600", letterSpacing: 0.8, paddingHorizontal: 16, marginBottom: 8 }}>
                      FROM {currentAutoQueueSource.toUpperCase()} — ALBUMS & SINGLES
                    </Text>
                    {displayPool.map((item, idx) => (
                      <Pressable
                        key={`pool-${item.videoId}-${idx}`}
                        style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 16 }}
                        onPress={() => item.videoId && playTrack(item.videoId, { title: item.title ?? undefined, artist: item.artists?.join(", "), thumbnail: item.thumbnail ?? undefined })}
                      >
                        {item.thumbnail ? (
                          <Image source={{ uri: upscaleThumbnail(item.thumbnail, 120) }} style={{ width: 44, height: 44, borderRadius: 6 }} />
                        ) : (
                          <View style={{ width: 44, height: 44, borderRadius: 6, backgroundColor: theme.colors.surface3, justifyContent: "center", alignItems: "center" }}>
                            <Icon name="music-note" size={18} color={theme.colors.textTertiary} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>{item.title || "Unknown"}</Text>
                          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{item.artists?.join(", ") || ""}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </>
                )}
              </>
            )}

            {!hasUpcoming && currentTrack && (
              <View style={{ alignItems: "center", paddingVertical: 60, gap: 12 }}>
                <Icon name="bars" size={36} color={theme.colors.textTertiary} />
                <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>No upcoming tracks</Text>
              </View>
            )}
          </>
        ) : (
          playHistory.length > 0 ? (
            playHistory.slice(0, 20).map((item) => (
              <Pressable
                key={item.id}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 16 }}
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
            ))
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 60, gap: 12 }}>
              <Icon name="clock" size={36} color={theme.colors.textTertiary} />
              <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>No recent tracks</Text>
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}
