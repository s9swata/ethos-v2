import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Icon } from "@/components/icons";
import { Image } from "expo-image";
import { api, upscaleThumbnail } from "@/api/client";
import { usePlayerStore } from "@/stores/player-store";
import { useLibraryStore } from "@/stores/library-store";
import { SkeletonArtistHero, SkeletonTrackRow } from "@/components/Skeleton";
import type { ArtistInfo } from "@/types";
import { theme, layout } from "@/theme";

export default function ArtistScreen() {
  const { browseId } = useLocalSearchParams<{ browseId: string }>();
  const router = useRouter();
  const [artist, setArtist] = useState<ArtistInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const isLiked = useLibraryStore((s) => s.isLiked);

  useEffect(() => {
    if (!browseId) return;
    setLoading(true);
    api.getArtist(browseId).then(setArtist).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [browseId]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
        <SkeletonArtistHero />
        <View style={{ paddingHorizontal: layout.px, marginTop: layout.sectionGap }}>
          {Array.from({ length: 5 }).map((_, i) => <SkeletonTrackRow key={i} />)}
        </View>
      </View>
    );
  }

  if (error || !artist) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
        <Text style={{ color: theme.colors.accent, fontSize: 14, textAlign: "center" }}>{error || "Artist not found"}</Text>
        <Pressable
          style={{ marginTop: 16, backgroundColor: theme.colors.glass, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 99 }}
          onPress={() => { setLoading(true); setError(null); api.getArtist(browseId!).then(setArtist).catch((err) => setError(err.message)).finally(() => setLoading(false)); }}
        >
          <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  const t = artist.thumbnails;
  const heroUrl = t?.[t.length - 1]?.url;

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
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 160,
          }}
        />
        <View style={{ paddingHorizontal: layout.px, paddingTop: 80, paddingBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 16 }}>
            {heroUrl && (
              <Image source={{ uri: upscaleThumbnail(heroUrl, 320) }} style={{ width: 112, height: 112, borderRadius: 56, borderWidth: 2, borderColor: "rgba(255,255,255,0.15)" }} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 30, fontWeight: "700", letterSpacing: -0.5 }}>{artist.name}</Text>
              {artist.subscribers && (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 4 }}>{artist.subscribers} subscribers</Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {artist.topSongs.length > 0 && (
        <View style={{ marginTop: layout.sectionGap, paddingHorizontal: layout.px }}>
          <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontWeight: "700", letterSpacing: -0.3, marginBottom: 8 }}>Top Songs</Text>
          {artist.topSongs.map((song, idx) => (
            <Pressable
              key={song.videoId ?? idx}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}
              onPress={() => song.videoId && playTrack(song.videoId, { artistBrowseId: browseId })}
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
          <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontWeight: "700", letterSpacing: -0.3, marginBottom: 12 }}>Albums</Text>
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
          <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontWeight: "700", letterSpacing: -0.3, marginBottom: 12 }}>Singles & EPs</Text>
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
    </ScrollView>
  );
}
