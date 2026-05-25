import { useEffect, useRef, useState } from "react";
import { Animated, View } from "react-native";

interface MarqueeTextProps {
  children: string;
  style?: any;
  duration?: number;
  delay?: number;
  gap?: number;
}

export function MarqueeText({ children, style, duration = 8000, delay = 2000, gap = 50 }: MarqueeTextProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const needsScroll = textWidth > containerWidth;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!needsScroll) return;

    const distance = textWidth - containerWidth + gap;

    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateX, {
          toValue: -distance,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [needsScroll, textWidth, containerWidth, duration, delay, gap, translateX]);

  useEffect(() => {
    translateX.setValue(0);
  }, [children, translateX]);

  return (
    <View
      style={{ overflow: "hidden" }}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Animated.Text
        style={[{ transform: needsScroll ? [{ translateX }] : undefined }, style]}
        onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
        numberOfLines={1}
      >
        {children}
      </Animated.Text>
    </View>
  );
}
