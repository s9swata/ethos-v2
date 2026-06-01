import { View, Pressable, Text, Animated } from "react-native";
import { Slot, useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/icons";
import { theme } from "@/theme";
import { haptics } from "@/utils/animations";
import { useRef, useCallback } from "react";

let _freshSearch = false;

export function consumeFreshSearch(): boolean {
  const v = _freshSearch;
  _freshSearch = false;
  return v;
}

const TABS = [
  { name: "index", label: "Home", icon: "home" as const },
  { name: "charts", label: "Charts", icon: "chart" as const },
  { name: "search", label: "Search", icon: "search" as const },
  { name: "library", label: "Library", icon: "bars" as const },
];

function TabButton({
  tab,
  isActive,
  onPress,
}: {
  tab: typeof TABS[0];
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    haptics.light();
    // Animate press
    Animated.spring(scale, {
      toValue: 0.9,
      friction: 8,
      tension: 400,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 400,
        useNativeDriver: true,
      }).start();
    });
    onPress();
  }, [onPress]);

  return (
    <Pressable
      style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 6 }}
      onPress={handlePress}
      accessibilityLabel={tab.label}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon
          name={tab.icon}
          size={24}
          color={isActive ? theme.colors.accent : theme.colors.textTertiary}
        />
      </Animated.View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: isActive ? "600" : "500",
          color: isActive ? theme.colors.accent : theme.colors.textTertiary,
          letterSpacing: 0.2,
        }}
      >
        {tab.label}
      </Text>
    </Pressable>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab =
    pathname.startsWith("/charts") ? "charts" :
    pathname.startsWith("/search") ? "search" :
    pathname.startsWith("/library") ? "library" :
    "index";

  const handleTabPress = (tabName: string) => {
    if (tabName === "index" && activeTab !== "index") router.replace("/");
    else if (tabName === "charts" && activeTab !== "charts") router.replace("/charts");
    else if (tabName === "search" && activeTab !== "search") { _freshSearch = true; router.replace("/search"); }
    else if (tabName === "library" && activeTab !== "library") router.replace("/library");
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <Slot />
      <View
        style={{
          flexDirection: "row",
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        }}
      >
        {TABS.map((tab) => (
          <TabButton
            key={tab.name}
            tab={tab}
            isActive={activeTab === tab.name}
            onPress={() => handleTabPress(tab.name)}
          />
        ))}
      </View>
    </View>
  );
}
