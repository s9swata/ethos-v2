import { useState, useCallback, useMemo } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { View, Text, Pressable, TextInput, Alert, ScrollView, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/icons";
import { Image } from "expo-image";
import { useLibraryStore } from "@/stores/library-store";
import { usePlayerStore } from "@/stores/player-store";
import { upscaleThumbnail } from "@/api/client";
import { SkeletonTrackRow } from "@/components/Skeleton";
import { theme, layout } from "@/theme";

type Filter = "playlists" | "songs" | "artists";
const { width: SCREEN_W } = Dimensions.get("window");
const GAP = 16;
const GRID_W = (SCREEN_W - layout.px * 2 - GAP) / 2;

const PILLS: { key: Filter; label: string }[] = [
  { key: "playlists", label: "Playlists" },
  { key: "songs", label: "Songs" },
  { key: "artists", label: "Artists" },
];

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const ready = useLibraryStore((s) => s.ready);
  const likedSongs = useLibraryStore((s) => s.likedSongs);
  const likedArtists = useLibraryStore((s) => s.likedArtists);
  const playlists = useLibraryStore((s) => s.playlists);
  const getLikedSongs = useLibraryStore((s) => s.getLikedSongs);
  const getLikedArtists = useLibraryStore((s) => s.getLikedArtists);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const [filter, setFilter] = useState<Filter>("playlists");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showName, setShowName] = useState(false);
  const [newName, setNewName] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (ready) {
        setLoading(true);
        Promise.all([getLikedSongs(), getLikedArtists()]).finally(() => setLoading(false));
      }
    }, [ready])
  );

  const match = (s: string) => s.toLowerCase().includes(query.toLowerCase());
  const fSongs = useMemo(() => query ? likedSongs.filter((s) => match(s.title) || match(s.artist)) : likedSongs, [likedSongs, query]);
  const fArtists = useMemo(() => query ? likedArtists.filter((a) => match(a.name)) : likedArtists, [likedArtists, query]);
  const fPlaylists = useMemo(() => query ? playlists.filter((p) => match(p.name)) : playlists, [playlists, query]);

  const header = (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: layout.px, paddingBottom: 8, backgroundColor: theme.colors.surface }}>
      <Text style={{ color: theme.colors.textPrimary, fontSize: 28, fontWeight: "700", letterSpacing: -0.5 }}>Library</Text>
      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.colors.surface3, borderRadius: 10, paddingHorizontal: 12, marginTop: 12 }}>
        <Icon name="search" size={14} color={theme.colors.textTertiary} />
        <TextInput style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: theme.colors.textPrimary, fontSize: 14 }} placeholder="Search in library" placeholderTextColor={theme.colors.textTertiary} value={query} onChangeText={setQuery} />
        {query.length > 0 && <Pressable onPress={() => setQuery("")}><Icon name="xmark" size={14} color={theme.colors.textTertiary} /></Pressable>}
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        {PILLS.map((p) => (
          <Pressable key={p.key} onPress={() => setFilter(p.key)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, backgroundColor: filter === p.key ? theme.colors.textPrimary : theme.colors.glass }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: filter === p.key ? "#000" : theme.colors.textSecondary }}>{p.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      {header}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.px, paddingTop: 16, paddingBottom: 140, gap: 2 }}>

        {filter === "playlists" && (
          <>
            {likedSongs.length > 0 && (
              <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }} onPress={() => setFilter("songs")}>
                <View style={{ width: 48, height: 48, borderRadius: 6, backgroundColor: theme.colors.accent, justifyContent: "center", alignItems: "center" }}>
                  <Icon name="heart-filled" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }}>Liked Songs</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>{likedSongs.length} songs</Text>
                </View>
                <Icon name="chevron-right" size={14} color={theme.colors.textTertiary} />
              </Pressable>
            )}

            {fPlaylists.map((pl) => (
              <Pressable key={pl.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }} onPress={() => router.push(`/playlist/${pl.id}`)} onLongPress={() => Alert.alert("Delete Playlist", `Delete "${pl.name}"?`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => deletePlaylist(pl.id) }])}>
                <View style={{ width: 48, height: 48, borderRadius: 6, backgroundColor: theme.colors.surface3, justifyContent: "center", alignItems: "center" }}>
                  <Icon name="music-note" size={18} color={theme.colors.textPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }}>{pl.name}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>{pl.track_count ?? 0} songs</Text>
                </View>
                <Icon name="chevron-right" size={14} color={theme.colors.textTertiary} />
              </Pressable>
            ))}

            {showName ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 }}>
                <TextInput style={{ flex: 1, backgroundColor: theme.colors.surface3, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: theme.colors.textPrimary, fontSize: 14 }} placeholder="Playlist name" placeholderTextColor={theme.colors.textTertiary} value={newName} onChangeText={setNewName} autoFocus onSubmitEditing={() => { if (newName.trim()) { createPlaylist(newName.trim()); setNewName(""); setShowName(false); } }} />
                <Pressable style={{ backgroundColor: theme.colors.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 }} onPress={() => { if (newName.trim()) { createPlaylist(newName.trim()); setNewName(""); setShowName(false); } }}>
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Create</Text>
                </Pressable>
                <Pressable style={{ padding: 10 }} onPress={() => { setShowName(false); setNewName(""); }}>
                  <Icon name="xmark" size={16} color={theme.colors.textSecondary} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, marginTop: 4 }} onPress={() => setShowName(true)}>
                <View style={{ width: 48, height: 48, borderRadius: 6, borderWidth: 1.5, borderColor: theme.colors.textTertiary, borderStyle: "dashed", justifyContent: "center", alignItems: "center" }}>
                  <Icon name="plus" size={18} color={theme.colors.textTertiary} />
                </View>
                <Text style={{ color: theme.colors.textTertiary, fontSize: 14, fontWeight: "500" }}>New Playlist</Text>
              </Pressable>
            )}
          </>
        )}

        {filter === "songs" && (
          loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonTrackRow key={i} />)
          ) : fSongs.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 48, gap: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.surface3, justifyContent: "center", alignItems: "center" }}>
                <Icon name="heart-outline" size={22} color={theme.colors.textTertiary} />
              </View>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>{query ? "No matching songs" : "No liked songs yet"}</Text>
              {!query && <Pressable style={{ backgroundColor: theme.colors.accent, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 99 }} onPress={() => router.replace("/search")}><Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Browse Music</Text></Pressable>}
            </View>
          ) : (
            fSongs.map((song) => (
              <Pressable key={song.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }} onPress={() => playTrack(song.id)}>
                <Image source={{ uri: upscaleThumbnail(song.thumbnail ?? "") }} style={{ width: 48, height: 48, borderRadius: 6 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>{song.title}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }} numberOfLines={1}>{song.artist}</Text>
                </View>
                <Icon name="heart-filled" size={16} color={theme.colors.accent} />
              </Pressable>
            ))
          )
        )}

        {filter === "artists" && (
          fArtists.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 48, gap: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.surface3, justifyContent: "center", alignItems: "center" }}>
                <Icon name="music-note" size={22} color={theme.colors.textTertiary} />
              </View>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>{query ? "No matching artists" : "No followed artists yet"}</Text>
              {!query && <Pressable style={{ backgroundColor: theme.colors.accent, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 99 }} onPress={() => router.replace("/search")}><Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Find Artists</Text></Pressable>}
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
              {fArtists.map((artist) => (
                <Pressable key={artist.id} style={{ width: GRID_W, alignItems: "center", gap: 8, paddingVertical: 12 }} onPress={() => router.push(`/artist/${artist.id}`)}>
                  <Image source={{ uri: upscaleThumbnail(artist.thumbnail ?? "", 160) }} style={{ width: GRID_W - 32, height: GRID_W - 32, borderRadius: (GRID_W - 32) / 2 }} />
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "500" }} numberOfLines={2}>{artist.name}</Text>
                </Pressable>
              ))}
            </View>
          )
        )}

      </ScrollView>
    </View>
  );
}
