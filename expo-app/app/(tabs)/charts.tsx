import { useEffect, useState, useCallback } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Icon } from "@/components/icons";
import { api, upscaleThumbnail } from "@/api/client";
import { usePlayerStore } from "@/stores/player-store";
import { SkeletonCard } from "@/components/Skeleton";
import { theme, layout, typography } from "@/theme";
import type { ChartsResponse } from "@/types";

const COUNTRIES: Record<string, string> = { ZZ: "Global", US: "US", GB: "UK", JP: "Japan", IN: "India", DE: "Germany", FR: "France", BR: "Brazil", KR: "South Korea", NG: "Nigeria" };

export default function ChartsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const playTrack = usePlayerStore((s) => s.playTrack);
  const [charts, setCharts] = useState<ChartsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("ZZ");

  const fetchCharts = useCallback(async (c: string) => {
    setLoading(true);
    try {
      const data = await api.getCharts(c);
      setCharts(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchCharts(country); }, [country, fetchCharts]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: layout.px, paddingBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={[typography.h1, { fontSize: 28, letterSpacing: -1 }]}>Charts</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxWidth: 200 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {Object.entries(COUNTRIES).map(([code, name]) => (
              <Pressable
                key={code}
                onPress={() => setCountry(code)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99,
                  backgroundColor: country === code ? theme.colors.accent : theme.colors.glass,
                }}
              >
                <Text style={{ color: country === code ? "#fff" : theme.colors.textPrimary, fontSize: 12, fontWeight: "600" }}>{name}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: layout.px, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </View>
        ) : (
          <>
            {charts?.videos && charts.videos.length > 0 && (
              <View style={{ marginBottom: layout.sectionGap }}>
                <Text style={[typography.h3, { marginBottom: 12 }]}>Top Videos</Text>
                {charts.videos.map((v, i) => (
                  <Pressable
                    key={v.playlistId ?? i}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}
                    onPress={() => router.push(`/playlist/${v.playlistId}`)}
                  >
                    <Text style={{ color: theme.colors.textTertiary, fontSize: 15, fontWeight: "700", width: 28 }}>{i + 1}</Text>
                    {v.thumbnails?.[0]?.url && (
                      <Image source={{ uri: upscaleThumbnail(v.thumbnails[0].url) }} style={{ width: 52, height: 52, borderRadius: 6 }} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>{v.title}</Text>
                    </View>
                    <Icon name="chevron-right" size={14} color={theme.colors.textTertiary} />
                  </Pressable>
                ))}
              </View>
            )}

            {charts?.artists && charts.artists.length > 0 && (
              <View style={{ marginBottom: layout.sectionGap }}>
                <Text style={[typography.h3, { marginBottom: 12 }]}>Top Artists</Text>
                {charts.artists.slice(0, 20).map((a, i) => (
                  <Pressable
                    key={a.browseId ?? i}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}
                    onPress={() => router.push(`/artist/${a.browseId}`)}
                  >
                    <Text style={{ color: theme.colors.textTertiary, fontSize: 15, fontWeight: "700", width: 28 }}>{i + 1}</Text>
                    {a.thumbnails?.[0]?.url && (
                      <Image source={{ uri: upscaleThumbnail(a.thumbnails[0].url, 160) }} style={{ width: 52, height: 52, borderRadius: 26 }} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>{a.title}</Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{a.subscribers}</Text>
                    </View>
                    <Text style={{ color: theme.colors.textTertiary, fontSize: 11 }}>#{a.rank}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {charts?.genres && charts.genres.length > 0 && (
              <View>
                <Text style={[typography.h3, { marginBottom: 12 }]}>Genre Charts</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                  {charts.genres.map((g, i) => (
                    <Pressable
                      key={g.playlistId ?? i}
                      style={{ width: 150 }}
                      onPress={() => router.push(`/playlist/${g.playlistId}`)}
                    >
                      <View style={{ width: 150, height: 150, borderRadius: 12, backgroundColor: theme.colors.surface3, overflow: "hidden" }}>
                        {g.thumbnails?.[0]?.url && <Image source={{ uri: upscaleThumbnail(g.thumbnails[0].url) }} style={{ width: 150, height: 150 }} />}
                      </View>
                      <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: "500", marginTop: 8 }} numberOfLines={2}>{g.title}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
