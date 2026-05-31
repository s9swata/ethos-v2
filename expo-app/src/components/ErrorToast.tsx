import { useEffect, useRef } from "react";
import { Animated, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayerStore } from "@/stores/player-store";

const AUTO_DISMISS_MS = 5000;

export function ErrorToast() {
  const error = usePlayerStore((s) => s.error);
  const dismissError = usePlayerStore((s) => s.dismissError);
  const insets = useSafeAreaInsets();

  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

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
        top: insets.top + 8,
        left: 16,
        right: 16,
        zIndex: 200,
      }}
    >
      <Animated.View
        style={{
          opacity,
          backgroundColor: "#ef4444",
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          shadowColor: "#ef4444",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>!</Text>
        <Text
          style={{ color: "#fff", fontSize: 13, fontWeight: "500", flex: 1 }}
          numberOfLines={2}
        >
          {error}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
