import { useState, useCallback, useMemo, useRef } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { View, Text, Pressable, TextInput, Alert, ScrollView, Dimensions, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/icons";
import { Image } from "expo-image";
import { useLibraryStore } from "@/stores/library-store";
import { usePlayerStore } from "@/stores/player-store";
import { upscaleThumbnail } from "@/api/client";
import { SkeletonTrackRow } from "@/components/Skeleton";
import { theme, layout, radius, typography } from "@/theme";
import { haptics } from "@/utils/animations";

type Filter = "playlists" | "songs" | "artists";
const { width: SCREEN_W } = Dimensions.get("window");
const GAP = 16;
const GRID_W = (SCREEN_W - layout.px * 2 - GAP) / 2;

const PILLS: { key: Filter; label: string }[] = [
  { key: "playlists", label: "Playlists" },
  { key: "songs", label: "Songs" },
  { key: "artists", label: "Artists" },
];

function FilterPill({ 
  label, 
  isActive, 
  onPress 
}: { 
  label: string; 
  isActive: boolean; 
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  
  const handlePress = () => {
    haptics.light();
    Animated.spring(scale, {
      toValue: 0.96,
      friction: 8,
      tension: 400,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 400,
        useNativeDriver: true,
      }).start();
    });
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable 
        onPress={handlePress}
        style={{ 
          paddingHorizontal: layout.space[4], 
          paddingVertical: layout.space[2], 
          borderRadius: radius.full, 
          backgroundColor: isActive ? theme.colors.accent : theme.colors.surfaceElevated,
          borderWidth: isActive ? 0 : 1,
          borderColor: theme.colors.border,
        }}
        accessibilityLabel={`Filter by ${label}`}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
      >
        <Text style={{ 
          fontSize: 13, 
          fontWeight: "600", 
          color: isActive ? "#fff" : theme.colors.textSecondary 
        }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

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
    <View style={{ 
      paddingTop: insets.top + layout.space[4], 
      paddingHorizontal: layout.px, 
      paddingBottom: layout.space[4], 
      backgroundColor: theme.colors.surface 
    }}>
      <Text style={{ 
        color: theme.colors.textPrimary, 
        fontSize: 32, 
        fontWeight: "700", 
        letterSpacing: -0.02 
      }}>
        Library
      </Text>
      
      {/* Search Field */}
      <View style={{ 
        flexDirection: "row", 
        alignItems: "center", 
        backgroundColor: theme.colors.surfaceElevated, 
        borderRadius: radius.md, 
        paddingHorizontal: layout.space[3],
        marginTop: layout.space[4],
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}>
        <Icon name="search" size={16} color={theme.colors.textTertiary} />
        <TextInput 
          style={{ 
            flex: 1, 
            paddingVertical: layout.space[3], 
            paddingHorizontal: layout.space[3], 
            color: theme.colors.textPrimary, 
            fontSize: 15 
          }} 
          placeholder="Search in library" 
          placeholderTextColor={theme.colors.textTertiary} 
          value={query} 
          onChangeText={setQuery} 
        />
        {query.length > 0 && (
          <Pressable 
            onPress={() => setQuery("")}
            hitSlop={12}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
          >
            <Icon name="xmark" size={16} color={theme.colors.textTertiary} />
          </Pressable>
        )}
      </View>
      
      {/* Filter Pills */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: "row", gap: layout.space[2], marginTop: layout.space[4] }}
      >
        {PILLS.map((p) => (
          <FilterPill 
            key={p.key} 
            label={p.label} 
            isActive={filter === p.key} 
            onPress={() => setFilter(p.key)} 
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      {header}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ 
          paddingHorizontal: layout.px, 
          paddingTop: layout.space[4], 
          paddingBottom: 160, 
          gap: layout.space[1] 
        }}
      >

        {filter === "playlists" && (
          <>
            {likedSongs.length > 0 && (
              <Pressable 
                style={({ pressed }) => ({ 
                  flexDirection: "row", 
                  alignItems: "center", 
                  gap: layout.space[3], 
                  paddingVertical: layout.space[3],
                  backgroundColor: pressed ? theme.colors.surfaceElevated : "transparent",
                  borderRadius: radius.md,
                })} 
                onPress={() => { haptics.light(); setFilter("songs"); }}
                accessibilityLabel="Liked Songs playlist"
                accessibilityRole="button"
              >
                <View style={{ 
                  width: 56, 
                  height: 56, 
                  borderRadius: radius.sm, 
                  backgroundColor: theme.colors.accent, 
                  justifyContent: "center", 
                  alignItems: "center",
                  ...theme.shadows.sm,
                }}>
                  <Icon name="heart-filled" size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: "600" }}>Liked Songs</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 }}>{likedSongs.length} songs</Text>
                </View>
                <Icon name="chevron-right" size={16} color={theme.colors.textTertiary} />
              </Pressable>
            )}

            {fPlaylists.map((pl) => (
              <Pressable 
                key={pl.id} 
                style={({ pressed }) => ({ 
                  flexDirection: "row", 
                  alignItems: "center", 
                  gap: layout.space[3], 
                  paddingVertical: layout.space[3],
                  backgroundColor: pressed ? theme.colors.surfaceElevated : "transparent",
                  borderRadius: radius.md,
                })} 
                onPress={() => { haptics.light(); router.push(`/playlist/${pl.id}`); }}
                onLongPress={() => {
                  haptics.medium();
                  Alert.alert(
                    "Delete Playlist", 
                    `Delete "${pl.name}"?`, 
                    [
                      { text: "Cancel", style: "cancel" }, 
                      { text: "Delete", style: "destructive", onPress: () => deletePlaylist(pl.id) }
                    ]
                  );
                }}
                accessibilityLabel={`Playlist: ${pl.name}`}
                accessibilityRole="button"
              >
                <View style={{ 
                  width: 56, 
                  height: 56, 
                  borderRadius: radius.sm, 
                  backgroundColor: theme.colors.surfaceElevated, 
                  justifyContent: "center", 
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}>
                  <Icon name="music-note" size={22} color={theme.colors.textPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: "600" }}>{pl.name}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 }}>{pl.track_count ?? 0} songs</Text>
                </View>
                <Icon name="chevron-right" size={16} color={theme.colors.textTertiary} />
              </Pressable>
            ))}

            {showName ? (
              <View style={{ 
                flexDirection: "row", 
                alignItems: "center", 
                gap: layout.space[2], 
                paddingVertical: layout.space[3],
                marginTop: layout.space[2],
              }}>
                <TextInput 
                  style={{ 
                    flex: 1, 
                    backgroundColor: theme.colors.surfaceElevated, 
                    borderRadius: radius.md, 
                    paddingHorizontal: layout.space[4], 
                    paddingVertical: layout.space[3], 
                    color: theme.colors.textPrimary, 
                    fontSize: 15,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }} 
                  placeholder="Playlist name" 
                  placeholderTextColor={theme.colors.textTertiary} 
                  value={newName} 
                  onChangeText={setNewName} 
                  autoFocus 
                  onSubmitEditing={() => { 
                    if (newName.trim()) { 
                      haptics.success();
                      createPlaylist(newName.trim()); 
                      setNewName(""); 
                      setShowName(false); 
                    } 
                  }} 
                />
                <Pressable 
                  style={{ 
                    backgroundColor: theme.colors.accent, 
                    paddingHorizontal: layout.space[4], 
                    paddingVertical: layout.space[3], 
                    borderRadius: radius.md,
                    ...theme.shadows.sm,
                  }} 
                  onPress={() => { 
                    if (newName.trim()) { 
                      haptics.success();
                      createPlaylist(newName.trim()); 
                      setNewName(""); 
                      setShowName(false); 
                    } 
                  }}
                  accessibilityLabel="Create playlist"
                  accessibilityRole="button"
                >
                  <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>Create</Text>
                </Pressable>
                <Pressable 
                  style={{ padding: layout.space[3] }} 
                  onPress={() => { setShowName(false); setNewName(""); }}
                  accessibilityLabel="Cancel"
                  accessibilityRole="button"
                >
                  <Icon name="xmark" size={18} color={theme.colors.textSecondary} />
                </Pressable>
              </View>
            ) : (
              <Pressable 
                style={({ pressed }) => ({ 
                  flexDirection: "row", 
                  alignItems: "center", 
                  gap: layout.space[3], 
                  paddingVertical: layout.space[3],
                  marginTop: layout.space[2],
                  backgroundColor: pressed ? theme.colors.surfaceElevated : "transparent",
                  borderRadius: radius.md,
                })} 
                onPress={() => { haptics.light(); setShowName(true); }}
                accessibilityLabel="Create new playlist"
                accessibilityRole="button"
              >
                <View style={{ 
                  width: 56, 
                  height: 56, 
                  borderRadius: radius.sm, 
                  borderWidth: 2, 
                  borderColor: theme.colors.textTertiary, 
                  borderStyle: "dashed", 
                  justifyContent: "center", 
                  alignItems: "center" 
                }}>
                  <Icon name="plus" size={24} color={theme.colors.textTertiary} />
                </View>
                <Text style={{ color: theme.colors.textTertiary, fontSize: 15, fontWeight: "600" }}>New Playlist</Text>
              </Pressable>
            )}
          </>
        )}

        {filter === "songs" && (
          loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonTrackRow key={i} />)
          ) : fSongs.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: layout.space[12], gap: layout.space[4] }}>
              <View style={{ 
                width: 72, 
                height: 72, 
                borderRadius: radius.xl, 
                backgroundColor: theme.colors.surfaceElevated, 
                justifyContent: "center", 
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}>
                <Icon name="heart-outline" size={32} color={theme.colors.textTertiary} />
              </View>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>
                {query ? "No matching songs" : "No liked songs yet"}
              </Text>
              {!query && (
                <Pressable 
                  style={{ 
                    backgroundColor: theme.colors.accent, 
                    paddingHorizontal: layout.space[5], 
                    paddingVertical: layout.space[3], 
                    borderRadius: radius.full,
                    ...theme.shadows.sm,
                  }} 
                  onPress={() => { haptics.light(); router.replace("/search"); }}
                  accessibilityLabel="Browse music"
                  accessibilityRole="button"
                >
                  <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>Browse Music</Text>
                </Pressable>
              )}
            </View>
          ) : (
            fSongs.map((song) => (
              <Pressable 
                key={song.id} 
                style={({ pressed }) => ({ 
                  flexDirection: "row", 
                  alignItems: "center", 
                  gap: layout.space[3], 
                  paddingVertical: layout.space[2],
                  backgroundColor: pressed ? theme.colors.surfaceElevated : "transparent",
                  borderRadius: radius.md,
                })} 
                onPress={() => { haptics.light(); playTrack(song.id); }}
                accessibilityLabel={`Play ${song.title} by ${song.artist}`}
                accessibilityRole="button"
              >
                <Image 
                  source={{ uri: upscaleThumbnail(song.thumbnail ?? "") }} 
                  style={{ 
                    width: 52, 
                    height: 52, 
                    borderRadius: radius.sm,
                    backgroundColor: theme.colors.surfaceElevated,
                  }} 
                  contentFit="cover"
                  transition={300}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: "500" }} numberOfLines={1}>
                    {song.title}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                    {song.artist}
                  </Text>
                </View>
                <Icon name="heart-filled" size={18} color={theme.colors.accent} />
              </Pressable>
            ))
          )
        )}

        {filter === "artists" && (
          fArtists.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: layout.space[12], gap: layout.space[4] }}>
              <View style={{ 
                width: 72, 
                height: 72, 
                borderRadius: radius.xl, 
                backgroundColor: theme.colors.surfaceElevated, 
                justifyContent: "center", 
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}>
                <Icon name="music-note" size={32} color={theme.colors.textTertiary} />
              </View>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 15 }}>
                {query ? "No matching artists" : "No followed artists yet"}
              </Text>
              {!query && (
                <Pressable 
                  style={{ 
                    backgroundColor: theme.colors.accent, 
                    paddingHorizontal: layout.space[5], 
                    paddingVertical: layout.space[3], 
                    borderRadius: radius.full,
                    ...theme.shadows.sm,
                  }} 
                  onPress={() => { haptics.light(); router.replace("/search"); }}
                  accessibilityLabel="Find artists"
                  accessibilityRole="button"
                >
                  <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>Find Artists</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
              {fArtists.map((artist) => (
                <Pressable 
                  key={artist.id} 
                  style={({ pressed }) => ({ 
                    width: GRID_W, 
                    alignItems: "center", 
                    gap: layout.space[2], 
                    paddingVertical: layout.space[3],
                    opacity: pressed ? 0.8 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })} 
                  onPress={() => { haptics.light(); router.push(`/artist/${artist.id}`); }}
                  accessibilityLabel={`View artist: ${artist.name}`}
                  accessibilityRole="button"
                >
                  <Image 
                    source={{ uri: upscaleThumbnail(artist.thumbnail ?? "", 280) }} 
                    style={{ 
                      width: GRID_W - 32, 
                      height: GRID_W - 32, 
                      borderRadius: (GRID_W - 32) / 2,
                      backgroundColor: theme.colors.surfaceElevated,
                      ...theme.shadows.sm,
                    }} 
                    contentFit="cover"
                    transition={300}
                  />
                  <Text style={{ 
                    color: theme.colors.textPrimary, 
                    fontSize: 14, 
                    fontWeight: "500",
                    textAlign: "center",
                  }} numberOfLines={2}>
                    {artist.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )
        )}

      </ScrollView>
    </View>
  );
}
