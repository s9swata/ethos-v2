import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/icons";
import { Image } from "expo-image";
import { upscaleThumbnail } from "@/api/client";
import { useArtistQuery } from "@/api/queries";
import { usePlayerStore } from "@/stores/player-store";
import { useLibraryStore } from "@/stores/library-store";
import { theme, layout } from "@/theme";

export default function ArtistScreen() {
  const { browseId } = useLocalSearchParams<{ browseId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: artist, isLoading, error } = useArtistQuery(browseId ?? null);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const isLiked = useLibraryStore((s) => s.isLiked);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
        <View style={{ paddingTop: insets.top + 80, paddingHorizontal: layout.px, paddingBottom: 24, alignItems: "center" }}>
          <View style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: theme.colors.surface3 }} />
          <View style={{ width: 160, height: 24, backgroundColor: theme.colors.surface3, borderRadius: 4, marginTop: 16 }} />
        </View>
        <View style={{ paddingHorizontal: layout.px, marginTop: layout.sectionGap }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 12, paddingVertical: 10 }}>
              <View style={{ width: 44, height: 44, borderRadius: 6, backgroundColor: theme.colors.surface3 }} />
              <View style={{ flex: 1, gap: 4, justifyContent: "center" }}>
                <View style={{ width: "70%", height: 14, backgroundColor: theme.colors.surface3, borderRadius: 4 }} />
                <View style={{ width: "40%", height: 12, backgroundColor: theme.colors.surface3, borderRadius: 4 }} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (error || !artist) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
        <Text style={{ color: theme.colors.accent, fontSize: 14, textAlign: "center" }}>{error?.message || "Artist not found"}</Text>
      </View>
    );
  }

  const t = artist.thumbnails;
  const heroUrl = t?.[t.length - 1]?.url;

  const artistContextItems = artist.topSongs
    .filter((s) => s.videoId)
    .map((s) => ({
      videoId: s.videoId!,
      title: s.title ?? "",
      artist: s.artists?.[0] ?? artist.name ?? "",
      thumbnail: s.thumbnails?.[0]?.url ?? "",
      duration: 0,
    }));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.surface }} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={{ height: 320, justifyContent: "flex-end" }}>
        {heroUrl && (
          <Image
            source={{ uri: upscaleThumbnail(heroUrl, 480) }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
        )}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.3)",
          }}
        />
        <View style={{ paddingHorizontal: layout.px, paddingTop: insets.top + 80, paddingBottom: 24, alignItems: "flex-end", paddingRight: 32 }}>
          <Text style={{ color: theme.colors.textPrimary, fontSize: 30, fontWeight: "700", letterSpacing: -0.5, textAlign: "right" }}>{artist.name}</Text>
          {artist.subscribers && (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 4 }}>{artist.subscribers} subscribers</Text>
          )}
        </View>
      </View>

      {artist.topSongs.length > 0 && (
        <View style={{ marginTop: layout.sectionGap, paddingHorizontal: layout.px }}>
          <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontWeight: "700", letterSpacing: -0.3, marginBottom: 8 }}>Top Songs</Text>
          {artist.topSongs.map((song, idx) => (
            <Pressable
              key={song.videoId ?? idx}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}
              onPress={() => {
                const startIdx = artistContextItems.findIndex((c) => c.videoId === song.videoId);
                song.videoId && playTrack(song.videoId, { queueType: "artist", queueId: browseId, contextItems: artistContextItems, startIndex: startIdx >= 0 ? startIdx : 0, title: song.title ?? undefined, artist: song.artists?.[0] ?? undefined, thumbnail: song.thumbnails?.[0]?.url });
              }}
            >
              <Text style={{ color: theme.colors.textTertiary, fontSize: 14, width: 24, textAlign: "right" }}>{idx + 1}</Text>
              {song.thumbnails?.[0]?.url && <Image source={{ uri: upscaleThumbnail(song.thumbnails[0].url) }} style={{ width: 44, height: 44, borderRadius: 6 }} />}
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>{song.title}</Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }} numberOfLines={1}>{song.album}</Text>
              </View>
              {song.videoId && (
                <Pressable style={{ padding: 10 }} onPress={() => toggleLike({ id: song.videoId!, title: song.title ?? "", artist: song.artists?.[0] ?? "", thumbnail: song.thumbnails?.[0]?.url })}>
                  <Icon name={isLiked(song.videoId!) ? "heart-filled" : "heart-outline"} size={16} color={isLiked(song.videoId!) ? theme.colors.accent : theme.colors.textTertiary} />
                </Pressable>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {artist.albums.length > 0 && (
        <View style={{ marginTop: layout.sectionGap, paddingHorizontal: layout.px }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontWeight: "700", letterSpacing: -0.3 }}>Albums</Text>
            {artist.albumsParams && (
              <Pressable onPress={() => router.push(`/artist/${browseId}/albums?params=${encodeURIComponent(artist.albumsParams!)}`)}>
                <Text style={{ color: theme.colors.accent, fontSize: 13, fontWeight: "600" }}>See All</Text>
              </Pressable>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
            {artist.albums.map((album, idx) => (
              <Pressable key={album.browseId ?? idx} style={{ width: 150 }} onPress={() => album.browseId && router.push(`/album/${album.browseId}`)}>
                <View style={{ borderRadius: 12, overflow: "hidden", backgroundColor: theme.colors.surface3 }}>
                  {album.thumbnails?.[0]?.url && <Image source={{ uri: upscaleThumbnail(album.thumbnails[0].url) }} style={{ width: 150, height: 150 }} />}
                </View>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "500", marginTop: 8 }} numberOfLines={1}>{album.title}</Text>
                {album.year && <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>{album.year}</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {artist.singles.length > 0 && (
        <View style={{ marginTop: layout.sectionGap, paddingHorizontal: layout.px }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontWeight: "700", letterSpacing: -0.3 }}>Singles & EPs</Text>
            {artist.singlesParams && (
              <Pressable onPress={() => router.push(`/artist/${browseId}/albums?params=${encodeURIComponent(artist.singlesParams!)}`)}>
                <Text style={{ color: theme.colors.accent, fontSize: 13, fontWeight: "600" }}>See All</Text>
              </Pressable>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
            {artist.singles.map((single, idx) => (
              <Pressable key={single.browseId ?? idx} style={{ width: 150 }} onPress={() => single.browseId && router.push(`/album/${single.browseId}`)}>
                <View style={{ borderRadius: 12, overflow: "hidden", backgroundColor: theme.colors.surface3 }}>
                  {single.thumbnails?.[0]?.url && <Image source={{ uri: upscaleThumbnail(single.thumbnails[0].url) }} style={{ width: 150, height: 150 }} />}
                </View>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "500", marginTop: 8 }} numberOfLines={1}>{single.title}</Text>
                {single.year && <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>{single.year}</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {artist.related && artist.related.length > 0 && (
        <View style={{ marginTop: layout.sectionGap, paddingHorizontal: layout.px }}>
          <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontWeight: "700", letterSpacing: -0.3, marginBottom: 12 }}>Related Artists</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {artist.related.map((r, idx) => (
              <Pressable
                key={r.browseId ?? idx}
                style={{ backgroundColor: theme.colors.glass, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99 }}
                onPress={() => r.browseId && router.push(`/artist/${r.browseId}`)}
              >
                <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "500" }}>{r.artist}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
