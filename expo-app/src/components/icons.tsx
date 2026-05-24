import Entypo from "@expo/vector-icons/Entypo";
import type { StyleProp, ViewStyle } from "react-native";

type IconProps = {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

const NAME_MAP: Record<string, string> = {
  "heart-filled": "heart",
  "heart-outline": "heart-outlined",
  home: "home",
  play: "controller-play",
  pause: "controller-paus",
  forward: "controller-next",
  backward: "controller-jump-to-start",
  shuffle: "shuffle",
  repeat: "cycle",
  search: "magnifying-glass",
  "chevron-right": "chevron-right",
  "chevron-down": "chevron-down",
  "arrow-left": "arrow-left",
  "music-note": "music",
  "queue-list": "list",
  trash: "trash",
  xmark: "cross",
  plus: "plus",
  clock: "clock",
  "x-circle": "circle-with-cross",
  share: "share",
  "ellipsis-horizontal": "dots-three-horizontal",
  "speaker-x-mark": "sound-mute",
  "speaker-wave": "sound",
  bars: "menu",
};

export type IconName = keyof typeof NAME_MAP;

export function Icon({ name, size = 24, color = "#000", style }: IconProps & { name: IconName }) {
  const entypoName = NAME_MAP[name];
  if (!entypoName) return null;
  return <Entypo name={entypoName as any} size={size} color={color} style={style} />;
}
