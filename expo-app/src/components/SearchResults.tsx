import { useCallback } from "react";
import { useRouter } from "expo-router";
import { FlatList, View, Text, Pressable } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/icons";
import { Image } from "expo-image";
import { usePlayerStore } from "@/stores/player-store";
import { useLibraryStore } from "@/stores/library-store";
import { api, upscaleThumbnail } from "@/api/client";
import { queryKeys } from "@/api/queries";
import type { SearchResult } from "@/types";
import { theme } from "@/theme";

interface Props {
  results: SearchResult[];
  query: string;
}

const MAX_SONG_SUBTITLE = 2;

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
      console.log(`[SearchResults] pressed ${result.type}: "${result.name}" (${result.id})`);
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

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => (
      <Pressable
        style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 16 }}
        onPressIn={() => handlePressIn(item)}
        onPress={() => handlePress(item)}
      >
        <Image
          source={{ uri: upscaleThumbnail(item.imageUrl) }}
          style={{
            width: item.type === "artist" ? 56 : 52,
            height: item.type === "artist" ? 56 : 52,
            borderRadius: item.type === "artist" ? 28 : 6,
          }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: "500" }} numberOfLines={1}>{item.name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
            {item.type === "track" && item.artists && item.artists.length > 0 && (
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
                Song • {item.artists.join(", ")}
              </Text>
            )}
            {item.type === "album" && (
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
                Album {item.year ? `• ${item.year}` : ""}
              </Text>
            )}
            {item.type === "artist" && (
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Artist</Text>
            )}
            {item.type === "playlist" && (
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Playlist</Text>
            )}
          </View>
        </View>
        {item.type === "track" ? (
          <Pressable style={{ padding: 8 }} onPress={() => toggleLike({ id: item.id, title: item.name, artist: item.artists?.[0] ?? "", album: item.album, thumbnail: item.imageUrl, duration: item.duration })}>
            <Icon name={isLiked(item.id) ? "heart-filled" : "heart-outline"} size={16} color={isLiked(item.id) ? theme.colors.accent : theme.colors.textTertiary} />
          </Pressable>
        ) : item.type === "album" || item.type === "playlist" ? (
          <Icon name="chevron-right" size={14} color={theme.colors.textTertiary} />
        ) : null}
      </Pressable>
    ),
    [handlePress, toggleLike, isLiked]
  );

  const keyExtractor = useCallback((item: SearchResult, index: number) => `${item.type}-${item.id}-${index}`, []);

  if (results.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
          <Icon name="search" size={36} color={theme.colors.textTertiary} />
        <Text style={{ color: theme.colors.textSecondary, fontSize: 16, marginTop: 12, textAlign: "center" }}>No results for "{query}"</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={results}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 120 }}
      ListHeaderComponent={
        <Text style={{ color: theme.colors.textTertiary, fontSize: 11, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase", paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6 }}>
          {results.length} result{results.length !== 1 ? "s" : ""}
        </Text>
      }
    />
  );
}
