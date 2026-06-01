import { useRef, useCallback } from "react";
import { useRouter, usePathname } from "expo-router";
import { View, Text, Pressable, Animated } from "react-native";
import { MarqueeText } from "@/components/MarqueeText";
import { Icon } from "@/components/icons";
import { Image } from "expo-image";
import { usePlayerStore } from "@/stores/player-store";
import { useLibraryStore } from "@/stores/library-store";
import { upscaleThumbnail } from "@/api/client";
import { theme, radius, springs } from "@/theme";
import { haptics, animateHeart as triggerHeartAnimation } from "@/utils/animations";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_BAR_HEIGHT = 56;

function hasTabBar(pathname: string) {
  if (pathname === "/") return true;
  if (pathname.startsWith("/search")) return true;
  if (pathname.startsWith("/charts")) return true;
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
  const playScale = useRef(new Animated.Value(1)).current;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const animateHeart = useCallback(() => {
    triggerHeartAnimation(heartScale);
  }, [heartScale]);

  const animatePlayButton = useCallback(() => {
    playScale.setValue(0.92);
    Animated.spring(playScale, {
      toValue: 1,
      friction: springs.button.friction,
      tension: springs.button.tension,
      useNativeDriver: true,
    }).start();
  }, [playScale]);

  const handleHeartPress = useCallback((e: any) => {
    e.stopPropagation();
    if (!currentTrack) return;
    haptics.medium();
    animateHeart();
    toggleLike({
      id: currentTrack.id,
      title: currentTrack.title,
      artist: currentTrack.artist,
      thumbnail: currentTrack.thumbnail,
    });
  }, [currentTrack, animateHeart, toggleLike]);

  const handlePlayPress = useCallback((e: any) => {
    e.stopPropagation();
    haptics.light();
    animatePlayButton();
    togglePlay();
  }, [animatePlayButton, togglePlay]);

  const handleControlPress = useCallback((fn: () => void) => (e: any) => {
    e.stopPropagation();
    haptics.light();
    fn();
  }, []);

  if (pathname === "/player" || pathname === "/lyrics" || !currentTrack) return null;

  return (
    <View style={{
      position: "absolute",
      bottom: hasTabBar(pathname) ? TAB_BAR_HEIGHT : 0,
      left: 0,
      right: 0,
      zIndex: 100,
      ...theme.shadows.lg,
    }}>
      <View style={{ paddingHorizontal: 16, paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }}>
        <View style={{
          borderRadius: radius.full,
          borderCurve: "continuous",
          backgroundColor: theme.colors.surfaceSecondary,
          ...theme.shadows.xl,
        }}>
          <Pressable
            onPress={() => router.push("/player")}
            style={{
              borderRadius: radius.full,
              borderCurve: "continuous",
              overflow: "hidden",
              backgroundColor: theme.colors.surfaceSecondary,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            {/* Single row: art + title/artist + heart + prev + play/pause + next */}
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 10 }}>
              <Pressable 
                onPress={() => router.push("/player")} 
                style={{ justifyContent: "center" }}
                accessibilityLabel="Open full player"
                accessibilityRole="button"
              >
                <Image
                  source={{ uri: upscaleThumbnail(currentTrack.thumbnail || "") }}
                  style={{ width: 44, height: 44, borderRadius: radius.sm }}
                  contentFit="cover"
                  transition={300}
                />
              </Pressable>
              <View style={{ flex: 1, justifyContent: "center", marginRight: 4 }}>
                <MarqueeText 
                  duration={8000} 
                  delay={1000} 
                  style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "600", letterSpacing: -0.01 }}
                >
                  {currentTrack.title}
                </MarqueeText>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {currentTrack.artist}
                </Text>
              </View>
              <Animated.View style={{ justifyContent: "center", transform: [{ scale: heartScale }] }}>
                <Pressable 
                  onPress={handleHeartPress} 
                  hitSlop={12} 
                  style={{ padding: 6 }}
                  accessibilityLabel={isLiked(currentTrack.id) ? "Unlike song" : "Like song"}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isLiked(currentTrack.id) }}
                >
                  <Icon
                    name={isLiked(currentTrack.id) ? "heart-filled" : "heart-outline"}
                    size={18}
                    color={isLiked(currentTrack.id) ? theme.colors.accent : theme.colors.textTertiary}
                  />
                </Pressable>
              </Animated.View>
              <Pressable 
                onPress={handleControlPress(playPrev)} 
                hitSlop={12} 
                style={{ padding: 6, justifyContent: "center" }}
                accessibilityLabel="Previous track"
                accessibilityRole="button"
              >
                <Icon name="backward" size={18} color={theme.colors.textSecondary} />
              </Pressable>
              <Animated.View style={{ transform: [{ scale: playScale }] }}>
                <Pressable 
                  onPress={handlePlayPress} 
                  hitSlop={12} 
                  style={{ padding: 6, justifyContent: "center" }}
                  accessibilityLabel={isPlaying ? "Pause" : "Play"}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isPlaying }}
                >
                  <Icon name={isPlaying ? "pause" : "play"} size={20} color={theme.colors.textPrimary} />
                </Pressable>
              </Animated.View>
              <Pressable 
                onPress={handleControlPress(playNext)} 
                hitSlop={12} 
                style={{ padding: 6, justifyContent: "center" }}
                accessibilityLabel="Next track"
                accessibilityRole="button"
              >
                <Icon name="forward" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            {/* Progress bar at bottom of pill */}
            <View style={{ height: 3, backgroundColor: theme.colors.surfaceTertiary }}>
              <View 
                style={{ 
                  width: `${progress}%`, 
                  height: "100%", 
                  backgroundColor: theme.colors.accent,
                  borderBottomLeftRadius: progress > 95 ? radius.full : 0,
                }} 
              />
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
