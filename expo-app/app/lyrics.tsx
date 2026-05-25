import { useRouter } from "expo-router";
import { Icon } from "@/components/icons";
import { Dimensions, Pressable, View, Text, Image as RNImage, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePlayerStore } from "@/stores/player-store";
import { api, upscaleThumbnail, requestLRCLIB } from "@/api/client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { LyricsResponse } from "@/types";
import { parseLRC, findActiveLineIndex, type TimedLyricLine } from "@/utils/lrc";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const DURATION_THRESHOLD = 5;
const VIEWPORT_CENTER = 0.35;

type DisplayMode = "synced" | "plain" | "none";

export default function LyricsScreen() {
  const router = useRouter();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentTime = usePlayerStore((s) => s.currentTime);

  useEffect(() => {
    if (!currentTrack) router.back();
  }, [currentTrack]);

  const [lyricsResult, setLyricsResult] = useState<LyricsResponse | null>(null);
  const [lrclibLyrics, setLrclibLyrics] = useState<TimedLyricLine[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [showOffsetSlider, setShowOffsetSlider] = useState(false);

  useEffect(() => {
    if (!currentTrack?.id) return;
    setLoading(true);
    setOffset(0);
    setLrclibLyrics(null);
    setLyricsResult(null);

    const artist = currentTrack.artist;
    const title = currentTrack.title;
    const duration = currentTrack.duration;

    requestLRCLIB(artist, title, duration).then((lrclibData) => {
      if (lrclibData?.syncedLyrics) {
        const lrcDuration = lrclibData.duration;
        const diff = lrcDuration ? Math.abs(lrcDuration - duration) : Infinity;
        if (diff <= DURATION_THRESHOLD) {
          setLrclibLyrics(parseLRC(lrclibData.syncedLyrics));
          setLoading(false);
          return;
        }
      }
      api.getLyrics(currentTrack.id).then(setLyricsResult).catch(() => setLyricsResult(null)).finally(() => setLoading(false));
    });
  }, [currentTrack?.id]);

  const timedLyrics = useMemo<TimedLyricLine[]>(() => {
    if (lrclibLyrics) return lrclibLyrics;
    if (lyricsResult?.hasTimestamps && Array.isArray(lyricsResult.lyrics)) {
      return lyricsResult.lyrics
        .filter((l) => l.text)
        .map((l) => ({ time: l.startTime / 1000, text: l.text }));
    }
    return [];
  }, [lrclibLyrics, lyricsResult]);

  const plainText = useMemo<string | null>(() => {
    if (lrclibLyrics) return null;
    if (!lyricsResult?.lyrics) return null;
    if (typeof lyricsResult.lyrics === "string") return lyricsResult.lyrics;
    return null;
  }, [lrclibLyrics, lyricsResult]);

  const displayMode: DisplayMode = timedLyrics.length ? "synced" : plainText ? "plain" : "none";

  const effectiveOffset = useMemo(() => offset + (currentTrack?.startTime || 0), [offset, currentTrack?.startTime]);
  const adjustedTime = currentTime + effectiveOffset;
  const activeIndex = findActiveLineIndex(timedLyrics, adjustedTime);

  const scrollRef = useRef<ScrollView>(null);
  const lineLayouts = useRef<number[]>([]);

  useEffect(() => {
    if (activeIndex < 0 || !scrollRef.current) return;
    const y = lineLayouts.current[activeIndex];
    if (y == null) return;
    scrollRef.current.scrollTo({ y: y - SCREEN_HEIGHT * VIEWPORT_CENTER, animated: true });
  }, [activeIndex]);

  const onLineLayout = useCallback((index: number, y: number) => {
    lineLayouts.current[index] = y;
  }, []);

  if (!currentTrack) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <RNImage
        source={{ uri: upscaleThumbnail(currentTrack.thumbnail || "", 480) }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        blurRadius={80}
      />
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)" }} />

      <View style={{ paddingHorizontal: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", height: 44 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8, position: "absolute", left: 8 }}>
          <Icon name="chevron-down" size={20} color="#fff" />
        </Pressable>
        <Text style={{ color: "#a1a1a1", fontSize: 11, fontWeight: "600", letterSpacing: 1 }}>NOW PLAYING</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: SCREEN_HEIGHT * VIEWPORT_CENTER }} />

        {loading ? (
          <Text style={{ color: "#a1a1a1", fontSize: 14, textAlign: "center" }}>Loading lyrics...</Text>
        ) : displayMode === "synced" ? (
          timedLyrics.map((line, i) => {
            const isActive = i === activeIndex;
            const dist = Math.abs(i - activeIndex);
            let opacity: number;
            if (isActive) opacity = 1;
            else if (i < activeIndex) opacity = Math.max(0.2, 0.5 - dist * 0.1);
            else opacity = Math.max(0.3, 0.6 - dist * 0.08);

            return (
              <View key={i} onLayout={(e) => onLineLayout(i, e.nativeEvent.layout.y)} style={{ paddingVertical: 6 }}>
                <Text
                  style={{
                    color: isActive ? "#fff" : `rgba(255,255,255,${opacity})`,
                    fontSize: isActive ? 20 : 15,
                    fontWeight: isActive ? "700" : "400",
                    lineHeight: isActive ? 28 : 22,
                    textAlign: "center",
                    letterSpacing: 0.3,
                  }}
                >
                  {line.text}
                </Text>
              </View>
            );
          })
        ) : displayMode === "plain" ? (
          <Text style={{ color: "#fff", fontSize: 16, lineHeight: 28, textAlign: "center", letterSpacing: 0.3 }}>
            {plainText}
          </Text>
        ) : (
          <Text style={{ color: "#a1a1a1", fontSize: 14, textAlign: "center" }}>No lyrics available</Text>
        )}
      </ScrollView>

      {displayMode === "synced" && (
        <View style={{ position: "absolute", bottom: 40, left: 0, right: 0, alignItems: "center" }}>
          <Pressable onPress={() => setShowOffsetSlider((v) => !v)} style={{ padding: 8, marginBottom: 4 }}>
            <Text style={{ color: "#a1a1a1", fontSize: 12, letterSpacing: 1 }}>SYNC</Text>
          </Pressable>
          {showOffsetSlider && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}>
              <Pressable onPress={() => setOffset((o) => Math.max(-15, +(o - 0.5).toFixed(1)))}>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>-</Text>
              </Pressable>
              <Text style={{ color: "#a1a1a1", fontSize: 13, minWidth: 60, textAlign: "center" }}>
                {effectiveOffset > 0 ? "+" : ""}{effectiveOffset.toFixed(1)}s
              </Text>
              <Pressable onPress={() => setOffset((o) => Math.min(15, +(o + 0.5).toFixed(1)))}>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>+</Text>
              </Pressable>
              {offset !== 0 && (
                <Pressable onPress={() => setOffset(0)} style={{ marginLeft: 8 }}>
                  <Text style={{ color: "#ff2a3b", fontSize: 12, fontWeight: "600" }}>RESET</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
