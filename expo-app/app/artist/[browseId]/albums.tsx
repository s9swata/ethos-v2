import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/icons";
import { Image } from "expo-image";
import { api, upscaleThumbnail } from "@/api/client";
import { theme, layout } from "@/theme";
import type { AlbumItem } from "@/types";

export default function ArtistAlbumsScreen() {
  const { browseId, params } = useLocalSearchParams<{ browseId: string; params: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<"chronological" | "alphabetical" | "popularity" | "reverse_chronological">("chronological");

  useEffect(() => {
    if (!browseId || !params) return;
    setLoading(true);
    api.getArtistAlbums(browseId, params, 50, order)
      .then((res) => setAlbums(res.results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [browseId, params, order]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: layout.px, flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 8 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Icon name="arrow-left" size={20} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 18, fontWeight: "700", flex: 1 }}>Albums</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {["chronological", "reverse_chronological", "alphabetical"].map((o) => (
            <Pressable
              key={o}
              onPress={() => setOrder(o as any)}
              style={{
                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99,
                backgroundColor: order === o ? theme.colors.accent : theme.colors.glass,
              }}
            >
              <Text style={{ color: order === o ? "#fff" : theme.colors.textPrimary, fontSize: 11, fontWeight: "600" }}>
                {o === "chronological" ? "Oldest" : o === "reverse_chronological" ? "Newest" : "A-Z"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: layout.px, paddingBottom: 120, flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", paddingTop: 40 }}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : (
          albums.map((album, idx) => (
            <Pressable
              key={album.browseId ?? idx}
              style={{ width: "47%" }}
              onPress={() => album.browseId && router.push(`/album/${album.browseId}`)}
            >
              <View style={{ borderRadius: 12, overflow: "hidden", backgroundColor: theme.colors.surface3, aspectRatio: 1 }}>
                {album.thumbnails?.[0]?.url && (
                  <Image source={{ uri: upscaleThumbnail(album.thumbnails[0].url) }} style={{ width: "100%", height: "100%" }} />
                )}
              </View>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500", marginTop: 8 }} numberOfLines={1}>{album.title}</Text>
              {album.year && <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>{album.year}</Text>}
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
