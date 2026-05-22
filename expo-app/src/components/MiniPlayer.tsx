import { useRouter, usePathname } from "expo-router";
import { View, Text, Pressable } from "react-native";
import { Icon } from "@/components/icons";
import { Image } from "expo-image";
import { usePlayerStore } from "@/stores/player-store";
import { upscaleThumbnail } from "@/api/client";
import { theme } from "@/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function MiniPlayer() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const playNext = usePlayerStore((s) => s.playNext);
  if (pathname === "/player") return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={{ position: "absolute", bottom: 56, left: 0, right: 0, zIndex: 100 }}>
      <View style={{ paddingHorizontal: 10, paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }}>
        <Pressable
          onPress={() => currentTrack && router.push("/player")}
          style={{
            borderRadius: 999,
            borderCurve: "continuous",
            overflow: "hidden",
            backgroundColor: currentTrack ? "#1c1c1e" : theme.colors.surface2,
            borderWidth: 0.5,
            borderColor: "rgba(255,255,255,0.08)",
            height: 64,
          }}
        >
          {currentTrack && (
            <View style={{ height: 2, backgroundColor: "#2a2a2a" }}>
              <View style={{ height: "100%", width: `${progress}%`, backgroundColor: theme.colors.accent }} />
            </View>
          )}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 10,
              gap: 10,
              flex: 1,
            }}
          >
            {currentTrack ? (
              <>
                <Image source={{ uri: upscaleThumbnail(currentTrack.thumbnail || "") }} style={{ width: 44, height: 44, borderRadius: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "600" }} numberOfLines={1}>{currentTrack.title}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{currentTrack.artist}</Text>
                </View>
                <Pressable onPress={(e) => { e.stopPropagation(); togglePlay(); }} style={{ width: 40, height: 40, justifyContent: "center", alignItems: "center" }}>
                  <Icon name={isPlaying ? "pause" : "play"} size={22} color={theme.colors.textPrimary} />
                </Pressable>
                <Pressable onPress={(e) => { e.stopPropagation(); playNext(); }} style={{ width: 40, height: 40, justifyContent: "center", alignItems: "center" }}>
                  <Icon name="forward" size={20} color={theme.colors.textSecondary} />
                </Pressable>
              </>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, paddingHorizontal: 4 }}>
                <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: theme.colors.surface3, justifyContent: "center", alignItems: "center" }}>
                  <Icon name="music-note" size={20} color={theme.colors.textTertiary} />
                </View>
                <Text style={{ color: theme.colors.textTertiary, fontSize: 14 }}>No track playing</Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
}
