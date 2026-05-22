import { useRouter } from "expo-router";
import { Icon } from "@/components/icons";
import { Dimensions, Pressable, View, Text, PanResponder } from "react-native";
import { Image } from "expo-image";
import { usePlayerStore } from "@/stores/player-store";
import { seekTo } from "@/components/AudioPlayerProvider";
import { upscaleThumbnail } from "@/api/client";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRef, useCallback, useMemo } from "react";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ART_SIZE = SCREEN_WIDTH - 64;

export default function PlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const repeat = usePlayerStore((s) => s.repeat);
  const isShuffled = usePlayerStore((s) => s.isShuffled);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const setRepeat = usePlayerStore((s) => s.setRepeat);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const playNext = usePlayerStore((s) => s.playNext);
  const playPrev = usePlayerStore((s) => s.playPrev);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  const seekBarWidth = useRef(0);
  const volumeBarWidth = useRef(0);

  const volumePanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const x = evt.nativeEvent.locationX;
      const newVol = Math.max(0, Math.min(x / (volumeBarWidth.current || 1), 1));
      setVolume(newVol);
    },
    onPanResponderMove: (evt) => {
      const x = evt.nativeEvent.locationX;
      const newVol = Math.max(0, Math.min(x / (volumeBarWidth.current || 1), 1));
      setVolume(newVol);
    },
  }), [setVolume]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const scrubPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const x = evt.nativeEvent.locationX;
      seekTo(Math.max(0, Math.min(x, seekBarWidth.current)) / (seekBarWidth.current || 1) * duration);
    },
    onPanResponderMove: (evt) => {
      const x = evt.nativeEvent.locationX;
      seekTo(Math.max(0, Math.min(x, seekBarWidth.current)) / (seekBarWidth.current || 1) * duration);
    },
  }), [duration]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!currentTrack) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#a1a1a1" }}>No track selected</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <Icon name="chevron-down" size={20} color="#fff" />
        </Pressable>
        <Text style={{ color: "#a1a1a1", fontSize: 11, fontWeight: "600", letterSpacing: 1 }}>
          NOW PLAYING
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
        <View style={{ width: ART_SIZE, height: ART_SIZE, borderRadius: 16, backgroundColor: "#1a1a1a" }}>
          <Image
            source={{ uri: upscaleThumbnail(currentTrack.thumbnail || "", 480) }}
            style={{ width: ART_SIZE, height: ART_SIZE, borderRadius: 16 }}
          />
        </View>

        <View style={{ width: "100%", marginTop: 32, gap: 4 }}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={{ color: "#a1a1a1", fontSize: 14 }} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
        </View>

        <View style={{ width: "100%", marginTop: 24 }}>
          <View
            style={{ height: 24, justifyContent: "center" }}
            onLayout={(e) => { seekBarWidth.current = e.nativeEvent.layout.width; }}
            {...scrubPanResponder.panHandlers}
          >
            <View style={{ height: 6, backgroundColor: "#2a2a2a", borderRadius: 3, overflow: "visible", justifyContent: "center" }}>
              <View
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  backgroundColor: "#fff",
                  borderRadius: 3,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: "#fff",
                  left: `${progress}%`,
                  marginLeft: -7,
                  ...(progress > 0 ? {} : { display: "none" }),
                }}
              />
            </View>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
            <Text style={{ color: "#6b6b6b", fontSize: 11 }}>
              {formatTime(currentTime)}
            </Text>
            <Text style={{ color: "#6b6b6b", fontSize: 11 }}>
              {formatTime(duration)}
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

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24, width: "100%", maxWidth: 240 }}>
          <Pressable onPress={() => setVolume(volume === 0 ? 0.5 : 0)} style={{ padding: 4 }}>
            <Icon name={volume === 0 ? "speaker-x-mark" : "speaker-wave"} size={16} color="#a1a1a1" />
          </Pressable>
          <View
            style={{ flex: 1, height: 24, justifyContent: "center" }}
            onLayout={(e) => { volumeBarWidth.current = e.nativeEvent.layout.width; }}
            {...volumePanResponder.panHandlers}
          >
            <View style={{ height: 4, backgroundColor: "#2a2a2a", borderRadius: 2, overflow: "visible", justifyContent: "center" }}>
              <View
                style={{
                  height: "100%",
                  width: `${volume * 100}%`,
                  backgroundColor: "#fff",
                  borderRadius: 2,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: "#fff",
                  left: `${volume * 100}%`,
                  marginLeft: -6,
                }}
              />
            </View>
          </View>
        </View>
      </View>

      <View style={{ paddingBottom: insets.bottom + 16, paddingHorizontal: 32, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Pressable style={{ padding: 8 }}>
          <Icon name="share" size={18} color="#a1a1a1" />
        </Pressable>
        <Pressable style={{ padding: 8 }}>
          <Icon name="ellipsis-horizontal" size={18} color="#a1a1a1" />
        </Pressable>
      </View>
    </View>
  );
}
