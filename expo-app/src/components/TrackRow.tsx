import { View, Text, Pressable } from "react-native";
import { Icon } from "@/components/icons";
import { Image } from "expo-image";
import { upscaleThumbnail } from "@/api/client";
import { theme } from "@/theme";

interface TrackRowProps {
  title: string;
  artist?: string;
  artists?: string[];
  album?: string | null;
  thumbnail?: string | null;
  duration?: string | number | null;
  index?: number;
  isLiked?: boolean;
  onPlay: () => void;
  onLike?: () => void;
}

export function TrackRow({ title, artist, artists, thumbnail, duration, index, isLiked, onPlay, onLike }: TrackRowProps) {
  const artistName = artist ?? artists?.join(", ") ?? "";

  return (
    <Pressable
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}
      onPress={onPlay}
    >
      {thumbnail ? (
        <Image source={{ uri: upscaleThumbnail(thumbnail) }} style={{ width: 44, height: 44, borderRadius: 6 }} />
      ) : index != null ? (
        <Text style={{ color: theme.colors.textTertiary, fontSize: 14, width: 24, textAlign: "right" }}>{index}</Text>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>{title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }} numberOfLines={1}>{artistName}</Text>
        </View>
      </View>
      {onLike && (
        <Pressable style={{ padding: 10 }} onPress={onLike}>
          <Icon name={isLiked ? "heart-filled" : "heart-outline"} size={16} color={isLiked ? theme.colors.accent : theme.colors.textTertiary} />
        </Pressable>
      )}
      {duration != null && (
        <Text style={{ color: theme.colors.textTertiary, fontSize: 12, width: 44, textAlign: "right" }}>
          {typeof duration === "number" ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}` : duration}
        </Text>
      )}
    </Pressable>
  );
}
