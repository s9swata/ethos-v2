import { useRouter } from "expo-router";
import { Icon } from "@/components/icons";
import { Dimensions, Pressable, View, Text, PanResponder, Image as RNImage } from "react-native";
import { Image } from "expo-image";
import { usePlayerStore } from "@/stores/player-store";
import { useLyricsStore } from "@/stores/lyrics-store";
import { seekTo } from "@/components/AudioPlayerProvider";
import { upscaleThumbnail } from "@/api/client";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TrackPlayer from "@rntp/player";
import { MarqueeText } from "@/components/MarqueeText";
import { useEffect, useRef, useState } from "react";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ART_SIZE = SCREEN_WIDTH - 64;

export default function PlayerScreen() {
  const router = useRouter();
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  useEffect(() => {
    if (!currentTrack) router.back();
  }, [currentTrack, router]);

  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const storeCurrentTime = usePlayerStore((s) => s.currentTime);
  const storeDuration = usePlayerStore((s) => s.duration);
  const repeat = usePlayerStore((s) => s.repeat);
  const isShuffled = usePlayerStore((s) => s.isShuffled);
  const setRepeat = usePlayerStore((s) => s.setRepeat);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const playNext = usePlayerStore((s) => s.playNext);
  const playPrev = usePlayerStore((s) => s.playPrev);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  const lyricsTrackId = useLyricsStore((s) => s.trackId);
  const timedLyrics = useLyricsStore((s) => s.timedLyrics);
  const plainText = useLyricsStore((s) => s.plainText);
  const hasLyrics = lyricsTrackId === currentTrack?.id && (!!timedLyrics || !!plainText);

  // Direct progress polling (sync, no native module issues)
  const [rntpCurrentTime, setRntpCurrentTime] = useState(0);
  const [rntpDuration, setRntpDuration] = useState(0);

  // Reset local progress on track change to avoid showing garbage values
  // from TrackPlayer.getProgress() during the load transition.
  useEffect(() => {
    setRntpCurrentTime(0);
    setRntpDuration(0);
  }, [currentTrack?.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const { position, duration } = TrackPlayer.getProgress();
        if (isFinite(position) && position >= 0 && position < 1000000) {
          setRntpCurrentTime(position);
        }
        if (isFinite(duration) && duration >= 0 && duration < 1000000) {
          setRntpDuration(duration);
        }
      } catch {}
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Use store values if RNTP not ready, otherwise use direct polling
  const displayCurrentTime = rntpCurrentTime === 0 && storeCurrentTime > 0 ? storeCurrentTime : rntpCurrentTime;
  const displayDuration = rntpDuration === 0 && storeDuration > 0 ? storeDuration : rntpDuration;

  // Keep a ref so scrubPanResponder (created once) always reads the latest value
  const displayDurationRef = useRef(displayDuration);
  displayDurationRef.current = displayDuration;

  const insets = useSafeAreaInsets();
  const seekBarWidth = useRef(0);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const scrubPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const x = evt.nativeEvent.locationX;
      seekTo(Math.max(0, Math.min(x, seekBarWidth.current)) / (seekBarWidth.current || 1) * displayDurationRef.current);
    },
    onPanResponderMove: (evt) => {
      const x = evt.nativeEvent.locationX;
      seekTo(Math.max(0, Math.min(x, seekBarWidth.current)) / (seekBarWidth.current || 1) * displayDurationRef.current);
    },
  })).current;

  const progress = displayDuration > 0 ? (displayCurrentTime / displayDuration) * 100 : 0;

  if (!currentTrack) return null;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <RNImage
        source={{ uri: upscaleThumbnail(currentTrack.thumbnail || "", 480) }}
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
        }}
        blurRadius={80}
      />
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)" }} />

      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Icon name="chevron-down" size={20} color="#fff" />
        </Pressable>
        <Text style={{ color: "#a1a1a1", fontSize: 14, fontWeight: "700", letterSpacing: 1.5 }}>
          NOW PLAYING
        </Text>
        <Pressable onPress={() => router.push("/queue")} style={{ padding: 8 }}>
          <Icon name="queue-list" size={18} color="#a1a1a1" />
        </Pressable>
      </View>

      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
        <View style={{ width: ART_SIZE, height: ART_SIZE, borderRadius: 16, backgroundColor: "#1a1a1a" }}>
          <Image
            source={{ uri: upscaleThumbnail(currentTrack.thumbnail || "", 480) }}
            style={{ width: ART_SIZE, height: ART_SIZE, borderRadius: 16 }}
          />
        </View>

        <View style={{ width: "100%", marginTop: 32, gap: 4 }}>
          <MarqueeText duration={8000} delay={1000} style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>
            {currentTrack.title}
          </MarqueeText>
          <Text style={{ color: "#fff", fontSize: 14 }} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
        </View>

        <View style={{ width: "100%", marginTop: 24 }}>
          <View
            style={{ height: 24, justifyContent: "center" }}
            onLayout={(e) => { seekBarWidth.current = e.nativeEvent.layout.width; }}
            {...scrubPanResponder.panHandlers}
          >
            <View style={{ height: 4, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2, overflow: "hidden" }}>
              <View
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  backgroundColor: "#fff",
                  borderRadius: 2,
                }}
              />
            </View>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
            <Text style={{ color: "#fff", fontSize: 11 }}>
              {formatTime(displayCurrentTime)}
            </Text>
            <Text style={{ color: "#fff", fontSize: 11 }}>
              {formatTime(displayDuration)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 32, marginTop: 24 }}>
          <Pressable onPress={toggleShuffle} style={{ padding: 4 }}>
            <Icon name="shuffle" size={20} color={isShuffled ? "#ff2a3b" : "#a1a1a1"} />
          </Pressable>
          <Pressable onPress={playPrev} style={{ padding: 4 }}>
            <Icon name="backward" size={24} color="#fff" />
          </Pressable>
          <Pressable
            onPress={togglePlay}
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "#fff",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Icon name={isPlaying ? "pause" : "play"} size={28} color="#000" />
          </Pressable>
          <Pressable onPress={playNext} style={{ padding: 4 }}>
            <Icon name="forward" size={24} color="#fff" />
          </Pressable>
          <Pressable onPress={() => setRepeat(repeat === "off" ? "all" : repeat === "all" ? "one" : "off")} style={{ padding: 4 }}>
            <Icon name="repeat" size={20} color={repeat !== "off" ? "#ff2a3b" : "#a1a1a1"} />
          </Pressable>
        </View>

      </View>

      <View style={{ paddingBottom: insets.bottom + 16, paddingHorizontal: 32, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        {hasLyrics && (
          <Pressable onPress={() => router.push("/lyrics")} style={{ padding: 8 }}>
            <Icon name="music-note" size={18} color="#a1a1a1" />
          </Pressable>
        )}
        {!hasLyrics && <View style={{ padding: 8, width: 34 }} />}
      </View>
    </View>
  );
}
