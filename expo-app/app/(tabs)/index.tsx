import { useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import { View, Text, Pressable, ScrollView, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Icon } from "@/components/icons";
import { SkeletonCard } from "@/components/Skeleton";
import { api, upscaleThumbnail } from "@/api/client";
import { queryKeys, useHomeFeedQuery } from "@/api/queries";
import { usePlayerStore } from "@/stores/player-store";
import { theme, layout, typography, radius } from "@/theme";
import { haptics } from "@/utils/animations";
import type { HomeSection } from "@/types";

const GREETINGS = ["Good morning", "Good afternoon", "Good evening"];

const TYPE_COLORS: Record<string, string> = {
  track: theme.colors.accent,
  album: "#a78bfa",
  artist: "#22d3ee",
  playlist: "#fbbf24",
};

const TYPE_LABELS: Record<string, string> = {
  track: "Song",
  album: "Album",
  artist: "Artist",
  playlist: "Playlist",
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return GREETINGS[0];
  if (h < 17) return GREETINGS[1];
  return GREETINGS[2];
}

function SectionRow({ 
  section, 
  onItemPress, 
  onItemPressIn 
}: { 
  section: HomeSection; 
  onItemPress: (item: HomeSection["items"][number]) => void; 
  onItemPressIn?: (item: HomeSection["items"][number]) => void;
}) {
  return (
    <View style={{ marginBottom: layout.space[8] }}>
      <Text style={{ 
        color: theme.colors.textPrimary, 
        fontSize: 20, 
        fontWeight: "700", 
        letterSpacing: -0.3,
        paddingHorizontal: layout.px, 
        marginBottom: layout.space[4] 
      }}>
        {section.title}
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={{ paddingHorizontal: layout.px, gap: layout.space[3] }}
        decelerationRate="fast"
        snapToInterval={162}
      >
        {section.items.filter((item) => item.type !== "mood").map((item, i) => {
          const isArtist = item.type === "artist";
          const cardWidth = isArtist ? 140 : 160;
          const imageSize = isArtist ? 140 : 160;
          
          return (
            <Pressable
              key={`${item.id}-${i}`}
              style={({ pressed }) => ({
                width: cardWidth,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
              onPressIn={() => onItemPressIn?.(item)}
              onPress={() => onItemPress(item)}
              accessibilityLabel={`${TYPE_LABELS[item.type]}: ${item.title}`}
              accessibilityRole="button"
            >
              <View style={{ position: "relative" }}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: upscaleThumbnail(item.imageUrl, isArtist ? 280 : 320) }}
                    style={{
                      width: imageSize,
                      height: imageSize,
                      borderRadius: isArtist ? radius.full : radius.md,
                      backgroundColor: theme.colors.surfaceElevated,
                      ...theme.shadows.sm,
                    }}
                    contentFit="cover"
                    transition={300}
                  />
                ) : (
                  <View style={{
                    width: imageSize,
                    height: imageSize,
                    borderRadius: isArtist ? radius.full : radius.md,
                    backgroundColor: theme.colors.surfaceElevated,
                    justifyContent: "center",
                    alignItems: "center",
                    ...theme.shadows.sm,
                  }}>
                    <Icon name="music-note" size={32} color={theme.colors.textTertiary} />
                  </View>
                )}
                
                {/* Type badge */}
                {!isArtist && (
                  <View 
                    style={{ 
                      position: "absolute", 
                      top: 8, 
                      left: 8, 
                      backgroundColor: TYPE_COLORS[item.type],
                      borderRadius: radius.full, 
                      paddingHorizontal: 8, 
                      paddingVertical: 3,
                      ...theme.shadows.sm,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                      {TYPE_LABELS[item.type]}
                    </Text>
                  </View>
                )}
              </View>
              
              <Text style={{ 
                color: theme.colors.textPrimary, 
                fontSize: 14, 
                fontWeight: "500", 
                marginTop: layout.space[3],
                letterSpacing: -0.01,
              }} numberOfLines={1}>
                {item.title}
              </Text>
              
              {item.subtitle ? (
                <Text style={{ 
                  color: theme.colors.textSecondary, 
                  fontSize: 12, 
                  marginTop: 2 
                }} numberOfLines={1}>
                  {item.subtitle}
                </Text>
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
          queryFn: () => api.getPlaylistV2(id),
          staleTime: 1000 * 60 * 2,
        });
      }
    },
    [queryClient]
  );

  const handleItemPress = useCallback(
    (item: HomeSection["items"][number]) => {
      haptics.light();
      try {
        if (item.type === "track") {
          playTrack(item.id, { title: item.title, artist: item.subtitle, thumbnail: item.imageUrl });
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
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        <View
          style={{
            paddingTop: insets.top + layout.space[10],
            paddingBottom: layout.space[6],
            paddingHorizontal: layout.px,
          }}
        >
          <Text style={{ 
            color: theme.colors.textPrimary,
            fontSize: 32,
            fontWeight: "700",
            letterSpacing: -0.02,
          }}>
            {greeting()}
          </Text>
        </View>

        {isLoading ? (
          <View style={{ gap: layout.space[8] }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={{ paddingHorizontal: layout.px }}>
                <View style={{ 
                  height: 20, 
                  width: "40%", 
                  backgroundColor: theme.colors.surfaceElevated, 
                  borderRadius: radius.sm, 
                  marginBottom: layout.space[4] 
                }} />
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={{ gap: layout.space[3] }}
                >
                  {Array.from({ length: 4 }).map((_, j) => (
                    <SkeletonCard key={j} />
                  ))}
                </ScrollView>
              </View>
            ))}
          </View>
        ) : error ? (
          <View style={{ 
            justifyContent: "center", 
            alignItems: "center", 
            paddingHorizontal: 32, 
            gap: 16, 
            paddingVertical: 80 
          }}>
            <View style={{
              width: 72,
              height: 72,
              borderRadius: radius.xl,
              backgroundColor: theme.colors.surfaceElevated,
              justifyContent: "center",
              alignItems: "center",
            }}>
              <Icon name="x-circle" size={32} color={theme.colors.textTertiary} />
            </View>
            <Text style={{ 
              color: theme.colors.textSecondary, 
              fontSize: 15, 
              textAlign: "center" 
            }}>
              {error.message}
            </Text>
          </View>
        ) : (
          <View style={{ gap: layout.space[6] }}>
            {sections.map((section, i) => (
              <SectionRow 
                key={`${section.title}-${i}`} 
                section={section} 
                onItemPress={handleItemPress} 
                onItemPressIn={handleItemPressIn} 
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
