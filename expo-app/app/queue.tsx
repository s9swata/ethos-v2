import { useState, useRef } from "react";
import { useRouter } from "expo-router";
import { View, Text, Pressable, Alert } from "react-native";
import { Swipeable, TouchableOpacity, ScrollView } from "react-native-gesture-handler";
import { Icon } from "@/components/icons";
import { Image } from "expo-image";
import { usePlayerStore } from "@/stores/player-store";
import { upscaleThumbnail } from "@/api/client";
import { formatDuration } from "@/utils/duration";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/theme";

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

function TrackRow({ item, onPress, onRemove }: { item: any; onPress: () => void; onRemove?: () => void }) {
  const content = (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 16 }}>
      {item.thumbnail ? (
        <Image source={{ uri: upscaleThumbnail(item.thumbnail, 120) }} style={{ width: 44, height: 44, borderRadius: 6 }} />
      ) : (
        <View style={{ width: 44, height: 44, borderRadius: 6, backgroundColor: theme.colors.surface3, justifyContent: "center", alignItems: "center" }}>
          <Icon name="music-note" size={18} color={theme.colors.textTertiary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>{item.title}</Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{item.artist}</Text>
      </View>
    </TouchableOpacity>
  );
  if (onRemove) return <SwipeableRow onRemove={onRemove}>{content}</SwipeableRow>;
  return content;
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: active ? theme.colors.surface3 : "transparent", alignItems: "center" }}
    >
      <Text style={{ color: active ? theme.colors.textPrimary : theme.colors.textSecondary, fontSize: 13, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export default function QueueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"queue" | "recents">("queue");
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const userQueue = usePlayerStore((s) => s.userQueue);
  const contextQueue = usePlayerStore((s) => s.contextQueue);
  const history = usePlayerStore((s) => s.history);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);

  const hasUpcoming = userQueue.length > 0 || contextQueue.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Icon name="chevron-down" size={20} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: "700" }}>{activeTab === "queue" ? "Up Next" : "History"}</Text>
        {activeTab === "queue" && hasUpcoming ? (
          <Pressable onPress={() => Alert.alert("Clear Queue", "Remove all queued tracks?", [{ text: "Cancel", style: "cancel" }, { text: "Clear", style: "destructive", onPress: clearQueue }])} style={{ padding: 8 }}>
            <Text style={{ color: theme.colors.textTertiary, fontSize: 13 }}>Clear</Text>
          </Pressable>
        ) : <View style={{ width: 36 }} />}
      </View>

      <View style={{ flexDirection: "row", marginHorizontal: 16, marginBottom: 16, borderRadius: 10, backgroundColor: theme.colors.surface2, padding: 2 }}>
        <TabButton label="Queue" active={activeTab === "queue"} onPress={() => setActiveTab("queue")} />
        <TabButton label="Recents" active={activeTab === "recents"} onPress={() => setActiveTab("recents")} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {activeTab === "queue" ? (
          <>
            {currentTrack && (
              <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Image source={{ uri: upscaleThumbnail(currentTrack.thumbnail || "", 120) }} style={{ width: 48, height: 48, borderRadius: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: "600" }} numberOfLines={1}>{currentTrack.title}</Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }} numberOfLines={1}>{currentTrack.artist}</Text>
                  </View>
                </View>
              </View>
            )}

            {hasUpcoming || !currentTrack ? (
              <>
                <View style={{ marginHorizontal: 16, height: 0.5, backgroundColor: theme.colors.border, marginBottom: 16 }} />
                {userQueue.length > 0 && <Text style={{ color: theme.colors.textTertiary, fontSize: 11, fontWeight: "600", letterSpacing: 0.8, paddingHorizontal: 16, marginBottom: 8 }}>UP NEXT</Text>}
                {userQueue.map((item, idx) => (
                  <SwipeableRow key={`uq-${item.videoId}-${idx}`} onRemove={() => removeFromQueue(item.videoId)}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => playTrack(item.videoId, { title: item.title, artist: item.artist, thumbnail: item.thumbnail, duration: formatDuration(item.duration) })} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 16 }}>
                      <Image source={{ uri: upscaleThumbnail(item.thumbnail || "", 120) }} style={{ width: 44, height: 44, borderRadius: 6 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>{item.title}</Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{item.artist}</Text>
                      </View>
                    </TouchableOpacity>
                  </SwipeableRow>
                ))}
                {userQueue.length > 0 && contextQueue.length > 0 && <View style={{ marginHorizontal: 16, height: 0.5, backgroundColor: theme.colors.border, marginVertical: 4 }} />}
                {contextQueue.length > 0 && <Text style={{ color: theme.colors.textTertiary, fontSize: 11, fontWeight: "600", letterSpacing: 0.8, paddingHorizontal: 16, marginBottom: 8 }}>NEXT UP</Text>}
                {contextQueue.map((item, idx) => (
                  <TrackRow key={`cq-${item.videoId}-${idx}`} item={item} onPress={() => playTrack(item.videoId, { title: item.title, artist: item.artist, thumbnail: item.thumbnail, duration: formatDuration(item.duration) })} />
                ))}
                {!hasUpcoming && !currentTrack && (
                  <View style={{ alignItems: "center", paddingVertical: 60, gap: 12 }}>
                    <Icon name="bars" size={36} color={theme.colors.textTertiary} />
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>Queue is empty</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={{ alignItems: "center", paddingVertical: 60, gap: 12 }}>
                <Icon name="bars" size={36} color={theme.colors.textTertiary} />
                <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>No upcoming tracks</Text>
              </View>
            )}
          </>
        ) : history.length > 0 ? (
          history.slice(0, 20).map((item) => (
            <TrackRow key={`hist-${item.videoId}`} item={item} onPress={() => playTrack(item.videoId, { title: item.title, artist: item.artist, thumbnail: item.thumbnail })} />
          ))
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 60, gap: 12 }}>
            <Icon name="clock" size={36} color={theme.colors.textTertiary} />
            <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>No recent tracks</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
