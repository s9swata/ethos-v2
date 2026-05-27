import { useCallback } from "react";
import { useRouter } from "expo-router";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Icon } from "@/components/icons";
import { SkeletonCard } from "@/components/Skeleton";
import { api, upscaleThumbnail } from "@/api/client";
import { queryKeys, useHomeFeedQuery } from "@/api/queries";
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

function SectionRow({ section, onItemPress, onItemPressIn }: { section: HomeSection; onItemPress: (item: HomeSection["items"][number]) => void; onItemPressIn?: (item: HomeSection["items"][number]) => void }) {
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
              onPressIn={() => onItemPressIn?.(item)}
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
  const queryClient = useQueryClient();
  const playTrack = usePlayerStore((s) => s.playTrack);

  const { data: home, isLoading, error } = useHomeFeedQuery();
  const sections = home?.sections ?? [];

  const handleItemPressIn = useCallback(
    (item: HomeSection["items"][number]) => {
      const id = item.browseId || item.id;
      if (!id) return;
      if (item.type === "artist") {
        queryClient.prefetchQuery({
          queryKey: queryKeys.artist(id),
          queryFn: () => api.getArtist(id),
          staleTime: 1000 * 60 * 2,
        });
      } else if (item.type === "album") {
        queryClient.prefetchQuery({
          queryKey: queryKeys.album(id),
          queryFn: () => api.getAlbum(id),
          staleTime: 1000 * 60 * 2,
        });
      } else if (item.type === "playlist") {
        queryClient.prefetchQuery({
          queryKey: queryKeys.playlist(id),
          queryFn: () => api.getPlaylist(`https://music.youtube.com/playlist?list=${id}`),
          staleTime: 1000 * 60 * 2,
        });
      } else if (item.type === "track") {
      }
    },
    [queryClient]
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

        {isLoading ? (
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
            <Text style={{ color: theme.colors.textSecondary, fontSize: 14, textAlign: "center" }}>{error.message}</Text>
          </View>
        ) : (
          <View style={{ gap: layout.sectionGap }}>
            {sections.map((section, i) => (
              <SectionRow key={`${section.title}-${i}`} section={section} onItemPress={handleItemPress} onItemPressIn={handleItemPressIn} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
