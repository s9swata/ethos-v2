import { useState, useCallback } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Icon } from "@/components/icons";
import { SkeletonCard } from "@/components/Skeleton";
import { api, upscaleThumbnail } from "@/api/client";
import { usePlayerStore } from "@/stores/player-store";
import { theme, layout, typography } from "@/theme";
import type { HomeSection } from "@/types";

const GREETINGS = ["Good morning", "Good afternoon", "Good evening"];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return GREETINGS[0];
  if (h < 17) return GREETINGS[1];
  return GREETINGS[2];
}

function SectionRow({ section, onItemPress }: { section: HomeSection; onItemPress: (item: HomeSection["items"][number]) => void }) {
  return (
    <View style={{ marginBottom: layout.sectionGap }}>
      <Text style={[typography.h3, { paddingHorizontal: layout.px, marginBottom: 12 }]}>{section.title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.px, gap: 12 }}>
        {section.items.filter((item) => item.type !== "mood").map((item, i) => {
          const isArtist = item.type === "artist";
          return (
            <Pressable
              key={`${item.id}-${i}`}
              style={{ width: isArtist ? 120 : 150 }}
              onPress={() => onItemPress(item)}
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: upscaleThumbnail(item.imageUrl, isArtist ? 160 : 240) }}
                  style={{
                    width: isArtist ? 120 : 150,
                    height: isArtist ? 120 : 150,
                    borderRadius: isArtist ? 60 : 12,
                    backgroundColor: theme.colors.surface3,
                  }}
                />
              ) : (
                <View style={{
                  width: isArtist ? 120 : 150,
                  height: isArtist ? 120 : 150,
                  borderRadius: isArtist ? 60 : 12,
                  backgroundColor: theme.colors.surface3,
                  justifyContent: "center",
                  alignItems: "center",
                }}>
                  <Icon name="music-note" size={24} color={theme.colors.textTertiary} />
                </View>
              )}
              <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "500", marginTop: 8 }} numberOfLines={1}>{item.title}</Text>
              {item.subtitle ? (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{item.subtitle}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const getTasteProfile = usePlayerStore((s) => s.getTasteProfile);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHome = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = getTasteProfile();
      const data = await api.getHomeFeed(profile || undefined);
      setSections(data.sections);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [getTasteProfile]);

  useFocusEffect(
    useCallback(() => {
      fetchHome();
    }, [fetchHome])
  );

  const handleItemPress = useCallback(
    (item: HomeSection["items"][number]) => {
      try {
        if (item.type === "track") {
          playTrack(item.id, { title: item.title, artist: item.subtitle });
        } else if (item.type === "artist") {
          const id = item.browseId || item.id;
          if (id) router.push(`/artist/${id}`);
        } else if (item.type === "album") {
          const id = item.browseId || item.id;
          if (id) router.push(`/album/${id}`);
        } else if (item.type === "playlist") {
          const id = item.browseId || item.id;
          if (id) router.push(`/playlist/${id}`);
        }
      } catch {}
    },
    [playTrack, router]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        <View
          style={{
            paddingTop: insets.top + 40,
            paddingBottom: 24,
            paddingHorizontal: layout.px,
          }}
        >
          <Text style={[typography.h1, { fontSize: 34, letterSpacing: -1 }]}>{greeting()}</Text>
        </View>

        {loading && sections.length === 0 ? (
          <View style={{ gap: layout.sectionGap }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={{ paddingHorizontal: layout.px }}>
                <View style={{ height: 18, width: "40%", backgroundColor: theme.colors.surface3, borderRadius: 4, marginBottom: 12 }} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <SkeletonCard key={j} />
                  ))}
                </ScrollView>
              </View>
            ))}
          </View>
        ) : error ? (
          <View style={{ justifyContent: "center", alignItems: "center", paddingHorizontal: 32, gap: 16, paddingVertical: 60 }}>
            <Icon name="x-circle" size={36} color={theme.colors.textTertiary} />
            <Text style={{ color: theme.colors.textSecondary, fontSize: 14, textAlign: "center" }}>{error}</Text>
            <Pressable
              style={{ backgroundColor: theme.colors.glass, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 99 }}
              onPress={fetchHome}
            >
              <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: layout.sectionGap }}>
            {sections.map((section, i) => (
              <SectionRow key={`${section.title}-${i}`} section={section} onItemPress={handleItemPress} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
