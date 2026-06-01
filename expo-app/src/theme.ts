export const theme = {
  colors: {
    // Surfaces (Matte Dark)
    surface: "#0a0a0a",
    surfaceElevated: "#141414",
    surfaceSecondary: "#1c1c1e",
    surfaceTertiary: "#242426",
    
    // Legacy aliases for compatibility
    surface2: "#0d0d0d",
    surface3: "#1a1a1a",
    surfaceHover: "#242426",
    
    // Accents (Crimson/Cherry)
    accent: "#e11d48",
    accentHover: "#f43f5e",
    accentSubtle: "rgba(225, 29, 72, 0.15)",
    
    // Text
    textPrimary: "#ffffff",
    textSecondary: "#a1a1aa",
    textTertiary: "#71717a",
    textOnImage: "#ffffff",
    
    // Utility
    border: "#27272a",
    shadow: "rgba(0, 0, 0, 0.4)",
    scrim: "rgba(0, 0, 0, 0.5)",
    glass: "rgba(255,255,255,0.08)",
  },
  shadows: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 4,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      elevation: 8,
    },
    xl: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35,
      shadowRadius: 32,
      elevation: 12,
    },
  },
  skeleton: {
    base: "#1c1c1e",
    highlight: "#27272a",
  },
} as const;

export const layout = {
  px: 16,
  sectionGap: 32,
  cardRadius: 12,
  miniPlayerHeight: 64,
  // Spacing scale (4px base)
  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
  },
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  // Display
  hero: { fontSize: 32, fontWeight: "700" as const, color: theme.colors.textPrimary, letterSpacing: -0.02 },
  
  // Headings
  h1: { fontSize: 28, fontWeight: "700" as const, color: theme.colors.textPrimary, letterSpacing: -0.02 },
  h2: { fontSize: 24, fontWeight: "700" as const, color: theme.colors.textPrimary, letterSpacing: -0.01 },
  h3: { fontSize: 20, fontWeight: "600" as const, color: theme.colors.textPrimary, letterSpacing: 0 },
  h4: { fontSize: 17, fontWeight: "600" as const, color: theme.colors.textPrimary, letterSpacing: 0 },
  
  // Body
  body: { fontSize: 15, fontWeight: "400" as const, color: theme.colors.textPrimary, letterSpacing: 0 },
  bodyEmphasis: { fontSize: 15, fontWeight: "500" as const, color: theme.colors.textPrimary, letterSpacing: 0 },
  
  // Captions
  caption: { fontSize: 13, fontWeight: "400" as const, color: theme.colors.textSecondary, letterSpacing: 0 },
  captionEmphasis: { fontSize: 13, fontWeight: "500" as const, color: theme.colors.textSecondary, letterSpacing: 0 },
  
  // Small
  footnote: { fontSize: 11, fontWeight: "500" as const, color: theme.colors.textTertiary, letterSpacing: 0.01 },
  label: { fontSize: 11, fontWeight: "600" as const, color: theme.colors.textTertiary, letterSpacing: 0.05 },
} as const;

// Animation durations
export const durations = {
  micro: 100,
  fast: 150,
  normal: 250,
  slow: 300,
  ambient: 8000,
} as const;

// Spring configurations
export const springs = {
  button: { friction: 8, tension: 400 },
  heart: { friction: 6, tension: 200 },
  card: { friction: 10, tension: 300 },
} as const;
