import { useState, useCallback } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { View, Text, Pressable, TextInput, Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/icons";
import { Image } from "expo-image";
import { useLibraryStore } from "@/stores/library-store";
import { usePlayerStore } from "@/stores/player-store";
import { upscaleThumbnail, api } from "@/api/client";
import { SkeletonTrackRow } from "@/components/Skeleton";
import { theme, layout, typography } from "@/theme";
import type { TrackInfo } from "@/types";

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const ready = useLibraryStore((s) => s.ready);
  const likedSongs = useLibraryStore((s) => s.likedSongs);
  const playlists = useLibraryStore((s) => s.playlists);
  const getLikedSongs = useLibraryStore((s) => s.getLikedSongs);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const history = usePlayerStore((s) => s.history);
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (ready) {
        setLoading(true);
        getLikedSongs().finally(() => setLoading(false));
      }
    }, [ready])
  );

  const handleCreatePlaylist = async () => {
    if (!newName.trim()) return;
    await createPlaylist(newName.trim());
    setNewName("");
    setShowNewPlaylist(false);
  };

  const handleDeletePlaylist = (id: number, name: string) => {
    Alert.alert("Delete Playlist", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deletePlaylist(id) },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 8,
          paddingHorizontal: layout.px,
          backgroundColor: theme.colors.surface,
        }}
      >
        <Text style={typography.h1}>Library</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: layout.px, paddingTop: 8, paddingBottom: 140, gap: 24 }}
      >
        {history.length > 0 && (
          <View>
            <Text style={[typography.h3, { marginBottom: 8 }]}>Recently Played</Text>
            <View style={{ gap: 2 }}>
              {history.map((item) => (
                <Pressable
                  key={item.videoId}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}
                  onPress={() => playTrack(item.videoId)}
                >
                  <Image source={{ uri: upscaleThumbnail(item.thumbnail) }} style={{ width: 48, height: 48, borderRadius: 6 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>{item.title}</Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }} numberOfLines={1}>{item.artist}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View>
          <Text style={[typography.h3, { marginBottom: 8 }]}>Songs</Text>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonTrackRow key={i} />)
          ) : likedSongs.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 32, gap: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.surface3, justifyContent: "center", alignItems: "center" }}>
                <Icon name="heart-outline" size={22} color={theme.colors.textTertiary} />
              </View>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>No liked songs yet</Text>
              <Pressable
                style={{ backgroundColor: theme.colors.accent, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 99 }}
                onPress={() => router.replace("/search")}
              >
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Browse Music</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 2 }}>
              {likedSongs.map((song) => (
                <Pressable
                  key={song.id}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}
                  onPress={() => playTrack(song.id)}
                >
                  <Image source={{ uri: upscaleThumbnail(song.thumbnail ?? "") }} style={{ width: 48, height: 48, borderRadius: 6 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>{song.title}</Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }} numberOfLines={1}>{song.artist}</Text>
                  </View>
                  <Icon name="heart-filled" size={16} color={theme.colors.accent} />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={typography.h3}>Playlists</Text>
            <Pressable
              style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99, backgroundColor: theme.colors.glass }}
              onPress={() => setShowNewPlaylist(true)}
            >
              <Icon name="plus" size={14} color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          {showNewPlaylist && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <TextInput
                style={{ flex: 1, backgroundColor: theme.colors.surface3, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: theme.colors.textPrimary, fontSize: 14 }}
                placeholder="Playlist name"
                placeholderTextColor={theme.colors.textTertiary}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                onSubmitEditing={handleCreatePlaylist}
              />
              <Pressable style={{ backgroundColor: theme.colors.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 }} onPress={handleCreatePlaylist}>
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Create</Text>
              </Pressable>
              <Pressable style={{ padding: 10 }} onPress={() => { setShowNewPlaylist(false); setNewName(""); }}>
                <Icon name="xmark" size={16} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
          )}

          {playlists.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 32, gap: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.surface3, justifyContent: "center", alignItems: "center" }}>
                <Icon name="bars" size={22} color={theme.colors.textTertiary} />
              </View>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>No playlists yet</Text>
            </View>
          ) : (
            <View style={{ gap: 2 }}>
              {playlists.map((playlist) => (
                <Pressable
                  key={playlist.id}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}
                  onPress={() => router.push(`/playlist/${playlist.id}`)}
                  onLongPress={() => handleDeletePlaylist(playlist.id, playlist.name)}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 6, backgroundColor: theme.colors.surface3, justifyContent: "center", alignItems: "center" }}>
                    <Icon name="music-note" size={18} color={theme.colors.textPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }}>{playlist.name}</Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>{playlist.track_count ?? 0} songs</Text>
                  </View>
                  <Icon name="chevron-right" size={14} color={theme.colors.textTertiary} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
