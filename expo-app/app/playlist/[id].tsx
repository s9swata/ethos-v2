import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/icons";
import { Image } from "expo-image";
import { Swipeable } from "react-native-gesture-handler";
import { useLibraryStore } from "@/stores/library-store";
import { usePlayerStore } from "@/stores/player-store";
import type { PlaylistTrack } from "@/stores/library-store";
import { upscaleThumbnail } from "@/api/client";
import { theme, layout } from "@/theme";

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const playlistId = Number(id);
  const getPlaylistTracks = useLibraryStore((s) => s.getPlaylistTracks);
  const insets = useSafeAreaInsets();
  const playlists = useLibraryStore((s) => s.playlists);
  const removeTrackFromPlaylist = useLibraryStore((s) => s.removeTrackFromPlaylist);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const playlist = playlists.find((p) => p.id === playlistId);

  useEffect(() => {
    if (!playlistId) return;
    setLoading(true);
    getPlaylistTracks(playlistId).then(setTracks).finally(() => setLoading(false));
  }, [playlistId]);

  const handleRemoveTrack = (position: number, title: string) => {
    Alert.alert("Remove Track", `Remove "${title}" from this playlist?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await removeTrackFromPlaylist(playlistId, position);
          setTracks((prev) => prev.filter((t) => t.position !== position));
        },
      },
    ]);
  };

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0].track_id);
    }
  };

  const handleShuffle = () => {
    if (tracks.length > 0) {
      const randomIdx = Math.floor(Math.random() * tracks.length);
      playTrack(tracks[randomIdx].track_id);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: layout.px, paddingBottom: 8 }}>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 22, fontWeight: "700" }}>{playlist?.name ?? "Playlist"}</Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>{tracks.length} songs</Text>
        {tracks.length > 0 && (
          <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
            <Pressable
              style={{ backgroundColor: theme.colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 99, flexDirection: "row", alignItems: "center", gap: 8 }}
              onPress={handlePlayAll}
            >
              <Icon name="play" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Play</Text>
            </Pressable>
            <Pressable
              style={{ backgroundColor: theme.colors.glass, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 99, flexDirection: "row", alignItems: "center", gap: 8 }}
              onPress={handleShuffle}
            >
              <Icon name="shuffle" size={16} color={theme.colors.textPrimary} />
              <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "600" }}>Shuffle</Text>
            </Pressable>
          </View>
        )}
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: layout.px, paddingBottom: 120 }}>
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
          tracks.map((track) => (
            <Swipeable
              key={track.id}
              renderRightActions={() => (
                <View style={{ justifyContent: "center", backgroundColor: theme.colors.accent, borderRadius: 10, marginVertical: 4, marginLeft: 8 }}>
                  <Pressable
                    style={{ paddingHorizontal: 20, flex: 1, justifyContent: "center", alignItems: "center" }}
                    onPress={() => handleRemoveTrack(track.position, track.title)}
                  >
                    <Icon name="trash" size={18} color="#fff" />
                  </Pressable>
                </View>
              )}
            >
              <Pressable
                style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}
                onPress={() => playTrack(track.track_id)}
              >
                {track.thumbnail ? (
                  <Image source={{ uri: upscaleThumbnail(track.thumbnail) }} style={{ width: 44, height: 44, borderRadius: 8 }} />
                ) : (
                  <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: theme.colors.surface3, justifyContent: "center", alignItems: "center" }}>
                    <Icon name="music-note" size={16} color={theme.colors.textSecondary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "500" }} numberOfLines={1}>{track.title}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{track.artist}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  {track.duration != null && (
                    <Text style={{ color: theme.colors.textTertiary, fontSize: 11 }}>
                      {track.duration}
                    </Text>
                  )}
                </View>
              </Pressable>
            </Swipeable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
