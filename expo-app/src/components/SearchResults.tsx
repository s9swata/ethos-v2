import { useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import { FlatList, View, Text, Pressable, Animated } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/icons";
import { Image } from "expo-image";
import { usePlayerStore } from "@/stores/player-store";
import { useLibraryStore } from "@/stores/library-store";
import { api, upscaleThumbnail } from "@/api/client";
import { queryKeys } from "@/api/queries";
import { theme, radius, typography } from "@/theme";
import { haptics, animateHeart as triggerHeartAnimation } from "@/utils/animations";
import type { SearchResult } from "@/types";

interface Props {
  results: SearchResult[];
  query: string;
}

const TYPE_LABELS: Record<string, string> = {
  track: "Song",
  album: "Album",
  artist: "Artist",
  playlist: "Playlist",
};

function ResultRow({ 
  item, 
  onPressIn, 
  onPress, 
  onLike, 
  isLiked 
}: { 
  item: SearchResult; 
  onPressIn: (item: SearchResult) => void;
  onPress: (item: SearchResult) => void;
  onLike?: () => void;
  isLiked?: boolean;
}) {
  const heartScale = useRef(new Animated.Value(1)).current;
  const isArtist = item.type === "artist";
  const isTrack = item.type === "track";
  
  const handleLike = () => {
    if (!onLike) return;
    haptics.medium();
    triggerHeartAnimation(heartScale);
    onLike();
  };

  return (
    <Pressable
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: pressed ? theme.colors.surfaceElevated : "transparent",
      })}
      onPressIn={() => onPressIn(item)}
      onPress={() => onPress(item)}
      accessibilityLabel={`${TYPE_LABELS[item.type]}: ${item.name}`}
      accessibilityRole="button"
    >
      <View style={{ position: "relative" }}>
        <Image
          source={{ uri: upscaleThumbnail(item.imageUrl) }}
          style={{
            width: isArtist ? 56 : 52,
            height: isArtist ? 56 : 52,
            borderRadius: isArtist ? radius.full : radius.md,
            backgroundColor: theme.colors.surfaceElevated,
          }}
          contentFit="cover"
          transition={300}
        />
        {/* Type indicator badge */}
        {!isArtist && (
          <View
            style={{
              position: "absolute",
              top: -4,
              left: -4,
              backgroundColor: "rgba(0,0,0,0.75)",
              borderRadius: radius.full,
              paddingHorizontal: 6,
              paddingVertical: 2,
              ...theme.shadows.sm,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>
              {TYPE_LABELS[item.type].charAt(0)}
            </Text>
          </View>
        )}
      </View>
      
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: "500", letterSpacing: -0.01 }} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {item.type === "track" && item.artists && item.artists.length > 0 && (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
              {item.artists.join(", ")}
            </Text>
          )}
          {item.type === "album" && (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
              {item.year ? `${item.year} • ` : ""}Album
            </Text>
          )}
          {item.type === "artist" && (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: "500" }}>Artist</Text>
          )}
          {item.type === "playlist" && (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: "500" }}>Playlist</Text>
          )}
        </View>
      </View>
      
      {isTrack ? (
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
      ) : (
        <Icon name="chevron-right" size={16} color={theme.colors.textTertiary} />
      )}
    </Pressable>
  );
}

export function SearchResults({ results, query }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const playTrack = usePlayerStore((s) => s.playTrack);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const isLiked = useLibraryStore((s) => s.isLiked);

  const handlePressIn = useCallback(
    (result: SearchResult) => {
      switch (result.type) {
        case "artist":
          queryClient.prefetchQuery({
            queryKey: queryKeys.artist(result.id),
            queryFn: () => api.getArtist(result.id),
            staleTime: 1000 * 60 * 2,
          });
          break;
        case "album":
          queryClient.prefetchQuery({
            queryKey: queryKeys.album(result.id),
            queryFn: () => api.getAlbum(result.id),
            staleTime: 1000 * 60 * 2,
          });
          break;
        case "playlist":
          queryClient.prefetchQuery({
            queryKey: queryKeys.playlist(result.id),
            queryFn: () => api.getPlaylistV2(result.id),
            staleTime: 1000 * 60 * 2,
          });
          break;
        case "track":
          break;
      }
    },
    [queryClient]
  );

  const handlePress = useCallback(
    (result: SearchResult) => {
      haptics.light();
      switch (result.type) {
        case "track":
          if (!result.id) return;
          playTrack(result.id, {
            artistBrowseId: result.artistId,
            albumBrowseId: result.albumId ?? undefined,
            title: result.name,
            artist: result.artists?.[0] ?? "",
            thumbnail: result.imageUrl,
            duration: result.duration,
          });
          break;
        case "artist":
          router.push(`/artist/${result.id}`);
          break;
        case "album":
          router.push(`/album/${result.id}`);
          break;
        case "playlist":
          router.push(`/playlist/${result.id}`);
          break;
      }
    },
    [playTrack, router]
  );

  const handleLike = useCallback((item: SearchResult) => {
    toggleLike({ 
      id: item.id, 
      title: item.name, 
      artist: item.artists?.[0] ?? "", 
      album: item.album, 
      thumbnail: item.imageUrl, 
      duration: item.duration 
    });
  }, [toggleLike]);

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => (
      <ResultRow
        item={item}
        onPressIn={handlePressIn}
        onPress={handlePress}
        onLike={item.type === "track" ? () => handleLike(item) : undefined}
        isLiked={item.type === "track" ? isLiked(item.id) : undefined}
      />
    ),
    [handlePressIn, handlePress, handleLike, isLiked]
  );

  const keyExtractor = useCallback((item: SearchResult, index: number) => `${item.type}-${item.id}-${index}`, []);

  if (results.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: radius.xl,
          backgroundColor: theme.colors.surfaceElevated,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 16,
        }}>
          <Icon name="search" size={36} color={theme.colors.textTertiary} />
        </View>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 16, textAlign: "center" }}>
          No results for "{query}"
        </Text>
        <Text style={{ color: theme.colors.textTertiary, fontSize: 13, marginTop: 8, textAlign: "center" }}>
          Try a different search term
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={results}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 140 }}
      ListHeaderComponent={
        <Text style={{ 
          color: theme.colors.textTertiary, 
          fontSize: 11, 
          fontWeight: "600", 
          letterSpacing: 0.5, 
          textTransform: "uppercase",
          paddingHorizontal: 16, 
          paddingTop: 8, 
          paddingBottom: 8 
        }}>
          {results.length} result{results.length !== 1 ? "s" : ""}
        </Text>
      }
    />
  );
}
