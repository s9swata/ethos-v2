import { useRef, useCallback } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { Icon } from "@/components/icons";
import { Image } from "expo-image";
import { upscaleThumbnail } from "@/api/client";
import { theme, radius } from "@/theme";
import { haptics, animateHeart as triggerHeartAnimation } from "@/utils/animations";

interface TrackRowProps {
  title: string;
  artist?: string;
  artists?: string[];
  album?: string | null;
  thumbnail?: string | null;
  duration?: string | number | null;
  index?: number;
  isLiked?: boolean;
  onPlay: () => void;
  onLike?: () => void;
  showLike?: boolean;
  showIndex?: boolean;
}

export function TrackRow({ 
  title, 
  artist, 
  artists, 
  thumbnail, 
  duration, 
  index, 
  isLiked = false, 
  onPlay, 
  onLike,
  showLike = true,
  showIndex = false,
}: TrackRowProps) {
  const artistName = artist ?? artists?.join(", ") ?? "";
  const heartScale = useRef(new Animated.Value(1)).current;

  const handleLike = useCallback(() => {
    if (!onLike) return;
    haptics.medium();
    triggerHeartAnimation(heartScale);
    onLike();
  }, [onLike]);

  const formatDuration = (d: string | number | null): string => {
    if (d === null || d === undefined) return "";
    if (typeof d === "number") {
      const minutes = Math.floor(d / 60);
      const seconds = Math.floor(d % 60);
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
    return d;
  };

  return (
    <Pressable
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 4,
        backgroundColor: pressed ? theme.colors.surfaceElevated : "transparent",
        borderRadius: radius.md,
      })}
      onPress={() => { haptics.light(); onPlay(); }}
      accessibilityLabel={`Play ${title}${artistName ? ` by ${artistName}` : ""}`}
      accessibilityRole="button"
    >
      {/* Index or Thumbnail */}
      {thumbnail ? (
        <Image 
          source={{ uri: upscaleThumbnail(thumbnail) }} 
          style={{ 
            width: 48, 
            height: 48, 
            borderRadius: radius.sm,
            backgroundColor: theme.colors.surfaceElevated,
          }}
          contentFit="cover"
          transition={200}
        />
      ) : showIndex && index != null ? (
        <View style={{ width: 48, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ 
            color: theme.colors.textTertiary, 
            fontSize: 14, 
            fontWeight: "500",
            fontVariant: ["tabular-nums"],
          }}>
            {index}
          </Text>
        </View>
      ) : (
        <View style={{ width: 48 }} />
      )}

      {/* Text Content */}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ 
          color: theme.colors.textPrimary, 
          fontSize: 15, 
          fontWeight: "500",
          letterSpacing: -0.01,
        }} numberOfLines={1}>
          {title}
        </Text>
        {artistName ? (
          <Text style={{ 
            color: theme.colors.textSecondary, 
            fontSize: 13 
          }} numberOfLines={1}>
            {artistName}
          </Text>
        ) : null}
      </View>

      {/* Like Button */}
      {showLike && onLike && (
        <Pressable 
          style={{ padding: 10 }}
          onPress={handleLike}
          hitSlop={12}
          accessibilityLabel={isLiked ? "Unlike song" : "Like song"}
          accessibilityRole="button"
          accessibilityState={{ selected: isLiked }}
        >
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Icon 
              name={isLiked ? "heart-filled" : "heart-outline"} 
              size={18} 
              color={isLiked ? theme.colors.accent : theme.colors.textTertiary} 
            />
          </Animated.View>
        </Pressable>
      )}

      {/* Duration */}
      {duration != null && (
        <Text style={{ 
          color: theme.colors.textTertiary, 
          fontSize: 13, 
          width: 48, 
          textAlign: "right",
          fontVariant: ["tabular-nums"],
        }}>
          {formatDuration(duration)}
        </Text>
      )}
    </Pressable>
  );
}
