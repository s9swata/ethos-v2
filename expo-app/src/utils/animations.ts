import { Animated } from "react-native";
import { springs, durations } from "@/theme";

// Haptic feedback helpers (disabled)
export const haptics = {
  light: () => {},
  medium: () => {},
  heavy: () => {},
  success: () => {},
  error: () => {},
};

// Spring animation helpers
export function createSpringAnimation(
  value: Animated.Value,
  toValue: number,
  springConfig: { friction: number; tension: number } = springs.button
) {
  return Animated.spring(value, {
    toValue,
    friction: springConfig.friction,
    tension: springConfig.tension,
    useNativeDriver: true,
  });
}

// Button press animation
export function animateButtonPress(
  scale: Animated.Value,
  onComplete?: () => void
) {
  scale.setValue(0.96);
  Animated.spring(scale, {
    toValue: 1,
    friction: springs.button.friction,
    tension: springs.button.tension,
    useNativeDriver: true,
  }).start(onComplete);
}

// Heart like animation
export function animateHeart(
  scale: Animated.Value,
  onComplete?: () => void
) {
  scale.setValue(0.7);
  Animated.spring(scale, {
    toValue: 1,
    friction: springs.heart.friction,
    tension: springs.heart.tension,
    useNativeDriver: true,
  }).start(onComplete);
}

// Fade in animation
export function fadeIn(
  opacity: Animated.Value,
  duration: number = durations.slow,
  onComplete?: () => void
) {
  opacity.setValue(0);
  Animated.timing(opacity, {
    toValue: 1,
    duration,
    useNativeDriver: true,
  }).start(onComplete);
}

// Fade out animation
export function fadeOut(
  opacity: Animated.Value,
  duration: number = durations.fast,
  onComplete?: () => void
) {
  Animated.timing(opacity, {
    toValue: 0,
    duration,
    useNativeDriver: true,
  }).start(onComplete);
}

// Slide up animation
export function slideUp(
  translateY: Animated.Value,
  distance: number = 20,
  duration: number = durations.normal,
  onComplete?: () => void
) {
  translateY.setValue(distance);
  Animated.timing(translateY, {
    toValue: 0,
    duration,
    useNativeDriver: true,
  }).start(onComplete);
}

// Scale animation for cards
export function animateCardPress(
  scale: Animated.Value,
  pressed: boolean
) {
  Animated.spring(scale, {
    toValue: pressed ? 0.98 : 1,
    friction: springs.card.friction,
    tension: springs.card.tension,
    useNativeDriver: true,
  }).start();
}

// Staggered children animation helper
export function createStaggeredAnimation(
  count: number,
  baseDelay: number = 50
): Animated.Value[] {
  return Array.from({ length: count }, () => new Animated.Value(0));
}

export function animateStaggered(
  values: Animated.Value[],
  toValue: number = 1,
  baseDelay: number = 50
) {
  return Animated.stagger(
    baseDelay,
    values.map((val) =>
      Animated.timing(val, {
        toValue,
        duration: durations.slow,
        useNativeDriver: true,
      })
    )
  );
}
