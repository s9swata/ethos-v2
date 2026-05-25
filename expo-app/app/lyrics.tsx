import { useRouter } from "expo-router";
import { Icon } from "@/components/icons";
import { Dimensions, Pressable, View, Text, Image as RNImage, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePlayerStore } from "@/stores/player-store";
import { api, upscaleThumbnail } from "@/api/client";
import { useEffect, useState } from "react";
import type { LyricsResponse } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function LyricsScreen() {
  const router = useRouter();
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  useEffect(() => {
    if (!currentTrack) router.back();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  const [lyrics, setLyrics] = useState<LyricsResponse | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  useEffect(() => {
    if (!currentTrack?.id) return;
    setLyrics(null);
    setLyricsLoading(true);
    api.getLyrics(currentTrack.id).then(setLyrics).catch(() => setLyrics(null)).finally(() => setLyricsLoading(false));
  }, [currentTrack?.id]);

  if (!currentTrack) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <RNImage
        source={{ uri: upscaleThumbnail(currentTrack.thumbnail || "", 480) }}
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
        }}
        blurRadius={80}
      />
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)" }} />

      <View style={{ paddingHorizontal: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", height: 44 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8, position: "absolute", left: 8 }}>
          <Icon name="chevron-down" size={20} color="#fff" />
        </Pressable>
        <Text style={{ color: "#a1a1a1", fontSize: 11, fontWeight: "600", letterSpacing: 1 }}>
          NOW PLAYING
        </Text>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 32 }} contentContainerStyle={{ paddingVertical: 16 }}>
        {lyricsLoading ? (
          <Text style={{ color: "#a1a1a1", fontSize: 14, textAlign: "center" }}>Loading lyrics...</Text>
        ) : lyrics?.lyrics ? (
          typeof lyrics.lyrics === "string" ? (
            <Text style={{ color: "#fff", fontSize: 16, lineHeight: 28, textAlign: "center", letterSpacing: 0.3 }}>
              {lyrics.lyrics}
            </Text>
          ) : (
            lyrics.lyrics.filter(l => l.text).map((line, i) => (
              <Text key={i} style={{ color: "#fff", fontSize: 15, lineHeight: 26, textAlign: "center" }}>
                {line.text}
              </Text>
            ))
          )
        ) : (
          <Text style={{ color: "#a1a1a1", fontSize: 14, textAlign: "center" }}>No lyrics available</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
