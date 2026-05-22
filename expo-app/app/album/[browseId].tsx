import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Icon } from "@/components/icons";
import { Image } from "expo-image";

import { api, upscaleThumbnail } from "@/api/client";
import { usePlayerStore } from "@/stores/player-store";
import { useLibraryStore } from "@/stores/library-store";
import { SkeletonAlbumHeader, SkeletonTrackRow } from "@/components/Skeleton";
import type { AlbumInfo } from "@/types";
import { theme, layout } from "@/theme";

export default function AlbumScreen() {
  const { browseId } = useLocalSearchParams<{ browseId: string }>();
  const router = useRouter();
  const [album, setAlbum] = useState<AlbumInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const isLiked = useLibraryStore((s) => s.isLiked);

  useEffect(() => {
    if (!browseId) return;
    setLoading(true);
    api.getAlbum(browseId).then(setAlbum).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [browseId]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
        <SkeletonAlbumHeader />
        <View style={{ paddingHorizontal: layout.px }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonTrackRow key={i} />)}
        </View>
      </View>
    );
  }

  if (error || !album) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
        <Text style={{ color: theme.colors.accent, fontSize: 14, textAlign: "center" }}>{error || "Album not found"}</Text>
        <Pressable
          style={{ marginTop: 16, backgroundColor: theme.colors.glass, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 99 }}
          onPress={() => { setLoading(true); setError(null); api.getAlbum(browseId!).then(setAlbum).catch((err) => setError(err.message)).finally(() => setLoading(false)); }}
        >
          <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  const t = album.thumbnails;
  const artUrl = t?.[t.length - 1]?.url;

  const handlePlayAll = () => {
    const firstTrack = album.tracks.find((t) => t.videoId);
    if (firstTrack?.videoId) playTrack(firstTrack.videoId, { albumBrowseId: browseId });
  };

  const header = (
    <View style={{ marginBottom: layout.sectionGap }}>
      <View style={{ alignItems: "center", paddingTop: 24, paddingBottom: 20, paddingHorizontal: layout.px }}>
        {artUrl && (
          <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: theme.colors.surface3 }}>
            <Image source={{ uri: upscaleThumbnail(artUrl, 320) }} style={{ width: 208, height: 208 }} />
          </View>
        )}
        <Text style={{ color: theme.colors.textPrimary, fontSize: 22, fontWeight: "700", letterSpacing: -0.3, marginTop: 16, textAlign: "center" }}>{album.title}</Text>
        {album.artists && (
          <View style={{ flexDirection: "row", gap: 4, marginTop: 6 }}>
            {album.artists.map((a, i) => (
              <Pressable key={a.id ?? i} onPress={() => a.id && router.push(`/artist/${a.id}`)}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>{a.name}{i < album.artists.length - 1 ? ", " : ""}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
          {album.year && <Text style={{ color: theme.colors.textTertiary, fontSize: 12 }}>{album.year}</Text>}
          {album.trackCount && <Text style={{ color: theme.colors.textTertiary, fontSize: 12 }}>{album.trackCount} songs</Text>}
          {album.duration && <Text style={{ color: theme.colors.textTertiary, fontSize: 12 }}>{album.duration}</Text>}
        </View>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
          <Pressable style={{ backgroundColor: theme.colors.accent, paddingHorizontal: 36, paddingVertical: 12, borderRadius: 99, flexDirection: "row", alignItems: "center", gap: 8 }} onPress={handlePlayAll}>
            <Icon name="play" size={16} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Play</Text>
          </Pressable>
          <Pressable style={{ backgroundColor: theme.colors.glass, paddingHorizontal: 36, paddingVertical: 12, borderRadius: 99, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="shuffle" size={16} color={theme.colors.textPrimary} />
            <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }}>Shuffle</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.surface }} contentContainerStyle={{ paddingBottom: 120 }}>
      {header}

      <View style={{ paddingHorizontal: layout.px }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: theme.colors.border }}>
          <Text style={{ color: theme.colors.textTertiary, fontSize: 11, fontWeight: "600", width: 32, letterSpacing: 0.5 }}>#</Text>
          <Text style={{ color: theme.colors.textTertiary, fontSize: 11, fontWeight: "600", flex: 1, letterSpacing: 0.5 }}>Title</Text>
          <View style={{ width: 48, alignItems: "flex-end" }}>
            <Icon name="clock" size={12} color={theme.colors.textTertiary} />
          </View>
        </View>
        {album.tracks.map((track, idx) => (
          <Pressable
            key={track.videoId ?? idx}
            style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: theme.colors.border }}
            onPress={() => track.videoId && playTrack(track.videoId, { albumBrowseId: browseId })}
          >
            <Text style={{ color: theme.colors.textTertiary, fontSize: 13, width: 32 }}>{track.index ?? idx + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>{track.title}</Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }} numberOfLines={1}>{track.artists?.join(", ")}</Text>
            </View>
            {track.videoId && (
              <Pressable style={{ padding: 10 }} onPress={() => toggleLike({ id: track.videoId!, title: track.title ?? "", artist: track.artists?.[0] ?? "", thumbnail: album.thumbnails?.[0]?.url })}>
                <Icon name={isLiked(track.videoId) ? "heart-filled" : "heart-outline"} size={15} color={isLiked(track.videoId) ? theme.colors.accent : theme.colors.textTertiary} />
              </Pressable>
            )}
            <Text style={{ color: theme.colors.textTertiary, fontSize: 12, width: 48, textAlign: "right" }}>{track.duration}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
