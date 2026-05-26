import { useRouter } from "expo-router";
import { Icon } from "@/components/icons";
import {
  Animated,
  Dimensions,
  Pressable,
  View,
  Text,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePlayerStore } from "@/stores/player-store";
import { api, upscaleThumbnail, requestLRCLIB } from "@/api/client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { LyricsResponse } from "@/types";
import { parseLRC, findActiveLineIndex, type TimedLyricLine } from "@/utils/lrc";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const DURATION_THRESHOLD = 5;
const VIEWPORT_CENTER = 0.38;

type DisplayMode = "synced" | "plain" | "none";

// Individual animated lyric line
function LyricLine({
  line,
  index,
  activeIndex,
  onLayout,
}: {
  line: TimedLyricLine;
  index: number;
  activeIndex: number;
  onLayout: (index: number, y: number) => void;
}) {
  const isActive = index === activeIndex;
  const isPast = index < activeIndex;
  const dist = Math.abs(index - activeIndex);

  // Animated values per line
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.35)).current;
  const blur = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let targetOpacity: number;
    let targetScale: number;

    if (isActive) {
      targetOpacity = 1;
      targetScale = 1.04;
    } else if (isPast) {
      // Past lines fade more the further they are
      targetOpacity = Math.max(0.15, 0.45 - dist * 0.08);
      targetScale = 1;
    } else {
      // Future lines are slightly dimmer than past
      targetOpacity = Math.max(0.2, 0.5 - dist * 0.07);
      targetScale = 1;
    }

    Animated.parallel([
      Animated.spring(scale, {
        toValue: targetScale,
        useNativeDriver: true,
        tension: 120,
        friction: 14,
      }),
      Animated.timing(opacity, {
        toValue: targetOpacity,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive, isPast, dist]);

  return (
    <View
      onLayout={(e) => onLayout(index, e.nativeEvent.layout.y)}
      style={styles.lineContainer}
    >
      <Animated.Text
        style={[
          styles.lyricText,
          isActive ? styles.lyricActive : styles.lyricInactive,
          { opacity, transform: [{ scale }] },
        ]}
      >
        {line.text}
      </Animated.Text>
    </View>
  );
}

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

  // Animations
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const offsetPillScale = useRef(new Animated.Value(0)).current;
  const offsetPillOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in content when loaded
    if (!loading) {
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      contentOpacity.setValue(0);
    }
  }, [loading]);

  useEffect(() => {
    if (showOffsetSlider) {
      Animated.parallel([
        Animated.spring(offsetPillScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 160,
          friction: 12,
        }),
        Animated.timing(offsetPillOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(offsetPillScale, {
          toValue: 0.8,
          useNativeDriver: true,
          tension: 200,
          friction: 10,
        }),
        Animated.timing(offsetPillOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showOffsetSlider]);

  useEffect(() => {
    if (!currentTrack?.id) return;
    setLoading(true);
    setOffset(0);
    setLrclibLyrics(null);
    setLyricsResult(null);

    const { artist, title, duration } = currentTrack;

    requestLRCLIB(artist, title, duration).then((lrclibData) => {
      if (lrclibData?.syncedLyrics) {
        const diff = lrclibData.duration
          ? Math.abs(lrclibData.duration - duration)
          : Infinity;
        if (diff <= DURATION_THRESHOLD) {
          setLrclibLyrics(parseLRC(lrclibData.syncedLyrics));
          setLoading(false);
          return;
        }
      }
      api
        .getLyrics(currentTrack.id)
        .then(setLyricsResult)
        .catch(() => setLyricsResult(null))
        .finally(() => setLoading(false));
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

  const displayMode: DisplayMode =
    timedLyrics.length ? "synced" : plainText ? "plain" : "none";

  const effectiveOffset = useMemo(
    () => offset + (currentTrack?.startTime || 0),
    [offset, currentTrack?.startTime]
  );
  const adjustedTime = currentTime + effectiveOffset;
  const activeIndex = findActiveLineIndex(timedLyrics, adjustedTime);

  const scrollRef = useRef<ScrollView>(null);
  const lineLayouts = useRef<number[]>([]);
  const lastScrolledIndex = useRef<number>(-1);

  useEffect(() => {
    if (activeIndex < 0 || !scrollRef.current) return;
    if (activeIndex === lastScrolledIndex.current) return;
    const y = lineLayouts.current[activeIndex];
    if (y == null) return;
    lastScrolledIndex.current = activeIndex;
    scrollRef.current.scrollTo({
      y: Math.max(0, y - SCREEN_HEIGHT * VIEWPORT_CENTER),
      animated: true,
    });
  }, [activeIndex]);

  const onLineLayout = useCallback((index: number, y: number) => {
    lineLayouts.current[index] = y;
  }, []);

  if (!currentTrack) return null;

  const thumbUri = upscaleThumbnail(currentTrack.thumbnail || "", 480);

  return (
    <SafeAreaView style={styles.root}>
      {/* Blurred background */}
      <RNImage
        source={{ uri: thumbUri }}
        style={StyleSheet.absoluteFill}
        blurRadius={90}
      />
      {/* Dark overlay — slightly stronger at bottom for footer legibility */}
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />

      {/* Subtle top vignette */}
      <View style={styles.topVignette} pointerEvents="none" />
      {/* Subtle bottom vignette */}
      <View style={styles.bottomVignette} pointerEvents="none" />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Icon name="chevron-down" size={22} color="rgba(255,255,255,0.85)" />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>LYRICS</Text>
          <Text style={styles.headerTrack} numberOfLines={1}>
            {currentTrack.title}
          </Text>
        </View>

        {/* Small album art */}
        <View style={styles.headerArtWrap}>
          <RNImage source={{ uri: thumbUri }} style={styles.headerArt} />
        </View>
      </Animated.View>

      {/* Lyrics scroll */}
      <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          <View style={{ height: SCREEN_HEIGHT * VIEWPORT_CENTER }} />

          {loading ? (
            <View style={styles.centerMsg}>
              <Text style={styles.loadingDot}>♪</Text>
              <Text style={styles.statusText}>Loading lyrics…</Text>
            </View>
          ) : displayMode === "synced" ? (
            timedLyrics.map((line, i) => (
              <LyricLine
                key={i}
                line={line}
                index={i}
                activeIndex={activeIndex}
                onLayout={onLineLayout}
              />
            ))
          ) : displayMode === "plain" ? (
            <Text style={styles.plainText}>{plainText}</Text>
          ) : (
            <View style={styles.centerMsg}>
              <Text style={styles.noLyricsIcon}>♩</Text>
              <Text style={styles.statusText}>No lyrics available</Text>
            </View>
          )}

          <View style={{ height: 140 }} />
        </ScrollView>
      </Animated.View>

      {/* Sync offset control */}
      {displayMode === "synced" && (
        <View style={styles.syncContainer}>
          <Animated.View
            style={[
              styles.offsetPill,
              {
                opacity: offsetPillOpacity,
                transform: [{ scale: offsetPillScale }],
              },
            ]}
            pointerEvents={showOffsetSlider ? "auto" : "none"}
          >
            <Pressable
              onPress={() =>
                setOffset((o) => Math.max(-15, +(o - 0.5).toFixed(1)))
              }
              style={styles.offsetBtn}
              hitSlop={8}
            >
              <Text style={styles.offsetBtnText}>−</Text>
            </Pressable>

            <View style={styles.offsetValueWrap}>
              <Text style={styles.offsetValue}>
                {effectiveOffset >= 0 ? "+" : ""}
                {effectiveOffset.toFixed(1)}s
              </Text>
              <Text style={styles.offsetLabel}>offset</Text>
            </View>

            <Pressable
              onPress={() =>
                setOffset((o) => Math.min(15, +(o + 0.5).toFixed(1)))
              }
              style={styles.offsetBtn}
              hitSlop={8}
            >
              <Text style={styles.offsetBtnText}>+</Text>
            </Pressable>

            {offset !== 0 && (
              <Pressable
                onPress={() => setOffset(0)}
                style={styles.resetBtn}
                hitSlop={8}
              >
                <Text style={styles.resetText}>RESET</Text>
              </Pressable>
            )}
          </Animated.View>

          <Pressable
            onPress={() => setShowOffsetSlider((v) => !v)}
            style={styles.syncBtn}
          >
            <Icon
              name="timer"
              size={13}
              color={showOffsetSlider ? "#fff" : "rgba(255,255,255,0.5)"}
            />
            <Text
              style={[
                styles.syncLabel,
                showOffsetSlider && { color: "#fff" },
              ]}
            >
              SYNC
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  topVignette: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: "transparent",
  },
  bottomVignette: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: "transparent",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    height: 54,
  },
  backBtn: {
    padding: 6,
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  headerLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.8,
    marginBottom: 1,
  },
  headerTrack: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
    maxWidth: SCREEN_WIDTH - 140,
  },
  headerArtWrap: {
    width: 36,
    height: 36,
    borderRadius: 6,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  headerArt: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingBottom: 20,
  },

  // Lyric lines
  lineContainer: {
    paddingVertical: 5,
    alignItems: "flex-start",
  },
  lyricText: {
    textAlign: "left",
    letterSpacing: 0.2,
  },
  lyricActive: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 34,
  },
  lyricInactive: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 34,
  },

  // Plain lyrics
  plainText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    lineHeight: 30,
    textAlign: "left",
    letterSpacing: 0.2,
    fontWeight: "500",
  },

  // Status
  centerMsg: {
    alignItems: "center",
    paddingTop: 20,
  },
  loadingDot: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 28,
    marginBottom: 8,
  },
  noLyricsIcon: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 36,
    marginBottom: 8,
  },
  statusText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.3,
  },

  // Sync controls
  syncContainer: {
    position: "absolute",
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 8,
  },
  offsetPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30,30,30,0.88)",
    borderRadius: 50,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    gap: 2,
  },
  offsetBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  offsetBtnText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "300",
    lineHeight: 24,
  },
  offsetValueWrap: {
    alignItems: "center",
    minWidth: 64,
    paddingHorizontal: 6,
  },
  offsetValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  offsetLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "500",
    marginTop: 1,
  },
  resetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 4,
  },
  resetText: {
    color: "#ff3b30",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  syncLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
});