import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/icons";
import { Image } from "expo-image";
import { useLibraryStore } from "@/stores/library-store";
import { usePlayerStore } from "@/stores/player-store";
import { api, upscaleThumbnail } from "@/api/client";
import { theme, layout } from "@/theme";

interface TrackDisplay {
  key: string;
  track_id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
}

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const playTrack = usePlayerStore((s) => s.playTrack);
  const [tracks, setTracks] = useState<TrackDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [playlistTitle, setPlaylistTitle] = useState("Playlist");

  const isLocalPlaylist = !isNaN(Number(id));

  useEffect(() => {
    if (isLocalPlaylist && id) {
      const { getPlaylistTracks, playlists } = useLibraryStore.getState();
      const playlistId = Number(id);
      const localPlaylist = playlists.find((p) => p.id === playlistId);
      if (localPlaylist) setPlaylistTitle(localPlaylist.name);
      setLoading(true);
      getPlaylistTracks(playlistId).then((pt) => {
        setTracks(pt.map((t) => ({
          key: String(t.id),
          track_id: t.track_id,
          title: t.title,
          artist: t.artist,
          thumbnail: t.thumbnail ?? "",
          duration: t.duration ?? "",
        })));
      }).finally(() => setLoading(false));
    } else if (id) {
      const url = `https://music.youtube.com/playlist?list=${id}`;
      setLoading(true);
      api.getPlaylist(url).then((data) => {
        setPlaylistTitle(data.title);
        setTracks(data.tracks.map((t, i) => ({
          key: `${id}-${i}`,
          track_id: t.id ?? "",
          title: t.title,
          artist: t.artist,
          thumbnail: t.thumbnail,
          duration: String(t.duration),
        })));
      }).catch(() => {
        setPlaylistTitle("Playlist");
      }).finally(() => setLoading(false));
    }
  }, [id, isLocalPlaylist]);

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
        <Text style={{ color: theme.colors.textPrimary, fontSize: 22, fontWeight: "700" }}>{playlistTitle}</Text>
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
            <Pressable
              key={track.key}
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
              {track.duration ? (
                <Text style={{ color: theme.colors.textTertiary, fontSize: 11 }}>{track.duration}</Text>
              ) : null}
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
