import { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { theme } from "@/theme";

function usePulse() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return opacity;
}

interface SkeletonBlockProps {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: object;
}

function SkeletonBlock({ width, height = 16, radius = 6, style }: SkeletonBlockProps) {
  const opacity = usePulse();
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.skeleton.base, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonRow() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 16 }}>
      <SkeletonBlock width={52} height={52} radius={6} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBlock width="70%" height={14} />
        <SkeletonBlock width="40%" height={12} />
      </View>
    </View>
  );
}

export function SkeletonCard() {
  return (
    <View style={{ gap: 8 }}>
      <SkeletonBlock width={150} height={150} radius={12} />
      <SkeletonBlock width="80%" height={13} />
      <SkeletonBlock width="50%" height={12} />
    </View>
  );
}

export function SkeletonTrackRow() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
      <SkeletonBlock width={44} height={44} radius={6} />
      <View style={{ flex: 1, gap: 4 }}>
        <SkeletonBlock width="65%" height={14} />
        <SkeletonBlock width="35%" height={12} />
      </View>
      <SkeletonBlock width={36} height={12} />
    </View>
  );
}

export function SkeletonAlbumHeader() {
  return (
    <View style={{ alignItems: "center", paddingVertical: 24, gap: 12 }}>
      <SkeletonBlock width={208} height={208} radius={16} />
      <SkeletonBlock width="60%" height={22} />
      <SkeletonBlock width="40%" height={14} />
      <SkeletonBlock width={120} height={36} radius={18} />
    </View>
  );
}

export function SkeletonArtistHero() {
  return (
    <View style={{ height: 320, justifyContent: "flex-end", paddingHorizontal: 16, paddingBottom: 24 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 16 }}>
        <SkeletonBlock width={112} height={112} radius={56} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBlock width="70%" height={30} />
          <SkeletonBlock width="40%" height={13} />
        </View>
      </View>
    </View>
  );
}
