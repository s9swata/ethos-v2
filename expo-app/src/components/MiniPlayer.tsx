import { useRef, useCallback } from "react";
import { useRouter, usePathname } from "expo-router";
import { View, Text, Pressable, Animated } from "react-native";
import TextTicker from "react-native-text-ticker";
import { Icon } from "@/components/icons";
import { Image } from "expo-image";
import { usePlayerStore } from "@/stores/player-store";
import { useLibraryStore } from "@/stores/library-store";
import { upscaleThumbnail } from "@/api/client";
import { theme } from "@/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_BAR_HEIGHT = 56;

function hasTabBar(pathname: string) {
  if (pathname === "/") return true;
  if (pathname.startsWith("/search")) return true;
  if (pathname.startsWith("/library")) return true;
  return false;
}

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
  const playPrev = usePlayerStore((s) => s.playPrev);

  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const isLiked = useLibraryStore((s) => s.isLiked);

  const heartScale = useRef(new Animated.Value(1)).current;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const animateHeart = useCallback(() => {
    heartScale.setValue(0.7);
    Animated.spring(heartScale, {
      toValue: 1,
      friction: 6,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [heartScale]);

  const handleHeartPress = useCallback((e: any) => {
    e.stopPropagation();
    if (!currentTrack) return;
    animateHeart();
    toggleLike({
      id: currentTrack.id,
      title: currentTrack.title,
      artist: currentTrack.artist,
      thumbnail: currentTrack.thumbnail,
    });
  }, [currentTrack, animateHeart, toggleLike]);

  const handleControlPress = useCallback((fn: () => void) => (e: any) => {
    e.stopPropagation();
    fn();
  }, []);

  if (pathname === "/player") return null;

  return (
    <View style={{
      position: "absolute",
      bottom: hasTabBar(pathname) ? TAB_BAR_HEIGHT : 0,
      left: 0,
      right: 0,
      zIndex: 100,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 10,
    }}>
      <View style={{ paddingHorizontal: 10, paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }}>
        {currentTrack ? (
          <>
            <Pressable
              onPress={() => router.push("/player")}
              style={{
                borderRadius: 999,
                borderCurve: "continuous",
                overflow: "hidden",
                backgroundColor: "#1c1c1e",
                borderWidth: 0.5,
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              {/* Single row: art + title/artist + heart + prev + play/pause + next */}
              <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
                <Pressable onPress={() => router.push("/player")}>
                  <Image
                    source={{ uri: upscaleThumbnail(currentTrack.thumbnail || "") }}
                    style={{ width: 40, height: 40, borderRadius: 8 }}
                  />
                </Pressable>
                <View style={{ flex: 1, justifyContent: "center" }}>
                  <TextTicker duration={8000} loop marqueeDelay={1000} bounce repeatSpacer={50} style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }}>
                    {currentTrack.title}
                  </TextTicker>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }} numberOfLines={1}>
                    {currentTrack.artist}
                  </Text>
                </View>
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                  <Pressable onPress={handleHeartPress} hitSlop={8} style={{ padding: 4 }}>
                    <Icon
                      name={isLiked(currentTrack.id) ? "heart-filled" : "heart-outline"}
                      size={16}
                      color={isLiked(currentTrack.id) ? theme.colors.accent : theme.colors.textTertiary}
                    />
                  </Pressable>
                </Animated.View>
                <Pressable onPress={handleControlPress(playPrev)} hitSlop={6} style={{ padding: 4 }}>
                  <Icon name="backward" size={17} color={theme.colors.textSecondary} />
                </Pressable>
                <Pressable onPress={handleControlPress(togglePlay)} hitSlop={8} style={{ padding: 4 }}>
                  <Icon name={isPlaying ? "pause" : "play"} size={17} color={theme.colors.textPrimary} />
                </Pressable>
                <Pressable onPress={handleControlPress(playNext)} hitSlop={6} style={{ padding: 4 }}>
                  <Icon name="forward" size={17} color={theme.colors.textSecondary} />
                </Pressable>
              </View>

              {/* Thin progress bar at bottom of pill */}
              <View style={{ height: 2, backgroundColor: "#2a2a2a" }}>
                <View style={{ width: `${progress}%`, height: "100%", backgroundColor: theme.colors.accent }} />
              </View>
            </Pressable>


          </>
        ) : (
          <Pressable
            style={{
              borderRadius: 999,
              borderCurve: "continuous",
              overflow: "hidden",
              backgroundColor: theme.colors.surface2,
              borderWidth: 0.5,
              borderColor: "rgba(255,255,255,0.08)",
              height: 60,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, paddingHorizontal: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: theme.colors.surface3, justifyContent: "center", alignItems: "center" }}>
                <Icon name="music-note" size={20} color={theme.colors.textTertiary} />
              </View>
              <Text style={{ color: theme.colors.textTertiary, fontSize: 14 }}>No track playing</Text>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}
