import { useEffect, useRef } from "react";
import { Animated, Text, Pressable, Dimensions } from "react-native";
import { usePlayerStore } from "@/stores/player-store";

const AUTO_DISMISS_MS = 4000;

export function ErrorToast() {
  const error = usePlayerStore((s) => s.error);
  const dismissError = usePlayerStore((s) => s.dismissError);

  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!error) {
      opacity.setValue(0);
      return;
    }

    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

    timerRef.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        dismissError();
      });
    }, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [error]);

  if (!error) return null;

  return (
    <Pressable
      onPress={dismissError}
      style={{
        position: "absolute",
        bottom: 100,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 200,
      }}
    >
      <Animated.View
        style={{
          opacity,
          backgroundColor: "rgba(60,60,60,0.95)",
          borderRadius: 20,
          paddingVertical: 10,
          paddingHorizontal: 20,
          maxWidth: Dimensions.get("window").width - 64,
        }}
      >
        <Text
          style={{ color: "#e0e0e0", fontSize: 13, fontWeight: "500", textAlign: "center" }}
          numberOfLines={2}
        >
          {error}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
