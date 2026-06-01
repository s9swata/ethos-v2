import { useEffect, useRef } from "react";
import { Animated, Text, Pressable, Dimensions } from "react-native";
import { usePlayerStore } from "@/stores/player-store";
import { theme, radius, durations } from "@/theme";

const AUTO_DISMISS_MS = 4000;

export function ErrorToast() {
  const error = usePlayerStore((s) => s.error);
  const dismissError = usePlayerStore((s) => s.dismissError);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!error) {
      opacity.setValue(0);
      translateY.setValue(20);
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: durations.fast, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 8, tension: 300, useNativeDriver: true }),
    ]).start();

    timerRef.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: durations.fast, useNativeDriver: true }).start(() => {
        translateY.setValue(20);
        dismissError();
      });
    }, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [error, dismissError]);

  if (!error) return null;

  return (
    <Pressable
      onPress={dismissError}
      style={{
        position: "absolute",
        bottom: 120,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 200,
      }}
      accessibilityLabel="Dismiss error"
      accessibilityRole="button"
    >
      <Animated.View
        style={{
          opacity,
          transform: [{ translateY }],
          backgroundColor: theme.colors.surfaceElevated,
          borderRadius: radius.lg,
          paddingVertical: 12,
          paddingHorizontal: 24,
          maxWidth: Dimensions.get("window").width - 64,
          borderWidth: 1,
          borderColor: theme.colors.border,
          ...theme.shadows.lg,
        }}
      >
        <Text
          style={{ 
            color: theme.colors.textSecondary, 
            fontSize: 14, 
            fontWeight: "500", 
            textAlign: "center" 
          }}
          numberOfLines={2}
        >
          {error}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
