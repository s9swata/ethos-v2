import { useEffect, useState, useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Icon } from "@/components/icons";
import { useLibraryStore } from "@/stores/library-store";
import { usePlayerStore } from "@/stores/player-store";
import { api, upscaleThumbnail } from "@/api/client";
import { theme, layout } from "@/theme";
import type { PlaylistInfo } from "@/types";

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const playTrack = usePlayerStore((s) => s.playTrack);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const isLiked = useLibraryStore((s) => s.isLiked);
  const [playlist, setPlaylist] = useState<PlaylistInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const isLocalPlaylist = !isNaN(Number(id));

  const tracks = useMemo(() => playlist?.tracks ?? [], [playlist]);

  useEffect(() => {
    if (isLocalPlaylist && id) {
      const { getPlaylistTracks, playlists } = useLibraryStore.getState();
      const playlistId = Number(id);
      const localPlaylist = playlists.find((p) => p.id === playlistId);
      if (localPlaylist) {
        setPlaylist({ title: localPlaylist.name, thumbnail: "", tracks: [], count: 0 });
      }
      setLoading(true);
      getPlaylistTracks(playlistId).then((pt) => {
        setPlaylist({
          title: localPlaylist?.name ?? "Playlist",
          thumbnail: "",
          tracks: pt.map((t) => ({
            id: t.track_id,
            title: t.title,
            artist: t.artist,
            duration: parseInt(t.duration ?? "0"),
            url: null,
            thumbnail: t.thumbnail ?? "",
            webpageUrl: "",
          })),
          count: pt.length,
        });
      }).finally(() => setLoading(false));
    } else if (id) {
      const url = `https://music.youtube.com/playlist?list=${id}`;
      setLoading(true);
      api.getPlaylist(url).then(setPlaylist).catch(() => {
        setPlaylist({ title: "Playlist", thumbnail: "", tracks: [], count: 0 });
      }).finally(() => setLoading(false));
    }
  }, [id, isLocalPlaylist]);

  const artUrl = playlist?.thumbnail || "";

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  const header = (
    <View style={{ marginBottom: layout.sectionGap }}>
      <View style={{ alignItems: "center", paddingTop: 24, paddingBottom: 20, paddingHorizontal: layout.px }}>
        {artUrl && (
          <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: theme.colors.surface3 }}>
            <Image source={{ uri: upscaleThumbnail(artUrl, 320) }} style={{ width: 208, height: 208 }} />
          </View>
        )}
        <Text style={{ color: theme.colors.textPrimary, fontSize: 22, fontWeight: "700", letterSpacing: -0.3, marginTop: 16, textAlign: "center" }}>{playlist?.title ?? "Playlist"}</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>{tracks.length} songs</Text>
        </View>
        {tracks.length > 0 && (
          <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
            <Pressable
              style={{ backgroundColor: theme.colors.accent, paddingHorizontal: 36, paddingVertical: 12, borderRadius: 99, flexDirection: "row", alignItems: "center", gap: 8 }}
              onPress={() => { const t = tracks[0]; playTrack(t.id ?? ""); }}
            >
              <Icon name="play" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Play</Text>
            </Pressable>
            <Pressable
              style={{ backgroundColor: theme.colors.glass, paddingHorizontal: 36, paddingVertical: 12, borderRadius: 99, flexDirection: "row", alignItems: "center", gap: 8 }}
              onPress={() => { const randomIdx = Math.floor(Math.random() * tracks.length); playTrack(tracks[randomIdx].id ?? ""); }}
            >
              <Icon name="shuffle" size={16} color={theme.colors.textPrimary} />
              <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }}>Shuffle</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.surface }} contentContainerStyle={{ paddingBottom: 120 }}>
      {header}

      <View style={{ paddingHorizontal: layout.px }}>
        {tracks.length === 0 ? (
          <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 64 }}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>No tracks in this playlist</Text>
            <Pressable
              style={{ marginTop: 16, backgroundColor: theme.colors.glass, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 99 }}
              onPress={() => router.push("/search")}
            >
              <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }}>Find Music</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: theme.colors.border }}>
              <Text style={{ color: theme.colors.textTertiary, fontSize: 11, fontWeight: "600", width: 32, letterSpacing: 0.5 }}>#</Text>
              <Text style={{ color: theme.colors.textTertiary, fontSize: 11, fontWeight: "600", flex: 1, letterSpacing: 0.5 }}>Title</Text>
              <View style={{ width: 48, alignItems: "flex-end" }}>
                <Icon name="clock" size={12} color={theme.colors.textTertiary} />
              </View>
            </View>
            {tracks.map((track, idx) => (
              <Pressable
                key={track.id ?? idx}
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: theme.colors.border }}
                onPress={() => track.id && playTrack(track.id, { title: track.title, artist: track.artist })}
              >
                <Text style={{ color: theme.colors.textTertiary, fontSize: 13, width: 32 }}>{idx + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>{track.title}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }} numberOfLines={1}>{track.artist}</Text>
                </View>
                {track.id && (
                  <Pressable style={{ padding: 10 }} onPress={() => toggleLike({ id: track.id!, title: track.title, artist: track.artist, thumbnail: "" })}>
                    <Icon name={isLiked(track.id) ? "heart-filled" : "heart-outline"} size={15} color={isLiked(track.id) ? theme.colors.accent : theme.colors.textTertiary} />
                  </Pressable>
                )}
                <Text style={{ color: theme.colors.textTertiary, fontSize: 12, width: 48, textAlign: "right" }}>{String(track.duration)}</Text>
              </Pressable>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}
