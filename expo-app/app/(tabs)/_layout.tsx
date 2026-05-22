import { View, Pressable, Text } from "react-native";
import { Slot, useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/icons";
import { theme } from "@/theme";

const TABS = [
  { name: "index", label: "Home", icon: "home" as const },
  { name: "search", label: "Search", icon: "search" as const },
  { name: "library", label: "Library", icon: "bars" as const },
];

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab =
    pathname.startsWith("/search") ? "search" :
    pathname.startsWith("/library") ? "library" :
    "index";

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <Slot />
      <View
        style={{
          flexDirection: "row",
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0.5,
          borderTopColor: theme.colors.border,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.name;
          return (
            <Pressable
              key={tab.name}
              style={{ flex: 1, alignItems: "center", gap: 2, paddingVertical: 4 }}
              onPress={() => {
                if (tab.name === "index" && !isActive) router.replace("/");
                else if (tab.name === "search" && !isActive) router.replace("/search");
                else if (tab.name === "library" && !isActive) router.replace("/library");
              }}
            >
              <Icon
                name={tab.icon}
                size={22}
                color={isActive ? theme.colors.accent : theme.colors.textTertiary}
              />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: isActive ? theme.colors.accent : theme.colors.textTertiary,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
