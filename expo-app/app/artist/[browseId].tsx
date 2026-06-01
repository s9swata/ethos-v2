import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable, ScrollView, Animated, useRef } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/icons";
import { Image } from "expo-image";
import { upscaleThumbnail } from "@/api/client";
import { useArtistQuery } from "@/api/queries";
import { usePlayerStore } from "@/stores/player-store";
import { useLibraryStore } from "@/stores/library-store";
import { theme, layout, radius } from "@/theme";
import { haptics, animateHeart as triggerHeartAnimation } from "@/utils/animations";

export default function ArtistScreen() {
  const { browseId } = useLocalSearchParams<{ browseId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: artist, isLoading, error } = useArtistQuery(browseId ?? null);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const toggleLikeArtist = useLibraryStore((s) => s.toggleLikeArtist);
  const isArtistLiked = useLibraryStore((s) => s.isArtistLiked);
  const isLiked = useLibraryStore((s) => s.isLiked);
  
  const heartScale = useRef(new Animated.Value(1)).current;

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
        <View style={{ 
          paddingTop: insets.top + layout.space[10], 
          paddingHorizontal: layout.px, 
          paddingBottom: layout.space[6], 
          alignItems: "center" 
        }}>
          <View style={{ 
            width: 160, 
            height: 160, 
            borderRadius: radius.full, 
            backgroundColor: theme.colors.surfaceElevated 
          }} />
          <View style={{ 
            width: 200, 
            height: 32, 
            backgroundColor: theme.colors.surfaceElevated, 
            borderRadius: radius.sm, 
            marginTop: layout.space[4] 
          }} />
        </View>
        <View style={{ paddingHorizontal: layout.px, marginTop: layout.space[8] }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={{ flexDirection: "row", gap: layout.space[3], paddingVertical: layout.space[2] }}>
              <View style={{ width: 48, height: 48, borderRadius: radius.sm, backgroundColor: theme.colors.surfaceElevated }} />
              <View style={{ flex: 1, gap: layout.space[1], justifyContent: "center" }}>
                <View style={{ width: "70%", height: 16, backgroundColor: theme.colors.surfaceElevated, borderRadius: radius.sm }} />
                <View style={{ width: "40%", height: 14, backgroundColor: theme.colors.surfaceElevated, borderRadius: radius.sm }} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (error || !artist) {
    return (
      <View style={{ 
        flex: 1, 
        backgroundColor: theme.colors.surface, 
        justifyContent: "center", 
        alignItems: "center", 
        paddingHorizontal: 32 
      }}>
        <View style={{
          width: 72,
          height: 72,
          borderRadius: radius.xl,
          backgroundColor: theme.colors.surfaceElevated,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 16,
        }}>
          <Icon name="x-circle" size={32} color={theme.colors.textTertiary} />
        </View>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 15, textAlign: "center" }}>
          {error?.message || "Artist not found"}
        </Text>
      </View>
    );
  }

  const t = artist.thumbnails;
  const heroUrl = t?.[t.length - 1]?.url;
  const isFollowing = isArtistLiked(browseId ?? "");

  const artistContextItems = artist.topSongs
    .filter((s) => s.videoId)
    .map((s) => ({
      videoId: s.videoId!,
      title: s.title ?? "",
      artist: s.artists?.[0] ?? artist.name ?? "",
      thumbnail: s.thumbnails?.[0]?.url ?? "",
      duration: 0,
    }));

  const handleFollow = () => {
    haptics.medium();
    if (!isFollowing) {
      triggerHeartAnimation(heartScale);
    }
    browseId && toggleLikeArtist({ id: browseId, name: artist.name, thumbnail: heroUrl });
  };

  const handlePlayTrack = (song: typeof artist.topSongs[0], idx: number) => {
    haptics.light();
    const startIdx = artistContextItems.findIndex((c) => c.videoId === song.videoId);
    song.videoId && playTrack(song.videoId, { 
      queueType: "artist", 
      queueId: browseId, 
      contextItems: artistContextItems, 
      startIndex: startIdx >= 0 ? startIdx : 0, 
      title: song.title ?? undefined, 
      artist: song.artists?.[0] ?? undefined, 
      thumbnail: song.thumbnails?.[0]?.url 
    });
  };

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: theme.colors.surface }} 
      contentContainerStyle={{ paddingBottom: 140 }}
    >
      {/* Hero Section */}
      <View style={{ height: 380, justifyContent: "flex-end" }}>
        {heroUrl && (
          <Image
            source={{ uri: upscaleThumbnail(heroUrl, 640) }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            contentFit="cover"
            transition={500}
          />
        )}
        {/* Gradient Scrim */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "transparent",
          }}
        >
          {/* Top gradient for status bar */}
          <View style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: insets.top + 100,
            backgroundColor: "rgba(0,0,0,0.4)",
          }} />
          {/* Bottom gradient for text legibility */}
          <View style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 250,
            backgroundColor: "rgba(0,0,0,0)",
          }} />
        </View>
        
        {/* Content */}
        <View style={{ 
          paddingHorizontal: layout.px, 
          paddingTop: insets.top + layout.space[6], 
          paddingBottom: layout.space[6], 
          alignItems: "center",
        }}>
          {/* Artist Avatar */}
          {heroUrl && (
            <Image
              source={{ uri: upscaleThumbnail(heroUrl, 320) }}
              style={{
                width: 160,
                height: 160,
                borderRadius: radius.full,
                borderWidth: 4,
                borderColor: "rgba(255,255,255,0.2)",
                marginBottom: layout.space[4],
                ...theme.shadows.md,
              }}
              contentFit="cover"
              transition={300}
            />
          )}
          
          <Text style={{ 
            color: theme.colors.textPrimary, 
            fontSize: 32, 
            fontWeight: "700", 
            letterSpacing: -0.02, 
            textAlign: "center",
            textShadowColor: "rgba(0,0,0,0.5)",
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 8,
          }}>
            {artist.name}
          </Text>
          
          {artist.subscribers && (
            <Text style={{ 
              color: theme.colors.textSecondary, 
              fontSize: 14, 
              marginTop: layout.space[1],
              textShadowColor: "rgba(0,0,0,0.5)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 4,
            }}>
              {artist.subscribers}
            </Text>
          )}
          
          <Animated.View style={{ transform: [{ scale: heartScale }], marginTop: layout.space[4] }}>
            <Pressable
              style={{ 
                backgroundColor: isFollowing ? theme.colors.surfaceElevated : theme.colors.accent, 
                paddingHorizontal: layout.space[6], 
                paddingVertical: layout.space[3], 
                borderRadius: radius.full,
                borderWidth: isFollowing ? 1 : 0,
                borderColor: theme.colors.border,
                ...theme.shadows.sm,
              }}
              onPress={handleFollow}
              accessibilityLabel={isFollowing ? "Unfollow artist" : "Follow artist"}
              accessibilityRole="button"
              accessibilityState={{ selected: isFollowing }}
            >
              <Text style={{ 
                color: "#fff", 
                fontSize: 14, 
                fontWeight: "600" 
              }}>
                {isFollowing ? "Following" : "Follow"}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>

      {/* Top Songs */}
      {artist.topSongs.length > 0 && (
        <View style={{ marginTop: layout.space[8], paddingHorizontal: layout.px }}>
          <Text style={{ 
            color: theme.colors.textPrimary, 
            fontSize: 22, 
            fontWeight: "700", 
            letterSpacing: -0.3, 
            marginBottom: layout.space[4] 
          }}>
            Top Songs
          </Text>
          {artist.topSongs.map((song, idx) => (
            <Pressable
              key={song.videoId ?? idx}
              style={({ pressed }) => ({ 
                flexDirection: "row", 
                alignItems: "center", 
                gap: layout.space[3], 
                paddingVertical: layout.space[2],
                backgroundColor: pressed ? theme.colors.surfaceElevated : "transparent",
                borderRadius: radius.md,
              })}
              onPress={() => handlePlayTrack(song, idx)}
              accessibilityLabel={`Play ${song.title}`}
              accessibilityRole="button"
            >
              <Text style={{ 
                color: theme.colors.textTertiary, 
                fontSize: 14, 
                width: 28, 
                textAlign: "center",
                fontVariant: ["tabular-nums"],
              }}>
                {idx + 1}
              </Text>
              {song.thumbnails?.[0]?.url && (
                <Image 
                  source={{ uri: upscaleThumbnail(song.thumbnails[0].url) }} 
                  style={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: radius.sm,
                    backgroundColor: theme.colors.surfaceElevated,
                  }}
                  contentFit="cover"
                  transition={200}
                />
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ 
                  color: theme.colors.textPrimary, 
                  fontSize: 15, 
                  fontWeight: "500" 
                }} numberOfLines={1}>
                  {song.title}
                </Text>
                <Text style={{ 
                  color: theme.colors.textSecondary, 
                  fontSize: 13 
                }} numberOfLines={1}>
                  {song.album}
                </Text>
              </View>
              {song.videoId && (
                <Pressable 
                  style={{ padding: layout.space[2] }}
                  onPress={() => {
                    haptics.medium();
                    toggleLike({ 
                      id: song.videoId!, 
                      title: song.title ?? "", 
                      artist: song.artists?.[0] ?? "", 
                      thumbnail: song.thumbnails?.[0]?.url 
                    });
                  }}
                  accessibilityLabel={isLiked(song.videoId!) ? "Unlike song" : "Like song"}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isLiked(song.videoId!) }}
                >
                  <Icon 
                    name={isLiked(song.videoId!) ? "heart-filled" : "heart-outline"} 
                    size={18} 
                    color={isLiked(song.videoId!) ? theme.colors.accent : theme.colors.textTertiary} 
                  />
                </Pressable>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {/* Albums */}
      {artist.albums.length > 0 && (
        <View style={{ marginTop: layout.space[8], paddingHorizontal: layout.px }}>
          <View style={{ 
            flexDirection: "row", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: layout.space[4] 
          }}>
            <Text style={{ 
              color: theme.colors.textPrimary, 
              fontSize: 22, 
              fontWeight: "700", 
              letterSpacing: -0.3 
            }}>
              Albums
            </Text>
            {artist.albumsParams && (
              <Pressable 
                onPress={() => router.push(`/artist/${browseId}/albums?params=${encodeURIComponent(artist.albumsParams!)}`)}
                accessibilityLabel="See all albums"
                accessibilityRole="button"
              >
                <Text style={{ 
                  color: theme.colors.accent, 
                  fontSize: 14, 
                  fontWeight: "600" 
                }}>
                  See All
                </Text>
              </Pressable>
            )}
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ gap: layout.space[3] }}
          >
            {artist.albums.map((album, idx) => (
              <Pressable 
                key={album.browseId ?? idx} 
                style={{ width: 160 }}
                onPress={() => { haptics.light(); album.browseId && router.push(`/album/${album.browseId}`); }}
                accessibilityLabel={`Album: ${album.title}`}
                accessibilityRole="button"
              >
                <View style={{ 
                  borderRadius: radius.md, 
                  overflow: "hidden", 
                  backgroundColor: theme.colors.surfaceElevated,
                  ...theme.shadows.sm,
                }}>
                  {album.thumbnails?.[0]?.url && (
                    <Image 
                      source={{ uri: upscaleThumbnail(album.thumbnails[0].url) }} 
                      style={{ width: 160, height: 160 }}
                      contentFit="cover"
                      transition={300}
                    />
                  )}
                </View>
                <Text style={{ 
                  color: theme.colors.textPrimary, 
                  fontSize: 14, 
                  fontWeight: "500", 
                  marginTop: layout.space[3] 
                }} numberOfLines={1}>
                  {album.title}
                </Text>
                {album.year && (
                  <Text style={{ 
                    color: theme.colors.textSecondary, 
                    fontSize: 13, 
                    marginTop: 2 
                  }}>
                    {album.year}
                  </Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Singles */}
      {artist.singles.length > 0 && (
        <View style={{ marginTop: layout.space[8], paddingHorizontal: layout.px }}>
          <View style={{ 
            flexDirection: "row", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: layout.space[4] 
          }}>
            <Text style={{ 
              color: theme.colors.textPrimary, 
              fontSize: 22, 
              fontWeight: "700", 
              letterSpacing: -0.3 
            }}>
              Singles & EPs
            </Text>
            {artist.singlesParams && (
              <Pressable 
                onPress={() => router.push(`/artist/${browseId}/albums?params=${encodeURIComponent(artist.singlesParams!)}`)}
                accessibilityLabel="See all singles"
                accessibilityRole="button"
              >
                <Text style={{ 
                  color: theme.colors.accent, 
                  fontSize: 14, 
                  fontWeight: "600" 
                }}>
                  See All
                </Text>
              </Pressable>
            )}
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ gap: layout.space[3] }}
          >
            {artist.singles.map((single, idx) => (
              <Pressable 
                key={single.browseId ?? idx} 
                style={{ width: 160 }}
                onPress={() => { haptics.light(); single.browseId && router.push(`/album/${single.browseId}`); }}
                accessibilityLabel={`Single: ${single.title}`}
                accessibilityRole="button"
              >
                <View style={{ 
                  borderRadius: radius.md, 
                  overflow: "hidden", 
                  backgroundColor: theme.colors.surfaceElevated,
                  ...theme.shadows.sm,
                }}>
                  {single.thumbnails?.[0]?.url && (
                    <Image 
                      source={{ uri: upscaleThumbnail(single.thumbnails[0].url) }} 
                      style={{ width: 160, height: 160 }}
                      contentFit="cover"
                      transition={300}
                    />
                  )}
                </View>
                <Text style={{ 
                  color: theme.colors.textPrimary, 
                  fontSize: 14, 
                  fontWeight: "500", 
                  marginTop: layout.space[3] 
                }} numberOfLines={1}>
                  {single.title}
                </Text>
                {single.year && (
                  <Text style={{ 
                    color: theme.colors.textSecondary, 
                    fontSize: 13, 
                    marginTop: 2 
                  }}>
                    {single.year}
                  </Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Related Artists */}
      {artist.related && artist.related.length > 0 && (
        <View style={{ marginTop: layout.space[8], paddingHorizontal: layout.px }}>
          <Text style={{ 
            color: theme.colors.textPrimary, 
            fontSize: 22, 
            fontWeight: "700", 
            letterSpacing: -0.3, 
            marginBottom: layout.space[4] 
          }}>
            Related Artists
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: layout.space[2] }}
          >
            {artist.related.map((r, idx) => (
              <Pressable
                key={r.browseId ?? idx}
                style={({ pressed }) => ({ 
                  backgroundColor: pressed ? theme.colors.surfaceTertiary : theme.colors.surfaceElevated, 
                  paddingHorizontal: layout.space[4], 
                  paddingVertical: layout.space[3], 
                  borderRadius: radius.full,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                })}
                onPress={() => { haptics.light(); r.browseId && router.push(`/artist/${r.browseId}`); }}
                accessibilityLabel={`View artist: ${r.artist}`}
                accessibilityRole="button"
              >
                <Text style={{ 
                  color: theme.colors.textPrimary, 
                  fontSize: 14, 
                  fontWeight: "500" 
                }}>
                  {r.artist}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}
